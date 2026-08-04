export const MESSAGING_CONTRACT_VERSION = "1.0.0" as const;

export const CHANNEL_PROVIDER_TYPES = [
  "META_CLOUD",
  "WHATSAPP_WEB_BAILEYS",
  "WEB_CHAT",
  "WHATSAPP_WEB_WHATSMEOW",
  "WHATSAPP_WEB_PUPPETEER",
  "EMAIL",
  "CUSTOM"
] as const;

export type ChannelProviderType = typeof CHANNEL_PROVIDER_TYPES[number];

export const IMPLEMENTED_CHANNEL_PROVIDER_TYPES = ["META_CLOUD"] as const satisfies readonly ChannelProviderType[];
export const PLANNED_CHANNEL_PROVIDER_TYPES = [
  "WHATSAPP_WEB_BAILEYS",
  "WEB_CHAT"
] as const satisfies readonly ChannelProviderType[];
export const RESERVED_CHANNEL_PROVIDER_TYPES = [
  "WHATSAPP_WEB_WHATSMEOW",
  "WHATSAPP_WEB_PUPPETEER",
  "EMAIL",
  "CUSTOM"
] as const satisfies readonly ChannelProviderType[];

export const CANONICAL_IDENTITY_NAMESPACES = [
  "PHONE",
  "WHATSAPP_PN",
  "WHATSAPP_LID",
  "GROUP",
  "NEWSLETTER",
  "WEB_USER",
  "EMAIL",
  "CUSTOM"
] as const;

export type CanonicalIdentityNamespace = typeof CANONICAL_IDENTITY_NAMESPACES[number];

export const CANONICAL_MESSAGE_DIRECTIONS = ["INBOUND", "OUTBOUND", "SYSTEM"] as const;
export type CanonicalMessageDirection = typeof CANONICAL_MESSAGE_DIRECTIONS[number];

export const CANONICAL_MESSAGE_TYPES = [
  "TEXT",
  "TEMPLATE",
  "DOCUMENT",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "STICKER",
  "LOCATION",
  "CONTACT",
  "REACTION",
  "INTERACTIVE",
  "EVENT",
  "UNKNOWN"
] as const;
export type CanonicalMessageType = typeof CANONICAL_MESSAGE_TYPES[number];

export const CANONICAL_DELIVERY_STATUSES = [
  "QUEUED",
  "ACCEPTED",
  "SENT",
  "DELIVERED",
  "READ",
  "RECEIVED",
  "FAILED",
  "CANCELLED"
] as const;
export type CanonicalDeliveryStatus = typeof CANONICAL_DELIVERY_STATUSES[number];

export const CANONICAL_CONVERSATION_STATUSES = [
  "OPEN",
  "PENDING",
  "CLOSED",
  "ARCHIVED"
] as const;
export type CanonicalConversationStatus = typeof CANONICAL_CONVERSATION_STATUSES[number];

export const CANONICAL_RECEIPT_TYPES = [
  "ACCEPTED",
  "SENT",
  "DELIVERED",
  "READ",
  "PLAYED",
  "FAILED"
] as const;
export type CanonicalReceiptType = typeof CANONICAL_RECEIPT_TYPES[number];

export type CanonicalProviderMetadata = {
  providerType: ChannelProviderType;
  schemaVersion: string;
  rawEventType?: string | null;
  providerTimestamp?: string | null;
  attributes: Readonly<Record<string, unknown>>;
};

export type CanonicalIdentityAlias = {
  namespace: CanonicalIdentityNamespace;
  externalId: string;
  normalizedId: string;
  confidence: "OBSERVED" | "INFERRED" | "CONFIRMED";
  firstObservedAt?: string | null;
  lastObservedAt?: string | null;
};

export type CanonicalIdentity = {
  schemaVersion: typeof MESSAGING_CONTRACT_VERSION;
  id?: string | null;
  organizationId: string;
  providerType: ChannelProviderType;
  providerAccountId: string;
  namespace: CanonicalIdentityNamespace;
  externalId: string;
  normalizedId: string;
  phoneE164?: string | null;
  deviceId?: string | null;
  displayName?: string | null;
  isSelf?: boolean;
  observedAt: string;
  aliases?: readonly CanonicalIdentityAlias[];
};

