import { describe, expect, it } from "vitest";
import {
  IMPLEMENTED_CHANNEL_PROVIDER_TYPES,
  MESSAGING_CONTRACT_VERSION,
  PLANNED_CHANNEL_PROVIDER_TYPES,
  MessagingDomainError,
  assertCanonicalIdentity,
  assertCanonicalMessage,
  canonicalIdentityKey,
  createCanonicalPhoneIdentity
} from "@/lib/messaging/domain";
import {
  canonicalStatusToLegacyWhatsApp,
  legacyWhatsAppAccountToCanonical,
  legacyWhatsAppContactToCanonicalIdentity,
  legacyWhatsAppConversationToCanonical,
  legacyWhatsAppMessageToCanonical,
  legacyWhatsAppStatusEventToCanonical,
  type LegacyWhatsAppAccount,
  type LegacyWhatsAppContact,
  type LegacyWhatsAppConversation,
  type LegacyWhatsAppMessage
} from "@/lib/messaging/whatsapp-compatibility";

const account: LegacyWhatsAppAccount = {
  id: "11111111-1111-1111-1111-111111111111",
  organization_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  waba_id: "waba-001",
  phone_number_id: "meta-phone-001",
  display_phone_number: "+55 12 3333-4444",
  business_name: "Innovar",
  active: true,
  is_default: true
};

const contact: LegacyWhatsAppContact = {
  id: "22222222-2222-2222-2222-222222222222",
  organization_id: account.organization_id,
  account_id: account.id,
  client_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  wa_id: "5512999999999",
  phone_e164: "5512999999999",
  display_name: "Cliente de teste",
  created_at: "2026-08-03T20:00:00.000Z",
  updated_at: "2026-08-03T20:05:00.000Z"
};

const conversation: LegacyWhatsAppConversation = {
  id: "33333333-3333-3333-3333-333333333333",
  organization_id: account.organization_id,
  account_id: account.id,
  contact_id: contact.id,
  client_id: contact.client_id,
  project_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  contract_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  opportunity_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  sac_ticket_id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  status: "OPEN",
  assigned_to: null,
  last_customer_message_at: "2026-08-03T20:10:00.000Z",
  last_message_at: "2026-08-03T20:10:00.000Z",
  unread_count: 1,
  created_at: "2026-08-03T20:00:00.000Z",
  updated_at: "2026-08-03T20:10:00.000Z"
};

const inboundMessage: LegacyWhatsAppMessage = {
  id: "44444444-4444-4444-4444-444444444444",
  organization_id: account.organization_id,
  conversation_id: conversation.id,
  direction: "INBOUND",
  message_type: "TEXT",
  status: "RECEIVED",
  provider_message_id: "wamid.inbound",
  body: "Preciso do andamento da obra.",
  source_binding_id: null,
  source_snapshot: {},
  provider_metadata: { providerStatus: "received" },
  idempotency_key: "meta:wamid.inbound",
  occurred_at: "2026-08-03T20:10:00.000Z",
  created_at: "2026-08-03T20:10:01.000Z"
};

