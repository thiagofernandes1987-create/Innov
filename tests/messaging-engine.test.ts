import { describe, expect, it, vi } from "vitest";
import {
  META_CLOUD_CAPABILITY_MATRIX,
  UnsupportedCapabilityError,
  applyCapabilityOverrides,
  deriveMessagingUiCapabilities,
  hasEngineCapability,
  requireEngineCapability
} from "@/lib/messaging/capabilities";
import {
  MESSAGING_CONTRACT_VERSION,
  createCanonicalPhoneIdentity,
  type CanonicalIdentity,
  type ChannelProviderType
} from "@/lib/messaging/domain";
import {
  MessagingEngineError,
  type EngineSendCommand,
  type MessagingEngine
} from "@/lib/messaging/engine";
import { MetaCloudMessagingEngine } from "@/lib/messaging/engines/meta-cloud";
import { MockMessagingEngine } from "@/lib/messaging/engines/mock";
import {
  parseOrganizationProviderOverrides,
  resolveProviderPolicy
} from "@/lib/messaging/feature-flags";

const organizationId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const channelAccountId = "11111111-1111-1111-1111-111111111111";

function identity(providerType: ChannelProviderType): CanonicalIdentity {
  if (providerType === "META_CLOUD") {
    return createCanonicalPhoneIdentity({
      organizationId,
      providerType,
      channelAccountId,
      providerAccountId: "meta-phone-001",
      externalId: "5512999999999",
      phone: "5512999999999",
      observedAt: new Date(0).toISOString()
    });
  }
  return {
    schemaVersion: MESSAGING_CONTRACT_VERSION,
    organizationId,
    providerType,
    channelAccountId,
    providerAccountId: "provider-account-001",
    namespace: "CUSTOM",
    externalId: "contact-001",
    normalizedId: "contact-001",
    observedAt: new Date(0).toISOString()
  };
}

function textCommand(providerType: ChannelProviderType): EngineSendCommand {
  return {
    idempotencyKey: "idem-001",
    organizationId,
    conversationId: "22222222-2222-2222-2222-222222222222",
    channelAccountId,
    providerAccountId:
      providerType === "META_CLOUD" ? "meta-phone-001" : "provider-account-001",
    to: identity(providerType),
    messageType: "TEXT",
    content: { text: "Mensagem de contrato" }
  };
}

function metaTransport() {
  return {
    sendText: vi.fn(async () => "wamid.text"),
    sendDocument: vi.fn(async () => "wamid.document"),
    sendTemplate: vi.fn(async () => "wamid.template")
  };
}

function engineCases(): Array<{
  name: string;
  providerType: ChannelProviderType;
  build: () => MessagingEngine;
}> {
  return [
    {
      name: "MetaCloudMessagingEngine",
      providerType: "META_CLOUD",
      build: () => new MetaCloudMessagingEngine(metaTransport())
    },
    {
      name: "MockMessagingEngine",
      providerType: "CUSTOM",
      build: () => new MockMessagingEngine()
    }
  ];
}

describe.each(engineCases())("contract test: $name", testCase => {
  it("retorna provider e identificador ao aceitar texto", async () => {
    const result = await testCase.build().send(textCommand(testCase.providerType));
    expect(result.providerType).toBe(testCase.providerType);
    expect(result.providerMessageId).toBeTruthy();
    expect(result.providerMetadata.providerType).toBe(testCase.providerType);
  });

  it("rejeita identidade pertencente a outro provider", async () => {
    const engine = testCase.build();
    const command = textCommand(testCase.providerType);
    command.to = identity(
      testCase.providerType === "META_CLOUD" ? "CUSTOM" : "META_CLOUD"
    );
    await expect(engine.send(command)).rejects.toMatchObject({
      code: "PROVIDER_MISMATCH"
    });
  });
});

describe("capability matrix", () => {
  it("declara somente capacidades realmente encapsuladas pela Meta", () => {
    expect(hasEngineCapability(META_CLOUD_CAPABILITY_MATRIX, "MESSAGE_SEND_TEXT")).toBe(true);
    expect(hasEngineCapability(META_CLOUD_CAPABILITY_MATRIX, "MESSAGE_SEND_TEMPLATE")).toBe(true);
    expect(hasEngineCapability(META_CLOUD_CAPABILITY_MATRIX, "MESSAGE_SEND_DOCUMENT")).toBe(true);
    expect(hasEngineCapability(META_CLOUD_CAPABILITY_MATRIX, "MESSAGE_SEND_IMAGE")).toBe(false);
    expect(hasEngineCapability(META_CLOUD_CAPABILITY_MATRIX, "GROUP_WRITE")).toBe(false);
    expect(hasEngineCapability(META_CLOUD_CAPABILITY_MATRIX, "MESSAGE_EDIT")).toBe(false);
  });

  it("falha explicitamente quando capability não existe", () => {
    expect(() =>
      requireEngineCapability(META_CLOUD_CAPABILITY_MATRIX, "MESSAGE_SEND_IMAGE")
    ).toThrow(UnsupportedCapabilityError);
  });

  it("aplica bloqueio organizacional e esconde a ação na UI", () => {
    const matrix = applyCapabilityOverrides(META_CLOUD_CAPABILITY_MATRIX, [
      "MESSAGE_SEND_TEXT",
      "CONVERSATION_START"
    ]);
    const ui = deriveMessagingUiCapabilities(matrix, true);
    expect(ui.canSendText).toBe(false);
    expect(ui.canStartConversation).toBe(false);
    expect(ui.canSendTemplate).toBe(true);
    expect(ui.canSendAny).toBe(true);
  });

  it("esconde todas as ações quando o provider está desabilitado", () => {
    const ui = deriveMessagingUiCapabilities(META_CLOUD_CAPABILITY_MATRIX, false);
    expect(ui.enabled).toBe(false);
    expect(ui.canSendAny).toBe(false);
    expect(ui.canStartConversation).toBe(false);
  });
});

