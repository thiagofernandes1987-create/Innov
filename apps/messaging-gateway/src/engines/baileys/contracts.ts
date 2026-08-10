export const BAILEYS_PACKAGE_VERSION = "7.0.0-rc13" as const;
export const BAILEYS_PROVIDER_TYPE = "WHATSAPP_WEB_BAILEYS" as const;
export const BAILEYS_ADAPTER_SCHEMA_VERSION = "1.0.0" as const;

export type BaileysIdentityNamespace =
  | "WHATSAPP_PN"
  | "WHATSAPP_LID"
  | "GROUP"
  | "NEWSLETTER";

export type BaileysCanonicalIdentity = {
  schemaVersion: "1.0.0";
  organizationId: string;
  providerType: typeof BAILEYS_PROVIDER_TYPE;
  channelAccountId: string;
  providerAccountId?: string | null;
  namespace: BaileysIdentityNamespace;
  externalId: string;
  normalizedId: string;
  phoneE164?: string | null;
  displayName?: string | null;
  isSelf?: boolean;
  observedAt: string;
};

export type BaileysCanonicalMedia = {
  schemaVersion: "1.0.0";
  mediaType: "DOCUMENT" | "IMAGE" | "AUDIO" | "VIDEO" | "STICKER" | "UNKNOWN";
  referenceType: "PROVIDER" | "PRIVATE_STORAGE" | "SIGNED_URL" | "INLINE_TEST_FIXTURE";
  reference: string;
  fileName?: string | null;
  declaredMimeType?: string | null;
  sizeBytes?: number | null;
  caption?: string | null;
};

export type BaileysCanonicalMessageContent = {
  text?: string | null;
  caption?: string | null;
  media?: readonly BaileysCanonicalMedia[];
  reaction?: {
    targetMessageId: string;
    emoji: string;
  } | null;
  location?: {
    latitude: number;
    longitude: number;
    name?: string | null;
    address?: string | null;
  } | null;
};

export type BaileysEngineMessageType =
  | "TEXT"
  | "DOCUMENT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "STICKER"
  | "LOCATION"
  | "REACTION";

export type BaileysEngineSendCommand = {
  idempotencyKey: string;
  organizationId: string;
  conversationId: string;
  channelAccountId: string;
  providerAccountId?: string | null;
  to: BaileysCanonicalIdentity;
  messageType: BaileysEngineMessageType;
  content: BaileysCanonicalMessageContent;
  replyToProviderMessageId?: string | null;
};

export type BaileysEngineSendResult = {
  providerType: typeof BAILEYS_PROVIDER_TYPE;
  providerMessageId: string;
  acceptedAt: string;
  providerMetadata: {
    providerType: typeof BAILEYS_PROVIDER_TYPE;
    schemaVersion: typeof BAILEYS_ADAPTER_SCHEMA_VERSION;
    rawEventType?: string | null;
    providerTimestamp?: string | null;
    attributes: Readonly<Record<string, unknown>>;
  };
};

export type BaileysSessionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "PAIRING_REQUIRED"
  | "READY"
  | "DEGRADED"
  | "ACTION_REQUIRED"
  | "STOPPING"
  | "FAILED";

export type BaileysSessionSnapshot = {
  providerType: typeof BAILEYS_PROVIDER_TYPE;
  channelAccountId: string;
  state: BaileysSessionState;
  changedAt: string;
  reason?: string | null;
  reconnectAttempt?: number | null;
  providerMetadata?: {
    providerType: typeof BAILEYS_PROVIDER_TYPE;
    schemaVersion: typeof BAILEYS_ADAPTER_SCHEMA_VERSION;
    rawEventType?: string | null;
    providerTimestamp?: string | null;
    attributes: Readonly<Record<string, unknown>>;
  } | null;
};

export type BaileysEngineEvent =
  | {
      kind: "SESSION_STATE_CHANGED";
      eventId: string;
      occurredAt: string;
      snapshot: BaileysSessionSnapshot;
    }
  | {
      kind: "MESSAGE_RECEIVED";
      eventId: string;
      occurredAt: string;
      organizationId: string;
      channelAccountId: string;
      providerType: typeof BAILEYS_PROVIDER_TYPE;
      providerMessageId: string;
      sender: BaileysCanonicalIdentity;
      recipients: readonly BaileysCanonicalIdentity[];
      messageType: BaileysEngineMessageType | "UNKNOWN";
      content: BaileysCanonicalMessageContent;
      providerMetadata: BaileysEngineSendResult["providerMetadata"];
    }
  | {
      kind: "RECEIPT_RECEIVED";
      eventId: string;
      occurredAt: string;
      receipt: {
        schemaVersion: "1.0.0";
        organizationId: string;
        messageId: string;
        providerType: typeof BAILEYS_PROVIDER_TYPE;
        channelAccountId: string;
        providerAccountId?: string | null;
        providerMessageId?: string | null;
        receiptType: "SENT" | "DELIVERED" | "READ" | "PLAYED" | "FAILED";
        occurredAt: string;
        identity?: BaileysCanonicalIdentity | null;
        providerMetadata: BaileysEngineSendResult["providerMetadata"];
      };
    }
  | {
      kind: "ENGINE_ERROR";
      eventId: string;
      occurredAt: string;
      providerType: typeof BAILEYS_PROVIDER_TYPE;
      channelAccountId?: string | null;
      code: string;
      retryable: boolean;
      message: string;
      providerMetadata?: BaileysEngineSendResult["providerMetadata"] | null;
    };

