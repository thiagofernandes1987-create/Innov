import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { BaileysEngineAdapter } from "../apps/messaging-gateway/src/engines/baileys/adapter";
import { createOfficialBaileysSocketFactory } from "../apps/messaging-gateway/src/engines/baileys/official-factory";
import {
  BAILEYS_PACKAGE_VERSION,
  type BaileysCanonicalIdentity,
  type BaileysEngineEvent,
  type BaileysEngineSendCommand,
  type BaileysInboundMessageLike,
  type BaileysSocketEventMap,
  type BaileysSocketPort
} from "../apps/messaging-gateway/src/engines/baileys/contracts";
import {
  canonicalIdentityFromJid,
  jidFromCanonicalIdentity,
  jidNamespace
} from "../apps/messaging-gateway/src/engines/baileys/jid";
import {
  BaileysAdapterError,
  normalizeBaileysError
} from "../apps/messaging-gateway/src/engines/baileys/errors";

const organizationId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const channelAccountId = "11111111-1111-1111-1111-111111111111";
const providerAccountId = "baileys-account-001";
const fixedNow = new Date("2026-08-04T10:00:00.000Z");

class FakeEmitter {
  private readonly listeners = new Map<string, Set<(value: unknown) => void>>();

  on<T extends keyof BaileysSocketEventMap>(
    event: T,
    listener: (value: BaileysSocketEventMap[T]) => void
  ): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as (value: unknown) => void);
    this.listeners.set(event, set);
  }

  off<T extends keyof BaileysSocketEventMap>(
    event: T,
    listener: (value: BaileysSocketEventMap[T]) => void
  ): void {
    this.listeners.get(event)?.delete(listener as (value: unknown) => void);
  }

  emit<T extends keyof BaileysSocketEventMap>(event: T, value: BaileysSocketEventMap[T]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(value);
  }
}

function fakeSocket() {
  const ev = new FakeEmitter();
  const socket: BaileysSocketPort = {
    ev,
    sendMessage: vi.fn(async (jid, _content, options) => ({
      key: { id: options?.messageId || "provider-message-001", remoteJid: jid, fromMe: true },
      messageTimestamp: Math.floor(fixedNow.getTime() / 1000)
    })),
    end: vi.fn()
  };
  return { socket, ev };
}

function identity(namespace: BaileysCanonicalIdentity["namespace"] = "WHATSAPP_PN"): BaileysCanonicalIdentity {
  const values = {
    WHATSAPP_PN: { externalId: "5512999999999@s.whatsapp.net", normalizedId: "5512999999999", phoneE164: "5512999999999" },
    WHATSAPP_LID: { externalId: "123456789@lid", normalizedId: "123456789", phoneE164: null },
    GROUP: { externalId: "120363000000@g.us", normalizedId: "120363000000", phoneE164: null },
    NEWSLETTER: { externalId: "120363999999@newsletter", normalizedId: "120363999999", phoneE164: null }
  }[namespace];
  return {
    schemaVersion: "1.0.0",
    organizationId,
    providerType: "WHATSAPP_WEB_BAILEYS",
    channelAccountId,
    providerAccountId,
    namespace,
    ...values,
    observedAt: fixedNow.toISOString()
  };
}

function command(
  messageType: BaileysEngineSendCommand["messageType"] = "TEXT",
  to = identity()
): BaileysEngineSendCommand {
  return {
    idempotencyKey: `idem-${messageType.toLowerCase()}`,
    organizationId,
    conversationId: "22222222-2222-2222-2222-222222222222",
    channelAccountId,
    providerAccountId,
    to,
    messageType,
    content: messageType === "TEXT" ? { text: "Mensagem segura" } : {}
  };
}

async function readyAdapter(options: {
  allowGroups?: boolean;
  allowNewsletters?: boolean;
  quotedMessageResolver?: (input: {
    channelAccountId: string;
    providerMessageId: string;
    remoteJid: string;
  }) => Promise<BaileysInboundMessageLike | null>;
} = {}) {
  const { socket, ev } = fakeSocket();
  const adapter = new BaileysEngineAdapter({
    organizationId,
    channelAccountId,
    providerAccountId,
    socketFactory: async () => socket,
    quotedMessageResolver: options.quotedMessageResolver,
    allowGroups: options.allowGroups,
    allowNewsletters: options.allowNewsletters,
    now: () => fixedNow,
    createEventId: () => "event-fixed"
  });
  await adapter.connect(channelAccountId);
  ev.emit("connection.update", { connection: "open" });
  await vi.waitFor(async () => {
    expect((await adapter.getSessionState(channelAccountId)).state).toBe("READY");
  });
  return { adapter, socket, ev };
}

