import {
  RUNTIME_LEASE_SCHEMA_VERSION,
  RuntimeLifecycleError,
  type AcquireRuntimeLeaseInput,
  type ReleaseRuntimeLeaseInput,
  type RenewRuntimeLeaseInput,
  type RuntimeKillSwitchDecision,
  type SessionRuntimeLease,
  type SessionRuntimeLeaseRepository,
  type SessionRuntimeScope
} from "./contracts.js";

const MIN_TTL_MS = 1_000;
const MAX_TTL_MS = 300_000;

type KillSwitchRecord = {
  enabled: boolean;
  reason: string;
  changedAt: string;
};

export function createMemoryRuntimeLeaseRepository(options: {
  now?: () => Date;
} = {}): SessionRuntimeLeaseRepository {
  const now = options.now ?? (() => new Date());
  const leases = new Map<string, SessionRuntimeLease>();
  const sessionSwitches = new Map<string, KillSwitchRecord>();
  let globalSwitch: KillSwitchRecord | null = null;
  let queue = Promise.resolve();

  const serialize = async <T>(operation: () => Promise<T> | T): Promise<T> => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  };

  const killDecision = (scope: SessionRuntimeScope): RuntimeKillSwitchDecision => {
    if (globalSwitch?.enabled) {
      return {
        blocked: true,
        scope: "GLOBAL",
        reason: globalSwitch.reason,
        changedAt: globalSwitch.changedAt
      };
    }
    const session = sessionSwitches.get(scopeKey(scope));
    if (session?.enabled) {
      return {
        blocked: true,
        scope: "SESSION",
        reason: session.reason,
        changedAt: session.changedAt
      };
    }
    return { blocked: false, scope: null, reason: null, changedAt: null };
  };

  return {
    acquire(input: AcquireRuntimeLeaseInput) {
      return serialize(() => {
        validateScope(input);
        validateHolder(input.holderInstanceId);
        validateTtl(input.ttlMs);
        assertNotKilled(killDecision(input));

        const key = scopeKey(input);
        const current = leases.get(key);
        const nowMs = now().getTime();
        if (
          current?.holderInstanceId &&
          Date.parse(current.leaseExpiresAt) > nowMs &&
          current.holderInstanceId !== input.holderInstanceId
        ) {
          throw new RuntimeLifecycleError(
            "LEASE_HELD",
            "A sessão já possui uma instância escritora ativa.",
            true
          );
        }

        if (
          current?.holderInstanceId === input.holderInstanceId &&
          Date.parse(current.leaseExpiresAt) > nowMs
        ) {
          const renewed = {
            ...current,
            leaseExpiresAt: new Date(nowMs + input.ttlMs).toISOString(),
            renewedAt: new Date(nowMs).toISOString()
          };
          leases.set(key, renewed);
          return cloneLease(renewed);
        }

        const acquiredAt = new Date(nowMs).toISOString();
        const lease: SessionRuntimeLease = {
          organizationId: input.organizationId,
          sessionId: input.sessionId,
          channelAccountId: input.channelAccountId,
          providerType: input.providerType,
          schemaVersion: RUNTIME_LEASE_SCHEMA_VERSION,
          holderInstanceId: input.holderInstanceId,
          fencingToken: (current?.fencingToken ?? 0) + 1,
          leaseExpiresAt: new Date(nowMs + input.ttlMs).toISOString(),
          acquiredAt,
          renewedAt: acquiredAt
        };
        leases.set(key, lease);
        return cloneLease(lease);
      });
    },

    renew(input: RenewRuntimeLeaseInput) {
      return serialize(() => {
        validateScope(input);
        validateHolder(input.holderInstanceId);
        validateToken(input.fencingToken);
        validateTtl(input.ttlMs);
        assertNotKilled(killDecision(input));
        const current = requireCurrentLease(leases, input);
        assertLiveFence(current, input, now().getTime());
        const renewedAt = now().toISOString();
        const renewed = {
          ...current,
          leaseExpiresAt: new Date(Date.parse(renewedAt) + input.ttlMs).toISOString(),
          renewedAt
        };
        leases.set(scopeKey(input), renewed);
        return cloneLease(renewed);
      });
    },

    release(input: ReleaseRuntimeLeaseInput) {
      return serialize(() => {
        validateScope(input);
        validateHolder(input.holderInstanceId);
        validateToken(input.fencingToken);
        const current = requireCurrentLease(leases, input);
        assertFenceIdentity(current, input);
        const releasedAt = now().toISOString();
        leases.set(scopeKey(input), {
          ...current,
          holderInstanceId: null,
          leaseExpiresAt: releasedAt,
          renewedAt: releasedAt
        });
      });
    },

    current(scope: SessionRuntimeScope) {
      return serialize(() => {
        validateScope(scope);
        const current = leases.get(scopeKey(scope));
        return current ? cloneLease(current) : null;
      });
    },

    assertFence(input: ReleaseRuntimeLeaseInput) {
      return serialize(() => {
        validateScope(input);
        validateHolder(input.holderInstanceId);
        validateToken(input.fencingToken);
        assertNotKilled(killDecision(input));
        const current = requireCurrentLease(leases, input);
        assertLiveFence(current, input, now().getTime());
        return cloneLease(current);
      });
    },

    getKillSwitch(scope: SessionRuntimeScope) {
      return serialize(() => {
        validateScope(scope);
        return { ...killDecision(scope) };
      });
    },

    setGlobalKillSwitch(input: { enabled: boolean; reason: string }) {
      return serialize(() => {
        validateReason(input.reason);
        globalSwitch = {
          enabled: input.enabled,
          reason: input.reason.trim(),
          changedAt: now().toISOString()
        };
        return {
          blocked: input.enabled,
          scope: input.enabled ? "GLOBAL" : null,
          reason: input.enabled ? globalSwitch.reason : null,
          changedAt: globalSwitch.changedAt
        };
      });
    },

    setSessionKillSwitch(input: SessionRuntimeScope & { enabled: boolean; reason: string }) {
      return serialize(() => {
        validateScope(input);
        validateReason(input.reason);
        const changedAt = now().toISOString();
        sessionSwitches.set(scopeKey(input), {
          enabled: input.enabled,
          reason: input.reason.trim(),
          changedAt
        });
        return {
          blocked: input.enabled,
          scope: input.enabled ? "SESSION" : null,
          reason: input.enabled ? input.reason.trim() : null,
          changedAt
        };
      });
    }
  };
}

