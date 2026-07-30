import { readFile, writeFile } from "node:fs/promises";

const tasksPagePath = "app/app/obras/[id]/tarefas/page.tsx";
const projectsActionPath = "app/actions/projects.ts";
const cronogramaPath = "lib/planejamento/cronograma.ts";

let page = await readFile(tasksPagePath, "utf8");
let actions = await readFile(projectsActionPath, "utf8");
let cronograma = await readFile(cronogramaPath, "utf8");

function replaceExact(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Trecho não encontrado: ${label}`);
  return source.replace(from, to);
}

page = replaceExact(
  page,
  `import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";\nimport { formatDate, formatPercent, taskColumns, taskStatusLabels } from "@/lib/stage12";`,
  `import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";\nimport { calcular, type Dependencia, type TipoDependencia } from "@/lib/planejamento/cronograma";\nimport { formatDate, formatPercent, taskColumns, taskStatusLabels } from "@/lib/stage12";`,
  "imports do motor"
);

page = replaceExact(
  page,
  `  const [projectResult, tasksResult, wbsResult, membershipsResult] = await Promise.all([`,
  `  const [projectResult, tasksResult, dependenciesResult, wbsResult, membershipsResult] = await Promise.all([`,
  "Promise.all"
);

page = replaceExact(
  page,
  `    supabase.from("project_tasks").select("id,code,title,description,status,priority,progress,weight,planned_start,planned_end,responsible_id,blocked_reason,client_visible,wbs_id").eq("project_id", id).order("sequence"),\n    supabase.from("work_breakdown_items")`,
  `    supabase.from("project_tasks").select("id,code,title,description,status,priority,progress,weight,planned_start,planned_end,duration_days,responsible_id,blocked_reason,client_visible,wbs_id").eq("project_id", id).order("sequence"),\n    supabase.from("task_dependencies").select("predecessor_task_id,successor_task_id,dependency_type,lag_days").eq("project_id", id).eq("organization_id", organizationId),\n    supabase.from("work_breakdown_items")`,
  "consultas de tarefas e dependências"
);

page = replaceExact(
  page,
  `  reportDataAccessError("project-tasks.collection", tasksResult.error);\n  reportDataAccessError("project-tasks.wbs", wbsResult.error);`,
  `  reportDataAccessError("project-tasks.collection", tasksResult.error);\n  reportDataAccessError("project-tasks.dependencies", dependenciesResult.error);\n  reportDataAccessError("project-tasks.wbs", wbsResult.error);`,
  "observabilidade das dependências"
);

page = replaceExact(
  page,
  `  const tasksLoadFailed = Boolean(tasksResult.error);\n  const supportLoadFailed = Boolean(wbsResult.error || membershipsResult.error);`,
  `  const tasksLoadFailed = Boolean(tasksResult.error || dependenciesResult.error);\n  const supportLoadFailed = Boolean(wbsResult.error || membershipsResult.error);\n  const schedule = calcular(\n    tasks\n      .filter(task => task.status !== "CANCELED")\n      .map(task => ({\n        id: task.id,\n        titulo: \`${'${task.code}'} · ${'${task.title}'}\`,\n        duracaoDias: Number(task.duration_days ?? 1),\n        inicioPlanejado: task.planned_start,\n        terminoPlanejado: task.planned_end,\n        progresso: Number(task.progress) || 0\n      })),\n    (dependenciesResult.data ?? []).map(dependency => ({\n      predecessorId: dependency.predecessor_task_id,\n      sucessorId: dependency.successor_task_id,\n      tipo: dependency.dependency_type as TipoDependencia,\n      folgaDias: Number(dependency.lag_days) || 0\n    } satisfies Dependencia))\n  );\n  const effectiveDateByTask = new Map(schedule.barras.map(bar => [bar.id, bar]));`,
  "cálculo efetivo"
);

page = replaceExact(
  page,
  `                {columnTasks.map((task) => (\n                  <article key={task.id} className="task-card">`,
  `                {columnTasks.map((task) => {\n                  const effective = effectiveDateByTask.get(task.id);\n                  return (\n                  <article key={task.id} className="task-card">`,
  "abertura do map"
);

