import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MESSAGING_SECURITY_ASSETS,
  MESSAGING_STRIDE_THREATS,
  MESSAGING_TRUST_BOUNDARIES,
  assertCriticalApproval,
  assertTenantScope,
  assertToolAllowed,
  buildSessionCompromisePlan,
  retentionDeadline,
  sanitizeSecurityLog
} from "@/lib/messaging/security";

function scopeHash(scope: Record<string, string>) {
  return createHash("sha256")
    .update(JSON.stringify(Object.entries(scope).sort(([a], [b]) => a.localeCompare(b))))
    .digest("hex");
}

describe("threat model W-17", () => {
  it("cobre as seis categorias STRIDE", () => {
    expect(new Set(MESSAGING_STRIDE_THREATS.map(item => item.category))).toEqual(
      new Set(["SPOOFING", "TAMPERING", "REPUDIATION", "INFORMATION_DISCLOSURE", "DENIAL_OF_SERVICE", "ELEVATION_OF_PRIVILEGE"])
    );
  });

  it("inventaria ativos e fronteiras de confiança", () => {
    expect(MESSAGING_SECURITY_ASSETS).toContain("SESSION_CREDENTIALS");
    expect(MESSAGING_SECURITY_ASSETS).toContain("AI_CONTEXT");
    expect(MESSAGING_TRUST_BOUNDARIES).toContain("ADAPTER_TO_EXTERNAL_PROVIDER");
    expect(MESSAGING_TRUST_BOUNDARIES).toContain("OPERATOR_TO_CRITICAL_WRITE");
  });

  it("redige chaves e valores secretos em logs", () => {
    const sanitized = sanitizeSecurityLog({
      authorization: "Bearer abcdefghijklmnopqrstuvwxyz",
      nested: { apiKey: "sk-abcdefghijklmnop", safe: "ok" },
      text: "token sk-1234567890abcdef"
    });
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(serialized).not.toContain("sk-1234567890abcdef");
    expect(serialized).toContain("REDACTED");
  });

  it("permite somente ferramentas da allowlist", () => {
    expect(() => assertToolAllowed("SEARCH_CANONICAL")).not.toThrow();
    expect(() => assertToolAllowed("SHELL_EXEC")).toThrow("Ferramenta não autorizada");
  });

  it("exige aprovação válida para escrita crítica", () => {
    const scope = { organizationId: "org", sessionId: "session" };
    const approval = {
      action: "DELETE_SESSION" as const,
      approvedBy: "security-reviewer",
      approvedAt: "2026-08-04T18:00:00.000Z",
      reason: "Incidente confirmado",
      expiresAt: "2026-08-04T19:00:00.000Z",
      scopeHash: scopeHash(scope)
    };
    expect(() => assertCriticalApproval({ action: "DELETE_SESSION", approval, scope, now: new Date("2026-08-04T18:30:00Z") })).not.toThrow();
    expect(() => assertCriticalApproval({ action: "DELETE_SESSION", approval: null, scope })).toThrow("requer aprovação válida");
    expect(() => assertCriticalApproval({ action: "DELETE_SESSION", approval: { ...approval, scopeHash: "x" }, scope })).toThrow();
  });

  it("calcula retenção e preserva legal hold", () => {
    expect(retentionDeadline({ retentionClass: "LEGAL_HOLD", createdAt: new Date(), policyDays: {} })).toBeNull();
    expect(
      retentionDeadline({
        retentionClass: "EPHEMERAL",
        createdAt: new Date("2026-08-04T00:00:00Z"),
        policyDays: { EPHEMERAL: 7 }
      })?.toISOString()
    ).toBe("2026-08-11T00:00:00.000Z");
    expect(() => retentionDeadline({ retentionClass: "AUDIT", createdAt: new Date(), policyDays: {} })).toThrow();
  });

  it("bloqueia acesso cross-tenant", () => {
    expect(() => assertTenantScope({ authenticatedOrganizationId: "a", resourceOrganizationId: "a" })).not.toThrow();
    expect(() => assertTenantScope({ authenticatedOrganizationId: "a", resourceOrganizationId: "b" })).toThrow("cross-tenant");
  });

  it("gera resposta ordenada para comprometimento de sessão", () => {
    const plan = buildSessionCompromisePlan();
    expect(plan.map(item => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(plan[0].action).toContain("KILL_SWITCH");
    expect(plan.filter(item => item.destructive).every(item => item.requiresApproval)).toBe(true);
    expect(plan.at(-1)?.action).toContain("SECURITY_REVIEW");
  });
});