describe("Messaging canonical domain", () => {
  it("versiona o contrato e distingue providers implementados, planejados e reservados", () => {
    expect(MESSAGING_CONTRACT_VERSION).toBe("1.0.0");
    expect(IMPLEMENTED_CHANNEL_PROVIDER_TYPES).toEqual(["META_CLOUD"]);
    expect(PLANNED_CHANNEL_PROVIDER_TYPES).toContain("WHATSAPP_WEB_BAILEYS");
    expect(PLANNED_CHANNEL_PROVIDER_TYPES).toContain("WEB_CHAT");
  });

  it("separa conta interna do id externo do provider", () => {
    const canonical = legacyWhatsAppAccountToCanonical(account);
    expect(canonical.id).toBe(account.id);
    expect(canonical.providerAccountId).toBe(account.phone_number_id);
    expect(canonical.providerMetadata.attributes).toMatchObject({
      legacyAccountId: account.id,
      wabaId: account.waba_id
    });
  });

  it("normaliza identidade sem reduzir a pessoa ao telefone", () => {
    const identity = legacyWhatsAppContactToCanonicalIdentity(
      contact,
      contact.updated_at ?? undefined,
      account.phone_number_id
    );
    expect(identity).toMatchObject({
      id: contact.id,
      providerType: "META_CLOUD",
      channelAccountId: account.id,
      providerAccountId: account.phone_number_id,
      namespace: "WHATSAPP_PN",
      externalId: contact.wa_id,
      normalizedId: contact.phone_e164,
      phoneE164: contact.phone_e164
    });
    expect(assertCanonicalIdentity(identity)).toBe(identity);
  });

  it("usa namespace e conta na chave para impedir colisões de identidade", () => {
    const base = createCanonicalPhoneIdentity({
      organizationId: account.organization_id,
      providerType: "META_CLOUD",
      channelAccountId: account.id,
      providerAccountId: account.phone_number_id,
      externalId: contact.wa_id,
      phone: contact.phone_e164,
      observedAt: "2026-08-03T20:00:00.000Z"
    });
    const anotherAccount = { ...base, channelAccountId: "outro-account-id" };
    const lid = {
      ...base,
      namespace: "WHATSAPP_LID" as const,
      externalId: "lid-001",
      normalizedId: "lid-001",
      phoneE164: null
    };
    expect(canonicalIdentityKey(base)).not.toBe(canonicalIdentityKey(anotherAccount));
    expect(canonicalIdentityKey(base)).not.toBe(canonicalIdentityKey(lid));
  });

  it("projeta conversa atual sem perder vínculos de negócio", () => {
    const canonical = legacyWhatsAppConversationToCanonical({
      account,
      contact,
      conversation
    });
    expect(canonical.status).toBe("OPEN");
    expect(canonical.participants).toHaveLength(2);
    expect(canonical.channelAccounts[0]).toEqual({
      providerType: "META_CLOUD",
      channelAccountId: account.id,
      providerAccountId: account.phone_number_id
    });
    expect(canonical.linkedEntities).toEqual({
      clientId: conversation.client_id,
      projectId: conversation.project_id,
      contractId: conversation.contract_id,
      opportunityId: conversation.opportunity_id,
      sacTicketId: conversation.sac_ticket_id
    });
  });

  it("projeta inbound com contato como remetente e conta como destinatária", () => {
    const canonical = legacyWhatsAppMessageToCanonical({
      account,
      contact,
      message: inboundMessage
    });
    expect(canonical.providerType).toBe("META_CLOUD");
    expect(canonical.channelAccountId).toBe(account.id);
    expect(canonical.providerAccountId).toBe(account.phone_number_id);
    expect(canonical.sender.id).toBe(contact.id);
    expect(canonical.sender.isSelf).not.toBe(true);
    expect(canonical.recipients[0].isSelf).toBe(true);
    expect(canonical.content.text).toBe(inboundMessage.body);
    expect(canonical.providerMetadata.attributes).toMatchObject({
      providerStatus: "received",
      legacyMessageType: "TEXT",
      legacyTable: "whatsapp_messages"
    });
  });

  it("projeta outbound preservando fonte canônica e invertendo participantes", () => {
    const outbound: LegacyWhatsAppMessage = {
      ...inboundMessage,
      id: "55555555-5555-5555-5555-555555555555",
      direction: "OUTBOUND",
      status: "SENT",
      provider_message_id: "wamid.outbound",
      body: "A medição foi atualizada.",
      source_binding_id: "66666666-6666-6666-6666-666666666666",
      source_snapshot: {
        sourceType: "PROJECT_DOCUMENT_VERSION",
        sourceId: "77777777-7777-7777-7777-777777777777",
        sourceField: "DOCUMENT",
        sourceVersion: 3,
        sourceName: "Medição 03",
        sha256: "abc123",
        resolvedAt: "2026-08-03T20:15:00.000Z"
      }
    };
    const canonical = legacyWhatsAppMessageToCanonical({ account, contact, message: outbound });
    expect(canonical.sender.isSelf).toBe(true);
    expect(canonical.recipients[0].id).toBe(contact.id);
    expect(canonical.sourceBindingId).toBe(outbound.source_binding_id);
    expect(canonical.sourceSnapshot).toMatchObject({
      sourceType: "PROJECT_DOCUMENT_VERSION",
      sourceVersion: 3,
      sha256: "abc123"
    });
  });

  it("recusa mensagem de texto canônica sem corpo", () => {
    const canonical = legacyWhatsAppMessageToCanonical({
      account,
      contact,
      message: inboundMessage
    });
    expect(() =>
      assertCanonicalMessage({ ...canonical, content: { text: "" } })
    ).toThrow(MessagingDomainError);
  });

  it("não projeta silenciosamente status canônico incompatível no schema legado", () => {
    expect(canonicalStatusToLegacyWhatsApp("DELIVERED")).toBe("DELIVERED");
    expect(() => canonicalStatusToLegacyWhatsApp("CANCELLED")).toThrow(
      "não possui projeção segura"
    );
    expect(() => canonicalStatusToLegacyWhatsApp("ACCEPTED")).toThrow(
      MessagingDomainError
    );
  });

  it("normaliza receipt Meta mantendo timestamp e erro", () => {
    const receipt = legacyWhatsAppStatusEventToCanonical({
      account,
      providerMessageId: "wamid.outbound",
      event: {
        id: "88888888-8888-8888-8888-888888888888",
        organization_id: account.organization_id,
        message_id: "55555555-5555-5555-5555-555555555555",
        status: "FAILED",
        provider_timestamp: "2026-08-03T20:20:00.000Z",
        error_code: "131000",
        error_title: "Provider failure",
        metadata: { source: "webhook" },
        created_at: "2026-08-03T20:20:01.000Z"
      }
    });
    expect(receipt).toMatchObject({
      providerType: "META_CLOUD",
      channelAccountId: account.id,
      providerAccountId: account.phone_number_id,
      receiptType: "FAILED",
      occurredAt: "2026-08-03T20:20:00.000Z",
      error: { code: "131000", title: "Provider failure" }
    });
  });
});
