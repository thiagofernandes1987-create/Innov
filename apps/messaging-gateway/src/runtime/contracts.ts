export const RUNTIME_PROVIDER_TYPE = "WHATSAPP_WEB_BAILEYS" as const;
export const RUNTIME_LEASE_SCHEMA_VERSION = 1 as const;

export type SessionRuntimeScope = {
  organizationId: string;
  sessionId: string;
  channelAccountId: string;
  providerType: typeof RUNTIME_PROVIDER_TYPE;
};

export type SessionRuntimeLease = SessionRuntimeScope & {
  schemaVersion: typeof RUNTIME_LEASE_SCHEMA_VERSION;
  holderInstanceId: string | null;
  fencingToken: number;
  leaseExpiresAt: string;
  acquiredAt: string | null;
  renewedAt: string | null;
};

export type RuntimeKillSwitchDecision = {
  blocked: boolean;
  scope: "GLOBAL" | "SESSION" | null;
  reason: string | null;
  changedAt: string | null;
};

export type AcquireRuntimeLeaseInput = SessionRuntimeScope & {
  holderInstanceId: string;
  ttlMs: number;
};

export type RenewRuntimeLeaseInput = SessionRuntimeScope & {
  holderInstanceId: string;
  fencingToken: number;
  ttlMs: number;
};

export type ReleaseRuntimeLeaseInput = SessionRuntimeScope & {
  holderInstanceId: string;
  fencingToken: number;
};

export interface SessionRuntimeLeaseRepository {
  acquire(input: AcquireRuntimeLeaseInput): Promise<SessionRuntimeLease>;
  renew(input: RenewRuntimeLeaseInput): Promise<SessionRuntimeLease>;
  release(input: ReleaseRuntimeLeaseInput): Promise<void>;
  current(scope: SessionRuntimeScope): Promise<SessionRuntimeLease | null>;
  assertFence(input: ReleaseRuntimeLeaseInput): Promise<SessionRuntimeLease>;
  getKillSwitch(scope: SessionRuntimeScope): Promise<RuntimeKillSwitchDecision>;
  setGlobalKillSwitch(input: {
    enabled: boolean;
    reason: string;
  }): Promise<RuntimeKillSwitchDecision>;
  setSessionKillSwitch(input: SessionRuntimeScope & {
    enabled: boolean;
    reason: string;
  }): Promise<RuntimeKillSwitchDecision>;
}

export type RuntimeLifecycleState =
  | "STOPPED"
  | "ACQUIRING_LEASE"
  | "CONNECTING"
  | "PAIRING_REQUIRED"
  | "READY"
  | "BACKOFF"
  | "ACTION_REQUIRED"
  | "RESTRICTED"
  | "LOGGED_OUT"
  | "KILLED"
  | "FENCED_OUT"
  | "STOPPING"
  | "FAILED";

export type RuntimeFailureCategory =
  | "TRANSIENT"
  | "LOGGED_OUT"
  | "RESTRICTED"
  | "ACTION_REQUIRED"
  | "SHUTDOWN";

export type RuntimeFailureClassification = {
  category: RuntimeFailureCategory;
  retryable: boolean;
  reasonCode: string;
};

export type EphemeralPairingNotice = {
  challengeId: string;
  kind: "QR" | "PAIRING_CODE";
  available: true;
  expiresAt: string;
  persisted: false;
};

export type RuntimeProviderSignal =
  | { kind: "CONNECTED" }
  | {
      kind: "PAIRING_CHALLENGE";
      challengeKind: "QR" | "PAIRING_CODE";
      challengeValue: string;
      expiresAt: string;
    }
  | { kind: "DISCONNECTED"; error: unknown };

export type RuntimeConnectionContext = {
  scope: SessionRuntimeScope;
  holderInstanceId: string;
  fencingToken: number;
  onSignal: (signal: RuntimeProviderSignal) => Promise<void>;
};

export interface SessionRuntimeDriver {
  connect(context: RuntimeConnectionContext): Promise<void>;
  disconnect(reason: string): Promise<void>;
}

export type RuntimeSnapshot = SessionRuntimeScope & {
  holderInstanceId: string;
  state: RuntimeLifecycleState;
  fencingToken: number | null;
  leaseExpiresAt: string | null;
  changedAt: string;
  reason: string;
  reconnectAttempt: number;
  nextReconnectAt: string | null;
  pairing: EphemeralPairingNotice | null;
};

export type FencedCredentialMutation<T> = (input: {
  holderInstanceId: string;
  fencingToken: number;
}) => Promise<T>;

export type RuntimeLifecycleErrorCode =
  | "INVALID_RUNTIME_SCOPE"
  | "INVALID_LEASE_TTL"
  | "LEASE_HELD"
  | "LEASE_EXPIRED"
  | "FENCING_TOKEN_STALE"
  | "KILL_SWITCH_ACTIVE"
  | "INVALID_STATE_TRANSITION"
  | "RUNTIME_NOT_LEASED"
  | "PAIRING_CHALLENGE_INVALID";

export class RuntimeLifecycleError extends Error {
  readonly code: RuntimeLifecycleErrorCode;
  readonly retryable: boolean;

  constructor(code: RuntimeLifecycleErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "RuntimeLifecycleError";
    this.code = code;
    this.retryable = retryable;
  }
}
