"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { proximoCodigo } from "@/lib/planejamento/eap";
import {
  isScheduleDependencyType,
  publicScheduleDatabaseMessage,
  wouldCreateScheduleCycle,
  wouldCreateTaskHierarchyCycle,
  type ScheduleDatabaseError
} from "@/lib/planejamento/schedule-validation";
import { ESCOPOS, registrarValorUsado } from "@/lib/sugestoes/servidor";

const scheduleRoles = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO"
] as const;

const taskStatuses = new Set(["BACKLOG", "READY", "IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED", "CANCELED"]);
const taskPriorities = new Set(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

type ScheduleContext = Awaited<ReturnType<typeof requireOrganizationContext>>;
type ScheduleSupabase = ScheduleContext["supabase"];

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string): string | null {
  const value = text(formData, name);
  return value || null;
}

function schedulePath(projectId: string): string {
  return projectId ? `/app/obras/${projectId}/cronograma` : "/app/obras";
}

function fail(projectId: string, message: string): never {
  redirect(`${schedulePath(projectId)}?error=${encodeURIComponent(message)}`);
}

function failDatabase(
  projectId: string,
  operation: string,
  error: ScheduleDatabaseError,
  fallback: string
): never {
  reportDataAccessError(`schedule.${operation}`, error);
  fail(projectId, publicScheduleDatabaseMessage(error, fallback));
}

function optionalIsoDate(formData: FormData, name: string, projectId: string): string | null {
  const value = optionalText(formData, name);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(projectId, "Informe uma data válida.");
  }
  return value;
}

function wholeNumber(
  formData: FormData,
  name: string,
  projectId: string,
  options: { defaultValue: number; min: number; max: number; label: string }
): number {
  const raw = text(formData, name);
  if (!raw) return options.defaultValue;
  const value = Number(raw.replace(",", "."));
  if (!Number.isInteger(value) || value < options.min || value > options.max) {
    fail(projectId, `${options.label} deve ser um número inteiro entre ${options.min} e ${options.max}.`);
  }
  return value;
}

function validatePeriod(projectId: string, start: string | null, end: string | null): void {
  if (start && end && end < start) {
    fail(projectId, "A data de término não pode ser anterior à data de início.");
  }
}

function revalidateSchedule(projectId: string): void {
  revalidatePath(schedulePath(projectId));
  revalidatePath(`/app/obras/${projectId}/eap`);
  revalidatePath(`/app/obras/${projectId}/tarefas`);
}

async function ensureWbsBelongsToProject(
  supabase: ScheduleSupabase,
  organizationId: string,
  projectId: string,
  wbsId: string | null
): Promise<void> {
  if (!wbsId) return;
  const { data, error } = await supabase
    .from("work_breakdown_items")
    .select("id")
    .eq("id", wbsId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) failDatabase(projectId, "validate-wbs", error, "Não foi possível validar a etapa da EAP.");
  if (!data) fail(projectId, "A etapa da EAP selecionada não pertence a esta obra.");
}

async function validateTaskPlacement(
  supabase: ScheduleSupabase,
  organizationId: string,
  projectId: string,
  taskId: string | null,
  wbsId: string | null,
  parentTaskId: string | null
): Promise<void> {
  await ensureWbsBelongsToProject(supabase, organizationId, projectId, wbsId);

  const { data, error } = await supabase
    .from("project_tasks")
    .select("id,parent_task_id")
    .eq("project_id", projectId)
    .eq("organization_id", organizationId);
  if (error) failDatabase(projectId, "validate-task-placement", error, "Não foi possível validar a hierarquia da atividade.");

  const tasks = data ?? [];
  if (parentTaskId && !tasks.some(task => task.id === parentTaskId)) {
    fail(projectId, "A atividade superior selecionada não pertence a esta obra.");
  }

  if (taskId) {
    if (!tasks.some(task => task.id === taskId)) fail(projectId, "A atividade não pertence a esta obra.");
    const parentByTask = new Map<string, string | null>(
      tasks.map(task => [task.id, task.parent_task_id ?? null])
    );
    if (wouldCreateTaskHierarchyCycle(parentByTask, taskId, parentTaskId)) {
      fail(projectId, "A atividade superior criaria um ciclo na hierarquia.");
    }
  }
}

