import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { loadGatewayConfig, type GatewayConfig } from "../apps/messaging-gateway/src/config";
import { createGatewayRuntime, type GatewayRuntime } from "../apps/messaging-gateway/src/server";
import { GatewayReplayError, ReplayGuard } from "../apps/messaging-gateway/src/replay-guard";
import { signGatewayRequest, verifyGatewayRequest } from "../apps/messaging-gateway/src/security";

const secret = "0123456789abcdef0123456789abcdef";
const running: GatewayRuntime[] = [];

afterEach(async () => {
  await Promise.all(running.splice(0).map(runtime => runtime.stop("test")));
});

function config(overrides: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    host: "127.0.0.1",
    port: 0,
    instanceId: "gateway-test",
    hmacSecret: secret,
    replayWindowSeconds: 300,
    maxReplayEntries: 100,
    maxBodyBytes: 65_536,
    shutdownTimeoutMs: 1_000,
    requestTimeoutMs: 5_000,
    headersTimeoutMs: 4_000,
    ...overrides
  };
}

async function start(overrides: Partial<GatewayConfig> = {}) {
  const runtime = createGatewayRuntime(config(overrides));
  running.push(runtime);
  const address = await runtime.start();
  return { runtime, baseUrl: `http://127.0.0.1:${address.port}` };
}

function command(correlationId: string) {
  return {
    schemaVersion: "1.0.0",
    commandId: randomUUID(),
    organizationId: randomUUID(),
    action: "FAKE_SEND",
    payload: { text: "teste determinístico" },
    correlationId,
    causationId: null,
    occurredAt: new Date().toISOString()
  } as const;
}

function signedHeaders(body: string, correlationId: string, nonce = randomUUID(), timestamp = String(Date.now())) {
  return {
    "content-type": "application/json",
    "x-innov-timestamp": timestamp,
    "x-innov-nonce": nonce,
    "x-correlation-id": correlationId,
    "x-innov-signature": signGatewayRequest({
      secret,
      timestamp,
      nonce,
      method: "POST",
      path: "/internal/commands",
      body
    })
  };
}

describe("messaging gateway W-05", () => {
  it("falha fechado sem secret ou instance id válidos", () => {
    expect(() => loadGatewayConfig({ GATEWAY_INSTANCE_ID: "test" })).toThrow(/GATEWAY_HMAC_SECRET/);
    expect(() => loadGatewayConfig({
      GATEWAY_INSTANCE_ID: "test",
      GATEWAY_HMAC_SECRET: "curto"
    })).toThrow(/32 bytes/);
  });

  it("carrega configuração tipada com limites seguros", () => {
    const loaded = loadGatewayConfig({
      GATEWAY_INSTANCE_ID: "instance-01",
      GATEWAY_HMAC_SECRET: secret,
      GATEWAY_PORT: "8788"
    });
    expect(loaded.port).toBe(8788);
    expect(loaded.replayWindowSeconds).toBe(300);
    expect(loaded.maxBodyBytes).toBe(65_536);
  });

  it("assina o corpo canônico e rejeita conteúdo alterado", () => {
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const signature = signGatewayRequest({
      secret,
      timestamp,
      nonce,
      method: "POST",
      path: "/internal/commands",
      body: "original"
    });
    expect(() => verifyGatewayRequest({
      secret,
      timestamp,
      nonce,
      signature,
      method: "POST",
      path: "/internal/commands",
      body: "original"
    })).not.toThrow();
    expect(() => verifyGatewayRequest({
      secret,
      timestamp,
      nonce,
      signature,
      method: "POST",
      path: "/internal/commands",
      body: "alterado"
    })).toThrow(/INVALID_AUTH/);
  });

  it("rejeita nonce repetido e timestamp fora da janela", () => {
    const now = 1_800_000_000_000;
    const guard = new ReplayGuard({ windowSeconds: 60, maxEntries: 10, now: () => now });
    guard.assertFreshAndRemember("nonce-123456", String(now));
    expect(() => guard.assertFreshAndRemember("nonce-123456", String(now)))
      .toThrowError(expect.objectContaining<Partial<GatewayReplayError>>({ code: "REPLAY_DETECTED" }));
    expect(() => guard.assertFreshAndRemember("nonce-654321", String(now - 61_000)))
      .toThrowError(expect.objectContaining<Partial<GatewayReplayError>>({ code: "STALE_REQUEST" }));
  });

  it("expõe health readiness e métricas sem payload ou segredo", async () => {
    const { runtime, baseUrl } = await start();
    expect(runtime.isReady()).toBe(true);
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ status: "ok", service: "messaging-gateway" });
    const ready = await fetch(`${baseUrl}/ready`);
    expect(ready.status).toBe(200);
    const metrics = await (await fetch(`${baseUrl}/metrics`)).text();
    expect(metrics).toContain("innov_gateway_ready 1");
    expect(metrics).not.toContain(secret);
    expect(metrics).not.toContain("teste determinístico");
  });

  it("bloqueia comando sem HMAC", async () => {
    const { baseUrl } = await start();
    const correlationId = randomUUID();
    const response = await fetch(`${baseUrl}/internal/commands`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": correlationId },
      body: JSON.stringify(command(correlationId))
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("aceita comando assinado e preserva correlação e causalidade", async () => {
    const { runtime, baseUrl } = await start();
    const correlationId = randomUUID();
    const payload = command(correlationId);
    const body = JSON.stringify(payload);
    const response = await fetch(`${baseUrl}/internal/commands`, {
      method: "POST",
      headers: signedHeaders(body, correlationId),
      body
    });
    expect(response.status).toBe(202);
    const result = await response.json() as { event: Record<string, unknown> };
    expect(result.event).toMatchObject({
      eventType: "FAKE_MESSAGE_ACCEPTED",
      correlationId,
      causationId: payload.commandId,
      organizationId: payload.organizationId
    });
    expect(runtime.fakeClient.recordedEvents()).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("teste determinístico");
  });

  it("rejeita replay do mesmo request assinado", async () => {
    const { baseUrl } = await start();
    const correlationId = randomUUID();
    const body = JSON.stringify(command(correlationId));
    const nonce = randomUUID();
    const timestamp = String(Date.now());
    const headers = signedHeaders(body, correlationId, nonce, timestamp);
    const first = await fetch(`${baseUrl}/internal/commands`, { method: "POST", headers, body });
    const second = await fetch(`${baseUrl}/internal/commands`, { method: "POST", headers, body });
    expect(first.status).toBe(202);
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: "REPLAY_DETECTED" });
  });

  it("limita o tamanho do corpo antes de executar o cliente", async () => {
    const { runtime, baseUrl } = await start({ maxBodyBytes: 64 });
    const correlationId = randomUUID();
    const body = JSON.stringify({ ...command(correlationId), payload: { text: "x".repeat(512) } });
    const response = await fetch(`${baseUrl}/internal/commands`, {
      method: "POST",
      headers: signedHeaders(body, correlationId),
      body
    });
    expect(response.status).toBe(413);
    expect(runtime.fakeClient.recordedEvents()).toHaveLength(0);
  });
});
