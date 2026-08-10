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
const namesResolver = readFileSync(
  new URL("../lib/pessoas/nomes.ts", import.meta.url),
  "utf8"
);

describe("resolução de responsáveis de projeto", () => {
  it.each([
    ["tarefas", taskPage],
    ["equipes", teamsPage]
  ])("não depende de relação implícita project_memberships → profiles em %s", (_name, source) => {
    expect(source).not.toContain('select("user_id,role,profiles(full_name)")');
    expect(source).toContain('from("project_memberships").select("user_id,role")');
    expect(source).not.toContain('from("profiles")');
    expect(source).toContain('import { nomesDosUsuarios } from "@/lib/pessoas/nomes"');
    expect(source).toContain("await nomesDosUsuarios(supabase, memberships.map(");
  });

  it("centraliza a leitura de profiles no resolvedor compartilhado", () => {
    expect(namesResolver).toContain('from("profiles").select("id,full_name,email")');
    expect(namesResolver).toContain('.in("id", unicos)');
    expect(namesResolver).toContain("for (const linha of data ?? [])");
  });

  it("preserva memberships e usa fallback quando o nome de suporte não vem", () => {
    expect(taskPage).toContain("const memberships = membershipsResult.data ?? []");
    expect(teamsPage).toContain("const memberships = membershipsResult.data ?? []");
    expect(taskPage).toContain("nomePorUsuario.get(membership.user_id) || membership.user_id.slice(0, 8)");
    expect(teamsPage).toContain("nomePorUsuario.get(membership.user_id) || membership.user_id.slice(0, 8)");
    expect(taskPage).toContain("const supportLoadFailed = Boolean(wbsResult.error || membershipsResult.error)");
    expect(teamsPage).toContain("const membershipsLoadFailed = Boolean(membershipsResult.error)");
  });
});
