import { BAILEYS_PACKAGE_VERSION, BAILEYS_PROVIDER_TYPE } from "./contracts.js";

export const BAILEYS_ENGINE_CAPABILITIES = [
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

export type BaileysEngineCapability = typeof BAILEYS_ENGINE_CAPABILITIES[number];

export type BaileysCapabilityMatrix = {
  providerType: typeof BAILEYS_PROVIDER_TYPE;
  version: string;
  capabilities: Readonly<Record<
    BaileysEngineCapability,
    { support: "SUPPORTED" | "CONDITIONAL" | "UNSUPPORTED" | "PLANNED"; reason?: string | null }
  >>;
};

export function createBaileysCapabilityMatrix(input: {
  allowGroups: boolean;
  allowNewsletters: boolean;
}): BaileysCapabilityMatrix {
  const supported = new Set<BaileysEngineCapability>([
    "CONVERSATION_START",
    "MESSAGE_SEND_TEXT",
    "MESSAGE_SEND_DOCUMENT",
    "MESSAGE_SEND_IMAGE",
    "MESSAGE_SEND_AUDIO",
    "MESSAGE_SEND_VIDEO",
    "MESSAGE_SEND_STICKER",
    "MESSAGE_SEND_LOCATION",
    "MESSAGE_SEND_REACTION",
    "MESSAGE_SEND_REPLY",
    "INBOUND_MESSAGES",
    "INBOUND_RECEIPTS",
    "SESSION_RECONNECT"
  ]);
  const capabilities = Object.fromEntries(
    BAILEYS_ENGINE_CAPABILITIES.map(capability => {
      if (supported.has(capability)) {
        return [capability, { support: "SUPPORTED" as const }];
      }
      if (capability === "GROUP_READ" || capability === "GROUP_WRITE") {
        return [
          capability,
          input.allowGroups
            ? { support: "SUPPORTED" as const }
            : {
                support: "UNSUPPORTED" as const,
                reason: "Grupos exigem autorização explícita do adapter."
              }
        ];
      }
      if (capability === "SESSION_PAIRING") {
        return [
          capability,
          {
            support: "PLANNED" as const,
            reason: "QR e pairing pertencem à W-08 e permanecem bloqueados."
          }
        ];
      }
      return [
        capability,
        {
          support: "UNSUPPORTED" as const,
          reason:
            capability === "MESSAGE_SEND_TEMPLATE"
              ? "Template oficial não é abstraído pelo adapter Web."
              : input.allowNewsletters
                ? "Capacidade ainda não foi encapsulada pelo adapter."
                : "Capacidade ainda não foi encapsulada pelo adapter; newsletters também estão bloqueadas."
        }
      ];
    })
  ) as Record<
    BaileysEngineCapability,
    { support: "SUPPORTED" | "CONDITIONAL" | "UNSUPPORTED" | "PLANNED"; reason?: string | null }
  >;

  return {
    providerType: BAILEYS_PROVIDER_TYPE,
    version: `${BAILEYS_PACKAGE_VERSION}-adapter.1`,
    capabilities
  };
}
