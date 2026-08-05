import type {
  CanonicalIdentity,
  CanonicalMessageContent,
  CanonicalMessageType,
  CanonicalProviderMetadata,
  CanonicalReceipt,
  ChannelProviderType
} from "@/lib/messaging/domain";
import {
  requireEngineCapability,
  type EngineCapability,
  type EngineCapabilityMatrix
} from "@/lib/messaging/capabilities";

export const ENGINE_SESSION_STATES = [
  "DISCONNECTED",
  "CONNECTING",
  "PAIRING_REQUIRED",
  "READY",
  "DEGRADED",
  "ACTION_REQUIRED",
  "STOPPING",
  "FAILED"
] as const;

export type EngineSessionState = typeof ENGINE_SESSION_STATES[number];

export type EngineSendCommand = {
  idempotencyKey: string;
  organizationId: string;
  conversationId: string;
  channelAccountId: string;
  providerAccountId?: string | null;
  to: CanonicalIdentity;
  messageType: CanonicalMessageType;
  content: CanonicalMessageContent;
  replyToProviderMessageId?: string | null;
};

export type EngineSendResult = {
  providerType: ChannelProviderType;
  providerMessageId: string;
  acceptedAt: string;
  providerMetadata: CanonicalProviderMetadata;
};

export type EngineSessionSnapshot = {
  providerType: ChannelProviderType;
  channelAccountId: string;
  state: EngineSessionState;
  changedAt: string;
  reason?: string | null;
  reconnectAttempt?: number | null;
  providerMetadata?: CanonicalProviderMetadata | null;
};

export type EnginePairingChallenge = {
  type: "QR" | "PAIRING_CODE";
  value: string;
  expiresAt: string;
};

export type EngineEvent =
  | {
      kind: "SESSION_STATE_CHANGED";
      eventId: string;
      occurredAt: string;
      snapshot: EngineSessionSnapshot;
    }
  | {
      kind: "MESSAGE_RECEIVED";
      eventId: string;
      occurredAt: string;
      organizationId: string;
      channelAccountId: string;
      providerType: ChannelProviderType;
      providerMessageId: string;
      sender: CanonicalIdentity;
      recipients: readonly CanonicalIdentity[];
      messageType: CanonicalMessageType;
      content: CanonicalMessageContent;
      providerMetadata: CanonicalProviderMetadata;
    }
  | {
      kind: "RECEIPT_RECEIVED";
      eventId: string;
      occurredAt: string;
      receipt: CanonicalReceipt;
    }
  | {
      kind: "ENGINE_ERROR";
      eventId: string;
      occurredAt: string;
      providerType: ChannelProviderType;
      channelAccountId?: string | null;
      code: string;
      retryable: boolean;
      message: string;
      providerMetadata?: CanonicalProviderMetadata | null;
    };

export type EngineEventListener = (event: EngineEvent) => void | Promise<void>;

export interface MessagingEngine {
  readonly providerType: ChannelProviderType;
  readonly capabilities: EngineCapabilityMatrix;
  send(command: EngineSendCommand): Promise<EngineSendResult>;
}

export interface SessionEngine {
  readonly providerType: ChannelProviderType;
  readonly capabilities: EngineCapabilityMatrix;
  connect(channelAccountId: string): Promise<EngineSessionSnapshot>;
  disconnect(channelAccountId: string, reason?: string): Promise<EngineSessionSnapshot>;
  getSessionState(channelAccountId: string): Promise<EngineSessionSnapshot>;
  requestPairing?(channelAccountId: string): Promise<EnginePairingChallenge>;
}

export interface EngineEventSource {
  readonly providerType: ChannelProviderType;
  subscribe(listener: EngineEventListener): () => void;
}

export type MessagingEngineBundle = {
  messaging: MessagingEngine;
  session?: SessionEngine;
  events?: EngineEventSource;
};

export class MessagingEngineError extends Error {
  constructor(
    public readonly code:
      | "INVALID_COMMAND"
      | "PROVIDER_MISMATCH"
      | "PROVIDER_NOT_AVAILABLE"
      | "PROVIDER_REJECTED"
      | "PROVIDER_UNAVAILABLE",
    message: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "MessagingEngineError";
  }
}

export function capabilityForSendCommand(
  command: Pick<EngineSendCommand, "messageType" | "replyToProviderMessageId">
): EngineCapability {
  if (command.replyToProviderMessageId) return "MESSAGE_SEND_REPLY";
  switch (command.messageType) {
    case "TEXT":
      return "MESSAGE_SEND_TEXT";
    case "TEMPLATE":
      return "MESSAGE_SEND_TEMPLATE";
    case "DOCUMENT":
      return "MESSAGE_SEND_DOCUMENT";
    case "IMAGE":
      return "MESSAGE_SEND_IMAGE";
    case "AUDIO":
      return "MESSAGE_SEND_AUDIO";
    case "VIDEO":
      return "MESSAGE_SEND_VIDEO";
    case "STICKER":
      return "MESSAGE_SEND_STICKER";
    case "LOCATION":
      return "MESSAGE_SEND_LOCATION";
    case "CONTACT":
      return "MESSAGE_SEND_CONTACT";
    case "REACTION":
      return "MESSAGE_SEND_REACTION";
    default:
      throw new MessagingEngineError(
        "INVALID_COMMAND",
        `O tipo ${command.messageType} não possui comando outbound canônico.`
      );
  }
}

export function assertEngineCommand(
  engine: Pick<MessagingEngine, "providerType" | "capabilities">,
  command: EngineSendCommand
) {
  if (
    !command.idempotencyKey ||
    !command.organizationId ||
    !command.conversationId ||
    !command.channelAccountId ||
    !command.to?.normalizedId
  ) {
    throw new MessagingEngineError("INVALID_COMMAND", "Comando de envio incompleto.");
  }
  if (command.to.providerType !== engine.providerType) {
    throw new MessagingEngineError(
      "PROVIDER_MISMATCH",
      "A identidade de destino pertence a outro provider."
    );
  }
  requireEngineCapability(engine.capabilities, capabilityForSendCommand(command));
  return command;
}

function eventProviderType(event: EngineEvent): ChannelProviderType {
  switch (event.kind) {
    case "SESSION_STATE_CHANGED":
      return event.snapshot.providerType;
    case "RECEIPT_RECEIVED":
      return event.receipt.providerType;
    case "MESSAGE_RECEIVED":
    case "ENGINE_ERROR":
      return event.providerType;
  }
}

export class InMemoryEngineEventSource implements EngineEventSource {
  private readonly listeners = new Set<EngineEventListener>();

  constructor(public readonly providerType: ChannelProviderType) {}

  subscribe(listener: EngineEventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async emit(event: EngineEvent) {
    if (eventProviderType(event) !== this.providerType) {
      throw new MessagingEngineError(
        "PROVIDER_MISMATCH",
        "Evento publicado em source de outro provider."
      );
    }
    await Promise.all([...this.listeners].map(listener => listener(event)));
  }
}