async function automaticWbsCode(
  supabase: ScheduleSupabase,
  organizationId: string,
  projectId: string,
  parentId: string | null,
  informed: string
): Promise<string> {
  if (informed) return informed;
  const { data, error } = await supabase
    .from("work_breakdown_items")
    .select("id,code")
    .eq("project_id", projectId)
    .eq("organization_id", organizationId);
  if (error) failDatabase(projectId, "number-wbs", error, "Não foi possível calcular o próximo código da EAP.");

  const rows = data ?? [];
  const parentCode = parentId
    ? String(rows.find(row => row.id === parentId)?.code ?? "") || null
    : null;
  if (parentId && !parentCode) fail(projectId, "A etapa superior não pôde ser usada para numerar a nova etapa.");
  return proximoCodigo(rows.map(row => String(row.code ?? "")), parentCode);
}

async function automaticTaskCode(
  supabase: ScheduleSupabase,
  organizationId: string,
  projectId: string,
  wbsId: string | null,
  informed: string
): Promise<string> {
  if (informed) return informed;
  const [{ data: tasks, error: taskError }, wbsResult] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("code")
      .eq("project_id", projectId)
      .eq("organization_id", organizationId),
    wbsId
      ? supabase
          .from("work_breakdown_items")
          .select("code")
          .eq("id", wbsId)
          .eq("project_id", projectId)
          .eq("organization_id", organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (taskError) failDatabase(projectId, "number-task", taskError, "Não foi possível calcular o próximo código da atividade.");
  if (wbsResult.error) failDatabase(projectId, "number-task-wbs", wbsResult.error, "Não foi possível consultar a etapa da EAP.");
  const parentCode = wbsResult.data ? String(wbsResult.data.code ?? "") || null : null;
  return proximoCodigo((tasks ?? []).map(task => String(task.code ?? "")), parentCode);
}

async function createModelActivities(
  supabase: ScheduleSupabase,
  formData: FormData,
  context: {
    projectId: string;
    organizationId: string;
    userId: string;
    wbsId: string;
    wbsCode: string;
  }
): Promise<void> {
  const selected = [...new Set(
    formData
      .getAll("atividadeDoModelo")
      .map(value => String(value).trim().slice(0, 160))
      .filter(Boolean)
  )].slice(0, 50);
  if (!selected.length) return;

  const { data: existing, error: existingError } = await supabase
    .from("project_tasks")
    .select("code,sequence")
    .eq("project_id", context.projectId)
    .eq("organization_id", context.organizationId);
  if (existingError) {
    console.error("[schedule.create-model-activities.list]", existingError);
    return;
  }

  const assignedCodes = (existing ?? []).map(row => String(row.code ?? ""));
  const maxSequence = (existing ?? []).reduce((max, row) => Math.max(max, Number(row.sequence) || 0), 0);
  const rows = selected.map((title, index) => {
    const code = proximoCodigo(assignedCodes, context.wbsCode);
    assignedCodes.push(code);
    return {
      organization_id: context.organizationId,
      project_id: context.projectId,
      wbs_id: context.wbsId,
      parent_task_id: null,
      code,
      title,
      status: "BACKLOG",
      priority: "NORMAL",
      sequence: maxSequence + index + 1,
      duration_days: 1,
      progress: 0,
      client_visible: true,
      created_by: context.userId
    };
  });

  const { error } = await supabase.from("project_tasks").insert(rows);
  if (error) {
    console.error("[schedule.create-model-activities.insert]", error);
    return;
  }
  for (const title of selected) {
    await registrarValorUsado(supabase, context.organizationId, ESCOPOS.atividadeDaEap, title);
  }
}

export async function createScheduleWbs(formData: FormData) {
  const projectId = text(formData, "projectId");
  const informedCode = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const parentId = optionalText(formData, "parentId");
  const plannedStart = optionalIsoDate(formData, "plannedStart", projectId);
  const plannedEnd = optionalIsoDate(formData, "plannedEnd", projectId);
  const sequence = wholeNumber(formData, "sequence", projectId, {
    defaultValue: 0,
    min: 0,
    max: 1_000_000,
    label: "A ordem"
  });

  if (!projectId || !title) fail(projectId, "Informe o nome da etapa da EAP.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  await ensureWbsBelongsToProject(supabase, organizationId, projectId, parentId);
  const code = await automaticWbsCode(supabase, organizationId, projectId, parentId, informedCode);

  const { data: created, error } = await supabase
    .from("work_breakdown_items")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      parent_id: parentId,
      code,
      title,
      description: optionalText(formData, "description"),
      sequence,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      client_visible: true,
      created_by: userId
    })
    .select("id")
    .maybeSingle();

  if (error) failDatabase(projectId, "create-wbs", error, "Não foi possível adicionar a etapa da EAP.");
  if (!created) fail(projectId, "A etapa foi processada, mas o registro criado não pôde ser confirmado.");

  await registrarValorUsado(supabase, organizationId, ESCOPOS.etapaDaEap, title);
  await createModelActivities(supabase, formData, {
    projectId,
    organizationId,
    userId,
    wbsId: created.id,
    wbsCode: code
  });
  revalidateSchedule(projectId);
}

