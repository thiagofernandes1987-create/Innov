import type {
  IdentityRegistry,
  IdentityResolution,
  ObservedChannelIdentity
} from "./contracts.js";

export class VersionedIdentityCache {
  private readonly entries = new Map<string, {
    organizationVersion: number;
    expiresAt: number;
    resolution: IdentityResolution;
  }>();

  constructor(
    private readonly registry: IdentityRegistry,
    private readonly ttlMs = 30_000,
    private readonly now: () => number = Date.now
  ) {}

  async resolve(identity: ObservedChannelIdentity): Promise<IdentityResolution> {
    const key = [
      identity.organizationId,
      identity.providerType,
      identity.providerAccountId,
      identity.namespace,
      identity.normalizedId,
      identity.deviceId ?? ""
    ].join(":");
    const organizationVersion = await this.registry.cacheVersion(identity.organizationId);
    const cached = this.entries.get(key);
    if (
      cached &&
      cached.organizationVersion === organizationVersion &&
      cached.expiresAt > this.now()
    ) {
      return cached.resolution;
    }
    const resolution = await this.registry.resolve(identity);
    this.entries.set(key, {
      organizationVersion,
      expiresAt: this.now() + this.ttlMs,
      resolution
    });
    return resolution;
  }

  invalidateOrganization(organizationId: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(`${organizationId}:`)) this.entries.delete(key);
    }
  }
}
