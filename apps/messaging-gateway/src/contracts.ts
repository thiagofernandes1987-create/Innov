export const GATEWAY_CONTRACT_VERSION = "1.0.0" as const;

export type GatewayCommandAction = "PING" | "FAKE_SEND";

export type GatewayCommandEnvelope = {
  schemaVersion: typeof GATEWAY_CONTRACT_VERSION;
  commandId: string;
  organizationId: string;
  action: GatewayCommandAction;
  payload: Readonly<Record<string, unknown>>;
  correlationId: string;
  causationId?: string | null;
  occurredAt: string;
};

export type GatewayEventEnvelope = {
  schemaVersion: typeof GATEWAY_CONTRACT_VERSION;
  eventId: string;
  eventType: "FAKE_COMMAND_ACCEPTED" | "FAKE_MESSAGE_ACCEPTED";
  organizationId: string;
  commandId: string;
  correlationId: string;
  causationId: string;
  occurredAt: string;
  payload: Readonly<Record<string, unknown>>;
};

export type GatewayCommandResult = {
  accepted: true;
  event: GatewayEventEnvelope;
};

export function isGatewayCommandEnvelope(value: unknown): value is GatewayCommandEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.schemaVersion === GATEWAY_CONTRACT_VERSION
    && typeof candidate.commandId === "string"
    && candidate.commandId.length >= 3
    && candidate.commandId.length <= 128
    && typeof candidate.organizationId === "string"
    && candidate.organizationId.length >= 3
    && candidate.organizationId.length <= 128
    && (candidate.action === "PING" || candidate.action === "FAKE_SEND")
    && Boolean(candidate.payload)
    && typeof candidate.payload === "object"
    && !Array.isArray(candidate.payload)
    && typeof candidate.correlationId === "string"
    && candidate.correlationId.length >= 3
    && candidate.correlationId.length <= 128
    && (candidate.causationId === undefined
      || candidate.causationId === null
      || (typeof candidate.causationId === "string" && candidate.causationId.length <= 128))
    && typeof candidate.occurredAt === "string"
    && Number.isFinite(Date.parse(candidate.occurredAt));
}
