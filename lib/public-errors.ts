import { randomUUID } from "node:crypto";

export type PublicOperationError = {
  code: string;
  message: string;
  correlationId: string;
};

function internalCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "UNKNOWN")
    : "UNKNOWN";
}

export function mapPublicOperationError(
  error: unknown,
  code: string,
  message: string,
  operation: string
): PublicOperationError {
  const correlationId = randomUUID();
  console.error(JSON.stringify({
    event: "operation.failed",
    operation,
    correlationId,
    errorCode: internalCode(error)
  }));
  return { code, message, correlationId };
}
