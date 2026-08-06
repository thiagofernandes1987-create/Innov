import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import makeWASocket, {
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
  type BaileysEngineEvent,
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

const scope: SessionSecretScope = {
  organizationId: ORGANIZATION_ID,
  sessionId: SESSION_ID,
  channelAccountId: CHANNEL_ACCOUNT_ID,
  providerType: BAILEYS_PROVIDER_TYPE
};

const evidence = {
  schemaVersion: "1.0.0",
  mode: "BAILEYS_LIVE_LAB",
  startedAt: new Date().toISOString(),
  completedAt: null as string | null,
  packageVersion: "7.0.0-rc13",
  qrObserved: false,
  socketOpened: false,
  credentialsPersistedEncrypted: false,
  canonicalSendAccepted: false,
  canonicalInboundObserved: false,
  receiptObserved: false,
  providerMessageIdHash: null as string | null,
  selfIdentityHash: null as string | null,
  sessionStates: [] as string[],
  engineErrorCodes: [] as string[],
  timedOut: false,
  disconnectedCleanly: false,
  productionNumberUsed: false,
  metaCloudUsed: false,
  autonomousAiUsed: false,
  rawQrPersisted: false,
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

async function persistEvidence(): Promise<void> {
  evidence.completedAt = new Date().toISOString();
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
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

  let rawSocket: WASocket | null = null;
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

  const adapter = new BaileysEngineAdapter({
    organizationId: ORGANIZATION_ID,
    channelAccountId: CHANNEL_ACCOUNT_ID,
    socketFactory: async (): Promise<BaileysSocketPort> => {
      const socket = makeWASocket({
        auth: storedAuth.state,
        printQRInTerminal: true,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        emitOwnEvents: true,
        connectTimeoutMs: 60_000,
        qrTimeout: 60_000,
        defaultQueryTimeoutMs: 60_000
      });
      rawSocket = socket;
      socket.ev.on("creds.update", async () => {
        await storedAuth.saveCreds({ actorId: "baileys-live-lab" });
        evidence.credentialsPersistedEncrypted = true;
      });
      return socket as unknown as BaileysSocketPort;
    }
  });

  adapter.subscribe(async event => {
    try {
      if (event.kind === "SESSION_STATE_CHANGED") {
        evidence.sessionStates.push(event.snapshot.state);
        if (event.snapshot.state === "PAIRING_REQUIRED") evidence.qrObserved = true;
        if (event.snapshot.state === "FAILED") {
          rejectDone(new Error(`BAILEYS_SESSION_FAILED:${event.snapshot.reason ?? "UNKNOWN"}`));
        }
        if (event.snapshot.state === "READY" && !sendStarted) {
          sendStarted = true;
          evidence.socketOpened = true;
          const selfJid = rawSocket?.user?.id ? jidNormalizedUser(rawSocket.user.id) : "";
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
        if (!settleTimer) settleTimer = setTimeout(resolveDone, 5_000);
      }

      if (
        event.kind === "RECEIPT_RECEIVED" &&
        sentProviderMessageId &&
        event.receipt.providerMessageId === sentProviderMessageId
      ) {
        evidence.receiptObserved = true;
        if (evidence.canonicalInboundObserved && !settleTimer) {
          settleTimer = setTimeout(resolveDone, 2_000);
        }
      }

      if (event.kind === "ENGINE_ERROR") {
        evidence.engineErrorCodes.push(event.code);
      }
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

  if (!evidence.socketOpened || !evidence.canonicalSendAccepted || !evidence.canonicalInboundObserved) {
    throw new Error("BAILEYS_LAB_INCOMPLETE");
  }

  console.log(JSON.stringify({
    ok: true,
    mode: evidence.mode,
    socketOpened: evidence.socketOpened,
    canonicalSendAccepted: evidence.canonicalSendAccepted,
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
  await persistEvidence().catch(() => undefined);
  console.error(JSON.stringify({ ok: false, code, evidencePath: EVIDENCE_PATH }));
  process.exit(1);
});