function requireCurrentLease(
  leases: Map<string, SessionRuntimeLease>,
  scope: SessionRuntimeScope
): SessionRuntimeLease {
  const current = leases.get(scopeKey(scope));
  if (!current?.holderInstanceId) {
    throw new RuntimeLifecycleError("RUNTIME_NOT_LEASED", "Sessão sem writer ativo.", true);
  }
  return current;
}

function assertLiveFence(
  current: SessionRuntimeLease,
  input: ReleaseRuntimeLeaseInput,
  nowMs: number
): void {
  assertFenceIdentity(current, input);
  if (Date.parse(current.leaseExpiresAt) <= nowMs) {
    throw new RuntimeLifecycleError("LEASE_EXPIRED", "Lease da sessão expirou.", true);
  }
}

function assertFenceIdentity(
  current: SessionRuntimeLease,
  input: ReleaseRuntimeLeaseInput
): void {
  if (
    current.holderInstanceId !== input.holderInstanceId ||
    current.fencingToken !== input.fencingToken
  ) {
    throw new RuntimeLifecycleError(
      "FENCING_TOKEN_STALE",
      "Instância ou fencing token não representam o writer atual.",
      false
    );
  }
}

function assertNotKilled(decision: RuntimeKillSwitchDecision): void {
  if (decision.blocked) {
    throw new RuntimeLifecycleError(
      "KILL_SWITCH_ACTIVE",
      `Runtime bloqueado pelo kill switch ${decision.scope ?? "UNKNOWN"}.`,
      false
    );
  }
}

function validateScope(scope: SessionRuntimeScope): void {
  if (
    !scope.organizationId.trim() ||
    !scope.sessionId.trim() ||
    !scope.channelAccountId.trim() ||
    scope.providerType !== "WHATSAPP_WEB_BAILEYS"
  ) {
    throw new RuntimeLifecycleError("INVALID_RUNTIME_SCOPE", "Escopo de runtime inválido.");
  }
}

function validateHolder(holderInstanceId: string): void {
  if (!holderInstanceId.trim() || holderInstanceId.length > 128) {
    throw new RuntimeLifecycleError("INVALID_RUNTIME_SCOPE", "Instância de runtime inválida.");
  }
}

function validateTtl(ttlMs: number): void {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < MIN_TTL_MS || ttlMs > MAX_TTL_MS) {
    throw new RuntimeLifecycleError("INVALID_LEASE_TTL", "TTL de lease fora dos limites.");
  }
}

function validateToken(token: number): void {
  if (!Number.isSafeInteger(token) || token <= 0) {
    throw new RuntimeLifecycleError("FENCING_TOKEN_STALE", "Fencing token inválido.");
  }
}

function validateReason(reason: string): void {
  if (!reason.trim() || reason.length > 500) {
    throw new RuntimeLifecycleError("INVALID_RUNTIME_SCOPE", "Justificativa inválida.");
  }
}

function scopeKey(scope: SessionRuntimeScope): string {
  return [
    scope.organizationId,
    scope.sessionId,
    scope.channelAccountId,
    scope.providerType
  ].join("\u0000");
}

function cloneLease(lease: SessionRuntimeLease): SessionRuntimeLease {
  return { ...lease };
}