page = replaceExact(
  page,
  `                    <p className="muted" style={{ fontSize: 12 }}>{formatDate(task.planned_start)} → {formatDate(task.planned_end)} · Peso {formatPercent(task.weight, 1)}</p>`,
  `                    <p className="muted" style={{ fontSize: 12 }}>\n                      {formatDate(effective?.inicio ?? task.planned_start)} → {formatDate(effective?.termino ?? task.planned_end)} · Peso {formatPercent(task.weight, 1)}\n                      {effective?.derivada ? <span className="badge" title="Data calculada pela rede de dependências">Calculada</span> : null}\n                    </p>`,
  "datas efetivas"
);

page = replaceExact(
  page,
  `                  </article>\n                ))}`,
  `                  </article>\n                  );\n                })}`,
  "fechamento do map"
);

page = replaceExact(
  page,
  `<label>Duração (dias)<input type="number" name="durationDays" min="0" step="0.5" defaultValue="1" /></label>`,
  `<label>Duração (dias úteis)<input type="number" name="durationDays" min="1" step="1" defaultValue="1" /></label>`,
  "precisão do formulário"
);

// Projetos: a porta de entrada antiga passa a aplicar as mesmas invariantes mínimas.
actions = replaceExact(
  actions,
  `import { requireOrganizationContext } from "@/lib/auth";`,
  `import { requireOrganizationContext } from "@/lib/auth";\nimport { publicScheduleDatabaseMessage } from "@/lib/planejamento/schedule-validation";`,
  "import de erro seguro"
);

const createTaskFrom = `export async function createTask(formData: FormData) {\n  const projectId = text(formData, "projectId");\n  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);\n  const plannedStart = optionalText(formData, "plannedStart");\n  const plannedEnd = optionalText(formData, "plannedEnd");\n\n  const { error } = await supabase.from("project_tasks").insert({\n    organization_id: organizationId,\n    project_id: projectId,\n    wbs_id: optionalText(formData, "wbsId"),\n    parent_task_id: optionalText(formData, "parentTaskId"),\n    code: text(formData, "code").toUpperCase(),\n    title: text(formData, "title"),\n    description: optionalText(formData, "description"),\n    status: text(formData, "status") || "BACKLOG",\n    priority: text(formData, "priority") || "NORMAL",\n    sequence: optionalNumber(formData, "sequence") ?? 0,\n    planned_start: plannedStart,\n    planned_end: plannedEnd,\n    duration_days: optionalNumber(formData, "durationDays") ?? 1,\n    weight: (optionalNumber(formData, "weightPercent") ?? 0) / 100,\n    responsible_id: optionalText(formData, "responsibleId"),\n    client_visible: bool(formData, "clientVisible"),\n    created_by: userId\n  });\n  if (error) fail(\`/app/obras/${'${projectId}'}/tarefas\`, error.message);\n  revalidatePath(\`/app/obras/${'${projectId}'}/tarefas\`);\n  revalidatePath(\`/app/obras/${'${projectId}'}/cronograma\`);\n}`;

