import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GATEWAY_SIGNATURE_HEADER = "x-innov-signature";
export const GATEWAY_TIMESTAMP_HEADER = "x-innov-timestamp";
export const GATEWAY_NONCE_HEADER = "x-innov-nonce";
export const GATEWAY_CORRELATION_HEADER = "x-correlation-id";
export const GATEWAY_CAUSATION_HEADER = "x-causation-id";

export type GatewaySignatureInput = {
  secret: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  body: Buffer | string;
};

export class GatewayAuthenticationError extends Error {
  constructor(public readonly code: "MISSING_AUTH" | "INVALID_AUTH") {
    super(code);
    this.name = "GatewayAuthenticationError";
  }
}

export function sha256Hex(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalSignaturePayload(input: Omit<GatewaySignatureInput, "secret">): string {
  return [
    input.timestamp,
    input.nonce,
    input.method.toUpperCase(),
    input.path,
    sha256Hex(input.body)
  ].join(".");
}

export function signGatewayRequest(input: GatewaySignatureInput): string {
  return createHmac("sha256", input.secret)
    .update(canonicalSignaturePayload(input))
    .digest("hex");
}

export function verifyGatewayRequest(input: GatewaySignatureInput & { signature?: string | null }): void {
  if (!input.timestamp || !input.nonce || !input.signature) {
    throw new GatewayAuthenticationError("MISSING_AUTH");
  }
  if (!/^[a-f0-9]{64}$/i.test(input.signature)) {
    throw new GatewayAuthenticationError("INVALID_AUTH");
  }

  const expected = Buffer.from(signGatewayRequest(input), "hex");
  const received = Buffer.from(input.signature, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new GatewayAuthenticationError("INVALID_AUTH");
  }
}

export function normalizeInternalId(value: string | string[] | undefined, required: boolean): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim() || "";
  if (!normalized) {
    if (required) throw new GatewayAuthenticationError("MISSING_AUTH");
    return null;
  }
  if (!/^[a-zA-Z0-9._:-]{3,128}$/.test(normalized)) {
    throw new GatewayAuthenticationError("INVALID_AUTH");
  }
  return normalized;
}