export type CanonicalMedia = {
  schemaVersion: typeof MESSAGING_CONTRACT_VERSION;
  id?: string | null;
  mediaType: "DOCUMENT" | "IMAGE" | "AUDIO" | "VIDEO" | "STICKER" | "UNKNOWN";
  referenceType: "PROVIDER" | "PRIVATE_STORAGE" | "SIGNED_URL" | "INLINE_TEST_FIXTURE";
  reference: string;
  fileName?: string | null;
  declaredMimeType?: string | null;
  detectedMimeType?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
  caption?: string | null;
  quarantineStatus?: "NOT_APPLICABLE" | "PENDING" | "APPROVED" | "REJECTED";
  expiresAt?: string | null;
  providerMetadata?: CanonicalProviderMetadata;
};

export type CanonicalSourceSnapshot = {
  sourceType: string;
  sourceId: string;
  sourceField: string;
  sourceVersion: number | null;
  sourceName: string;
  sha256: string;
  resolvedAt: string;
};

export type CanonicalMessageContent = {
  text?: string | null;
  caption?: string | null;
  media?: readonly CanonicalMedia[];
  template?: {
    name: string;
    languageCode: string;
    parameters: readonly string[];
  } | null;
  reaction?: {
    targetMessageId: string;
    emoji: string;
  } | null;
  location?: {
    latitude: number;
    longitude: number;
    name?: string | null;
    address?: string | null;
  } | null;
};

export type CanonicalMessage = {
  schemaVersion: typeof MESSAGING_CONTRACT_VERSION;
  id: string;
  organizationId: string;
  conversationId: string;
  providerType: ChannelProviderType;
  providerAccountId: string;
  providerMessageId?: string | null;
  idempotencyKey?: string | null;
  direction: CanonicalMessageDirection;
  messageType: CanonicalMessageType;
  status: CanonicalDeliveryStatus;
  sender: CanonicalIdentity;
  recipients: readonly CanonicalIdentity[];
  content: CanonicalMessageContent;
  replyToMessageId?: string | null;
  occurredAt: string;
  createdAt?: string | null;
  sourceBindingId?: string | null;
  sourceSnapshot?: CanonicalSourceSnapshot | null;
  error?: {
    code?: string | null;
    message?: string | null;
    retryable?: boolean | null;
  } | null;
  providerMetadata: CanonicalProviderMetadata;
};

export type CanonicalReceipt = {
  schemaVersion: typeof MESSAGING_CONTRACT_VERSION;
  id?: string | null;
  organizationId: string;
  messageId: string;
  providerType: ChannelProviderType;
  providerAccountId: string;
  providerMessageId?: string | null;
  receiptType: CanonicalReceiptType;
  occurredAt: string;
  identity?: CanonicalIdentity | null;
  error?: {
    code?: string | null;
    title?: string | null;
    retryable?: boolean | null;
  } | null;
  providerMetadata: CanonicalProviderMetadata;
};

export type CanonicalConversation = {
  schemaVersion: typeof MESSAGING_CONTRACT_VERSION;
  id: string;
  organizationId: string;
  status: CanonicalConversationStatus;
  participants: readonly CanonicalIdentity[];
  providerAccounts: readonly {
    providerType: ChannelProviderType;
    providerAccountId: string;
  }[];
  assignedTo?: string | null;
  unreadCount: number;
  lastCustomerMessageAt?: string | null;
  lastMessageAt?: string | null;
  linkedEntities: {
    clientId?: string | null;
    projectId?: string | null;
    contractId?: string | null;
    opportunityId?: string | null;
    sacTicketId?: string | null;
  };
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CanonicalChannelAccount = {
  schemaVersion: typeof MESSAGING_CONTRACT_VERSION;
  id: string;
  organizationId: string;
  providerType: ChannelProviderType;
  providerAccountId: string;
  displayAddress?: string | null;
  displayName?: string | null;
  active: boolean;
  isDefault: boolean;
  providerMetadata: CanonicalProviderMetadata;
};

export class MessagingDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PROVIDER"
      | "INVALID_IDENTITY"
      | "INVALID_PHONE"
      | "INVALID_MESSAGE"
      | "INVALID_RECEIPT"
      | "INCOMPATIBLE_LEGACY_VALUE",
    message: string
  ) {
    super(message);
    this.name = "MessagingDomainError";
  }
}

