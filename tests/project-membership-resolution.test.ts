import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const taskPage = readFileSync(
  new URL("../app/app/obras/[id]/tarefas/page.tsx", import.meta.url),
  "utf8"
);
const teamsPage = readFileSync(
  new URL("../app/app/obras/[id]/equipes/page.tsx", import.meta.url),
  "utf8"
);

describe("resolução de responsáveis de projeto", () => {
  it.each([
    ["tarefas", taskPage],
    ["equipes", teamsPage]
  ])("não depende de relação implícita project_memberships → profiles em %s", (_name, source) => {
    expect(source).not.toContain('select("user_id,role,profiles(full_name)")');
    expect(source).toContain('from("project_memberships").select("user_id,role")');
    expect(source).toContain('from("profiles").select("id,full_name,email")');
  });

  it("trata falha dos perfis como indisponibilidade de suporte, não como lista vazia", () => {
    expect(taskPage).toContain("membershipsResult.error || profilesResult.error");
    expect(teamsPage).toContain("membershipsResult.error || profilesResult.error");
  });
});
