export type BaileysAdapterErrorCode =
  | "INVALID_COMMAND"
  | "PROVIDER_MISMATCH"
  | "UNSUPPORTED_IDENTITY"
  | "UNSUPPORTED_MESSAGE"
  | "UNSAFE_MEDIA_REFERENCE"
  | "GROUPS_DISABLED"
  | "NEWSLETTERS_DISABLED"
  | "SOCKET_NOT_CONNECTED"
  | "SOCKET_FACTORY_FAILED"
  | "QUOTED_MESSAGE_NOT_FOUND"
  | "INVALID_PROVIDER_RESPONSE"
  | "PROVIDER_REJECTED"
  | "PROVIDER_UNAVAILABLE"
  | "EXTERNAL_SOCKET_BLOCKED";

export class BaileysAdapterError extends Error {
  constructor(
    public readonly code: BaileysAdapterErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly providerStatusCode?: number | null
  ) {
    super(message);
    this.name = "BaileysAdapterError";
  }
}

function statusCodeFromUnknown(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as Record<string, unknown>;
  const direct = candidate.statusCode;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;

  const output = candidate.output;
  if (output && typeof output === "object") {
    const status = (output as Record<string, unknown>).statusCode;
    if (typeof status === "number" && Number.isFinite(status)) return status;
  }

  const data = candidate.data;
  if (data && typeof data === "object") {
    const status = (data as Record<string, unknown>).statusCode;
    if (typeof status === "number" && Number.isFinite(status)) return status;
  }
  return null;
}

export function normalizeBaileysError(
  error: unknown,
  fallbackCode: BaileysAdapterErrorCode = "PROVIDER_UNAVAILABLE"
): BaileysAdapterError {
  if (error instanceof BaileysAdapterError) return error;
  const statusCode = statusCodeFromUnknown(error);
  if (statusCode === 401 || statusCode === 403 || statusCode === 411 || statusCode === 440) {
    return new BaileysAdapterError(
      "PROVIDER_REJECTED",
      "O provider rejeitou a operação ou exige ação humana.",
      false,
      statusCode
    );
  }
  if (
    statusCode === 408 ||
    statusCode === 428 ||
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 503 ||
    statusCode === 515
  ) {
    return new BaileysAdapterError(
      "PROVIDER_UNAVAILABLE",
      "O provider está temporariamente indisponível.",
      true,
      statusCode
    );
  }
  return new BaileysAdapterError(
    fallbackCode,
    fallbackCode === "SOCKET_FACTORY_FAILED"
      ? "A fábrica do socket falhou antes de disponibilizar o adapter."
      : "Falha não classificada no adapter do provider.",
    fallbackCode !== "INVALID_PROVIDER_RESPONSE",
    statusCode
  );
}
