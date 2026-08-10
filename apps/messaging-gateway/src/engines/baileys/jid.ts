import {
  BAILEYS_PROVIDER_TYPE,
  type BaileysCanonicalIdentity,
  type BaileysIdentityNamespace
} from "./contracts.js";
import { BaileysAdapterError } from "./errors.js";

const JID_SERVERS = {
  WHATSAPP_PN: "s.whatsapp.net",
  WHATSAPP_LID: "lid",
  GROUP: "g.us",
  NEWSLETTER: "newsletter"
} as const satisfies Record<BaileysIdentityNamespace, string>;

function cleanLocalPart(value: string): string {
  return value.trim().split(":", 1)[0]?.toLowerCase() || "";
}

function splitJid(jid: string): { local: string; server: string } {
  const normalized = jid.trim().toLowerCase();
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0 || separator === normalized.length - 1) {
    throw new BaileysAdapterError("UNSUPPORTED_IDENTITY", "JID inválido.", false);
  }
  return {
    local: cleanLocalPart(normalized.slice(0, separator)),
    server: normalized.slice(separator + 1)
  };
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function jidNamespace(jid: string): BaileysIdentityNamespace {
  const { server } = splitJid(jid);
  switch (server) {
    case "s.whatsapp.net":
      return "WHATSAPP_PN";
    case "lid":
      return "WHATSAPP_LID";
    case "g.us":
      return "GROUP";
    case "newsletter":
      return "NEWSLETTER";
    default:
      throw new BaileysAdapterError(
        "UNSUPPORTED_IDENTITY",
        "Namespace JID não suportado pelo adapter.",
        false
      );
  }
}

export function sanitizedJidKind(jid: string | null | undefined): string | null {
  if (!jid) return null;
  try {
    return jidNamespace(jid);
  } catch {
    return "UNKNOWN";
  }
}

export function canonicalIdentityFromJid(input: {
  jid: string;
  organizationId: string;
  channelAccountId: string;
  providerAccountId?: string | null;
  observedAt: string;
  displayName?: string | null;
  isSelf?: boolean;
}): BaileysCanonicalIdentity {
  const namespace = jidNamespace(input.jid);
  const { local } = splitJid(input.jid);
  const normalizedId = namespace === "WHATSAPP_PN" ? digits(local) : local;
  if (!normalizedId) {
    throw new BaileysAdapterError("UNSUPPORTED_IDENTITY", "JID sem identificador.", false);
  }
  if (namespace === "WHATSAPP_PN" && (normalizedId.length < 8 || normalizedId.length > 15)) {
    throw new BaileysAdapterError(
      "UNSUPPORTED_IDENTITY",
      "Identidade PN fora dos limites canônicos.",
      false
    );
  }
  return {
    schemaVersion: "1.0.0",
    organizationId: input.organizationId,
    providerType: BAILEYS_PROVIDER_TYPE,
    channelAccountId: input.channelAccountId,
    providerAccountId: input.providerAccountId,
    namespace,
    externalId: input.jid,
    normalizedId,
    phoneE164: namespace === "WHATSAPP_PN" ? normalizedId : null,
    displayName: input.displayName,
    isSelf: input.isSelf,
    observedAt: input.observedAt
  };
}

export function jidFromCanonicalIdentity(
  identity: BaileysCanonicalIdentity,
  policy: { allowGroups: boolean; allowNewsletters: boolean }
): string {
  if (identity.providerType !== BAILEYS_PROVIDER_TYPE) {
    throw new BaileysAdapterError("PROVIDER_MISMATCH", "Identidade pertence a outro provider.", false);
  }
  if (identity.namespace === "GROUP" && !policy.allowGroups) {
    throw new BaileysAdapterError("GROUPS_DISABLED", "Operações em grupos estão desabilitadas.", false);
  }
  if (identity.namespace === "NEWSLETTER" && !policy.allowNewsletters) {
    throw new BaileysAdapterError(
      "NEWSLETTERS_DISABLED",
      "Operações em newsletters estão desabilitadas.",
      false
    );
  }

  const expectedServer = JID_SERVERS[identity.namespace];
  if (identity.externalId?.includes("@")) {
    const parsed = splitJid(identity.externalId);
    if (parsed.server !== expectedServer) {
      throw new BaileysAdapterError(
        "UNSUPPORTED_IDENTITY",
        "Servidor JID incompatível com o namespace canônico.",
        false
      );
    }
    return `${parsed.local}@${parsed.server}`;
  }

  const local = identity.namespace === "WHATSAPP_PN"
    ? digits(identity.phoneE164 || identity.normalizedId)
    : cleanLocalPart(identity.normalizedId);
  if (!local) {
    throw new BaileysAdapterError("UNSUPPORTED_IDENTITY", "Identidade sem JID resolvível.", false);
  }
  return `${local}@${expectedServer}`;
}