export function isChannelProviderType(value: string): value is ChannelProviderType {
  return CHANNEL_PROVIDER_TYPES.includes(value as ChannelProviderType);
}

export function normalizeCanonicalPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new MessagingDomainError(
      "INVALID_PHONE",
      "A identidade telefônica deve conter país, DDD e número válidos."
    );
  }
  return digits;
}

export function canonicalIdentityKey(identity: Pick<
  CanonicalIdentity,
  "organizationId" | "providerType" | "providerAccountId" | "namespace" | "normalizedId"
>) {
  return [
    identity.organizationId,
    identity.providerType,
    identity.providerAccountId,
    identity.namespace,
    identity.normalizedId
  ].join(":");
}

export function createCanonicalPhoneIdentity(input: {
  organizationId: string;
  providerType: ChannelProviderType;
  providerAccountId: string;
  externalId: string;
  phone: string;
  displayName?: string | null;
  observedAt: string;
  id?: string | null;
}): CanonicalIdentity {
  const phoneE164 = normalizeCanonicalPhone(input.phone);
  return {
    schemaVersion: MESSAGING_CONTRACT_VERSION,
    id: input.id,
    organizationId: input.organizationId,
    providerType: input.providerType,
    providerAccountId: input.providerAccountId,
    namespace: input.providerType === "WEB_CHAT" ? "PHONE" : "WHATSAPP_PN",
    externalId: input.externalId,
    normalizedId: phoneE164,
    phoneE164,
    displayName: input.displayName,
    observedAt: input.observedAt
  };
}

export function assertCanonicalIdentity(identity: CanonicalIdentity) {
  if (
    identity.schemaVersion !== MESSAGING_CONTRACT_VERSION ||
    !identity.organizationId ||
    !identity.providerAccountId ||
    !identity.externalId ||
    !identity.normalizedId ||
    !isChannelProviderType(identity.providerType) ||
    !CANONICAL_IDENTITY_NAMESPACES.includes(identity.namespace)
  ) {
    throw new MessagingDomainError("INVALID_IDENTITY", "Identidade canônica inválida.");
  }
  if (
    (identity.namespace === "PHONE" || identity.namespace === "WHATSAPP_PN") &&
    identity.phoneE164 !== normalizeCanonicalPhone(identity.phoneE164 ?? identity.normalizedId)
  ) {
    throw new MessagingDomainError(
      "INVALID_IDENTITY",
      "A identidade telefônica não está normalizada."
    );
  }
  return identity;
}

export function assertCanonicalMessage(message: CanonicalMessage) {
  if (
    message.schemaVersion !== MESSAGING_CONTRACT_VERSION ||
    !message.id ||
    !message.organizationId ||
    !message.conversationId ||
    !message.providerAccountId ||
    !isChannelProviderType(message.providerType) ||
    !CANONICAL_MESSAGE_DIRECTIONS.includes(message.direction) ||
    !CANONICAL_MESSAGE_TYPES.includes(message.messageType) ||
    !CANONICAL_DELIVERY_STATUSES.includes(message.status) ||
    !message.occurredAt
  ) {
    throw new MessagingDomainError("INVALID_MESSAGE", "Mensagem canônica inválida.");
  }
  assertCanonicalIdentity(message.sender);
  for (const recipient of message.recipients) assertCanonicalIdentity(recipient);
  if (message.messageType === "TEXT" && !message.content.text?.trim()) {
    throw new MessagingDomainError(
      "INVALID_MESSAGE",
      "Mensagem de texto deve possuir conteúdo."
    );
  }
  return message;
}

export function assertCanonicalReceipt(receipt: CanonicalReceipt) {
  if (
    receipt.schemaVersion !== MESSAGING_CONTRACT_VERSION ||
    !receipt.organizationId ||
    !receipt.messageId ||
    !receipt.providerAccountId ||
    !isChannelProviderType(receipt.providerType) ||
    !CANONICAL_RECEIPT_TYPES.includes(receipt.receiptType) ||
    !receipt.occurredAt
  ) {
    throw new MessagingDomainError("INVALID_RECEIPT", "Receipt canônico inválido.");
  }
  if (receipt.identity) assertCanonicalIdentity(receipt.identity);
  return receipt;
}