describe("Baileys W-06 dependency boundary", () => {
  it("fixa a versão exata somente no pacote do gateway", () => {
    const gateway = JSON.parse(fs.readFileSync("apps/messaging-gateway/package.json", "utf8"));
    const root = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(BAILEYS_PACKAGE_VERSION).toBe("7.0.0-rc13");
    expect(gateway.dependencies["@whiskeysockets/baileys"]).toBe("7.0.0-rc13");
    expect(JSON.stringify(gateway)).not.toContain("latest");
    expect(root.dependencies?.["@whiskeysockets/baileys"]).toBeUndefined();
  });

  it("mantém a fábrica oficial bloqueada sem autorização explícita", async () => {
    const factory = createOfficialBaileysSocketFactory({
      authResolver: async () => ({} as never),
      authorization: () => "DENIED",
      moduleLoader: async () => ({ makeWASocket: vi.fn() as never })
    });
    await expect(factory({ channelAccountId })).rejects.toMatchObject({
      code: "EXTERNAL_SOCKET_BLOCKED"
    });
  });

  it("encapsula a criação do socket com módulo injetável sem rede", async () => {
    const { socket } = fakeSocket();
    const makeWASocket = vi.fn(() => socket as never);
    const factory = createOfficialBaileysSocketFactory({
      authResolver: async () => ({} as never),
      authorization: () => "AUTHORIZED_TEST_DOUBLE",
      moduleLoader: async () => ({ makeWASocket })
    });
    await expect(factory({ channelAccountId })).resolves.toBe(socket);
    expect(makeWASocket).toHaveBeenCalledWith(expect.objectContaining({
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      emitOwnEvents: false
    }));
  });
});

describe("Baileys W-06 identity mapping", () => {
  it.each([
    ["5512999999999@s.whatsapp.net", "WHATSAPP_PN"],
    ["123456789@lid", "WHATSAPP_LID"],
    ["120363000000@g.us", "GROUP"],
    ["120363999999@newsletter", "NEWSLETTER"]
  ] as const)("mapeia %s como %s", (jid, namespace) => {
    expect(jidNamespace(jid)).toBe(namespace);
    const canonical = canonicalIdentityFromJid({
      jid,
      organizationId,
      channelAccountId,
      providerAccountId,
      observedAt: fixedNow.toISOString()
    });
    expect(canonical.namespace).toBe(namespace);
  });

  it("remove device ID do PN observado", () => {
    const canonical = canonicalIdentityFromJid({
      jid: "5512999999999:17@s.whatsapp.net",
      organizationId,
      channelAccountId,
      observedAt: fixedNow.toISOString()
    });
    expect(canonical.normalizedId).toBe("5512999999999");
    expect(canonical.externalId).toContain(":17@");
  });

  it("bloqueia grupos e newsletters por padrão", () => {
    expect(() => jidFromCanonicalIdentity(identity("GROUP"), {
      allowGroups: false,
      allowNewsletters: false
    })).toThrowError(expect.objectContaining<Partial<BaileysAdapterError>>({ code: "GROUPS_DISABLED" }));
    expect(() => jidFromCanonicalIdentity(identity("NEWSLETTER"), {
      allowGroups: false,
      allowNewsletters: false
    })).toThrowError(expect.objectContaining<Partial<BaileysAdapterError>>({ code: "NEWSLETTERS_DISABLED" }));
  });
});

