import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createServer } from "node:net";
import type { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFileSecurityGatewaySignature } from "../lib/file-security/gateway-auth";

type GatewayProcess = ChildProcessByStdio<null, Readable, Readable>;

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const MAX_FILE_BYTES = 1024;

let gateway: GatewayProcess;
let baseUrl: string;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (typeof address === "object" && address) {
        const { port } = address;
        probe.close(() => resolve(port));
      } else {
        probe.close(() => reject(new Error("porta indisponível")));
      }
    });
  });
}

function waitForStart(child: GatewayProcess) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("gateway não iniciou a tempo")), 10_000);
    child.stdout.on("data", chunk => {
      if (String(chunk).includes("file_security_gateway_started")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", code => {
      clearTimeout(timer);
      reject(new Error(`gateway encerrou com código ${code}`));
    });
  });
}

beforeAll(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  gateway = spawn(process.execPath, ["services/file-security-gateway/server.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      SCANNER_SHARED_SECRET: SECRET,
      CLAMAV_HOST: "127.0.0.1",
      // Porta reservada para descarte: qualquer tentativa de scan falha, o que
      // prova que a rejeição ocorreu antes de chegar ao scanner.
      CLAMAV_PORT: "9",
      CLAMAV_TIMEOUT_MS: "1000",
      MAX_FILE_BYTES: String(MAX_FILE_BYTES)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForStart(gateway);
}, 20_000);

afterAll(() => {
  gateway?.kill("SIGKILL");
});

describe("pré-condições do gateway de análise de arquivos", () => {
  it("rejeita requisição anônima sem ler o corpo", async () => {
    const response = await fetch(`${baseUrl}/v1/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(256)
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "MISSING_AUTH_HEADERS" });
  });

  it("rejeita assinatura com formato inválido", async () => {
    const response = await fetch(`${baseUrl}/v1/scan`, {
      method: "POST",
      headers: {
        "X-Innov-Timestamp": String(Math.floor(Date.now() / 1000)),
        "X-Innov-Content-SHA256": "a".repeat(64),
        "X-Innov-Signature": "assinatura-invalida"
      },
      body: new Uint8Array(256)
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "MALFORMED_AUTH_HEADERS" });
  });

  it("rejeita timestamp fora da janela permitida", async () => {
    const response = await fetch(`${baseUrl}/v1/scan`, {
      method: "POST",
      headers: {
        "X-Innov-Timestamp": String(Math.floor(Date.now() / 1000) - 3600),
        "X-Innov-Content-SHA256": "a".repeat(64),
        "X-Innov-Signature": "b".repeat(64)
      },
      body: new Uint8Array(256)
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "TIMESTAMP_OUT_OF_WINDOW" });
  });

  it("recusa corpo maior que o limite pelo tamanho declarado", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const sha256 = "a".repeat(64);
    const response = await fetch(`${baseUrl}/v1/scan`, {
      method: "POST",
      headers: {
        "X-Innov-Timestamp": timestamp,
        "X-Innov-Content-SHA256": sha256,
        "X-Innov-Signature": createFileSecurityGatewaySignature({ secret: SECRET, timestamp, sha256 })
      },
      body: new Uint8Array(MAX_FILE_BYTES + 512)
    });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("mantém a verificação de assinatura após as pré-condições", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const response = await fetch(`${baseUrl}/v1/scan`, {
      method: "POST",
      headers: {
        "X-Innov-Timestamp": timestamp,
        "X-Innov-Content-SHA256": "a".repeat(64),
        "X-Innov-Signature": "c".repeat(64)
      },
      body: new Uint8Array(64)
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ status: "unauthorized" });
  });
});
