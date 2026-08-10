import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { rm, writeFile } from "node:fs/promises";

const LAB_ROOT = process.env.BAILEYS_QUICKSTART_ROOT || "/tmp/baileys-official-quickstart";
const AUTH_DIR = process.env.BAILEYS_QUICKSTART_AUTH_DIR || `${LAB_ROOT}/auth_info_baileys`;
const QR_PATH = process.env.BAILEYS_QUICKSTART_QR_PATH || `${LAB_ROOT}/qr.png`;
const STATUS_PATH = process.env.BAILEYS_QUICKSTART_STATUS_PATH || `${LAB_ROOT}/status.json`;
const EVIDENCE_PATH = process.env.BAILEYS_QUICKSTART_EVIDENCE_PATH || `${LAB_ROOT}/evidence.json`;
const MODULE_PATH = process.env.BAILEYS_QUICKSTART_MODULE_PATH
  || `${LAB_ROOT}/node_modules/@whiskeysockets/baileys/lib/index.js`;
const TIMEOUT_MS = boundedInteger(process.env.BAILEYS_QUICKSTART_TIMEOUT_MS, 120_000, 900_000, 720_000);
const require = createRequire(`${LAB_ROOT}/package.json`);
const QRCode = require("qrcode");

const evidence = {
  schemaVersion: "1.0.0",
  mode: "BAILEYS_OFFICIAL_QUICKSTART",
  packageVersion: "7.0.0-rc13",
  startedAt: new Date().toISOString(),
  completedAt: null,
  qrObserved: false,
  qrGenerationCount: 0,
  connectionOpened: false,
  restartRequiredObserved: false,
  reconnectCount: 0,
  credentialsUpdated: false,
  sendAccepted: false,
  providerMessageIdHash: null,
  selfIdentityHash: null,
  loggedOut: false,
  timedOut: false,
  outcome: "PENDING",
  productionNumberUsed: false,
  metaCloudUsed: false,
  autonomousAiUsed: false,
  rawQrPersistedInEvidence: false,
  authDirectoryCommitted: false
};

