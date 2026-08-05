import { randomUUID } from "node:crypto";
import { reconnectBackoffMs } from "./backoff.js";
import {
  RuntimeLifecycleError,
  type EphemeralPairingNotice,
  type FencedCredentialMutation,
  type RuntimeLifecycleState,
  type RuntimeProviderSignal,
  type RuntimeSnapshot,
  type SessionRuntimeDriver,
  type SessionRuntimeLease,
  type SessionRuntimeLeaseRepository,
  type SessionRuntimeScope
} from "./contracts.js";
import { classifyRuntimeFailure } from "./failure-classification.js";

const ALLOWED_TRANSITIONS: Readonly<Record<RuntimeLifecycleState, readonly RuntimeLifecycleState[]>> = {
  STOPPED: ["ACQUIRING_LEASE"],
  ACQUIRING_LEASE: ["CONNECTING", "KILLED", "FAILED"],
  CONNECTING: [
    "PAIRING_REQUIRED",
    "READY",
    "BACKOFF",
    "ACTION_REQUIRED",
    "RESTRICTED",
    "LOGGED_OUT",
    "KILLED",
    "FENCED_OUT",
    "STOPPING",
    "FAILED"
  ],
  PAIRING_REQUIRED: [
    "CONNECTING",
    "READY",
    "BACKOFF",
    "ACTION_REQUIRED",
    "RESTRICTED",
    "LOGGED_OUT",
    "KILLED",
    "FENCED_OUT",
    "STOPPING",
    "FAILED"
  ],
  READY: [
    "BACKOFF",
    "ACTION_REQUIRED",
    "RESTRICTED",
    "LOGGED_OUT",
    "KILLED",
    "FENCED_OUT",
    "STOPPING",
    "FAILED"
  ],
  BACKOFF: ["CONNECTING", "KILLED", "FENCED_OUT", "STOPPING", "FAILED"],
  ACTION_REQUIRED: ["STOPPING", "STOPPED", "ACQUIRING_LEASE"],
  RESTRICTED: ["STOPPING", "STOPPED", "ACQUIRING_LEASE"],
  LOGGED_OUT: ["STOPPING", "STOPPED", "ACQUIRING_LEASE"],
  KILLED: ["STOPPING", "STOPPED", "ACQUIRING_LEASE"],
  FENCED_OUT: ["STOPPING", "STOPPED", "ACQUIRING_LEASE"],
  STOPPING: ["STOPPED", "FENCED_OUT"],
  FAILED: ["STOPPING", "STOPPED", "ACQUIRING_LEASE"]
};

export type SessionLifecycleSupervisorOptions = {
  scope: SessionRuntimeScope;
  holderInstanceId: string;
  leaseTtlMs: number;
  leaseRepository: SessionRuntimeLeaseRepository;
  driver: SessionRuntimeDriver;
  now?: () => Date;
  random?: () => number;
  createId?: () => string;
  onSnapshot?: (snapshot: RuntimeSnapshot) => void | Promise<void>;
  onPairingNotice?: (notice: EphemeralPairingNotice) => void | Promise<void>;
};

export class SessionLifecycleSupervisor {
  private readonly now: () => Date;
  private readonly random: () => number;
  private readonly createId: () => string;
  private lease: SessionRuntimeLease | null = null;
  private snapshot: RuntimeSnapshot;

  constructor(private readonly options: SessionLifecycleSupervisorOptions) {
    validateOptions(options);
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
    this.createId = options.createId ?? randomUUID;
    this.snapshot = {
      ...options.scope,
      holderInstanceId: options.holderInstanceId,
      state: "STOPPED",
      fencingToken: null,
      leaseExpiresAt: null,
      changedAt: this.now().toISOString(),
      reason: "NOT_STARTED",
      reconnectAttempt: 0,
      nextReconnectAt: null,
      pairing: null
    };
  }

  getSnapshot(): RuntimeSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  async start(): Promise<RuntimeSnapshot> {
    if (this.snapshot.state !== "STOPPED") {
      throw new RuntimeLifecycleError(
        "INVALID_STATE_TRANSITION",
        "Runtime só pode iniciar a partir de STOPPED."
      );
    }
    await this.transition("ACQUIRING_LEASE", "LEASE_ACQUIRE_REQUESTED");
    try {
      await this.assertKillSwitchOpen();
      this.lease = await this.options.leaseRepository.acquire({
        ...this.options.scope,
        holderInstanceId: this.options.holderInstanceId,
        ttlMs: this.options.leaseTtlMs
      });
      await this.transition("CONNECTING", "LEASE_ACQUIRED");
      await this.options.driver.connect(this.connectionContext());
      return this.getSnapshot();
    } catch (error) {
      if (error instanceof RuntimeLifecycleError && error.code === "KILL_SWITCH_ACTIVE") {
        await this.transition("KILLED", error.code);
      } else {
        await this.transition("FAILED", errorCode(error));
      }
      throw error;
    }
  }

