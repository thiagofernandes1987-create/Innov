import { describe, expect, it } from "vitest";
import {
  InMemoryIdentityRegistry,
  VersionedIdentityCache,
  normalizeExternalIdentity,
  normalizeObservedIdentity,
  type ObservedChannelIdentity
} from "../apps/messaging-gateway/src/identities/index.js";

function observed(
  namespace: ObservedChannelIdentity["namespace"],
  externalId: string,
  overrides: Partial<ObservedChannelIdentity> = {}
): ObservedChannelIdentity {
  return normalizeObservedIdentity({
    organizationId: "org-1",
    channelAccountId: "account-1",
    providerType: "WHATSAPP_WEB_BAILEYS",
    providerAccountId: "provider-account-1",
    namespace,
    externalId,
    observedAt: "2026-08-04T16:00:00.000Z",
    ...overrides
  });
}

describe("Messaging identities W-11", () => {
  it("normaliza PN, LID, grupo e newsletter", () => {
    expect(normalizeExternalIdentity("WHATSAPP_PN", "+55 (11) 99999-0001"))
      .toBe("5511999990001@s.whatsapp.net");
    expect(normalizeExternalIdentity("WHATSAPP_LID", "700000000001@lid"))
      .toBe("700000000001@lid");
    expect(normalizeExternalIdentity("GROUP", "123-456@g.us")).toBe("123-456@g.us");
    expect(normalizeExternalIdentity("NEWSLETTER", "987@newsletter")).toBe("987@newsletter");
  });

  it("mantém PN e LID separados no mesmo contato observado", async () => {
    const registry = new InMemoryIdentityRegistry();
    const pn = await registry.observe(observed("WHATSAPP_PN", "+5511999990001"), "contact-1");
    const lid = await registry.observe(observed("WHATSAPP_LID", "700000000001@lid"), "contact-1");
    expect(pn.identityId).not.toBe(lid.identityId);
    const resolution = await registry.resolve(observed("WHATSAPP_LID", "700000000001@lid"));
    expect(resolution.status).toBe("RESOLVED");
    expect(resolution.identities).toHaveLength(2);
  });

  it("separa observação de confirmação do alias", async () => {
    const registry = new InMemoryIdentityRegistry();
    const pn = await registry.observe(observed("WHATSAPP_PN", "+5511999990001"), "contact-1");
    const lid = await registry.observe(observed("WHATSAPP_LID", "700000000001@lid"), "contact-1");
    expect(pn.confidence).toBe("OBSERVED");
    await registry.confirmAlias(pn.identityId, lid.identityId, "actor-1");
    const resolution = await registry.resolve(observed("WHATSAPP_PN", "+5511999990001"));
    expect(resolution.identities.every(item => item.confidence === "CONFIRMED")).toBe(true);
  });

  it("marca conflito sem mover identidade observada", async () => {
    const registry = new InMemoryIdentityRegistry();
    const identity = observed("WHATSAPP_PN", "+5511999990001");
    await registry.observe(identity, "contact-1");
    const conflict = await registry.observe(identity, "contact-2");
    expect(conflict.linkStatus).toBe("CONFLICT");
    expect(conflict.contactId).toBe("contact-1");
    expect((await registry.resolve(identity)).status).toBe("CONFLICT");
  });

  it("proíbe alias entre contatos antes de merge confirmado", async () => {
    const registry = new InMemoryIdentityRegistry();
    const first = await registry.observe(observed("WHATSAPP_PN", "+5511999990001"), "contact-1");
    const second = await registry.observe(observed("WHATSAPP_LID", "700000000002@lid"), "contact-2");
    await expect(registry.confirmAlias(first.identityId, second.identityId, "actor-1"))
      .rejects.toThrow("CONTACT_CONFIRMATION_REQUIRED");
  });

  it("merge exige versões e preserva aliases", async () => {
    const registry = new InMemoryIdentityRegistry();
    await registry.observe(observed("WHATSAPP_PN", "+5511999990001"), "contact-target");
    await registry.observe(observed("WHATSAPP_LID", "700000000003@lid"), "contact-source");
    await expect(registry.mergeContacts({
      organizationId: "org-1",
      sourceContactId: "contact-source",
      targetContactId: "contact-target",
      reason: "Deduplicação sintética",
      expectedSourceVersion: 0,
      expectedTargetVersion: 0
    })).rejects.toThrow("CONTACT_VERSION_CONFLICT");
    await registry.mergeContacts({
      organizationId: "org-1",
      sourceContactId: "contact-source",
      targetContactId: "contact-target",
      reason: "Deduplicação sintética",
      expectedSourceVersion: 1,
      expectedTargetVersion: 1
    });
    const resolution = await registry.resolve(observed("WHATSAPP_LID", "700000000003@lid"));
    expect(resolution.contactId).toBe("contact-target");
    expect(registry.contactVersion("contact-source")).toBe(2);
  });

  it("isola conflitos entre organizações", async () => {
    const registry = new InMemoryIdentityRegistry();
    await registry.observe(observed("WHATSAPP_PN", "+5511999990001"), "contact-shared");
    await expect(registry.observe(observed("WHATSAPP_LID", "700000000002@lid", {
      organizationId: "org-2"
    }), "contact-shared")).rejects.toThrow("CROSS_TENANT_CONTACT");
  });

  it("cache invalida quando a versão da organização muda", async () => {
    let now = 1_000;
    const registry = new InMemoryIdentityRegistry();
    const cache = new VersionedIdentityCache(registry, 60_000, () => now);
    const identity = observed("WHATSAPP_PN", "+5511999990001");
    expect((await cache.resolve(identity)).status).toBe("UNRESOLVED");
    await registry.observe(identity, "contact-1");
    expect((await cache.resolve(identity)).status).toBe("RESOLVED");
    now += 61_000;
    expect((await cache.resolve(identity)).contactId).toBe("contact-1");
  });
});
