import type {
  BaileysCanonicalMedia,
  BaileysCanonicalMessageContent,
  BaileysEngineMessageType,
  BaileysInboundMediaLike,
  BaileysInboundMessageLike,
  BaileysOutboundContentLike
} from "./contracts.js";
import { BaileysAdapterError } from "./errors.js";

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object") {
    const toNumber = (value as { toNumber?: () => number }).toNumber;
    if (typeof toNumber === "function") {
      const converted = toNumber.call(value);
      return Number.isFinite(converted) ? converted : null;
    }
  }
  return null;
}

function requiredMedia(
  content: BaileysCanonicalMessageContent,
  expectedType: BaileysCanonicalMedia["mediaType"]
): BaileysCanonicalMedia {
  const media = content.media?.find(item => item.mediaType === expectedType);
  if (!media) {
    throw new BaileysAdapterError(
      "INVALID_COMMAND",
      `Mensagem ${expectedType} sem mídia canônica.`,
      false
    );
  }
  if (media.referenceType !== "SIGNED_URL" || !/^https:\/\//i.test(media.reference)) {
    throw new BaileysAdapterError(
      "UNSAFE_MEDIA_REFERENCE",
      "Mídia outbound exige URL HTTPS assinada.",
      false
    );
  }
  return media;
}

export function toBaileysOutboundContent(input: {
  messageType: BaileysEngineMessageType;
  content: BaileysCanonicalMessageContent;
  remoteJid: string;
}): BaileysOutboundContentLike {
  switch (input.messageType) {
    case "TEXT": {
      const text = input.content.text?.trim();
      if (!text) {
        throw new BaileysAdapterError("INVALID_COMMAND", "Texto outbound vazio.", false);
      }
      return { text };
    }
    case "DOCUMENT": {
      const media = requiredMedia(input.content, "DOCUMENT");
      return {
        document: { url: media.reference },
        mimetype: media.declaredMimeType || "application/octet-stream",
        fileName: media.fileName || undefined,
        caption: media.caption || input.content.caption || undefined
      };
    }
    case "IMAGE": {
      const media = requiredMedia(input.content, "IMAGE");
      return {
        image: { url: media.reference },
        mimetype: media.declaredMimeType || undefined,
        caption: media.caption || input.content.caption || undefined
      };
    }
    case "AUDIO": {
      const media = requiredMedia(input.content, "AUDIO");
      return {
        audio: { url: media.reference },
        mimetype: media.declaredMimeType || undefined,
        ptt: false
      };
    }
    case "VIDEO": {
      const media = requiredMedia(input.content, "VIDEO");
      return {
        video: { url: media.reference },
        mimetype: media.declaredMimeType || undefined,
        caption: media.caption || input.content.caption || undefined
      };
    }
    case "STICKER": {
      const media = requiredMedia(input.content, "STICKER");
      return { sticker: { url: media.reference } };
    }
    case "LOCATION": {
      const location = input.content.location;
      if (
        !location ||
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude) ||
        Math.abs(location.latitude) > 90 ||
        Math.abs(location.longitude) > 180
      ) {
        throw new BaileysAdapterError("INVALID_COMMAND", "Localização outbound inválida.", false);
      }
      return {
        location: {
          degreesLatitude: location.latitude,
          degreesLongitude: location.longitude,
          name: location.name || undefined,
          address: location.address || undefined
        }
      };
    }
    case "REACTION": {
      const reaction = input.content.reaction;
      if (!reaction?.targetMessageId || !reaction.emoji) {
        throw new BaileysAdapterError("INVALID_COMMAND", "Reação outbound incompleta.", false);
      }
      return {
        react: {
          text: reaction.emoji,
          key: {
            remoteJid: input.remoteJid,
            id: reaction.targetMessageId
          }
        }
      };
    }
  }
}

function providerMedia(input: {
  mediaType: BaileysCanonicalMedia["mediaType"];
  native: BaileysInboundMediaLike;
  providerMessageId: string;
}): BaileysCanonicalMedia {
  const reference = input.native.directPath || input.native.url || `provider:${input.providerMessageId}`;
  return {
    schemaVersion: "1.0.0",
    mediaType: input.mediaType,
    referenceType: "PROVIDER",
    reference,
    fileName: input.native.fileName || null,
    declaredMimeType: input.native.mimetype || null,
    sizeBytes: finiteNumber(input.native.fileLength),
    caption: input.native.caption || null
  };
}

export function fromBaileysInboundContent(input: {
  message: BaileysInboundMessageLike;
  providerMessageId: string;
}): {
  messageType: BaileysEngineMessageType | "UNKNOWN";
  content: BaileysCanonicalMessageContent;
  replyToProviderMessageId?: string | null;
} {
  const message = input.message.message;
  const conversation = message?.conversation?.trim();
  if (conversation) return { messageType: "TEXT", content: { text: conversation } };

  const extended = message?.extendedTextMessage;
  if (extended?.text?.trim()) {
    return {
      messageType: "TEXT",
      content: { text: extended.text.trim() },
      replyToProviderMessageId: extended.contextInfo?.stanzaId || null
    };
  }

  const mediaCases: Array<{
    key: "imageMessage" | "videoMessage" | "audioMessage" | "documentMessage" | "stickerMessage";
    messageType: BaileysEngineMessageType;
    mediaType: BaileysCanonicalMedia["mediaType"];
  }> = [
    { key: "imageMessage", messageType: "IMAGE", mediaType: "IMAGE" },
    { key: "videoMessage", messageType: "VIDEO", mediaType: "VIDEO" },
    { key: "audioMessage", messageType: "AUDIO", mediaType: "AUDIO" },
    { key: "documentMessage", messageType: "DOCUMENT", mediaType: "DOCUMENT" },
    { key: "stickerMessage", messageType: "STICKER", mediaType: "STICKER" }
  ];
  for (const candidate of mediaCases) {
    const native = message?.[candidate.key];
    if (native) {
      return {
        messageType: candidate.messageType,
        content: {
          caption: native.caption || null,
          media: [
            providerMedia({
              mediaType: candidate.mediaType,
              native,
              providerMessageId: input.providerMessageId
            })
          ]
        }
      };
    }
  }

  const location = message?.locationMessage;
  if (
    location &&
    typeof location.degreesLatitude === "number" &&
    typeof location.degreesLongitude === "number"
  ) {
    return {
      messageType: "LOCATION",
      content: {
        location: {
          latitude: location.degreesLatitude,
          longitude: location.degreesLongitude,
          name: location.name || null,
          address: location.address || null
        }
      }
    };
  }

  const reaction = message?.reactionMessage;
  if (reaction?.key?.id && typeof reaction.text === "string") {
    return {
      messageType: "REACTION",
      content: {
        reaction: {
          targetMessageId: reaction.key.id,
          emoji: reaction.text
        }
      }
    };
  }

  return { messageType: "UNKNOWN", content: {} };
}

export function providerTimestamp(value: unknown, fallback: string): string {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds <= 0) return fallback;
  const milliseconds = seconds > 10_000_000_000 ? seconds : seconds * 1_000;
  const date = new Date(milliseconds);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}
