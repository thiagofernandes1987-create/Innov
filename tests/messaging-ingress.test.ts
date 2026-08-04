import { describe, expect, it, vi } from "vitest";
import type { BaileysEngineEvent } from "../apps/messaging-gateway/src/engines/baileys/contracts.js";
import {
  InMemoryIngressRepository,
  IngressPipelineError,
  assertPersistedBeforeAutomation,
  createIngressPipeline,
  normalizeBaileysEngineEvent,
  type CanonicalIngressEnvelope,
  type PersistedIngressEvent
} from "../apps/messaging-gateway/src/ingress/index.js";

const receivedAt = "2026-08-04T14:30:00.000Z";

function messageEvent(): Extract<BaileysEngineEvent, { kind: "MESSAGE_RECEIVED" }> {
  return {
    kind: "MESSAGE_RECEIVED",
    eventId: "event-message-1",
    occurredAt: "2026-08-04T14:29:00.000Z",
    organizationId: "org-1",
    channelAccountId: "account-1",
    providerType: "WHATSAPP_WEB_BAILEYS",
    providerMessageId: "provider-message-1",
    sender: {
      schemaVersion: "1.0.0",
      organizationId: "org-1",
      providerType: "WHATSAPP_WEB_BAILEYS",
      channelAccountId: "account-1",
      namespace: "WHATSAPP_LID",
      externalId: "123@lid",
      normalizedId: "123@lid",
      displayName: "Fixture",
      observedAt: "2026-08-04T14:29:00.000Z"
    },
    recipients: [],
    messageType: "TEXT",
    content: { text: "Mensagem sintética" },
    providerMetadata: {
      providerType: "WHATSAPP_WEB_BAILEYS",
      schemaVersion: "1.0.0",
      rawEventType: "messages.upsert",
      providerTimestamp: "2026-08-04T14:29:00.000Z",
      attributes: {}
    }
  };
}

function normalize(event: BaileysEngineEvent) {
  return normalizeBaileysEngineEvent(event, {
    receivedAt,
    resolveProviderAccountId: () => "provider-account-1",
    resolveOrganizationId: () => "org-1"
  });
}

