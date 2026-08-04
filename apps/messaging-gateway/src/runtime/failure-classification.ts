import type { RuntimeFailureClassification } from "./contracts.js";

const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "SOCKET_CLOSED",
  "CONNECTION_LOST",
  "SERVICE_UNAVAILABLE"
]);

const LOGOUT_CODES = new Set(["LOGGED_OUT", "DEVICE_REMOVED", "SESSION_REVOKED"]);
const RESTRICTION_CODES = new Set([
  "ACCOUNT_RESTRICTED",
  "ACCOUNT_BANNED",
  "RATE_LIMIT_RESTRICTION"
]);
const ACTION_CODES = new Set([
  "BAD_SESSION",
  "PAIRING_REQUIRED",
  "CREDENTIALS_INVALID",
  "DEVICE_CONFIRMATION_REQUIRED"
]);

export function classifyRuntimeFailure(error: unknown): RuntimeFailureClassification {
  const candidate = asRecord(error);
  const code = normalizedCode(candidate?.code ?? candidate?.reason ?? candidate?.name);
  const status = numericStatus(candidate?.statusCode ?? candidate?.status);

  if (LOGOUT_CODES.has(code) || status === 401) {
    return { category: "LOGGED_OUT", retryable: false, reasonCode: code || "HTTP_401" };
  }
  if (RESTRICTION_CODES.has(code) || status === 403 || status === 429) {
    return { category: "RESTRICTED", retryable: false, reasonCode: code || `HTTP_${status}` };
  }
  if (ACTION_CODES.has(code) || status === 428) {
    return { category: "ACTION_REQUIRED", retryable: false, reasonCode: code || "HTTP_428" };
  }
  if (candidate?.shutdown === true || code === "SHUTDOWN" || code === "REQUESTED") {
    return { category: "SHUTDOWN", retryable: false, reasonCode: code || "SHUTDOWN" };
  }
  if (
    TRANSIENT_CODES.has(code) ||
    candidate?.retryable === true ||
    status === 408 ||
    status === 425 ||
    (status !== null && status >= 500)
  ) {
    return { category: "TRANSIENT", retryable: true, reasonCode: code || `HTTP_${status}` };
  }
  return { category: "ACTION_REQUIRED", retryable: false, reasonCode: code || "UNKNOWN_FAILURE" };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function normalizedCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function numericStatus(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  return null;
}