const createTaskTo = `export async function createTask(formData: FormData) {\n  const projectId = text(formData, "projectId");\n  const path = \`/app/obras/${'${projectId}'}/tarefas\`;\n  const code = text(formData, "code").toUpperCase();\n  const title = text(formData, "title");\n  const plannedStart = optionalText(formData, "plannedStart");\n  const plannedEnd = optionalText(formData, "plannedEnd");\n  const durationDays = optionalNumber(formData, "durationDays") ?? 1;\n  const sequence = optionalNumber(formData, "sequence") ?? 0;\n  const weightPercent = optionalNumber(formData, "weightPercent") ?? 0;\n  const status = text(formData, "status") || "BACKLOG";\n  const priority = text(formData, "priority") || "NORMAL";\n  const wbsId = optionalText(formData, "wbsId");\n  const responsibleId = optionalText(formData, "responsibleId");\n\n  if (!projectId || !code || !title) fail(path, "Informe código e título da atividade.");\n  if (plannedStart && plannedEnd && plannedEnd < plannedStart) fail(path, "A data de término não pode ser anterior à data de início.");\n  if (!Number.isInteger(durationDays) || durationDays < 1) fail(path, "A duração deve ser informada em dias úteis inteiros, a partir de 1.");\n  if (!Number.isInteger(sequence) || sequence < 0) fail(path, "A sequência deve ser um número inteiro não negativo.");\n  if (weightPercent < 0 || weightPercent > 100) fail(path, "O peso deve ficar entre 0% e 100%.");\n  if (!["BACKLOG", "READY", "IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED", "CANCELED"].includes(status)) fail(path, "O status selecionado é inválido.");\n  if (!["LOW", "NORMAL", "HIGH", "CRITICAL"].includes(priority)) fail(path, "A prioridade selecionada é inválida.");\n\n  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);\n  if (wbsId) {\n    const { data: wbs, error: wbsError } = await supabase\n      .from("work_breakdown_items")\n      .select("id")\n      .eq("id", wbsId)\n      .eq("project_id", projectId)\n      .eq("organization_id", organizationId)\n      .maybeSingle();\n    if (wbsError) {\n      console.error("[projects.create-task.wbs]", wbsError);\n      fail(path, publicScheduleDatabaseMessage(wbsError, "Não foi possível validar a etapa da EAP."));\n    }\n    if (!wbs) fail(path, "A etapa da EAP selecionada não pertence a esta obra.");\n  }\n  if (responsibleId) {\n    const { data: membership, error: membershipError } = await supabase\n      .from("project_memberships")\n      .select("user_id")\n      .eq("project_id", projectId)\n      .eq("user_id", responsibleId)\n      .eq("active", true)\n      .maybeSingle();\n    if (membershipError) {\n      console.error("[projects.create-task.responsible]", membershipError);\n      fail(path, publicScheduleDatabaseMessage(membershipError, "Não foi possível validar o responsável."));\n    }\n    if (!membership) fail(path, "O responsável selecionado não participa desta obra.");\n  }\n\n  const { error } = await supabase.from("project_tasks").insert({\n    organization_id: organizationId,\n    project_id: projectId,\n    wbs_id: wbsId,\n    parent_task_id: null,\n    code,\n    title,\n    description: optionalText(formData, "description"),\n    status,\n    priority,\n    sequence,\n    planned_start: plannedStart,\n    planned_end: plannedEnd,\n    duration_days: durationDays,\n    weight: weightPercent / 100,\n    responsible_id: responsibleId,\n    client_visible: bool(formData, "clientVisible"),\n    created_by: userId\n  });\n  if (error) {\n    console.error("[projects.create-task]", error);\n    fail(path, publicScheduleDatabaseMessage(error, "Não foi possível adicionar a atividade."));\n  }\n  revalidatePath(path);\n  revalidatePath(\`/app/obras/${'${projectId}'}/cronograma\`);\n}`;

actions = replaceExact(actions, createTaskFrom, createTaskTo, "action createTask");

cronograma = cronograma.replace(
  " * Devolve `null` quando há ciclo. O banco já recusa ciclo na escrita, mas esta",
  " * Devolve `null` quando há ciclo. A aplicação recusa ciclo antes da escrita; uma"
).replace(
  " * função também roda sobre dados que chegaram por importação ou por uma versão",
  " * RPC transacional ainda é necessária para serializar gravações concorrentes. Esta função"
).replace(
  " * anterior do esquema — e travar a tela num laço infinito é pior que desenhar",
  " * também protege dados importados ou de versões anteriores — e travar a tela é pior que desenhar"
);

await writeFile(tasksPagePath, page);
await writeFile(projectsActionPath, actions);
await writeFile(cronogramaPath, cronograma);
console.log("Integração Planejamento ↔ Tarefas corrigida.");