function boundedInteger(raw, minimum, maximum, fallback) {
  const value = Number(raw ?? fallback);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
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
  if (process.env.BAILEYS_QUICKSTART_CONFIRM !== "I_ACCEPT_UNOFFICIAL_TEST_RISK") {
    throw new Error("BAILEYS_QUICKSTART_NOT_CONFIRMED");
  }

  await rm(AUTH_DIR, { recursive: true, force: true });
  await rm(QR_PATH, { force: true });
  await updateStatus("INITIALIZING");

  const baileys = await import(pathToFileURL(MODULE_PATH).href);
  const {
    default: makeWASocket,
    DisconnectReason,
    jidNormalizedUser,
    useMultiFileAuthState,
    fetchLatestWaWebVersion
  } = baileys;

  // A versão do WhatsApp Web precisa ser buscada, não herdada do pacote.
  //
  // A primeira execução real deste laboratório reprovou aqui, e o log dizia
  // tudo: o socket **conectava**, tentava registrar e o WhatsApp fechava com
  // `statusCode 405` — 31 vezes em dois minutos, sem nunca emitir QR. Medido
  // depois: o Baileys se anunciava com a constante embutida `2.3000.1035194821`
  // enquanto o próprio endpoint do WhatsApp Web reportava `2.3000.1044834443`.
  //
  // Cliente que se identifica com versão que o servidor já não aceita é
  // recusado no registro, antes de qualquer QR. E a constante embutida envelhece
  // sozinha: ela é fixada no dia em que o pacote é publicado e o WhatsApp
  // continua andando. Buscar em tempo de execução é o que impede o laboratório
  // de apodrecer sem ninguém mexer nele.
  //
  // A falha da busca não derruba a execução — cai na constante embutida e
  // registra o motivo, porque um laboratório que não sobe por causa de uma
  // consulta de rede diz menos do que um que sobe e falha com 405 explicando
  // por quê.
  let waVersion = null;
  try {
    const atual = await fetchLatestWaWebVersion();
    waVersion = atual?.version ?? null;
    evidence.waWebVersion = waVersion ? waVersion.join(".") : null;
    evidence.waWebVersionSource = "fetchLatestWaWebVersion";
  } catch (erro) {
    evidence.waWebVersion = null;
    evidence.waWebVersionSource = `fallback-embutido (${erro?.message ?? "falha na consulta"})`;
  }

  let socket = null;
  let completed = false;
  let reconnecting = false;
  let resolveDone;
  let rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  async function connectToWhatsApp() {
    if (completed) return;
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    socket = makeWASocket(waVersion ? { auth: state, version: waVersion } : { auth: state });

    socket.ev.on("creds.update", async () => {
      evidence.credentialsUpdated = true;
      await saveCreds();
    });

    socket.ev.on("connection.update", async update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        evidence.qrObserved = true;
        evidence.qrGenerationCount += 1;
        await QRCode.toFile(QR_PATH, qr, {
          type: "png",
          width: 512,
          margin: 4,
          errorCorrectionLevel: "M"
        });
        await updateStatus("QR_READY", { generation: evidence.qrGenerationCount });
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode
          ?? lastDisconnect?.error?.data?.statusCode
          ?? null;
        if (statusCode === DisconnectReason.restartRequired) {
          evidence.restartRequiredObserved = true;
        }
        if (statusCode === DisconnectReason.loggedOut) {
          evidence.loggedOut = true;
          rejectDone(new Error("BAILEYS_QUICKSTART_LOGGED_OUT"));
          return;
        }
        if (!completed && !reconnecting) {
          reconnecting = true;
          evidence.reconnectCount += 1;
          await updateStatus("RECONNECTING", { statusCode, reconnectCount: evidence.reconnectCount });
          setTimeout(() => {
            reconnecting = false;
            void connectToWhatsApp().catch(rejectDone);
          }, 1_000);
        }
        return;
      }

      if (connection === "open" && !evidence.sendAccepted) {
        evidence.connectionOpened = true;
        await rm(QR_PATH, { force: true });
        const selfJid = socket?.user?.id ? jidNormalizedUser(socket.user.id) : "";
        if (!selfJid) {
          rejectDone(new Error("BAILEYS_QUICKSTART_SELF_IDENTITY_MISSING"));
          return;
        }
        evidence.selfIdentityHash = hash(selfJid);
        await updateStatus("OPEN");
        const marker = `INNOV-BAILEYS-QUICKSTART-${randomUUID()}`;
        const sent = await socket.sendMessage(selfJid, { text: marker });
        const providerMessageId = sent?.key?.id || "";
        if (!providerMessageId) {
          rejectDone(new Error("BAILEYS_QUICKSTART_SEND_NOT_ACCEPTED"));
          return;
        }
        evidence.providerMessageIdHash = hash(providerMessageId);
        evidence.sendAccepted = true;
        evidence.outcome = "PASS";
        await updateStatus("SEND_ACCEPTED");
        resolveDone();
      }
    });
  }

  const timeout = setTimeout(() => {
    evidence.timedOut = true;
    rejectDone(new Error("BAILEYS_QUICKSTART_TIMEOUT"));
  }, TIMEOUT_MS);

  try {
    await connectToWhatsApp();
    await done;
    completed = true;
  } finally {
    clearTimeout(timeout);
    completed = true;
    if (socket) {
      await socket.logout().catch(() => socket?.end(new Error("LAB_COMPLETE")));
    }
    await rm(QR_PATH, { force: true });
    await rm(AUTH_DIR, { recursive: true, force: true });
    await persistEvidence();
  }

  if (evidence.outcome !== "PASS") throw new Error("BAILEYS_QUICKSTART_INCOMPLETE");
  await updateStatus("COMPLETED", {
    outcome: evidence.outcome,
    reconnectCount: evidence.reconnectCount,
    restartRequiredObserved: evidence.restartRequiredObserved
  });
}

main().catch(async error => {
  evidence.outcome = "FAIL";
  const code = error instanceof Error ? error.message.split(":", 1)[0] : "BAILEYS_QUICKSTART_UNKNOWN";
  await persistEvidence().catch(() => undefined);
  await updateStatus("FAILED", { code }).catch(() => undefined);
  process.exit(1);
});
