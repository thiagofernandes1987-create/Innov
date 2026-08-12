"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { campoDeTexto } from "@/lib/forms/campos";

const managementRoles = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO"
] as const;

const fieldRoles = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO",
  "QUALIDADE"
] as const;

function text(formData: FormData, name: string) {
  return campoDeTexto(formData, name).trim();
}

function optionalNumber(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function optionalDate(formData: FormData, name: string) {
  const value = text(formData, name);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

function databaseFailure(path: string, operation: string, error: unknown, message: string): never {
  console.error(`[project-resource-usage.${operation}]`, error);
  fail(path, message);
}

export async function createDailyLogResource(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dailyLogId = text(formData, "dailyLogId");
  const resourceId = text(formData, "resourceId") || null;
  const path = `/app/obras/${projectId}/diario/${dailyLogId}`;
  const quantity = optionalNumber(formData, "quantity");
  const hours = optionalNumber(formData, "hours");

  if (!projectId || !dailyLogId) fail(path, "O diário informado é inválido.");
  if (quantity !== null && quantity < 0) fail(path, "A quantidade utilizada não pode ser negativa.");
  if (hours !== null && hours < 0) fail(path, "As horas utilizadas não podem ser negativas.");
  if ((quantity ?? 0) === 0 && (hours ?? 0) === 0) fail(path, "Informe quantidade ou horas utilizadas.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(fieldRoles);
  const { data: log, error: logError } = await supabase
    .from("daily_logs")
    .select("id,status")
    .eq("id", dailyLogId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (logError) databaseFailure(path, "daily-resource.validate-log", logError, "Não foi possível validar o diário.");
  if (!log) fail(path, "O diário não pertence a esta obra.");
  if (!["DRAFT", "REJECTED"].includes(log.status)) fail(path, "Recursos só podem ser registrados enquanto o diário estiver editável.");

  let resourceName = text(formData, "resourceName");
  let unit = text(formData, "unit") || "un";
  if (resourceId) {
    const { data: resource, error: resourceError } = await supabase
      .from("project_resources")
      .select("id,name,unit")
      .eq("id", resourceId)
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (resourceError) databaseFailure(path, "daily-resource.validate-resource", resourceError, "Não foi possível validar o recurso.");
    if (!resource) fail(path, "O recurso selecionado não pertence a esta obra.");
    resourceName = resource.name;
    unit = resource.unit || unit;
  }
  if (!resourceName) fail(path, "Informe ou selecione um recurso utilizado.");

  const { error } = await supabase.from("daily_log_resources").insert({
    organization_id: organizationId,
    project_id: projectId,
    daily_log_id: dailyLogId,
    resource_id: resourceId,
    resource_name: resourceName,
    unit,
    quantity,
    hours,
    notes: text(formData, "notes") || null,
    created_by: userId
  });
  if (error) databaseFailure(path, "daily-resource.insert", error, "Não foi possível registrar o recurso utilizado.");
  revalidatePath(path);
}

export async function upsertTaskResourceAllocation(formData: FormData) {
  const projectId = text(formData, "projectId");
  const taskId = text(formData, "taskId");
  const resourceId = text(formData, "resourceId");
  const path = `/app/obras/${projectId}/tarefas`;
  const plannedQuantity = optionalNumber(formData, "plannedQuantity");
  const actualQuantity = optionalNumber(formData, "actualQuantity");
  const plannedHours = optionalNumber(formData, "plannedHours");
  const actualHours = optionalNumber(formData, "actualHours");
  const plannedStart = optionalDate(formData, "plannedStart");
  const plannedEnd = optionalDate(formData, "plannedEnd");

  if (!projectId || !taskId || !resourceId) fail(path, "Selecione tarefa e recurso.");
  for (const [value, label] of [
    [plannedQuantity, "quantidade planejada"],
    [actualQuantity, "quantidade realizada"],
    [plannedHours, "horas planejadas"],
    [actualHours, "horas realizadas"]
  ] as const) {
    if (value !== null && value < 0) fail(path, `A ${label} não pode ser negativa.`);
  }
  if (plannedStart && plannedEnd && plannedEnd < plannedStart) fail(path, "A data final da alocação não pode ser anterior à inicial.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const [{ data: task, error: taskError }, { data: resource, error: resourceError }] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("project_resources")
      .select("id")
      .eq("id", resourceId)
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .maybeSingle()
  ]);
  if (taskError) databaseFailure(path, "task-allocation.validate-task", taskError, "Não foi possível validar a tarefa.");
  if (resourceError) databaseFailure(path, "task-allocation.validate-resource", resourceError, "Não foi possível validar o recurso.");
  if (!task) fail(path, "A tarefa não pertence a esta obra.");
  if (!resource) fail(path, "O recurso não pertence a esta obra.");

  const { error } = await supabase.from("task_resource_allocations").upsert({
    organization_id: organizationId,
    project_id: projectId,
    task_id: taskId,
    resource_id: resourceId,
    planned_quantity: plannedQuantity,
    actual_quantity: actualQuantity,
    planned_hours: plannedHours,
    actual_hours: actualHours,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    created_by: userId
  }, { onConflict: "task_id,resource_id" });
  if (error) databaseFailure(path, "task-allocation.upsert", error, "Não foi possível salvar a alocação do recurso.");

  revalidatePath(path);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
  revalidatePath(`/app/obras/${projectId}/equipes`);
}