export async function createScheduleTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const informedCode = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const wbsId = optionalText(formData, "wbsId");
  const parentTaskId = optionalText(formData, "parentTaskId");
  const plannedStart = optionalIsoDate(formData, "plannedStart", projectId);
  const plannedEnd = optionalIsoDate(formData, "plannedEnd", projectId);
  const durationDays = wholeNumber(formData, "durationDays", projectId, {
    defaultValue: 1,
    min: 1,
    max: 36_500,
    label: "A duração"
  });
  const sequence = wholeNumber(formData, "sequence", projectId, {
    defaultValue: 0,
    min: 0,
    max: 1_000_000,
    label: "A ordem"
  });

  if (!projectId || !title) fail(projectId, "Informe o nome da atividade.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  await validateTaskPlacement(supabase, organizationId, projectId, null, wbsId, parentTaskId);
  const code = await automaticTaskCode(supabase, organizationId, projectId, wbsId, informedCode);

  const { error } = await supabase.from("project_tasks").insert({
    organization_id: organizationId,
    project_id: projectId,
    wbs_id: wbsId,
    parent_task_id: parentTaskId,
    code,
    title,
    description: optionalText(formData, "description"),
    status: "BACKLOG",
    priority: "NORMAL",
    sequence,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    duration_days: durationDays,
    progress: 0,
    client_visible: true,
    created_by: userId
  });

  if (error) failDatabase(projectId, "create-task", error, "Não foi possível adicionar a atividade.");
  await registrarValorUsado(supabase, organizationId, ESCOPOS.atividadeDaEap, title);
  revalidateSchedule(projectId);
}