export type BaileysMessageKeyLike = {
  remoteJid?: string | null;
  participant?: string | null;
  id?: string | null;
  fromMe?: boolean | null;
};

export type BaileysInboundMessageLike = {
  key: BaileysMessageKeyLike;
  pushName?: string | null;
  messageTimestamp?: number | bigint | { toNumber?: () => number } | null;
  message?: {
    conversation?: string | null;
    extendedTextMessage?: {
      text?: string | null;
      contextInfo?: { stanzaId?: string | null } | null;
    } | null;
    imageMessage?: BaileysInboundMediaLike | null;
    videoMessage?: BaileysInboundMediaLike | null;
    audioMessage?: BaileysInboundMediaLike | null;
    documentMessage?: BaileysInboundMediaLike | null;
    stickerMessage?: BaileysInboundMediaLike | null;
    locationMessage?: {
      degreesLatitude?: number | null;
      degreesLongitude?: number | null;
      name?: string | null;
      address?: string | null;
    } | null;
    reactionMessage?: {
      text?: string | null;
      key?: BaileysMessageKeyLike | null;
    } | null;
  } | null;
};

export type BaileysInboundMediaLike = {
  url?: string | null;
  directPath?: string | null;
  mimetype?: string | null;
  fileName?: string | null;
  fileLength?: number | bigint | { toNumber?: () => number } | null;
  caption?: string | null;
};

export type BaileysReceiptLike = {
  key: BaileysMessageKeyLike;
  receipt: {
    userJid?: string | null;
    readTimestamp?: number | bigint | { toNumber?: () => number } | null;
    playedTimestamp?: number | bigint | { toNumber?: () => number } | null;
    deliveredTimestamp?: number | bigint | { toNumber?: () => number } | null;
    receiptTimestamp?: number | bigint | { toNumber?: () => number } | null;
  };
};

export type BaileysConnectionUpdateLike = {
  connection?: "open" | "connecting" | "close";
  qr?: string;
  isNewLogin?: boolean;
  receivedPendingNotifications?: boolean;
  lastDisconnect?: { error?: unknown; date?: Date };
};

export type BaileysSocketEventMap = {
  "connection.update": BaileysConnectionUpdateLike;
  "messages.upsert": {
    messages: BaileysInboundMessageLike[];
    type: "append" | "notify";
    requestId?: string;
  };
  "message-receipt.update": BaileysReceiptLike[];
};

export interface BaileysEventEmitterPort {
  on<T extends keyof BaileysSocketEventMap>(
    event: T,
    listener: (value: BaileysSocketEventMap[T]) => void
  ): void;
  off<T extends keyof BaileysSocketEventMap>(
    event: T,
    listener: (value: BaileysSocketEventMap[T]) => void
  ): void;
}

export type BaileysMediaUploadLike = { url: string };

export type BaileysOutboundContentLike =
  | { text: string }
  | { document: BaileysMediaUploadLike; mimetype: string; fileName?: string; caption?: string }
  | { image: BaileysMediaUploadLike; mimetype?: string; caption?: string }
  | { audio: BaileysMediaUploadLike; mimetype?: string; ptt?: boolean }
  | { video: BaileysMediaUploadLike; mimetype?: string; caption?: string }
  | { sticker: BaileysMediaUploadLike }
  | {
      location: {
        degreesLatitude: number;
        degreesLongitude: number;
        name?: string;
        address?: string;
      };
    }
  | { react: { text: string; key: BaileysMessageKeyLike } };

export type BaileysSendOptionsLike = {
  quoted?: BaileysInboundMessageLike;
  messageId?: string;
};

export interface BaileysSocketPort {
  readonly ev: BaileysEventEmitterPort;
  sendMessage(
    jid: string,
    content: BaileysOutboundContentLike,
    options?: BaileysSendOptionsLike
  ): Promise<BaileysInboundMessageLike | undefined>;
  end(error?: Error): void;
}

export type BaileysSocketFactory = (input: {
  channelAccountId: string;
}) => Promise<BaileysSocketPort> | BaileysSocketPort;

export type BaileysQuotedMessageResolver = (input: {
  channelAccountId: string;
  providerMessageId: string;
  remoteJid: string;
}) => Promise<BaileysInboundMessageLike | null>;

export type BaileysEngineEventListener = (
  event: BaileysEngineEvent
) => void | Promise<void>;
