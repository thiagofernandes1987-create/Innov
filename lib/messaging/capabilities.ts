import type { ChannelProviderType } from "@/lib/messaging/domain";

export const ENGINE_CAPABILITIES = [
  "CONVERSATION_START",
  "MESSAGE_SEND_TEXT",
  "MESSAGE_SEND_TEMPLATE",
  "MESSAGE_SEND_DOCUMENT",
  "MESSAGE_SEND_IMAGE",
  "MESSAGE_SEND_AUDIO",
  "MESSAGE_SEND_VIDEO",
  "MESSAGE_SEND_STICKER",
  "MESSAGE_SEND_LOCATION",
  "MESSAGE_SEND_CONTACT",
  "MESSAGE_SEND_REACTION",
  "MESSAGE_SEND_REPLY",
  "MESSAGE_EDIT",
  "MESSAGE_DELETE",
  "GROUP_READ",
  "GROUP_WRITE",
  "PRESENCE_READ",
  "PRESENCE_WRITE",
  "HISTORY_SYNC",
  "RECEIPT_MARK_READ",
  "INBOUND_MESSAGES",
  "INBOUND_RECEIPTS",
  "SESSION_PAIRING",
  "SESSION_RECONNECT"
] as const;

export type EngineCapability = typeof ENGINE_CAPABILITIES[number];

export const CAPABILITY_SUPPORT_LEVELS = [
  "SUPPORTED",
  "CONDITIONAL",
  "UNSUPPORTED",
  "PLANNED"
] as const;

export type CapabilitySupportLevel = typeof CAPABILITY_SUPPORT_LEVELS[number];

export type EngineCapabilityState = {
  support: CapabilitySupportLevel;
  reason?: string | null;
};

export type EngineCapabilityMatrix = {
  providerType: ChannelProviderType;
  version: string;
  capabilities: Readonly<Record<EngineCapability, EngineCapabilityState>>;
};

function createCapabilityMatrix(input: {
  providerType: ChannelProviderType;
  version: string;
  supported?: readonly EngineCapability[];
  conditional?: Readonly<Partial<Record<EngineCapability, string>>>;
  planned?: readonly EngineCapability[];
  defaultReason: string;
}): EngineCapabilityMatrix {
  const supported = new Set(input.supported ?? []);
  const planned = new Set(input.planned ?? []);
  const capabilities = Object.fromEntries(
    ENGINE_CAPABILITIES.map(capability => {
      const conditionalReason = input.conditional?.[capability];
      if (supported.has(capability)) {
        return [capability, { support: "SUPPORTED" as const }];
      }
      if (conditionalReason) {
        return [
          capability,
          { support: "CONDITIONAL" as const, reason: conditionalReason }
        ];
      }
      if (planned.has(capability)) {
        return [
          capability,
          {
            support: "PLANNED" as const,
            reason: "Provider ainda não possui adapter operacional registrado."
          }
        ];
      }
      return [
        capability,
        { support: "UNSUPPORTED" as const, reason: input.defaultReason }
      ];
    })
  ) as Record<EngineCapability, EngineCapabilityState>;

  return {
    providerType: input.providerType,
    version: input.version,
    capabilities
  };
}

/**
 * Reflete apenas as capacidades já encapsuladas pelo adapter Meta do Innov.
 * Não representa todo o catálogo teórico da Cloud API.
 */
export const META_CLOUD_CAPABILITY_MATRIX = createCapabilityMatrix({
  providerType: "META_CLOUD",
  version: "1.0.0",
  supported: [
    "CONVERSATION_START",
    "MESSAGE_SEND_TEXT",
    "MESSAGE_SEND_TEMPLATE",
    "MESSAGE_SEND_DOCUMENT",
    "INBOUND_MESSAGES",
    "INBOUND_RECEIPTS"
  ],
  defaultReason: "Capacidade ainda não foi encapsulada pelo adapter Meta do Innov."
});

export const BAILEYS_PLANNED_CAPABILITY_MATRIX = createCapabilityMatrix({
  providerType: "WHATSAPP_WEB_BAILEYS",
  version: "0.0.0-planned",
  planned: ENGINE_CAPABILITIES,
  defaultReason: "Baileys ainda não foi instalado ou registrado."
});