describe("BaileysEngineAdapter outbound", () => {
  it("não cria socket antes de connect e traduz texto", async () => {
    const { socket, ev } = fakeSocket();
    const factory = vi.fn(async () => socket);
    const adapter = new BaileysEngineAdapter({
      organizationId,
      channelAccountId,
      providerAccountId,
      socketFactory: factory,
      now: () => fixedNow
    });
    expect(factory).not.toHaveBeenCalled();
    await adapter.connect(channelAccountId);
    ev.emit("connection.update", { connection: "open" });
    await vi.waitFor(async () => expect((await adapter.getSessionState(channelAccountId)).state).toBe("READY"));
    const result = await adapter.send(command());
    expect(socket.sendMessage).toHaveBeenCalledWith(
      "5512999999999@s.whatsapp.net",
      { text: "Mensagem segura" },
      { messageId: "idem-text" }
    );
    expect(result).toMatchObject({
      providerType: "WHATSAPP_WEB_BAILEYS",
      providerMessageId: "idem-text"
    });
  });

  it.each([
    ["DOCUMENT", "document", "application/pdf"],
    ["IMAGE", "image", "image/jpeg"],
    ["AUDIO", "audio", "audio/ogg"],
    ["VIDEO", "video", "video/mp4"],
    ["STICKER", "sticker", "image/webp"]
  ] as const)("traduz mídia %s por URL assinada", async (messageType, nativeKey, mime) => {
    const { adapter, socket } = await readyAdapter();
    const outbound = command(messageType);
    outbound.content = {
      media: [{
        schemaVersion: "1.0.0",
        mediaType: messageType,
        referenceType: "SIGNED_URL",
        reference: "https://files.example/signed",
        declaredMimeType: mime,
        fileName: messageType === "DOCUMENT" ? "proposta.pdf" : null,
        caption: "Arquivo aprovado"
      }]
    };
    await adapter.send(outbound);
    expect(socket.sendMessage).toHaveBeenCalledWith(
      "5512999999999@s.whatsapp.net",
      expect.objectContaining({ [nativeKey]: { url: "https://files.example/signed" } }),
      expect.any(Object)
    );
  });

  it("rejeita referência de mídia não assinada", async () => {
    const { adapter } = await readyAdapter();
    const outbound = command("IMAGE");
    outbound.content = {
      media: [{
        schemaVersion: "1.0.0",
        mediaType: "IMAGE",
        referenceType: "PRIVATE_STORAGE",
        reference: "bucket/private/image.jpg"
      }]
    };
    await expect(adapter.send(outbound)).rejects.toMatchObject({ code: "UNSAFE_MEDIA_REFERENCE" });
  });

  it("traduz localização e reação", async () => {
    const { adapter, socket } = await readyAdapter();
    const location = command("LOCATION");
    location.content = { location: { latitude: -23.18, longitude: -45.88, name: "Obra" } };
    await adapter.send(location);
    const reaction = command("REACTION");
    reaction.content = { reaction: { targetMessageId: "wamid-target", emoji: "✅" } };
    await adapter.send(reaction);
    expect(socket.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      { react: { text: "✅", key: { remoteJid: "5512999999999@s.whatsapp.net", id: "wamid-target" } } },
      expect.any(Object)
    );
  });

  it("resolve quoted message antes de enviar reply", async () => {
    const quoted: BaileysInboundMessageLike = {
      key: { id: "quoted-001", remoteJid: "5512999999999@s.whatsapp.net" },
      message: { conversation: "Original" }
    };
    const resolver = vi.fn(async () => quoted);
    const { adapter, socket } = await readyAdapter({ quotedMessageResolver: resolver });
    const outbound = command();
    outbound.replyToProviderMessageId = "quoted-001";
    await adapter.send(outbound);
    expect(resolver).toHaveBeenCalled();
    expect(socket.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      { text: "Mensagem segura" },
      expect.objectContaining({ quoted })
    );
  });

  it("habilita grupo somente quando capability é autorizada", async () => {
    const blocked = await readyAdapter();
    await expect(blocked.adapter.send(command("TEXT", identity("GROUP"))))
      .rejects.toMatchObject({ code: "GROUPS_DISABLED" });

    const allowed = await readyAdapter({ allowGroups: true });
    await allowed.adapter.send(command("TEXT", identity("GROUP")));
    expect(allowed.socket.sendMessage).toHaveBeenCalledWith(
      "120363000000@g.us",
      { text: "Mensagem segura" },
      expect.any(Object)
    );
    expect(allowed.adapter.capabilities.capabilities.GROUP_WRITE.support).toBe("SUPPORTED");
  });
});

