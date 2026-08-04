import { createHash } from "node:crypto";
import type { BaileysEngineEvent } from "../engines/baileys/contracts.js";
import {
  INGRESS_SCHEMA_VERSION,
  type CanonicalIngressEnvelope,
  type IngressContent,
  type IngressIdentity
} from "./contracts.js";

export type IngressNormalizationContext = {
  receivedAt: string;
  resolveProviderAccountId?: (channelAccountId: string) => string | null;
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function identity(input: {
  namespace: string;
  normalizedId: string;
  displayName?: string | null;
}): IngressIdentity {
  const namespace = [
    "PHONE", "WHATSAPP_PN", "WHATSAPP_LID", "GROUP", "NEWSLETTER", "WEB_USER"
  ].includes(input.namespace)
    ? input.namespace as IngressIdentity["namespace"]
    : "UNKNOWN";
  return { namespace, normalizedId: input.normalizedId, displayName: input.displayName ?? null };
}

function normalizeContent(event: Extract<BaileysEngineEvent, { kind: "MESSAGE_RECEIVED" }>): IngressContent {
  return {
    messageType: event.messageType,
    text: event.content.text ?? null,
    caption: event.content.caption ?? null,
    reaction: event.content.reaction ?? null,
    media: event.content.media?.map(item => ({
      mediaType: item.mediaType,
      referenceType: item.referenceType,
      reference: item.reference,
      declaredMimeType: item.declaredMimeType ?? null,
      fileName: item.fileName ?? null
    })) ?? [],
    attributes: {
      wrapperNormalized: true,
      ephemeralMaterialPersisted: false,
      viewOnceMaterialPersisted: false,
      rawPayloadPersisted: false
    }
  };
}

export function normalizeBaileysEngineEvent(
  event: BaileysEngineEvent,
  context: IngressNormalizationContext
): CanonicalIngressEnvelope {
  const providerAccountId = context.resolveProviderAccountId?.(
    "channelAccountId" in event ? event.channelAccountId ?? "" : event.snapshot.channelAccountId
  ) ?? null;

  if (event.kind === "MESSAGE_RECEIVED") {
    const idempotencyKey = hash({
      providerType: event.providerType,
      account: event.channelAccountId,
      eventId: event.eventId,
      providerMessageId: event.providerMessageId,
      kind: event.kind
    });
    return {
      schemaVersion: INGRESS_SCHEMA_VERSION,
      eventId: event.eventId,
      idempotencyKey,
      organizationId: event.organizationId,
      channelAccountId: event.channelAccountId,
      providerType: event.providerType,
      providerAccountId,
      providerEventId: event.providerMessageId,
      eventKind: "MESSAGE",
      occurredAt: event.occurredAt,
      receivedAt: context.receivedAt,
      sequenceKey: `${event.channelAccountId}:${event.sender.normalizedId}`,
      sender: identity(event.sender),
      recipients: event.recipients.map(identity),
      content: normalizeContent(event),
      sanitizedMetadata: {
        rawEventType: event.providerMetadata.rawEventType ?? null,
        schemaVersion: event.providerMetadata.schemaVersion,
        payloadSanitized: true
      }
    };
  }

  if (event.kind === "RECEIPT_RECEIVED") {
    const receipt = event.receipt;
    return {
      schemaVersion: INGRESS_SCHEMA_VERSION,
      eventId: event.eventId,
      idempotencyKey: hash({
        providerType: receipt.providerType,
        account: receipt.channelAccountId,
        providerMessageId: receipt.providerMessageId,
        receiptType: receipt.receiptType,
        occurredAt: receipt.occurredAt
      }),
      organizationId: receipt.organizationId,
      channelAccountId: receipt.channelAccountId,
      providerType: receipt.providerType,
      providerAccountId: receipt.providerAccountId ?? providerAccountId,
      providerEventId: event.eventId,
      eventKind: "RECEIPT",
      occurredAt: receipt.occurredAt,
      receivedAt: context.receivedAt,
      sequenceKey: `${receipt.channelAccountId}:${receipt.providerMessageId ?? receipt.messageId}`,
      sender: receipt.identity ? identity(receipt.identity) : null,
      recipients: [],
      receipt: {
        providerMessageId: receipt.providerMessageId ?? receipt.messageId,
        receiptType: receipt.receiptType
      },
      sanitizedMetadata: {
        rawEventType: receipt.providerMetadata.rawEventType ?? null,
        schemaVersion: receipt.providerMetadata.schemaVersion,
        payloadSanitized: true
      }
    };
  }

  if (event.kind === "SESSION_STATE_CHANGED") {
    return {
      schemaVersion: INGRESS_SCHEMA_VERSION,
      eventId: event.eventId,
      idempotencyKey: hash({ eventId: event.eventId, state: event.snapshot.state }),
      organizationId: "SYSTEM",
      channelAccountId: event.snapshot.channelAccountId,
      providerType: event.snapshot.providerType,
      providerAccountId,
      providerEventId: event.eventId,
      eventKind: "SESSION",
      occurredAt: event.occurredAt,
      receivedAt: context.receivedAt,
      sequenceKey: event.snapshot.channelAccountId,
      recipients: [],
      sanitizedMetadata: {
        state: event.snapshot.state,
        reason: event.snapshot.reason ?? null,
        payloadSanitized: true,
        qrPersisted: false
      }
    };
  }

  return {
    schemaVersion: INGRESS_SCHEMA_VERSION,
    eventId: event.eventId,
    idempotencyKey: hash({ eventId: event.eventId, code: event.code }),
    organizationId: "SYSTEM",
    channelAccountId: event.channelAccountId ?? "UNRESOLVED",
    providerType: event.providerType,
    providerAccountId,
    providerEventId: event.eventId,
    eventKind: "UNKNOWN",
    occurredAt: event.occurredAt,
    receivedAt: context.receivedAt,
    sequenceKey: event.channelAccountId ?? "UNRESOLVED",
    recipients: [],
    sanitizedMetadata: {
      code: event.code,
      retryable: event.retryable,
      payloadSanitized: true
    }
  };
}
