import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import makeWASocket, {
  Browsers,
  jidNormalizedUser,
  type WASocket
} from "@whiskeysockets/baileys";
import {
  TestOnlyInMemoryKeyEnvelopeProvider,
  TransactionalMemorySessionCredentialRepository,
  createEncryptedSessionCredentialStore,
  type SessionSecretScope
} from "../../session-store/index.js";
import { BaileysEngineAdapter } from "./adapter.js";
import {
  BAILEYS_PROVIDER_TYPE,
  type BaileysConnectionUpdateLike,
  type BaileysEngineEvent,
  type BaileysEventEmitterPort,
  type BaileysInboundMessageLike,
  type BaileysReceiptLike,
  type BaileysSocketEventMap,
  type BaileysSocketPort
} from "./contracts.js";
import { canonicalIdentityFromJid } from "./jid.js";
import { createStoredBaileysAuthenticationState } from "./stored-auth-state.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const CHANNEL_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const EVIDENCE_PATH = process.env.BAILEYS_LAB_EVIDENCE_PATH?.trim()
  || "baileys-live-lab-evidence.json";
const TIMEOUT_MS = boundedInteger(process.env.BAILEYS_LAB_TIMEOUT_MS, 60_000, 900_000, 480_000);
const QR_MODULE_PATH = process.env.BAILEYS_LAB_QR_MODULE?.trim() || "";

const scope: SessionSecretScope = {
  organizationId: ORGANIZATION_ID,
  sessionId: SESSION_ID,
  channelAccountId: CHANNEL_ACCOUNT_ID,
  providerType: BAILEYS_PROVIDER_TYPE
};

const evidence = {
  schemaVersion: "1.1.0",
  mode: "BAILEYS_LIVE_LAB",
  startedAt: new Date().toISOString(),
  completedAt: null as string | null,
  packageVersion: "7.0.0-rc13",
  qrObserved: false,
  qrRenderedInRestrictedLogs: false,
  reconnectAttempts: 0,
  socketOpened: false,
  credentialsPersistedEncrypted: false,
  canonicalSendAccepted: false,
  rawOwnMessageObserved: false,
  canonicalInboundObserved: false,
  receiptObserved: false,
  providerMessageIdHash: null as string | null,
  selfIdentityHash: null as string | null,
  sessionStates: [] as string[],
  engineErrorCodes: [] as string[],
  timedOut: false,
  disconnectedCleanly: false,
  outcome: "PENDING" as "PENDING" | "PASS_OUTBOUND" | "PASS_FULL" | "FAIL",
  productionNumberUsed: false,
  metaCloudUsed: false,
  autonomousAiUsed: false,
  rawQrStringPersisted: false,
  rawCredentialsPersisted: false
};