export async function updateScheduleTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const taskId = text(formData, "taskId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const wbsId = optionalText(formData, "wbsId");
  const parentTaskId = optionalText(formData, "parentTaskId");
  const plannedStart = optionalIsoDate(formData, "plannedStart", projectId);
  const plannedEnd = optionalIsoDate(formData, "plannedEnd", projectId);
  const durationDays = wholeNumber(formData, "durationDays", projectId, {
    defaultValue: 1,
    min: 1,
    max: 36_500,
    label: "A duração"
  });
  const progressPercent = wholeNumber(formData, "progressPercent", projectId, {
    defaultValue: 0,
    min: 0,
    max: 100,
    label: "O avanço"
  });
  const sequence = wholeNumber(formData, "sequence", projectId, {
    defaultValue: 0,
    min: 0,
    max: 1_000_000,
    label: "A ordem"
  });
  const status = text(formData, "status") || "BACKLOG";
  const priority = text(formData, "priority") || "NORMAL";

  if (!projectId || !taskId || !code || !title) fail(projectId, "A atividade está incompleta.");
  if (!taskStatuses.has(status)) fail(projectId, "O status selecionado é inválido.");
  if (!taskPriorities.has(priority)) fail(projectId, "A prioridade selecionada é inválida.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId } = await requireOrganizationContext(scheduleRoles);
  await validateTaskPlacement(supabase, organizationId, projectId, taskId, wbsId, parentTaskId);

  const { data, error } = await supabase
    .from("project_tasks")
    .update({
      wbs_id: wbsId,
      parent_task_id: parentTaskId,
      code,
      title,
      description: optionalText(formData, "description"),
      status,
      priority,
      sequence,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      duration_days: durationDays,
      progress: progressPercent / 100,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) failDatabase(projectId, "update-task", error, "Não foi possível salvar a atividade.");
  if (!data) fail(projectId, "A atividade não existe mais ou não pertence a esta obra.");
  revalidateSchedule(projectId);
}

export async function createScheduleDependency(formData: FormData) {
  const projectId = text(formData, "projectId");
  const predecessorTaskId = text(formData, "predecessorTaskId");
  const successorTaskId = text(formData, "successorTaskId");
  const dependencyType = text(formData, "dependencyType") || "FS";
  const lagDays = wholeNumber(formData, "lagDays", projectId, {
    defaultValue: 0,
    min: -3_650,
    max: 3_650,
    label: "A defasagem"
  });

  if (!projectId || !predecessorTaskId || !successorTaskId) {
    fail(projectId, "Selecione a atividade predecessora e a sucessora.");
  }
  if (!isScheduleDependencyType(dependencyType)) fail(projectId, "O tipo de dependência é inválido.");
  if (predecessorTaskId === successorTaskId) fail(projectId, "Uma atividade não pode depender dela mesma.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  const [{ data: tasks, error: tasksError }, { data: dependencies, error: dependenciesError }] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id")
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .in("id", [predecessorTaskId, successorTaskId]),
    supabase
      .from("task_dependencies")
      .select("predecessor_task_id,successor_task_id")
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
  ]);

  if (tasksError) failDatabase(projectId, "validate-dependency-tasks", tasksError, "Não foi possível validar as atividades selecionadas.");
  if (dependenciesError) failDatabase(projectId, "validate-dependency-graph", dependenciesError, "Não foi possível validar a rede de dependências.");
  if ((tasks ?? []).length !== 2) fail(projectId, "As duas atividades devem pertencer a esta obra.");

  const edges = (dependencies ?? []).map(dependency => ({
    predecessorId: dependency.predecessor_task_id,
    successorId: dependency.successor_task_id
  }));
  if (edges.some(edge => edge.predecessorId === predecessorTaskId && edge.successorId === successorTaskId)) {
    fail(projectId, "Essa relação entre as atividades já está cadastrada.");
  }
  if (wouldCreateScheduleCycle(edges, predecessorTaskId, successorTaskId)) {
    fail(projectId, "A relação criaria um ciclo no cronograma e não foi salva.");
  }

  const { error } = await supabase.from("task_dependencies").insert({
    organization_id: organizationId,
    project_id: projectId,
    predecessor_task_id: predecessorTaskId,
    successor_task_id: successorTaskId,
    dependency_type: dependencyType,
    lag_days: lagDays,
    created_by: userId
  });

  if (error) failDatabase(projectId, "create-dependency", error, "Não foi possível adicionar a dependência.");
  revalidateSchedule(projectId);
}

export async function deleteScheduleDependency(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dependencyId = text(formData, "dependencyId");
  if (!projectId || !dependencyId) fail(projectId, "Relação de dependência inválida.");

  const { supabase, organizationId } = await requireOrganizationContext(scheduleRoles);
  const { data, error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("id", dependencyId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) failDatabase(projectId, "delete-dependency", error, "Não foi possível remover a dependência.");
  if (!data) fail(projectId, "A dependência não existe mais ou não pertence a esta obra.");
  revalidateSchedule(projectId);
}
