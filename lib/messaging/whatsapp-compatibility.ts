import {
  MESSAGING_CONTRACT_VERSION,
  MessagingDomainError,
  assertCanonicalMessage,
  assertCanonicalReceipt,
  createCanonicalPhoneIdentity,
  normalizeCanonicalPhone,
  type CanonicalChannelAccount,
  type CanonicalConversation,
  type CanonicalDeliveryStatus,
  type CanonicalIdentity,
  type CanonicalMessage,
  type CanonicalMessageType,
  type CanonicalProviderMetadata,
  type CanonicalReceipt,
  type CanonicalReceiptType,
  type CanonicalSourceSnapshot
} from "@/lib/messaging/domain";

export type LegacyWhatsAppAccount = {
  id: string;
  organization_id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone_number?: string | null;
  business_name?: string | null;
  active: boolean;
  is_default: boolean;
};

export type LegacyWhatsAppContact = {
  id: string;
  organization_id: string;
  account_id: string;
  client_id?: string | null;
  wa_id: string;
  phone_e164: string;
  display_name?: string | null;
  profile_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LegacyWhatsAppConversation = {
  id: string;
  organization_id: string;
  account_id: string;
  contact_id: string;
  client_id?: string | null;
  project_id?: string | null;
  contract_id?: string | null;
  opportunity_id?: string | null;
  sac_ticket_id?: string | null;
  status: "OPEN" | "PENDING" | "CLOSED";
  assigned_to?: string | null;
  last_customer_message_at?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LegacyWhatsAppMessage = {
  id: string;
  organization_id: string;
  conversation_id: string;
  direction: "INBOUND" | "OUTBOUND";
  message_type:
    | "TEXT"
    | "TEMPLATE"
    | "DOCUMENT"
    | "IMAGE"
    | "AUDIO"
    | "INTERACTIVE"
    | "UNKNOWN";
  status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "RECEIVED";
  provider_message_id?: string | null;
  body?: string | null;
  caption?: string | null;
  source_binding_id?: string | null;
  source_snapshot?: unknown;
  provider_metadata?: unknown;
  idempotency_key?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  occurred_at: string;
  created_at?: string | null;
};

export type LegacyWhatsAppStatusEvent = {
  id: string;
  organization_id: string;
  message_id: string;
  status: string;
  provider_timestamp?: string | null;
  error_code?: string | null;
  error_title?: string | null;
  metadata?: unknown;
  created_at: string;
};

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value && !Array.isArray(value) && typeof value === "object"
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function normalizedPhoneOrNull(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15
    ? normalizeCanonicalPhone(digits)
    : null;
}

function optionalSourceSnapshot(value: unknown): CanonicalSourceSnapshot | null {
  const candidate = record(value);
  if (
    typeof candidate.sourceType !== "string" ||
    typeof candidate.sourceId !== "string" ||
    typeof candidate.sourceField !== "string" ||
    typeof candidate.sourceName !== "string" ||
    typeof candidate.sha256 !== "string" ||
    typeof candidate.resolvedAt !== "string"
  ) {
    return null;
  }
  return {
    sourceType: candidate.sourceType,
    sourceId: candidate.sourceId,
    sourceField: candidate.sourceField,
    sourceVersion:
      typeof candidate.sourceVersion === "number" ? candidate.sourceVersion : null,
    sourceName: candidate.sourceName,
    sha256: candidate.sha256,
    resolvedAt: candidate.resolvedAt
  };
}

function metadata(input: {
  attributes?: unknown;
  rawEventType?: string | null;
  providerTimestamp?: string | null;
}): CanonicalProviderMetadata {
  return {
    providerType: "META_CLOUD",
    schemaVersion: "meta-cloud-legacy-v1",
    rawEventType: input.rawEventType,
    providerTimestamp: input.providerTimestamp,
    attributes: input.attributes ? record(input.attributes) : {}
  };
}

function accountIdentity(
  account: LegacyWhatsAppAccount,
  observedAt: string
): CanonicalIdentity {
  const phone = normalizedPhoneOrNull(account.display_phone_number);
  if (phone) {
    return createCanonicalPhoneIdentity({
      organizationId: account.organization_id,
      providerType: "META_CLOUD",
      channelAccountId: account.id,
      providerAccountId: account.phone_number_id,
      externalId: account.phone_number_id,
      phone,
      displayName: account.business_name,
      observedAt,
      isSelf: true
    });
  }
  return {
    schemaVersion: MESSAGING_CONTRACT_VERSION,
    organizationId: account.organization_id,
    providerType: "META_CLOUD",
    channelAccountId: account.id,
    providerAccountId: account.phone_number_id,
    namespace: "CUSTOM",
    externalId: account.phone_number_id,
    normalizedId: `meta-phone-number-id:${account.phone_number_id}`,
    displayName: account.business_name,
    isSelf: true,
    observedAt
  };
}

export function legacyWhatsAppContactToCanonicalIdentity(
  contact: LegacyWhatsAppContact,
  observedAt = contact.updated_at ?? contact.created_at ?? new Date(0).toISOString(),
  providerAccountId?: string | null
): CanonicalIdentity {
  return createCanonicalPhoneIdentity({
    id: contact.id,
    organizationId: contact.organization_id,
    providerType: "META_CLOUD",
    channelAccountId: contact.account_id,
    providerAccountId,
    externalId: contact.wa_id,
    phone: contact.phone_e164,
    displayName: contact.display_name ?? contact.profile_name,
    observedAt
  });
}

export function legacyWhatsAppAccountToCanonical(
  account: LegacyWhatsAppAccount
): CanonicalChannelAccount {
  return {
    schemaVersion: MESSAGING_CONTRACT_VERSION,
    id: account.id,
    organizationId: account.organization_id,
    providerType: "META_CLOUD",
    providerAccountId: account.phone_number_id,
    displayAddress: normalizedPhoneOrNull(account.display_phone_number),
    displayName: account.business_name,
    active: account.active,
    isDefault: account.is_default,
    providerMetadata: metadata({
      attributes: {
        legacyAccountId: account.id,
        wabaId: account.waba_id
      }
    })
  };
}

export function legacyWhatsAppConversationToCanonical(input: {
  account: LegacyWhatsAppAccount;
  contact: LegacyWhatsAppContact;
  conversation: LegacyWhatsAppConversation;
}): CanonicalConversation {
  const observedAt =
    input.conversation.last_message_at ??
    input.conversation.updated_at ??
    input.conversation.created_at ??
    new Date(0).toISOString();
  return {
    schemaVersion: MESSAGING_CONTRACT_VERSION,
    id: input.conversation.id,
    organizationId: input.conversation.organization_id,
    status: input.conversation.status,
    participants: [
      accountIdentity(input.account, observedAt),
      legacyWhatsAppContactToCanonicalIdentity(
        input.contact,
        observedAt,
        input.account.phone_number_id
      )
    ],
    channelAccounts: [
      {
        providerType: "META_CLOUD",
        channelAccountId: input.account.id,
        providerAccountId: input.account.phone_number_id
      }
    ],
    assignedTo: input.conversation.assigned_to,
    unreadCount: input.conversation.unread_count,
    lastCustomerMessageAt: input.conversation.last_customer_message_at,
    lastMessageAt: input.conversation.last_message_at,
    linkedEntities: {
      clientId: input.conversation.client_id,
      projectId: input.conversation.project_id,
      contractId: input.conversation.contract_id,
      opportunityId: input.conversation.opportunity_id,
      sacTicketId: input.conversation.sac_ticket_id
    },
    createdAt: input.conversation.created_at,
    updatedAt: input.conversation.updated_at
  };
}

const LEGACY_MESSAGE_TYPES: Readonly<
  Record<LegacyWhatsAppMessage["message_type"], CanonicalMessageType>
> = {
  TEXT: "TEXT",
  TEMPLATE: "TEMPLATE",
  DOCUMENT: "DOCUMENT",
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  INTERACTIVE: "INTERACTIVE",
  UNKNOWN: "UNKNOWN"
};

export function legacyWhatsAppStatusToCanonical(
  status: LegacyWhatsAppMessage["status"]
): CanonicalDeliveryStatus {
  return status;
}

export function canonicalStatusToLegacyWhatsApp(
  status: CanonicalDeliveryStatus
): LegacyWhatsAppMessage["status"] {
  if (
    status === "QUEUED" ||
    status === "SENT" ||
    status === "DELIVERED" ||
    status === "READ" ||
    status === "FAILED" ||
    status === "RECEIVED"
  ) {
    return status;
  }
  throw new MessagingDomainError(
    "INCOMPATIBLE_LEGACY_VALUE",
    `O status canônico ${status} não possui projeção segura para o schema WhatsApp atual.`
  );
}

export function legacyWhatsAppMessageToCanonical(input: {
  account: LegacyWhatsAppAccount;
  contact: LegacyWhatsAppContact;
  message: LegacyWhatsAppMessage;
}): CanonicalMessage {
  const contactIdentity = legacyWhatsAppContactToCanonicalIdentity(
    input.contact,
    input.message.occurred_at,
    input.account.phone_number_id
  );
  const businessIdentity = accountIdentity(input.account, input.message.occurred_at);
  const inbound = input.message.direction === "INBOUND";
  return assertCanonicalMessage({
    schemaVersion: MESSAGING_CONTRACT_VERSION,
    id: input.message.id,
    organizationId: input.message.organization_id,
    conversationId: input.message.conversation_id,
    providerType: "META_CLOUD",
    channelAccountId: input.account.id,
    providerAccountId: input.account.phone_number_id,
    providerMessageId: input.message.provider_message_id,
    idempotencyKey: input.message.idempotency_key,
    direction: input.message.direction,
    messageType: LEGACY_MESSAGE_TYPES[input.message.message_type],
    status: legacyWhatsAppStatusToCanonical(input.message.status),
    sender: inbound ? contactIdentity : businessIdentity,
    recipients: [inbound ? businessIdentity : contactIdentity],
    content: {
      text: input.message.body,
      caption: input.message.caption
    },
    occurredAt: input.message.occurred_at,
    createdAt: input.message.created_at,
    sourceBindingId: input.message.source_binding_id,
    sourceSnapshot: optionalSourceSnapshot(input.message.source_snapshot),
    error:
      input.message.error_code || input.message.error_message
        ? {
            code: input.message.error_code,
            message: input.message.error_message
          }
        : null,
    providerMetadata: metadata({
      attributes: {
        ...record(input.message.provider_metadata),
        legacyMessageType: input.message.message_type,
        legacyTable: "whatsapp_messages"
      }
    })
  });
}

function receiptType(status: string): CanonicalReceiptType {
  switch (status.toUpperCase()) {
    case "ACCEPTED":
      return "ACCEPTED";
    case "SENT":
      return "SENT";
    case "DELIVERED":
      return "DELIVERED";
    case "READ":
      return "READ";
    case "PLAYED":
      return "PLAYED";
    case "FAILED":
      return "FAILED";
    default:
      throw new MessagingDomainError(
        "INCOMPATIBLE_LEGACY_VALUE",
        `O evento de status ${status} não possui receipt canônico conhecido.`
      );
  }
}

export function legacyWhatsAppStatusEventToCanonical(input: {
  account: LegacyWhatsAppAccount;
  event: LegacyWhatsAppStatusEvent;
  providerMessageId?: string | null;
}): CanonicalReceipt {
  return assertCanonicalReceipt({
    schemaVersion: MESSAGING_CONTRACT_VERSION,
    id: input.event.id,
    organizationId: input.event.organization_id,
    messageId: input.event.message_id,
    providerType: "META_CLOUD",
    channelAccountId: input.account.id,
    providerAccountId: input.account.phone_number_id,
    providerMessageId: input.providerMessageId,
    receiptType: receiptType(input.event.status),
    occurredAt: input.event.provider_timestamp ?? input.event.created_at,
    error:
      input.event.error_code || input.event.error_title
        ? {
            code: input.event.error_code,
            title: input.event.error_title
          }
        : null,
    providerMetadata: metadata({
      rawEventType: input.event.status,
      providerTimestamp: input.event.provider_timestamp,
      attributes: input.event.metadata
    })
  });
}