describe("organization provider flags", () => {
  it("mantém Meta ativa e Baileys indisponível por padrão", () => {
    expect(
      resolveProviderPolicy({ organizationId, providerType: "META_CLOUD" }).enabled
    ).toBe(true);
    const baileys = resolveProviderPolicy({
      organizationId,
      providerType: "WHATSAPP_WEB_BAILEYS"
    });
    expect(baileys.requestedEnabled).toBe(false);
    expect(baileys.runtimeAvailable).toBe(false);
    expect(baileys.enabled).toBe(false);
  });

  it("não permite habilitar Baileys sem runtime registrado", () => {
    const rawOverrides = JSON.stringify({
      [organizationId]: {
        WHATSAPP_WEB_BAILEYS: { enabled: true }
      }
    });
    const policy = resolveProviderPolicy({
      organizationId,
      providerType: "WHATSAPP_WEB_BAILEYS",
      rawOverrides
    });
    expect(policy.requestedEnabled).toBe(true);
    expect(policy.runtimeAvailable).toBe(false);
    expect(policy.enabled).toBe(false);
  });

  it("permite desabilitar capability por organização", () => {
    const rawOverrides = JSON.stringify({
      [organizationId]: {
        META_CLOUD: {
          enabled: true,
          disabledCapabilities: ["MESSAGE_SEND_TEXT", "INVALID"]
        }
      }
    });
    const policy = resolveProviderPolicy({
      organizationId,
      providerType: "META_CLOUD",
      rawOverrides
    });
    expect(policy.enabled).toBe(true);
    expect(policy.disabledCapabilities).toEqual(["MESSAGE_SEND_TEXT"]);
  });

  it("falha fechada com JSON inválido", () => {
    const parsed = parseOrganizationProviderOverrides("{");
    expect(parsed.valid).toBe(false);
    expect(
      resolveProviderPolicy({
        organizationId,
        providerType: "META_CLOUD",
        rawOverrides: "{"
      }).enabled
    ).toBe(false);
  });
});

describe("MetaCloudMessagingEngine", () => {
  it("traduz texto para o transporte atual", async () => {
    const transport = metaTransport();
    const engine = new MetaCloudMessagingEngine(transport);
    await engine.send(textCommand("META_CLOUD"));
    expect(transport.sendText).toHaveBeenCalledWith({
      phoneNumberId: "meta-phone-001",
      to: "5512999999999",
      body: "Mensagem de contrato"
    });
  });

  it("traduz template sem expor payload Graph no domínio", async () => {
    const transport = metaTransport();
    const engine = new MetaCloudMessagingEngine(transport);
    const command = textCommand("META_CLOUD");
    command.messageType = "TEMPLATE";
    command.content = {
      template: {
        name: "proposta_aprovada_v1",
        languageCode: "pt_BR",
        parameters: ["Ana", "OB-0026"]
      }
    };
    const result = await engine.send(command);
    expect(result.providerMessageId).toBe("wamid.template");
    expect(transport.sendTemplate).toHaveBeenCalledWith({
      phoneNumberId: "meta-phone-001",
      to: "5512999999999",
      name: "proposta_aprovada_v1",
      languageCode: "pt_BR",
      parameters: ["Ana", "OB-0026"]
    });
  });

  it("aceita documento somente por URL assinada", async () => {
    const transport = metaTransport();
    const engine = new MetaCloudMessagingEngine(transport);
    const command = textCommand("META_CLOUD");
    command.messageType = "DOCUMENT";
    command.content = {
      media: [
        {
          schemaVersion: MESSAGING_CONTRACT_VERSION,
          mediaType: "DOCUMENT",
          referenceType: "SIGNED_URL",
          reference: "https://files.example/signed",
          fileName: "proposta.pdf",
          caption: "Proposta aprovada"
        }
      ]
    };
    await engine.send(command);
    expect(transport.sendDocument).toHaveBeenCalledWith({
      phoneNumberId: "meta-phone-001",
      to: "5512999999999",
      link: "https://files.example/signed",
      fileName: "proposta.pdf",
      caption: "Proposta aprovada"
    });
  });

  it("rejeita capability ainda não encapsulada", async () => {
    const engine = new MetaCloudMessagingEngine(metaTransport());
    const command = textCommand("META_CLOUD");
    command.messageType = "IMAGE";
    command.content = {};
    await expect(engine.send(command)).rejects.toBeInstanceOf(
      UnsupportedCapabilityError
    );
  });
});

describe("MockMessagingEngine", () => {
  it("implementa sessão, pairing e event source determinísticos", async () => {
    const engine = new MockMessagingEngine();
    const received: string[] = [];
    const unsubscribe = engine.subscribe(event => received.push(event.kind));

    const connected = await engine.connect(channelAccountId);
    expect(connected.state).toBe("READY");
    expect((await engine.getSessionState(channelAccountId)).state).toBe("READY");
    expect((await engine.requestPairing(channelAccountId)).type).toBe("PAIRING_CODE");
    expect(received).toContain("SESSION_STATE_CHANGED");

    unsubscribe();
    await engine.disconnect(channelAccountId);
    expect(received).toHaveLength(1);
  });

  it("permite simular indisponibilidade retryable", async () => {
    const engine = new MockMessagingEngine();
    engine.queueFailure(
      new MessagingEngineError("PROVIDER_UNAVAILABLE", "offline", true)
    );
    await expect(engine.send(textCommand("CUSTOM"))).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true
    });
  });
});
