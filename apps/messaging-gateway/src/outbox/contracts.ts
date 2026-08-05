export const OUTBOX_SCHEMA_VERSION = "1.0.0" as const;

export type DeliveryOutcome = "SUCCESS" | "RETRY" | "TERMINAL" | "ABORTED";
export type DeliveryCircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CanonicalDeliveryCommand = {
  schemaVersion: typeof OUTBOX_SCHEMA_VERSION;
  commandId: string;
  organizationId: string;
  channelAccountId: string;
  conversationId: string;
  messageId?: string | null;
  providerType: "META_CLOUD" | "WHATSAPP_WEB_BAILEYS" | "WEB_CHAT";
  providerAccountId: string;
  idempotencyKey: string;
  sequenceNumber: number;
  payloadSha256: string;
  payload: Readonly<Record<string, unknown>>;
  createdAt: string;
};

export type ClaimedDelivery = {
  command: CanonicalDeliveryCommand;
  workerId: string;
  claimToken: string;
  attemptNumber: number;
  claimedAt: string;
};

export type ProviderDeliveryResult = {
  providerMessageId: string;
  acceptedAt: string;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
};

export type ProviderDeliveryFailure = {
  code: string;
  classification: "TRANSIENT" | "RATE_LIMIT" | "AUTH" | "POLICY" | "INVALID" | "UNKNOWN";
  retryable: boolean;
  message: string;
};

export type DeliveryAttempt = {
  commandId: string;
  attemptNumber: number;
  outcome: DeliveryOutcome;
  startedAt: string;
  finishedAt: string;
  nextAttemptAt?: string | null;
  failure?: ProviderDeliveryFailure | null;
  providerMessageId?: string | null;
};

export interface DeliveryRepository {
  claimOrdered(workerId: string, limit: number): Promise<readonly ClaimedDelivery[]>;
  complete(claim: ClaimedDelivery, result: ProviderDeliveryResult): Promise<DeliveryAttempt>;
  fail(claim: ClaimedDelivery, failure: ProviderDeliveryFailure, nextAttemptAt: string | null): Promise<DeliveryAttempt>;
  reconcile(now: string): Promise<number>;
  replay(commandId: string, justification: string): Promise<void>;
}

export interface DeliveryProvider {
  send(command: CanonicalDeliveryCommand): Promise<ProviderDeliveryResult>;
}

export interface DeliveryCircuitBreaker {
  allow(accountId: string, now: string): boolean;
  success(accountId: string): void;
  failure(accountId: string, failure: ProviderDeliveryFailure, now: string): void;
  state(accountId: string): DeliveryCircuitState;
}

export interface DeliveryRateLimiter {
  reserve(organizationId: string, accountId: string, now: string): boolean;
}
