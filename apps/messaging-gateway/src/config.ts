export type GatewayConfig = {
  host: string;
  port: number;
  instanceId: string;
  hmacSecret: string;
  replayWindowSeconds: number;
  maxReplayEntries: number;
  maxBodyBytes: number;
  shutdownTimeoutMs: number;
  requestTimeoutMs: number;
  headersTimeoutMs: number;
};

type Env = Readonly<Record<string, string | undefined>>;

function required(env: Env, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${key}`);
  return value;
}

function integer(env: Env, key: string, fallback: number, minimum: number, maximum: number): number {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${key} deve ser inteiro entre ${minimum} e ${maximum}.`);
  }
  return value;
}

function safeHost(value: string): string {
  if (!/^[a-zA-Z0-9.:-]+$/.test(value)) throw new Error("GATEWAY_HOST inválido.");
  return value;
}

export function loadGatewayConfig(env: Env = process.env): GatewayConfig {
  const hmacSecret = required(env, "GATEWAY_HMAC_SECRET");
  if (Buffer.byteLength(hmacSecret, "utf8") < 32) {
    throw new Error("GATEWAY_HMAC_SECRET deve possuir ao menos 32 bytes.");
  }

  const instanceId = required(env, "GATEWAY_INSTANCE_ID");
  if (!/^[a-zA-Z0-9._:-]{3,128}$/.test(instanceId)) {
    throw new Error("GATEWAY_INSTANCE_ID inválido.");
  }

  const requestTimeoutMs = integer(env, "GATEWAY_REQUEST_TIMEOUT_MS", 15_000, 1_000, 120_000);
  const headersTimeoutMs = integer(env, "GATEWAY_HEADERS_TIMEOUT_MS", 10_000, 1_000, 60_000);
  if (headersTimeoutMs > requestTimeoutMs) {
    throw new Error("GATEWAY_HEADERS_TIMEOUT_MS não pode superar GATEWAY_REQUEST_TIMEOUT_MS.");
  }

  return {
    host: safeHost(env.GATEWAY_HOST?.trim() || "127.0.0.1"),
    port: integer(env, "GATEWAY_PORT", 8787, 1, 65_535),
    instanceId,
    hmacSecret,
    replayWindowSeconds: integer(env, "GATEWAY_REPLAY_WINDOW_SECONDS", 300, 30, 900),
    maxReplayEntries: integer(env, "GATEWAY_MAX_REPLAY_ENTRIES", 10_000, 100, 100_000),
    maxBodyBytes: integer(env, "GATEWAY_MAX_BODY_BYTES", 65_536, 1_024, 1_048_576),
    shutdownTimeoutMs: integer(env, "GATEWAY_SHUTDOWN_TIMEOUT_MS", 10_000, 1_000, 60_000),
    requestTimeoutMs,
    headersTimeoutMs
  };
}
