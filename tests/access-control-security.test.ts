import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync(new URL("../app/actions/access-control.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/app/administracao/usuarios/page.tsx", import.meta.url), "utf8");

describe("administração de acesso", () => {
  it("mantém atribuição e reconecta revogação de perfis adicionais", () => {
    expect(actions).toContain('rpc("assign_user_access_profile"');
    expect(actions).toContain("export async function revokeProfileFromUser");
    expect(actions).toContain('rpc("revoke_user_access_profile"');
    expect(page).toContain("revokeProfileFromUser");
    expect(page).toContain('name="assignmentId"');
    expect(page).toContain("Revogar perfil");
  });

  it("não encaminha mensagens técnicas de banco ao usuário", () => {
    expect(actions).toContain("reportDataAccessError");
    expect(actions).not.toContain("error.message");
    expect(actions).not.toContain("error?.message");
    expect(page).toContain("DATA_LOAD_ERROR_MESSAGE");
    expect(page).toContain("reportDataAccessError");
    expect(page).not.toContain("throw new Error(firstError.message)");
    expect(page).not.toContain("throw new Error(identityResult.error.message)");
  });
});
