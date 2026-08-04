import type { IdentityNamespace, ObservedChannelIdentity } from "./contracts.js";

export function normalizeExternalIdentity(
  namespace: IdentityNamespace,
  value: string
): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) throw new Error("IDENTITY_EMPTY");
  switch (namespace) {
    case "PHONE":
    case "WHATSAPP_PN": {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) throw new Error("INVALID_PHONE_IDENTITY");
      return namespace === "WHATSAPP_PN" ? `${digits}@s.whatsapp.net` : `+${digits}`;
    }
    case "WHATSAPP_LID": {
      const local = trimmed.replace(/@lid$/, "").replace(/\D/g, "");
      if (!local) throw new Error("INVALID_LID_IDENTITY");
      return `${local}@lid`;
    }
    case "GROUP":
      if (!/^\d+-\d+@g\.us$/.test(trimmed)) throw new Error("INVALID_GROUP_IDENTITY");
      return trimmed;
    case "NEWSLETTER":
      if (!/^\d+@newsletter$/.test(trimmed)) throw new Error("INVALID_NEWSLETTER_IDENTITY");
      return trimmed;
    case "WEB_USER":
      if (!/^[a-z0-9][a-z0-9._:-]{2,127}$/.test(trimmed)) throw new Error("INVALID_WEB_USER_IDENTITY");
      return trimmed;
  }
}

export function normalizeObservedIdentity(
  input: Omit<ObservedChannelIdentity, "normalizedId">
): ObservedChannelIdentity {
  return {
    ...input,
    normalizedId: normalizeExternalIdentity(input.namespace, input.externalId)
  };
}