  async renewLease(): Promise<RuntimeSnapshot> {
    const lease = this.requireLease();
    try {
      await this.assertKillSwitchOpen();
      this.lease = await this.options.leaseRepository.renew({
        ...this.options.scope,
        holderInstanceId: this.options.holderInstanceId,
        fencingToken: lease.fencingToken,
        ttlMs: this.options.leaseTtlMs
      });
      this.snapshot = {
        ...this.snapshot,
        leaseExpiresAt: this.lease.leaseExpiresAt,
        changedAt: this.now().toISOString(),
        reason: "LEASE_RENEWED"
      };
      await this.notifySnapshot();
      return this.getSnapshot();
    } catch (error) {
      await this.fenceOut(errorCode(error));
      throw error;
    }
  }

  async enforceKillSwitch(): Promise<RuntimeSnapshot> {
    const decision = await this.options.leaseRepository.getKillSwitch(this.options.scope);
    if (!decision.blocked) return this.getSnapshot();
    await this.disconnectAndRelease("KILL_SWITCH_ACTIVE");
    if (this.snapshot.state !== "KILLED") {
      await this.transition("KILLED", decision.reason ?? "KILL_SWITCH_ACTIVE");
    }
    return this.getSnapshot();
  }

  async reconnectNow(): Promise<RuntimeSnapshot> {
    if (this.snapshot.state !== "BACKOFF") {
      throw new RuntimeLifecycleError(
        "INVALID_STATE_TRANSITION",
        "Reconnect explícito exige estado BACKOFF."
      );
    }
    const nextAt = this.snapshot.nextReconnectAt
      ? Date.parse(this.snapshot.nextReconnectAt)
      : Number.POSITIVE_INFINITY;
    if (this.now().getTime() < nextAt) {
      throw new RuntimeLifecycleError(
        "INVALID_STATE_TRANSITION",
        "Janela de backoff ainda não terminou.",
        true
      );
    }
    await this.assertWritableLease();
    await this.transition("CONNECTING", "RECONNECT_ATTEMPT");
    try {
      await this.options.driver.connect(this.connectionContext());
      return this.getSnapshot();
    } catch (error) {
      await this.handleProviderSignal({ kind: "DISCONNECTED", error });
      throw error;
    }
  }

  async runFencedCredentialMutation<T>(mutation: FencedCredentialMutation<T>): Promise<T> {
    const lease = await this.assertWritableLease();
    const result = await mutation({
      holderInstanceId: this.options.holderInstanceId,
      fencingToken: lease.fencingToken
    });
    await this.options.leaseRepository.assertFence({
      ...this.options.scope,
      holderInstanceId: this.options.holderInstanceId,
      fencingToken: lease.fencingToken
    });
    return result;
  }

  async restoreOnNewInstance<T>(restore: FencedCredentialMutation<T>): Promise<T> {
    return this.runFencedCredentialMutation(restore);
  }

  async stop(reason = "REQUESTED"): Promise<RuntimeSnapshot> {
    if (this.snapshot.state === "STOPPED") return this.getSnapshot();
    if (this.snapshot.state !== "STOPPING") {
      await this.transition("STOPPING", reason);
    }
    await this.disconnectAndRelease(reason);
    await this.transition("STOPPED", reason);
    return this.getSnapshot();
  }

  private connectionContext() {
    const lease = this.requireLease();
    return {
      scope: { ...this.options.scope },
      holderInstanceId: this.options.holderInstanceId,
      fencingToken: lease.fencingToken,
      onSignal: (signal: RuntimeProviderSignal) => this.handleProviderSignal(signal)
    };
  }

  private async handleProviderSignal(signal: RuntimeProviderSignal): Promise<void> {
    switch (signal.kind) {
      case "CONNECTED":
        this.snapshot = { ...this.snapshot, reconnectAttempt: 0, nextReconnectAt: null, pairing: null };
        await this.transition("READY", "PROVIDER_CONNECTED");
        return;
      case "PAIRING_CHALLENGE":
        await this.handlePairingChallenge(signal);
        return;
      case "DISCONNECTED":
        await this.handleDisconnect(signal.error);
    }
  }

  private async handlePairingChallenge(
    signal: Extract<RuntimeProviderSignal, { kind: "PAIRING_CHALLENGE" }>
  ): Promise<void> {
    if (!signal.challengeValue.trim() || Date.parse(signal.expiresAt) <= this.now().getTime()) {
      throw new RuntimeLifecycleError(
        "PAIRING_CHALLENGE_INVALID",
        "Desafio efêmero ausente ou expirado."
      );
    }
    const notice: EphemeralPairingNotice = {
      challengeId: this.createId(),
      kind: signal.challengeKind,
      available: true,
      expiresAt: signal.expiresAt,
      persisted: false
    };
    this.snapshot = { ...this.snapshot, pairing: notice };
    await this.transition("PAIRING_REQUIRED", "PAIRING_CHALLENGE_AVAILABLE");
    await this.options.onPairingNotice?.({ ...notice });
  }

