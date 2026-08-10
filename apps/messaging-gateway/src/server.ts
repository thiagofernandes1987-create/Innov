import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { GatewayConfig } from "./config.js";
import { isGatewayCommandEnvelope, type GatewayCommandEnvelope } from "./contracts.js";
import { FakeChannelClient } from "./fake-client.js";
import { GatewayMetrics } from "./metrics.js";
import { GatewayReplayError, ReplayGuard } from "./replay-guard.js";
import {
  GATEWAY_CAUSATION_HEADER,
  GATEWAY_CORRELATION_HEADER,
  GATEWAY_NONCE_HEADER,
  GATEWAY_SIGNATURE_HEADER,
  GATEWAY_TIMESTAMP_HEADER,
  GatewayAuthenticationError,
  normalizeInternalId,
  verifyGatewayRequest
} from "./security.js";

class BodyTooLargeError extends Error {}
class InvalidRequestError extends Error {}

export type GatewayRuntime = {
  start: () => Promise<{ host: string; port: number }>;
  stop: (reason?: string) => Promise<void>;
  isReady: () => boolean;
  server: Server;
  metrics: GatewayMetrics;
  fakeClient: FakeChannelClient;
};

type GatewayDependencies = {
  fakeClient?: FakeChannelClient;
  metrics?: GatewayMetrics;
  now?: () => number;
};

function header(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  const encoded = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(encoded.byteLength),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(encoded);
}

async function readBody(request: IncomingMessage, maximumBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maximumBytes) throw new BodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function assertContentType(request: IncomingMessage): void {
  const value = header(request, "content-type")?.toLowerCase() || "";
  if (!value.startsWith("application/json")) throw new InvalidRequestError();
}

function parseCommand(body: Buffer, correlationId: string, causationId: string | null): GatewayCommandEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    throw new InvalidRequestError();
  }
  if (!isGatewayCommandEnvelope(parsed)) throw new InvalidRequestError();
  if (parsed.correlationId !== correlationId) throw new InvalidRequestError();
  if (causationId && parsed.causationId && parsed.causationId !== causationId) {
    throw new InvalidRequestError();
  }
  return causationId ? { ...parsed, causationId } : parsed;
}

export function createGatewayRuntime(
  config: GatewayConfig,
  dependencies: GatewayDependencies = {}
): GatewayRuntime {
  const fakeClient = dependencies.fakeClient ?? new FakeChannelClient();
  const metrics = dependencies.metrics ?? new GatewayMetrics();
  const replayGuard = new ReplayGuard({
    windowSeconds: config.replayWindowSeconds,
    maxEntries: config.maxReplayEntries,
    now: dependencies.now
  });
  const startedAt = Date.now();
  let acceptingCommands = false;
  let stopping: Promise<void> | null = null;

  const server = createServer(async (request, response) => {
    const endRequest = metrics.beginRequest();
    try {
      const url = new URL(request.url || "/", "http://gateway.internal");
      if (request.method === "GET" && url.pathname === "/health" && !url.search) {
        writeJson(response, 200, {
          status: "ok",
          service: "messaging-gateway",
          instanceId: config.instanceId,
          uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1_000))
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/ready" && !url.search) {
        const ready = acceptingCommands && fakeClient.isReady();
        writeJson(response, ready ? 200 : 503, { status: ready ? "ready" : "not_ready" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/metrics" && !url.search) {
        const body = Buffer.from(metrics.render());
        response.writeHead(200, {
          "content-type": "text/plain; version=0.0.4; charset=utf-8",
          "content-length": String(body.byteLength),
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        });
        response.end(body);
        return;
      }
      if (request.method !== "POST" || url.pathname !== "/internal/commands" || url.search) {
        writeJson(response, 404, { error: "NOT_FOUND" });
        return;
      }
      if (!acceptingCommands || !fakeClient.isReady()) {
        writeJson(response, 503, { error: "NOT_READY" });
        return;
      }

      assertContentType(request);
      const body = await readBody(request, config.maxBodyBytes);
      const timestamp = header(request, GATEWAY_TIMESTAMP_HEADER) || "";
      const nonce = header(request, GATEWAY_NONCE_HEADER) || "";
      verifyGatewayRequest({
        secret: config.hmacSecret,
        timestamp,
        nonce,
        signature: header(request, GATEWAY_SIGNATURE_HEADER),
        method: request.method,
        path: url.pathname,
        body
      });
      replayGuard.assertFreshAndRemember(nonce, timestamp);

      const correlationId = normalizeInternalId(request.headers[GATEWAY_CORRELATION_HEADER], true);
      const causationId = normalizeInternalId(request.headers[GATEWAY_CAUSATION_HEADER], false);
      if (!correlationId) throw new GatewayAuthenticationError("MISSING_AUTH");
      const command = parseCommand(body, correlationId, causationId);
      metrics.countAuthenticatedCommand();
      const result = await fakeClient.execute(command);
      metrics.countFakeCommand();
      writeJson(response, 202, result);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        writeJson(response, 413, { error: "BODY_TOO_LARGE" });
      } else if (error instanceof GatewayAuthenticationError) {
        metrics.countAuthenticationFailure();
        writeJson(response, 401, { error: "UNAUTHORIZED" });
      } else if (error instanceof GatewayReplayError) {
        metrics.countReplayRejection();
        writeJson(response, 409, { error: error.code });
      } else if (error instanceof InvalidRequestError) {
        writeJson(response, 400, { error: "INVALID_REQUEST" });
      } else {
        writeJson(response, 500, { error: "INTERNAL_ERROR" });
      }
    } finally {
      endRequest();
    }
  });

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = config.headersTimeoutMs;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 64;

  return {
    server,
    metrics,
    fakeClient,
    isReady: () => acceptingCommands && fakeClient.isReady(),
    start: () => new Promise((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      server.once("error", onError);
      server.listen(config.port, config.host, () => {
        server.off("error", onError);
        fakeClient.start();
        acceptingCommands = true;
        metrics.markReady(true);
        const address = server.address() as AddressInfo;
        resolve({ host: address.address, port: address.port });
      });
    }),
    stop: async () => {
      if (stopping) return stopping;
      acceptingCommands = false;
      metrics.markReady(false);
      fakeClient.stop();
      stopping = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          server.closeAllConnections();
          resolve();
        }, config.shutdownTimeoutMs);
        timeout.unref();
        server.close(() => {
          clearTimeout(timeout);
          resolve();
        });
        server.closeIdleConnections();
      });
      return stopping;
    }
  };
}
