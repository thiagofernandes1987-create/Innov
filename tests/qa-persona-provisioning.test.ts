import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const provisioner = readFileSync(new URL("../scripts/provision-qa-personas.mjs", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("provisionamento de personas QA", () => {
  it("usa Auth Admin e nunca grava diretamente em auth.users", () => {
    expect(provisioner).toContain("supabase.auth.admin.createUser");
    expect(provisioner).toContain("supabase.auth.admin.updateUserById");
    expect(provisioner).not.toContain('.from("auth.users")');
    expect(provisioner).not.toContain("insert into auth.users");
  });

  it("exige trava explícita de homologação e lê credenciais somente do secret JSON", () => {
    expect(provisioner).toContain('process.env.ALLOW_INSECURE_DEMO_USERS !== "true"');
    expect(provisioner).toContain("process.env.QA_PERSONAS_JSON");
    expect(provisioner).toContain('key: "administrador"');
    expect(provisioner).toContain('key: "gestor_de_obras"');
    expect(provisioner).not.toMatch(/password:\s*["'][^"']+["']/);
  });

  it("associa as personas aos papéis e perfis canônicos", () => {
    expect(provisioner).toContain('role: "ADMINISTRADOR"');
    expect(provisioner).toContain('profileCode: "administrador"');
    expect(provisioner).toContain('role: "GESTOR_OBRAS"');
    expect(provisioner).toContain('profileCode: "gestor_obras"');
    expect(provisioner).toContain('from("organization_memberships")');
    expect(provisioner).toContain("access_profile_id: accessProfileId");
    expect(packageJson.scripts["provision:qa-personas"]).toBe("node scripts/provision-qa-personas.mjs");
  });
});