describe("BaileysEngineAdapter inbound and lifecycle", () => {
  it("traduz connection.update sem expor o QR", async () => {
    const { socket, ev } = fakeSocket();
    const engine = new BaileysEngineAdapter({
      organizationId,
      channelAccountId,
      socketFactory: async () => socket,
      now: () => fixedNow,
      createEventId: () => "event-fixed"
    });
    const events: BaileysEngineEvent[] = [];
    engine.subscribe(event => {
      events.push(event);
    });
    await engine.connect(channelAccountId);
    ev.emit("connection.update", { qr: "SECRET-QR-VALUE" });
    await vi.waitFor(() => expect(events.some(event =>
      event.kind === "SESSION_STATE_CHANGED" && event.snapshot.state === "PAIRING_REQUIRED"
    )).toBe(true));
    expect(JSON.stringify(events)).not.toContain("SECRET-QR-VALUE");
    expect(JSON.stringify(events)).toContain("qrPersisted");
  });

  it("normaliza mensagem inbound e preserva somente metadata sanitizada", async () => {
    const { adapter, ev } = await readyAdapter();
    const events: BaileysEngineEvent[] = [];
    adapter.subscribe(event => {
      events.push(event);
    });
    ev.emit("messages.upsert", {
      type: "notify",
      requestId: "request-secret",
      messages: [{
        key: {
          id: "inbound-001",
          remoteJid: "5512999999999@s.whatsapp.net",
          participant: "5512888888888:4@s.whatsapp.net",
          fromMe: false
        },
        pushName: "Ana",
        messageTimestamp: Math.floor(fixedNow.getTime() / 1000),
        message: { extendedTextMessage: { text: "Olá", contextInfo: { stanzaId: "quoted-001" } } }
      }]
    });
    await vi.waitFor(() => expect(events.some(event => event.kind === "MESSAGE_RECEIVED")).toBe(true));
    const received = events.find(event => event.kind === "MESSAGE_RECEIVED");
    expect(received).toMatchObject({
      kind: "MESSAGE_RECEIVED",
      providerMessageId: "inbound-001",
      messageType: "TEXT",
      content: { text: "Olá" },
      sender: { namespace: "WHATSAPP_PN", normalizedId: "5512888888888" }
    });
    const serializedMetadata = JSON.stringify(
      received?.kind === "MESSAGE_RECEIVED" ? received.providerMetadata : null
    );
    expect(serializedMetadata).not.toContain("5512999999999");
    expect(serializedMetadata).not.toContain("5512888888888");
    expect(serializedMetadata).not.toContain("request-secret");
    expect(serializedMetadata).toContain("WHATSAPP_PN");
  });

  it("normaliza mídia inbound como referência do provider sem baixar conteúdo", async () => {
    const { adapter, ev } = await readyAdapter();
    const events: BaileysEngineEvent[] = [];
    adapter.subscribe(event => {
      events.push(event);
    });
    ev.emit("messages.upsert", {
      type: "notify",
      messages: [{
        key: { id: "media-001", remoteJid: "5512999999999@s.whatsapp.net", fromMe: false },
        messageTimestamp: Math.floor(fixedNow.getTime() / 1000),
        message: {
          imageMessage: {
            directPath: "/v/t62/private-path",
            mimetype: "image/jpeg",
            fileLength: 2048,
            caption: "Foto da obra"
          }
        }
      }]
    });
    await vi.waitFor(() => expect(events.some(event => event.kind === "MESSAGE_RECEIVED")).toBe(true));
    const received = events.find(event => event.kind === "MESSAGE_RECEIVED");
    expect(received?.kind === "MESSAGE_RECEIVED" ? received.content.media?.[0] : null).toMatchObject({
      mediaType: "IMAGE",
      referenceType: "PROVIDER",
      reference: "/v/t62/private-path",
      sizeBytes: 2048
    });
  });

  it("normaliza receipts e encerra o socket graciosamente", async () => {
    const { adapter, socket, ev } = await readyAdapter();
    const events: BaileysEngineEvent[] = [];
    adapter.subscribe(event => {
      events.push(event);
    });
    ev.emit("message-receipt.update", [{
      key: { id: "outbound-001", remoteJid: "5512999999999@s.whatsapp.net" },
      receipt: {
        userJid: "5512999999999@s.whatsapp.net",
        readTimestamp: Math.floor(fixedNow.getTime() / 1000)
      }
    }]);
    await vi.waitFor(() => expect(events.some(event => event.kind === "RECEIPT_RECEIVED")).toBe(true));
    expect(events.find(event => event.kind === "RECEIPT_RECEIVED")).toMatchObject({
      kind: "RECEIPT_RECEIVED",
      receipt: { providerMessageId: "outbound-001", receiptType: "READ" }
    });
    await adapter.disconnect(channelAccountId, "TEST_END");
    expect(socket.end).toHaveBeenCalled();
    expect((await adapter.getSessionState(channelAccountId)).state).toBe("DISCONNECTED");
  });
});

describe("Baileys W-06 error normalization", () => {
  it("classifica logout e forbidden como ação humana não retryable", () => {
    expect(normalizeBaileysError({ output: { statusCode: 401 } })).toMatchObject({
      code: "PROVIDER_REJECTED",
      retryable: false,
      providerStatusCode: 401
    });
  });

  it("classifica timeout e indisponibilidade como retryable", () => {
    expect(normalizeBaileysError({ statusCode: 503 })).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
      providerStatusCode: 503
    });
  });
});