function boundedInteger(
  raw: string | undefined,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const value = Number(raw ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) return fallback;
  return value;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function messageText(event: Extract<BaileysEngineEvent, { kind: "MESSAGE_RECEIVED" }>): string {
  return event.content.text?.trim() || event.content.caption?.trim() || "";
}

function rawMessageText(message: BaileysInboundMessageLike): string {
  return message.message?.conversation?.trim()
    || message.message?.extendedTextMessage?.text?.trim()
    || "";
}

async function renderQr(qrValue: string): Promise<void> {
  evidence.qrObserved = true;
  if (!QR_MODULE_PATH) throw new Error("BAILEYS_QR_RENDERER_MISSING");
  const imported = await import(pathToFileURL(QR_MODULE_PATH).href);
  const renderer = (imported.default ?? imported) as {
    generate: (
      value: string,
      options: { small: boolean },
      callback: (output: string) => void
    ) => void;
  };
  await new Promise<void>((resolve, reject) => {
    try {
      renderer.generate(qrValue, { small: true }, output => {
        console.log("\n===== QR BAILEYS DE USO ÚNICO — NÚMERO DEDICADO =====");
        console.log(output);
        console.log("===== FIM DO QR — ESCANEIE EM APARELHOS CONECTADOS =====\n");
        evidence.qrRenderedInRestrictedLogs = true;
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function persistEvidence(): Promise<void> {
  evidence.completedAt = new Date().toISOString();
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

class LiveLabSocketPort implements BaileysSocketPort {
  private currentSocket: WASocket | null = null;
  private stopped = false;
  private opened = false;
  private attempts = 0;
  private readonly listeners = new Map<string, Set<(value: unknown) => void>>();
  private readonly bufferedConnectionUpdates: BaileysConnectionUpdateLike[] = [];

  readonly ev: BaileysEventEmitterPort = {
    on: <T extends keyof BaileysSocketEventMap>(
      event: T,
      listener: (value: BaileysSocketEventMap[T]) => void
    ): void => {
      const listeners = this.listeners.get(event) ?? new Set<(value: unknown) => void>();
      listeners.add(listener as (value: unknown) => void);
      this.listeners.set(event, listeners);
      if (event === "connection.update" && this.bufferedConnectionUpdates.length) {
        const buffered = this.bufferedConnectionUpdates.splice(0);
        queueMicrotask(() => {
          for (const update of buffered) listener(update as BaileysSocketEventMap[T]);
        });
      }
    },
    off: <T extends keyof BaileysSocketEventMap>(
      event: T,
      listener: (value: BaileysSocketEventMap[T]) => void
    ): void => {
      this.listeners.get(event)?.delete(listener as (value: unknown) => void);
    }
  };

  constructor(
    private readonly authState: Awaited<ReturnType<typeof createStoredBaileysAuthenticationState>>,
    private readonly onRawOwnMessage: (message: BaileysInboundMessageLike) => void
  ) {
    this.openSocket();
  }

  currentUserId(): string {
    return this.currentSocket?.user?.id ?? "";
  }

  async sendMessage(
    jid: string,
    content: Parameters<BaileysSocketPort["sendMessage"]>[1],
    options?: Parameters<BaileysSocketPort["sendMessage"]>[2]
  ): ReturnType<BaileysSocketPort["sendMessage"]> {
    if (!this.currentSocket || !this.opened) throw new Error("BAILEYS_LAB_SOCKET_NOT_OPEN");
    return await this.currentSocket.sendMessage(
      jid,
      content as never,
      options as never
    ) as unknown as Awaited<ReturnType<BaileysSocketPort["sendMessage"]>>;
  }

  end(error?: Error): void {
    this.stopped = true;
    this.currentSocket?.end(error);
    this.currentSocket = null;
  }

  private emit<T extends keyof BaileysSocketEventMap>(
    event: T,
    value: BaileysSocketEventMap[T]
  ): void {
    const listeners = this.listeners.get(event);
    if (!listeners?.size && event === "connection.update") {
      this.bufferedConnectionUpdates.push(value as BaileysConnectionUpdateLike);
      if (this.bufferedConnectionUpdates.length > 8) this.bufferedConnectionUpdates.shift();
      return;
    }
    for (const listener of listeners ?? []) listener(value);
  }

  private openSocket(): void {
    if (this.stopped) return;
    this.attempts += 1;
    evidence.reconnectAttempts = this.attempts - 1;
    const socket = makeWASocket({
      auth: this.authState.state,
      browser: Browsers.ubuntu("Innov Baileys Lab"),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      emitOwnEvents: true,
      connectTimeoutMs: 60_000,
      qrTimeout: 60_000,
      defaultQueryTimeoutMs: 60_000
    });
    this.currentSocket = socket;

    socket.ev.on("creds.update", async () => {
      await this.authState.saveCreds({ actorId: "baileys-live-lab" });
      evidence.credentialsPersistedEncrypted = true;
    });

    socket.ev.on("connection.update", update => {
      if (update.qr) {
        void renderQr(update.qr).catch(error => {
          evidence.engineErrorCodes.push(
            error instanceof Error ? error.message : "BAILEYS_QR_RENDER_FAILED"
          );
        });
      }
      if (update.connection === "open") this.opened = true;
      if (update.connection === "close") {
        this.opened = false;
        if (!this.stopped && !evidence.socketOpened && this.attempts < 12) {
          setTimeout(() => this.openSocket(), 1_500);
        }
      }
      this.emit("connection.update", update as BaileysConnectionUpdateLike);
    });

    socket.ev.on("messages.upsert", update => {
      const normalized = update as unknown as BaileysSocketEventMap["messages.upsert"];
      for (const message of normalized.messages) {
        if (message.key.fromMe) this.onRawOwnMessage(message);
      }
      this.emit("messages.upsert", normalized);
    });

    socket.ev.on("message-receipt.update", updates => {
      this.emit(
        "message-receipt.update",
        updates as unknown as BaileysReceiptLike[]
      );
    });
  }
}

async function main(): Promise<void> {
  if (process.env.BAILEYS_LAB_CONFIRM !== "I_ACCEPT_UNOFFICIAL_TEST_RISK") {
    throw new Error("BAILEYS_LAB_NOT_CONFIRMED");
  }

  const repository = new TransactionalMemorySessionCredentialRepository();
  const keyEnvelopeProvider = new TestOnlyInMemoryKeyEnvelopeProvider({
    allowTestOnly: true,
    keyId: "baileys-live-lab-kek",
    keyVersion: 1,
    keyMaterial: randomBytes(32)
  });
  const store = createEncryptedSessionCredentialStore({ repository, keyEnvelopeProvider });
  const storedAuth = await createStoredBaileysAuthenticationState({
    store,
    scope,
    audit: { actorId: "baileys-live-lab" }
  });

  let port: LiveLabSocketPort | null = null;
  let marker = "";
  let sentProviderMessageId = "";
  let sendStarted = false;
  let settleTimer: NodeJS.Timeout | null = null;
  let resolveDone!: () => void;
  let rejectDone!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const scheduleCompletion = () => {
    if (evidence.rawOwnMessageObserved && !settleTimer) {
      settleTimer = setTimeout(resolveDone, 6_000);
    }
  };

  const adapter = new BaileysEngineAdapter({
    organizationId: ORGANIZATION_ID,
    channelAccountId: CHANNEL_ACCOUNT_ID,
    socketFactory: async (): Promise<BaileysSocketPort> => {
      port = new LiveLabSocketPort(storedAuth, message => {
        if (marker && message.key.fromMe && rawMessageText(message) === marker) {
          evidence.rawOwnMessageObserved = true;
          scheduleCompletion();
        }
      });
      return port;
    }
  });

  adapter.subscribe(async event => {
    try {
      if (event.kind === "SESSION_STATE_CHANGED") {
        evidence.sessionStates.push(event.snapshot.state);
        if (event.snapshot.state === "PAIRING_REQUIRED") evidence.qrObserved = true;
        if (event.snapshot.state === "READY" && !sendStarted) {
          sendStarted = true;
          evidence.socketOpened = true;
          const selfJid = port?.currentUserId()
            ? jidNormalizedUser(port.currentUserId())
            : "";
          if (!selfJid) throw new Error("BAILEYS_SELF_IDENTITY_MISSING");
          const identity = canonicalIdentityFromJid({
            jid: selfJid,
            organizationId: ORGANIZATION_ID,
            channelAccountId: CHANNEL_ACCOUNT_ID,
            observedAt: new Date().toISOString(),
            displayName: "Baileys live lab",
            isSelf: true
          });
          evidence.selfIdentityHash = hash(`${identity.namespace}:${identity.normalizedId}`);
          marker = `INNOV-BAILEYS-LAB-${randomUUID()}`;
          const result = await adapter.send({
            idempotencyKey: randomUUID(),
            organizationId: ORGANIZATION_ID,
            conversationId: randomUUID(),
            channelAccountId: CHANNEL_ACCOUNT_ID,
            to: identity,
            messageType: "TEXT",
            content: { text: marker }
          });
          sentProviderMessageId = result.providerMessageId;
          evidence.providerMessageIdHash = hash(result.providerMessageId);
          evidence.canonicalSendAccepted = true;
        }
      }

      if (event.kind === "MESSAGE_RECEIVED" && marker && messageText(event) === marker) {
        evidence.canonicalInboundObserved = true;
        scheduleCompletion();
      }

      if (
        event.kind === "RECEIPT_RECEIVED" &&
        sentProviderMessageId &&
        event.receipt.providerMessageId === sentProviderMessageId
      ) {
        evidence.receiptObserved = true;
        scheduleCompletion();
      }

      if (event.kind === "ENGINE_ERROR") evidence.engineErrorCodes.push(event.code);
    } catch (error) {
      rejectDone(error instanceof Error ? error : new Error("BAILEYS_LAB_EVENT_FAILED"));
    }
  });

  const timeout = setTimeout(() => {
    evidence.timedOut = true;
    rejectDone(new Error("BAILEYS_LAB_TIMEOUT"));
  }, TIMEOUT_MS);

  const terminate = async () => {
    clearTimeout(timeout);
    if (settleTimer) clearTimeout(settleTimer);
    try {
      await adapter.disconnect(CHANNEL_ACCOUNT_ID, "LIVE_LAB_COMPLETED");
      evidence.disconnectedCleanly = true;
    } catch {
      evidence.disconnectedCleanly = false;
    }
    evidence.outcome = evidence.socketOpened
      && evidence.canonicalSendAccepted
      && evidence.rawOwnMessageObserved
      ? (evidence.canonicalInboundObserved ? "PASS_FULL" : "PASS_OUTBOUND")
      : "FAIL";
    await persistEvidence();
  };

  process.once("SIGTERM", () => void terminate().finally(() => process.exit(143)));
  process.once("SIGINT", () => void terminate().finally(() => process.exit(130)));

  try {
    await adapter.connect(CHANNEL_ACCOUNT_ID);
    await done;
  } finally {
    await terminate();
  }

  if (
    !evidence.socketOpened
    || !evidence.canonicalSendAccepted
    || !evidence.rawOwnMessageObserved
  ) {
    throw new Error("BAILEYS_LAB_INCOMPLETE");
  }

  console.log(JSON.stringify({
    ok: true,
    mode: evidence.mode,
    outcome: evidence.outcome,
    socketOpened: evidence.socketOpened,
    canonicalSendAccepted: evidence.canonicalSendAccepted,
    rawOwnMessageObserved: evidence.rawOwnMessageObserved,
    canonicalInboundObserved: evidence.canonicalInboundObserved,
    receiptObserved: evidence.receiptObserved,
    evidencePath: EVIDENCE_PATH
  }));
}

main().catch(async error => {
  const code = error instanceof Error
    ? (error.message.split(":", 1)[0] ?? "BAILEYS_LAB_UNKNOWN")
    : "BAILEYS_LAB_UNKNOWN";
  evidence.engineErrorCodes.push(code);
  evidence.outcome = "FAIL";
  await persistEvidence().catch(() => undefined);
  console.error(JSON.stringify({ ok: false, code, evidencePath: EVIDENCE_PATH }));
  process.exit(1);
});