export const WEB_CHAT_PLANNED_CAPABILITY_MATRIX = createCapabilityMatrix({
  providerType: "WEB_CHAT",
  version: "0.0.0-planned",
  planned: [
    "CONVERSATION_START",
    "MESSAGE_SEND_TEXT",
    "MESSAGE_SEND_DOCUMENT",
    "MESSAGE_SEND_IMAGE",
    "MESSAGE_SEND_REPLY",
    "MESSAGE_EDIT",
    "INBOUND_MESSAGES",
    "INBOUND_RECEIPTS"
  ],
  defaultReason: "Web Chat ainda não possui engine registrado."
});

export class UnsupportedCapabilityError extends Error {
  constructor(
    public readonly providerType: ChannelProviderType,
    public readonly capability: EngineCapability,
    message?: string
  ) {
    super(message ?? `O provider ${providerType} não suporta ${capability}.`);
    this.name = "UnsupportedCapabilityError";
  }
}

export function capabilityState(
  matrix: EngineCapabilityMatrix,
  capability: EngineCapability
) {
  return matrix.capabilities[capability];
}

export function hasEngineCapability(
  matrix: EngineCapabilityMatrix,
  capability: EngineCapability
) {
  return capabilityState(matrix, capability).support === "SUPPORTED";
}

export function requireEngineCapability(
  matrix: EngineCapabilityMatrix,
  capability: EngineCapability
) {
  const state = capabilityState(matrix, capability);
  if (state.support !== "SUPPORTED") {
    throw new UnsupportedCapabilityError(
      matrix.providerType,
      capability,
      state.reason ?? undefined
    );
  }
  return state;
}

export function applyCapabilityOverrides(
  matrix: EngineCapabilityMatrix,
  disabledCapabilities: readonly EngineCapability[]
): EngineCapabilityMatrix {
  if (!disabledCapabilities.length) return matrix;
  const disabled = new Set(disabledCapabilities);
  return {
    ...matrix,
    capabilities: Object.fromEntries(
      ENGINE_CAPABILITIES.map(capability => [
        capability,
        disabled.has(capability)
          ? {
              support: "UNSUPPORTED" as const,
              reason: "Capacidade desativada pela política da organização."
            }
          : matrix.capabilities[capability]
      ])
    ) as Record<EngineCapability, EngineCapabilityState>
  };
}

export type MessagingUiCapabilities = {
  providerType: ChannelProviderType;
  enabled: boolean;
  canStartConversation: boolean;
  canSendText: boolean;
  canSendTemplate: boolean;
  canSendDocument: boolean;
  canSendImage: boolean;
  canSendAudio: boolean;
  canSendVideo: boolean;
  canSendReaction: boolean;
  canReply: boolean;
  canUseGroups: boolean;
  canUsePresence: boolean;
  canSyncHistory: boolean;
  canEditMessages: boolean;
  canSendAny: boolean;
};

export function deriveMessagingUiCapabilities(
  matrix: EngineCapabilityMatrix,
  enabled: boolean
): MessagingUiCapabilities {
  const allowed = (capability: EngineCapability) =>
    enabled && hasEngineCapability(matrix, capability);
  const result = {
    providerType: matrix.providerType,
    enabled,
    canStartConversation: allowed("CONVERSATION_START"),
    canSendText: allowed("MESSAGE_SEND_TEXT"),
    canSendTemplate: allowed("MESSAGE_SEND_TEMPLATE"),
    canSendDocument: allowed("MESSAGE_SEND_DOCUMENT"),
    canSendImage: allowed("MESSAGE_SEND_IMAGE"),
    canSendAudio: allowed("MESSAGE_SEND_AUDIO"),
    canSendVideo: allowed("MESSAGE_SEND_VIDEO"),
    canSendReaction: allowed("MESSAGE_SEND_REACTION"),
    canReply: allowed("MESSAGE_SEND_REPLY"),
    canUseGroups: allowed("GROUP_READ") || allowed("GROUP_WRITE"),
    canUsePresence: allowed("PRESENCE_READ") || allowed("PRESENCE_WRITE"),
    canSyncHistory: allowed("HISTORY_SYNC"),
    canEditMessages: allowed("MESSAGE_EDIT"),
    canSendAny: false
  } satisfies MessagingUiCapabilities;

  return {
    ...result,
    canSendAny:
      result.canSendText ||
      result.canSendTemplate ||
      result.canSendDocument ||
      result.canSendImage ||
      result.canSendAudio ||
      result.canSendVideo
  };
}
