export const INGRESS_SCHEMA_VERSION = "1.0.0" as const;

export type IngressProviderType = "META_CLOUD" | "WHATSAPP_WEB_BAILEYS" | "WEB_CHAT";
export type IngressEventKind =
  | "MESSAGE"
  | "RECEIPT"
  | "IDENTITY"
  | "SESSION"
  | "UNKNOWN";
export type IngressState =
  | "RECEIVED"
  | "VALIDATED"
  | "NORMALIZED"
  | "PERSISTED"
  | "DISPATCHED"
  | "FAILED"
  | "DLQ";

export type IngressIdentity = {
  namespace: "PHONE" | "WHATSAPP_PN" | "WHATSAPP_LID" | "GROUP" | "NEWSLETTER" | "WEB_USER" | "UNKNOWN";
  normalizedId: string;
  displayName?: string | null;
};

export type IngressContent = {
  messageType: string;
  text?: string | null;
  caption?: string | null;
  replyToProviderMessageId?: string | null;
  reaction?: { targetMessageId: string; emoji: string } | null;
  media?: readonly {
    mediaType: string;
    referenceType: "PROVIDER" | "PRIVATE_STORAGE" | "SIGNED_URL" | "INLINE_TEST_FIXTURE";
    reference: string;
    declaredMimeType?: string | null;
    fileName?: string | null;
  }[];
  attributes: Readonly<Record<string, string | number | boolean | null>>;
};

export type CanonicalIngressEnvelope = {
  schemaVersion: typeof INGRESS_SCHEMA_VERSION;
  eventId: string;
  idempotencyKey: string;
  organizationId: string;
  channelAccountId: string;
  providerType: IngressProviderType;
  providerAccountId?: string | null;
  providerEventId?: string | null;
  eventKind: IngressEventKind;
  occurredAt: string;
  receivedAt: string;
  sequenceKey: string;
  sequenceNumber?: number | null;
  sender?: IngressIdentity | null;
  recipients: readonly IngressIdentity[];
  content?: IngressContent | null;
  receipt?: {
    providerMessageId: string;
    receiptType: "SENT" | "DELIVERED" | "READ" | "PLAYED" | "FAILED";
  } | null;
  sanitizedMetadata: Readonly<Record<string, string | number | boolean | null>>;
};

export type PersistedIngressEvent = {
  envelope: CanonicalIngressEnvelope;
  state: IngressState;
  persistedAt: string;
  replayCount: number;
  duplicate: boolean;
};

export type IngressFailure = {
  code: "INVALID_EVENT" | "UNKNOWN_PAYLOAD" | "TENANT_UNRESOLVED" | "OUT_OF_ORDER" | "PERSISTENCE_FAILED";
  message: string;
  retryable: boolean;
};

export interface IngressRepository {
  persist(envelope: CanonicalIngressEnvelope): Promise<PersistedIngressEvent>;
  get(idempotencyKey: string): Promise<PersistedIngressEvent | null>;
  markDispatched(idempotencyKey: string): Promise<PersistedIngressEvent>;
  moveToDlq(envelope: CanonicalIngressEnvelope, failure: IngressFailure): Promise<void>;
  replay(idempotencyKey: string): Promise<PersistedIngressEvent>;
}

export type IngressDispatch = (event: PersistedIngressEvent) => Promise<void>;