  private async handleDisconnect(error: unknown): Promise<void> {
    const classification = classifyRuntimeFailure(error);
    switch (classification.category) {
      case "TRANSIENT": {
        const reconnectAttempt = this.snapshot.reconnectAttempt + 1;
        const delay = reconnectBackoffMs({
          attempt: reconnectAttempt,
          random: this.random
        });
        this.snapshot = {
          ...this.snapshot,
          reconnectAttempt,
          nextReconnectAt: new Date(this.now().getTime() + delay).toISOString(),
          pairing: null
        };
        await this.transition("BACKOFF", classification.reasonCode);
        return;
      }
      case "LOGGED_OUT":
        await this.terminalize("LOGGED_OUT", classification.reasonCode);
        return;
      case "RESTRICTED":
        await this.terminalize("RESTRICTED", classification.reasonCode);
        return;
      case "ACTION_REQUIRED":
        await this.terminalize("ACTION_REQUIRED", classification.reasonCode);
        return;
      case "SHUTDOWN":
        await this.stop(classification.reasonCode);
    }
  }

  private async terminalize(
    state: Extract<RuntimeLifecycleState, "LOGGED_OUT" | "RESTRICTED" | "ACTION_REQUIRED">,
    reason: string
  ): Promise<void> {
    await this.disconnectAndRelease(reason);
    await this.transition(state, reason);
  }

  private async assertWritableLease(): Promise<SessionRuntimeLease> {
    const lease = this.requireLease();
    try {
      return await this.options.leaseRepository.assertFence({
        ...this.options.scope,
        holderInstanceId: this.options.holderInstanceId,
        fencingToken: lease.fencingToken
      });
    } catch (error) {
      await this.fenceOut(errorCode(error));
      throw error;
    }
  }

  private async assertKillSwitchOpen(): Promise<void> {
    const decision = await this.options.leaseRepository.getKillSwitch(this.options.scope);
    if (decision.blocked) {
      throw new RuntimeLifecycleError(
        "KILL_SWITCH_ACTIVE",
        decision.reason ?? "Runtime bloqueado por kill switch."
      );
    }
  }

  private async fenceOut(reason: string): Promise<void> {
    try {
      await this.options.driver.disconnect("FENCED_OUT");
    } finally {
      this.lease = null;
      if (this.snapshot.state !== "FENCED_OUT") {
        await this.transition("FENCED_OUT", reason);
      }
    }
  }

  private async disconnectAndRelease(reason: string): Promise<void> {
    try {
      await this.options.driver.disconnect(reason);
    } finally {
      const lease = this.lease;
      this.lease = null;
      if (lease) {
        try {
          await this.options.leaseRepository.release({
            ...this.options.scope,
            holderInstanceId: this.options.holderInstanceId,
            fencingToken: lease.fencingToken
          });
        } catch {
          // A liberação é best effort: token obsoleto nunca deve substituir o writer atual.
        }
      }
    }
  }

  private requireLease(): SessionRuntimeLease {
    if (!this.lease) {
      throw new RuntimeLifecycleError(
        "RUNTIME_NOT_LEASED",
        "Operação exige lease ativo da sessão.",
        true
      );
    }
    return this.lease;
  }

  private async transition(state: RuntimeLifecycleState, reason: string): Promise<void> {
    const allowed = ALLOWED_TRANSITIONS[this.snapshot.state];
    if (!allowed.includes(state)) {
      throw new RuntimeLifecycleError(
        "INVALID_STATE_TRANSITION",
        `Transição ${this.snapshot.state} -> ${state} não permitida.`
      );
    }
    this.snapshot = {
      ...this.snapshot,
      state,
      fencingToken: this.lease?.fencingToken ?? null,
      leaseExpiresAt: this.lease?.leaseExpiresAt ?? null,
      changedAt: this.now().toISOString(),
      reason
    };
    await this.notifySnapshot();
  }

  private async notifySnapshot(): Promise<void> {
    await this.options.onSnapshot?.(this.getSnapshot());
  }
}

function validateOptions(options: SessionLifecycleSupervisorOptions): void {
  if (
    !options.scope.organizationId.trim() ||
    !options.scope.sessionId.trim() ||
    !options.scope.channelAccountId.trim() ||
    options.scope.providerType !== "WHATSAPP_WEB_BAILEYS" ||
    !options.holderInstanceId.trim()
  ) {
    throw new RuntimeLifecycleError("INVALID_RUNTIME_SCOPE", "Configuração de runtime inválida.");
  }
  if (!Number.isSafeInteger(options.leaseTtlMs) || options.leaseTtlMs < 1_000) {
    throw new RuntimeLifecycleError("INVALID_LEASE_TTL", "TTL de lease inválido.");
  }
}

function cloneSnapshot(snapshot: RuntimeSnapshot): RuntimeSnapshot {
  return {
    ...snapshot,
    pairing: snapshot.pairing ? { ...snapshot.pairing } : null
  };
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return code.trim();
  }
  return error instanceof Error && error.name ? error.name : "UNKNOWN_ERROR";
}
