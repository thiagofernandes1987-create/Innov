export type IdentityNamespace =
  | "PHONE"
  | "WHATSAPP_PN"
  | "WHATSAPP_LID"
  | "GROUP"
  | "NEWSLETTER"
  | "WEB_USER";

export type IdentityConfidence = "OBSERVED" | "INFERRED" | "CONFIRMED";
export type IdentityLinkStatus = "OBSERVED" | "CONFIRMED" | "CONFLICT" | "REJECTED";

export type ObservedChannelIdentity = {
  organizationId: string;
  channelAccountId: string;
  providerType: "META_CLOUD" | "WHATSAPP_WEB_BAILEYS" | "WEB_CHAT";
  providerAccountId: string;
  namespace: IdentityNamespace;
  externalId: string;
  normalizedId: string;
  deviceId?: string | null;
  observedAt: string;
};

export type IdentityRecord = ObservedChannelIdentity & {
  identityId: string;
  contactId: string;
  confidence: IdentityConfidence;
  linkStatus: IdentityLinkStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  version: number;
  supersededBy?: string | null;
};

export type IdentityResolution = {
  status: "RESOLVED" | "UNRESOLVED" | "CONFLICT";
  contactId?: string | null;
  identities: readonly IdentityRecord[];
  cacheVersion: number;
};

export type ContactMergeRequest = {
  organizationId: string;
  sourceContactId: string;
  targetContactId: string;
  reason: string;
  expectedSourceVersion: number;
  expectedTargetVersion: number;
};

export interface IdentityRegistry {
  observe(identity: ObservedChannelIdentity, proposedContactId: string): Promise<IdentityRecord>;
  resolve(identity: ObservedChannelIdentity): Promise<IdentityResolution>;
  confirmAlias(primaryIdentityId: string, aliasIdentityId: string, actorId: string): Promise<void>;
  mergeContacts(request: ContactMergeRequest): Promise<void>;
  cacheVersion(organizationId: string): Promise<number>;
}
