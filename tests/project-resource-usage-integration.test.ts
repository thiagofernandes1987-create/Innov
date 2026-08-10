import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync(new URL("../app/actions/project-resource-usage.ts", import.meta.url), "utf8");
const dailyPage = readFileSync(new URL("../app/app/obras/[id]/diario/[logId]/page.tsx", import.meta.url), "utf8");
const tasksPage = readFileSync(new URL("../app/app/obras/[id]/tarefas/page.tsx", import.meta.url), "utf8");

describe("recursos operacionais da obra", () => {
  it("liga daily_log_resources ao Diário com escopo e estado editável", () => {
    expect(actions).toContain("export async function createDailyLogResource");
    expect(actions).toContain('.from("daily_logs")');
    expect(actions).toContain('.eq("project_id", projectId)');
    expect(actions).toContain('.eq("organization_id", organizationId)');
    expect(actions).toContain('["DRAFT", "REJECTED"].includes(log.status)');
    expect(actions).toContain('.from("daily_log_resources").insert');
    expect(actions).not.toContain("error.message");

    expect(dailyPage).toContain('.from("daily_log_resources")');
    expect(dailyPage).toContain('.from("project_resources")');
    expect(dailyPage).toContain("action={createDailyLogResource}");
    expect(dailyPage).toContain("Recursos utilizados");
  });

  it("liga task_resource_allocations às Tarefas com tarefa e recurso da mesma obra", () => {
    expect(actions).toContain("export async function upsertTaskResourceAllocation");
    expect(actions).toContain('.from("project_tasks")');
    expect(actions).toContain('.from("project_resources")');
    expect(actions).toContain('.from("task_resource_allocations").upsert');
    expect(actions).toContain('{ onConflict: "task_id,resource_id" }');
    expect(actions).toContain('revalidatePath(`/app/obras/${projectId}/cronograma`)');

    expect(tasksPage).toContain('.from("task_resource_allocations")');
    expect(tasksPage).toContain('.from("project_resources")');
    expect(tasksPage).toContain("action={upsertTaskResourceAllocation}");
    expect(tasksPage).toContain("Alocação de recursos");
  });

  it("não expõe mensagens técnicas do banco pelas novas actions", () => {
    expect(actions).toContain("databaseFailure");
    expect(actions).toContain("console.error");
    expect(actions).not.toContain("fail(path, error.message)");
    expect(actions).not.toContain("redirect(error.message)");
  });
});
