import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calcular } from "../lib/planejamento/cronograma";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Planejamento ↔ Tarefas", () => {
  it("usa o mesmo motor de dependências para exibir datas efetivas no kanban", () => {
    const page = read("app/app/obras/[id]/tarefas/page.tsx");

    expect(page).toContain('.from("task_dependencies")');
    expect(page).toContain("calcular(");
    expect(page).toContain("effectiveDateByTask");
    expect(page).toContain("Data calculada pela rede de dependências");
  });

  it("não oferece duração fracionária quando o motor opera em dias úteis inteiros", () => {
    const page = read("app/app/obras/[id]/tarefas/page.tsx");
    const actions = read("app/actions/projects.ts");

    expect(page).toContain('name="durationDays" min="1" step="1"');
    expect(page).not.toContain('name="durationDays" min="0" step="0.5"');
    expect(actions).toContain("Number.isInteger(durationDays)");
    expect(actions).toContain("dias úteis inteiros");
  });

  it("protege a segunda porta de entrada com escopo e mensagem pública segura", () => {
    const actions = read("app/actions/projects.ts");

    expect(actions).toContain("publicScheduleDatabaseMessage");
    expect(actions).toContain('.eq("organization_id", organizationId)');
    expect(actions).toContain('.from("project_memberships")');
    expect(actions).toContain("O responsável selecionado não participa desta obra.");
    expect(actions).not.toContain('fail(path, error.message)');
  });

  it("mantém uma única porta canônica e segura para dependências", () => {
    const projectActions = read("app/actions/projects.ts");
    const scheduleActions = read("app/actions/schedule.ts");

    expect(projectActions).not.toContain("createScheduleDependency");
    expect(projectActions).not.toContain("function createDependency");
    expect(scheduleActions).toContain("export async function createScheduleDependency");
    expect(scheduleActions).toContain('failDatabase(projectId, "create-dependency"');
    expect(projectActions).toContain('failProjectDatabase(path, "move-task"');
    expect(projectActions).toContain('failProjectDatabase(path, "create-milestone"');
    expect(projectActions).toContain('failProjectDatabase(path, "create-baseline"');
    expect(projectActions).toContain('failProjectDatabase(path, "create-wbs"');
    expect(projectActions).not.toContain('fail(`/app/obras/${projectId}/cronograma`, error.message)');
  });

  it("confirma tarefa, obra e organização antes de movimentar o registro", () => {
    const actions = read("app/actions/projects.ts");
    const validationStart = actions.indexOf('const { data: scopedTask');
    const rpcStart = actions.indexOf('supabase.rpc("move_project_task"');

    expect(validationStart).toBeGreaterThan(-1);
    expect(rpcStart).toBeGreaterThan(validationStart);
    expect(actions.slice(validationStart, rpcStart)).toContain('.from("project_tasks")');
    expect(actions.slice(validationStart, rpcStart)).toContain('.eq("id", taskId)');
    expect(actions.slice(validationStart, rpcStart)).toContain('.eq("project_id", projectId)');
    expect(actions.slice(validationStart, rpcStart)).toContain('.eq("organization_id", organizationId)');
    expect(actions).toContain("A tarefa não pertence a esta obra.");
  });

  it("produz a mesma data efetiva para uma sucessora sem início fixado", () => {
    const result = calcular(
      [
        {
          id: "A",
          titulo: "Predecessora",
          duracaoDias: 5,
          inicioPlanejado: "2026-08-03",
          terminoPlanejado: null,
          progresso: 0
        },
        {
          id: "B",
          titulo: "Sucessora",
          duracaoDias: 3,
          inicioPlanejado: null,
          terminoPlanejado: null,
          progresso: 0
        }
      ],
      [{ predecessorId: "A", sucessorId: "B", tipo: "FS", folgaDias: 0 }]
    );

    expect(result.ciclo).toBe(false);
    expect(result.barras.find(bar => bar.id === "A")?.termino).toBe("2026-08-07");
    expect(result.barras.find(bar => bar.id === "B")?.inicio).toBe("2026-08-10");
    expect(result.barras.find(bar => bar.id === "B")?.derivada).toBe(true);
  });
});