describe("Messaging ingress W-09", () => {
  it("cria envelope canônico e sanitizado para mensagem", () => {
    const envelope = normalize(messageEvent());
    expect(envelope.schemaVersion).toBe("1.0.0");
    expect(envelope.eventKind).toBe("MESSAGE");
    expect(envelope.idempotencyKey).toMatch(/^[0-9a-f]{64}$/);
    expect(envelope.sender?.namespace).toBe("WHATSAPP_LID");
    expect(envelope.content?.text).toBe("Mensagem sintética");
    expect(envelope.content?.attributes).toMatchObject({
      wrapperNormalized: true,
      ephemeralMaterialPersisted: false,
      viewOnceMaterialPersisted: false,
      rawPayloadPersisted: false
    });
    expect(envelope.sanitizedMetadata.payloadSanitized).toBe(true);
    expect(JSON.stringify(envelope)).not.toContain("raw_payload");
  });

  it("normaliza receipt sem depender do payload nativo", () => {
    const event: BaileysEngineEvent = {
      kind: "RECEIPT_RECEIVED",
      eventId: "receipt-event-1",
      occurredAt: "2026-08-04T14:31:00.000Z",
      receipt: {
        schemaVersion: "1.0.0",
        organizationId: "org-1",
        messageId: "message-1",
        providerType: "WHATSAPP_WEB_BAILEYS",
        channelAccountId: "account-1",
        providerAccountId: "provider-account-1",
        providerMessageId: "provider-message-1",
        receiptType: "READ",
        occurredAt: "2026-08-04T14:31:00.000Z",
        providerMetadata: {
          providerType: "WHATSAPP_WEB_BAILEYS",
          schemaVersion: "1.0.0",
          rawEventType: "message-receipt.update",
          providerTimestamp: "2026-08-04T14:31:00.000Z",
          attributes: {}
        }
      }
    };
    const envelope = normalize(event);
    expect(envelope.eventKind).toBe("RECEIPT");
    expect(envelope.receipt).toEqual({
      providerMessageId: "provider-message-1",
      receiptType: "READ"
    });
  });

  it("persiste antes do dispatch e marca DISPATCHED depois", async () => {
    const repository = new InMemoryIngressRepository(() => new Date(receivedAt));
    const dispatch = vi.fn(async (event: PersistedIngressEvent) => {
      expect(event.state).toBe("PERSISTED");
      assertPersistedBeforeAutomation(event);
    });
    const pipeline = createIngressPipeline({ repository, dispatch });
    const result = await pipeline.process(normalize(messageEvent()));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(result.state).toBe("DISPATCHED");
  });

  it("deduplica sem redispatch após conclusão", async () => {
    const repository = new InMemoryIngressRepository(() => new Date(receivedAt));
    const dispatch = vi.fn(async () => undefined);
    const pipeline = createIngressPipeline({ repository, dispatch });
    const envelope = normalize(messageEvent());
    await pipeline.process(envelope);
    const duplicate = await pipeline.process(envelope);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.state).toBe("DISPATCHED");
  });

  it("isola payload desconhecido em DLQ", async () => {
    const repository = new InMemoryIngressRepository(() => new Date(receivedAt));
    const dispatch = vi.fn(async () => undefined);
    const pipeline = createIngressPipeline({ repository, dispatch });
    const unknown: CanonicalIngressEnvelope = {
      ...normalize(messageEvent()),
      eventId: "unknown-1",
      idempotencyKey: "a".repeat(64),
      eventKind: "UNKNOWN"
    };
    await expect(pipeline.process(unknown)).rejects.toMatchObject({
      code: "UNKNOWN_PAYLOAD",
      retryable: false
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(repository.getDeadLetter(unknown.idempotencyKey)?.failure.code).toBe("UNKNOWN_PAYLOAD");
  });

  it("falha fechado quando organização não é resolvida", async () => {
    const repository = new InMemoryIngressRepository(() => new Date(receivedAt));
    const pipeline = createIngressPipeline({ repository, dispatch: async () => undefined });
    const unresolved = {
      ...normalize(messageEvent()),
      organizationId: "UNRESOLVED",
      idempotencyKey: "d".repeat(64)
    };
    await expect(pipeline.process(unresolved)).rejects.toMatchObject({
      code: "TENANT_UNRESOLVED"
    });
  });

  it("proíbe workflow e IA antes de PERSISTED", () => {
    const event: PersistedIngressEvent = {
      envelope: normalize(messageEvent()),
      state: "NORMALIZED",
      persistedAt: receivedAt,
      replayCount: 0,
      duplicate: false
    };
    expect(() => assertPersistedBeforeAutomation(event)).toThrowError(IngressPipelineError);
  });

  it("replay mantém a mesma idempotency key e incrementa contador", async () => {
    const repository = new InMemoryIngressRepository(() => new Date(receivedAt));
    const dispatch = vi.fn(async () => undefined);
    const pipeline = createIngressPipeline({ repository, dispatch });
    const envelope = normalize(messageEvent());
    await pipeline.process(envelope);
    await repository.moveToDlq(envelope, {
      code: "OUT_OF_ORDER",
      message: "fixture",
      retryable: true
    });
    const replayed = await pipeline.replay(envelope.idempotencyKey);
    expect(replayed.state).toBe("DISPATCHED");
    expect(replayed.replayCount).toBe(1);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("preserva eventos fora de ordem como envelopes distintos", async () => {
    const repository = new InMemoryIngressRepository(() => new Date(receivedAt));
    const base = normalize(messageEvent());
    const newer = { ...base, idempotencyKey: "b".repeat(64), sequenceNumber: 2 };
    const older = { ...base, idempotencyKey: "c".repeat(64), sequenceNumber: 1 };
    await repository.persist(newer);
    await repository.persist(older);
    expect((await repository.get(newer.idempotencyKey))?.envelope.sequenceNumber).toBe(2);
    expect((await repository.get(older.idempotencyKey))?.envelope.sequenceNumber).toBe(1);
  });
});
