import { randomUUID } from "node:crypto";
import type {
  ContactMergeRequest,
  IdentityRecord,
  IdentityRegistry,
  IdentityResolution,
  ObservedChannelIdentity
} from "./contracts.js";

function identityKey(identity: ObservedChannelIdentity): string {
  return [
    identity.organizationId,
    identity.providerType,
    identity.providerAccountId,
    identity.namespace,
    identity.normalizedId,
    identity.deviceId ?? ""
  ].join(":");
}

export class InMemoryIdentityRegistry implements IdentityRegistry {
  private readonly identities = new Map<string, IdentityRecord>();
  private readonly contacts = new Map<string, { organizationId: string; version: number; active: boolean }>();
  private readonly versions = new Map<string, number>();

  async observe(
    identity: ObservedChannelIdentity,
    proposedContactId: string
  ): Promise<IdentityRecord> {
    const key = identityKey(identity);
    const existing = this.identities.get(key);
    if (existing) {
      if (existing.contactId !== proposedContactId && existing.linkStatus !== "REJECTED") {
        existing.linkStatus = "CONFLICT";
        existing.version += 1;
        this.bump(identity.organizationId);
      }
      existing.lastObservedAt = identity.observedAt;
      return { ...existing };
    }
    const contact = this.contacts.get(proposedContactId);
    if (contact && contact.organizationId !== identity.organizationId) {
      throw new Error("CROSS_TENANT_CONTACT");
    }
    this.contacts.set(proposedContactId, contact ?? {
      organizationId: identity.organizationId,
      version: 1,
      active: true
    });
    const record: IdentityRecord = {
      ...identity,
      identityId: randomUUID(),
      contactId: proposedContactId,
      confidence: "OBSERVED",
      linkStatus: "OBSERVED",
      firstObservedAt: identity.observedAt,
      lastObservedAt: identity.observedAt,
      version: 1
    };
    this.identities.set(key, record);
    this.bump(identity.organizationId);
    return { ...record };
  }

  async resolve(identity: ObservedChannelIdentity): Promise<IdentityResolution> {
    const exact = this.identities.get(identityKey(identity));
    if (!exact) {
      return {
        status: "UNRESOLVED",
        identities: [],
        cacheVersion: await this.cacheVersion(identity.organizationId)
      };
    }
    const related = [...this.identities.values()].filter(item =>
      item.organizationId === identity.organizationId &&
      item.contactId === exact.contactId &&
      !item.supersededBy
    );
    return {
      status: exact.linkStatus === "CONFLICT" ? "CONFLICT" : "RESOLVED",
      contactId: exact.contactId,
      identities: related.map(item => ({ ...item })),
      cacheVersion: await this.cacheVersion(identity.organizationId)
    };
  }

  async confirmAlias(
    primaryIdentityId: string,
    aliasIdentityId: string,
    actorId: string
  ): Promise<void> {
    if (!actorId.trim()) throw new Error("ACTOR_REQUIRED");
    const primary = this.findById(primaryIdentityId);
    const alias = this.findById(aliasIdentityId);
    if (primary.organizationId !== alias.organizationId) throw new Error("CROSS_TENANT_ALIAS");
    if (primary.channelAccountId !== alias.channelAccountId) throw new Error("CROSS_ACCOUNT_ALIAS");
    if (primary.contactId !== alias.contactId) throw new Error("CONTACT_CONFIRMATION_REQUIRED");
    primary.confidence = "CONFIRMED";
    primary.linkStatus = "CONFIRMED";
    primary.version += 1;
    alias.confidence = "CONFIRMED";
    alias.linkStatus = "CONFIRMED";
    alias.version += 1;
    this.bump(primary.organizationId);
  }

  async mergeContacts(request: ContactMergeRequest): Promise<void> {
    if (request.sourceContactId === request.targetContactId) throw new Error("SAME_CONTACT_MERGE");
    if (request.reason.trim().length < 8) throw new Error("MERGE_REASON_REQUIRED");
    const source = this.contacts.get(request.sourceContactId);
    const target = this.contacts.get(request.targetContactId);
    if (!source || !target) throw new Error("CONTACT_NOT_FOUND");
    if (source.organizationId !== request.organizationId || target.organizationId !== request.organizationId) {
      throw new Error("CROSS_TENANT_MERGE");
    }
    if (source.version !== request.expectedSourceVersion || target.version !== request.expectedTargetVersion) {
      throw new Error("CONTACT_VERSION_CONFLICT");
    }
    const targetKeys = new Set([...this.identities.entries()]
      .filter(([, item]) => item.contactId === request.targetContactId && !item.supersededBy)
      .map(([key]) => key));
    for (const [key, item] of this.identities.entries()) {
      if (item.contactId !== request.sourceContactId || item.supersededBy) continue;
      const duplicateTarget = targetKeys.has(key);
      if (duplicateTarget) {
        const targetIdentity = this.identities.get(key);
        item.supersededBy = targetIdentity?.identityId ?? null;
        item.linkStatus = "REJECTED";
      } else {
        item.contactId = request.targetContactId;
        item.version += 1;
      }
    }
    source.active = false;
    source.version += 1;
    target.version += 1;
    this.bump(request.organizationId);
  }

  async cacheVersion(organizationId: string): Promise<number> {
    return this.versions.get(organizationId) ?? 0;
  }

  contactVersion(contactId: string): number | null {
    return this.contacts.get(contactId)?.version ?? null;
  }

  private findById(identityId: string): IdentityRecord {
    const found = [...this.identities.values()].find(item => item.identityId === identityId);
    if (!found) throw new Error("IDENTITY_NOT_FOUND");
    return found;
  }

  private bump(organizationId: string): void {
    this.versions.set(organizationId, (this.versions.get(organizationId) ?? 0) + 1);
  }
}
