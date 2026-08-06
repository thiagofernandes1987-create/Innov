import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { rm, writeFile } from "node:fs/promises";

const LAB_ROOT = process.env.WWEBJS_LAB_ROOT || "/tmp/whatsapp-webjs-live-lab";
const QR_PATH = process.env.WWEBJS_LAB_QR_PATH || `${LAB_ROOT}/qr.png`;
const STATUS_PATH = process.env.WWEBJS_LAB_STATUS_PATH || `${LAB_ROOT}/status.json`;
const EVIDENCE_PATH = process.env.WWEBJS_LAB_EVIDENCE_PATH || `${LAB_ROOT}/evidence.json`;
const CHROME_PATH = process.env.WWEBJS_CHROME_PATH || "/usr/bin/google-chrome";
const TIMEOUT_MS = boundedInteger(process.env.WWEBJS_LAB_TIMEOUT_MS, 120_000, 900_000, 720_000);
const require = createRequire(`${LAB_ROOT}/package.json`);
const { Client, NoAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

const evidence = {
  schemaVersion: "1.0.0",
  mode: "WHATSAPP_WEBJS_LIVE_LAB",
  library: "whatsapp-web.js",
  libraryVersion: "1.34.7",
  startedAt: new Date().toISOString(),
  completedAt: null,
  qrGenerated: false,
  qrGenerationCount: 0,
  authenticated: false,
  ready: false,
  webVersion: null,
  selfIdentityHash: null,
  sendAccepted: false,
  ownMessageObserved: false,
  messageAckObserved: false,
  highestAck: null,
  sentMessageIdHash: null,
  authFailure: false,
  disconnected: false,
  disconnectReason: null,
  timedOut: false,
  sessionPersisted: false,
  productionNumberUsed: false,
  metaCloudUsed: false,
  baileysUsed: false,
  autonomousAiUsed: false,
  rawQrPersistedInEvidence: false,
  outcome: "PENDING"
};

function boundedInteger(raw, minimum, maximum, fallback) {
  const parsed = Number(raw ?? fallback);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function updateStatus(stage, extra = {}) {
  await writeJson(STATUS_PATH, {
    stage,
    updatedAt: new Date().toISOString(),
    ...extra
  });
  console.log(JSON.stringify({ event: stage, ...extra }));
}

async function persistEvidence() {
  evidence.completedAt = new Date().toISOString();
  await writeJson(EVIDENCE_PATH, evidence);
}

async function main() {
  if (process.env.WWEBJS_LAB_CONFIRM !== "I_ACCEPT_UNOFFICIAL_TEST_RISK") {
    throw new Error("WWEBJS_LAB_NOT_CONFIRMED");
  }

  await rm(QR_PATH, { force: true });
  await updateStatus("INITIALIZING");

  let marker = "";
  let sentMessageId = "";
  let settleTimer = null;
  let completed = false;
  let resolveDone;
  let rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const client = new Client({
    authStrategy: new NoAuth(),
    qrMaxRetries: 8,
    authTimeoutMs: 120_000,
    takeoverOnConflict: false,
    puppeteer: {
      headless: true,
      executablePath: CHROME_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-background-networking"
      ]
    }
  });

  const scheduleSuccess = () => {
    if (evidence.sendAccepted && evidence.ownMessageObserved && !settleTimer) {
      settleTimer = setTimeout(() => resolveDone(), 5_000);
    }
  };

  client.on("qr", async qr => {
    try {
      evidence.qrGenerated = true;
      evidence.qrGenerationCount += 1;
      await QRCode.toFile(QR_PATH, qr, {
        type: "png",
        width: 512,
        margin: 4,
        errorCorrectionLevel: "M"
      });
      await updateStatus("QR_READY", { generation: evidence.qrGenerationCount });
    } catch (error) {
      rejectDone(error instanceof Error ? error : new Error("WWEBJS_QR_WRITE_FAILED"));
    }
  });

  client.on("authenticated", async () => {
    evidence.authenticated = true;
    await rm(QR_PATH, { force: true });
    await updateStatus("AUTHENTICATED");
  });

  client.on("auth_failure", async message => {
    evidence.authFailure = true;
    await updateStatus("AUTH_FAILURE");
    rejectDone(new Error(`WWEBJS_AUTH_FAILURE:${String(message).slice(0, 80)}`));
  });

  client.on("ready", async () => {
    try {
      evidence.ready = true;
      evidence.webVersion = await client.getWWebVersion().catch(() => null);
      const selfId = client.info?.wid?._serialized || "";
      if (!selfId) throw new Error("WWEBJS_SELF_IDENTITY_MISSING");
      evidence.selfIdentityHash = hash(selfId);
      await updateStatus("READY", { webVersion: evidence.webVersion });

      marker = `INNOV-WWEBJS-LAB-${randomUUID()}`;
      const sent = await client.sendMessage(selfId, marker);
      sentMessageId = sent?.id?._serialized || "";
      if (!sentMessageId) throw new Error("WWEBJS_SEND_NOT_ACCEPTED");
      evidence.sentMessageIdHash = hash(sentMessageId);
      evidence.sendAccepted = true;
      await updateStatus("SEND_ACCEPTED");
      scheduleSuccess();
    } catch (error) {
      rejectDone(error instanceof Error ? error : new Error("WWEBJS_READY_FLOW_FAILED"));
    }
  });

  client.on("message_create", async message => {
    if (marker && message.fromMe && message.body === marker) {
      evidence.ownMessageObserved = true;
      await updateStatus("OWN_MESSAGE_OBSERVED");
      scheduleSuccess();
    }
  });

  client.on("message_ack", async (message, ack) => {
    const messageId = message?.id?._serialized || "";
    if (sentMessageId && messageId === sentMessageId) {
      evidence.messageAckObserved = true;
      evidence.highestAck = Math.max(Number(evidence.highestAck ?? -1), Number(ack));
      await updateStatus("MESSAGE_ACK", { ack: evidence.highestAck });
      scheduleSuccess();
    }
  });

  client.on("disconnected", async reason => {
    evidence.disconnected = true;
    evidence.disconnectReason = String(reason).slice(0, 100);
    await updateStatus("DISCONNECTED");
    if (!completed) rejectDone(new Error("WWEBJS_DISCONNECTED_BEFORE_COMPLETION"));
  });

  const timeout = setTimeout(() => {
    evidence.timedOut = true;
    rejectDone(new Error("WWEBJS_LAB_TIMEOUT"));
  }, TIMEOUT_MS);

  try {
    await client.initialize();
    await done;
    completed = true;
    evidence.outcome = evidence.ready && evidence.sendAccepted && evidence.ownMessageObserved
      ? "PASS"
      : "FAIL";
  } finally {
    clearTimeout(timeout);
    if (settleTimer) clearTimeout(settleTimer);
    await client.destroy().catch(() => undefined);
    await rm(QR_PATH, { force: true });
    await persistEvidence();
  }

  if (evidence.outcome !== "PASS") throw new Error("WWEBJS_LAB_INCOMPLETE");
  await updateStatus("COMPLETED", {
    outcome: evidence.outcome,
    ackObserved: evidence.messageAckObserved,
    highestAck: evidence.highestAck
  });
}

main().catch(async error => {
  const code = error instanceof Error ? error.message.split(":", 1)[0] : "WWEBJS_LAB_UNKNOWN";
  evidence.outcome = "FAIL";
  await persistEvidence().catch(() => undefined);
  await updateStatus("FAILED", { code }).catch(() => undefined);
  process.exit(1);
});
