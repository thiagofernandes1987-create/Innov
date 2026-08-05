"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";

const scheduleRoles = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO"
] as const;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string): string | null {
  const value = text(formData, name);
  return value || null;
}

function optionalNumber(formData: FormData, name: string): number | null {
  const value = text(formData, name);
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function schedulePath(projectId: string): string {
  return projectId ? `/app/obras/${projectId}/cronograma` : "/app/obras";
}

function fail(projectId: string, message: string): never {
  redirect(`${schedulePath(projectId)}?error=${encodeURIComponent(message)}`);
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

export async function createScheduleWbs(formData: FormData) {
  const projectId = text(formData, "projectId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const plannedStart = optionalText(formData, "plannedStart");
  const plannedEnd = optionalText(formData, "plannedEnd");

  if (!projectId || !code || !title) fail(projectId, "Informe o código e o nome da etapa da EAP.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  const { error } = await supabase.from("work_breakdown_items").insert({
    organization_id: organizationId,
    project_id: projectId,
    parent_id: optionalText(formData, "parentId"),
    code,
    title,
    description: optionalText(formData, "description"),
    sequence: optionalNumber(formData, "sequence") ?? 0,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    client_visible: true,
    created_by: userId
  });

  if (error) fail(projectId, error.message);
  revalidateSchedule(projectId);
}

export async function createScheduleTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const plannedStart = optionalText(formData, "plannedStart");
  const plannedEnd = optionalText(formData, "plannedEnd");
  const durationDays = optionalNumber(formData, "durationDays") ?? 1;

  if (!projectId || !code || !title) fail(projectId, "Informe o código e o nome da atividade.");
  if (durationDays < 0) fail(projectId, "A duração não pode ser negativa.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  const { error } = await supabase.from("project_tasks").insert({
    organization_id: organizationId,
    project_id: projectId,
    wbs_id: optionalText(formData, "wbsId"),
    parent_task_id: optionalText(formData, "parentTaskId"),
    code,
    title,
    description: optionalText(formData, "description"),
    status: "BACKLOG",
    priority: "NORMAL",
    sequence: optionalNumber(formData, "sequence") ?? 0,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    duration_days: durationDays,
    progress: 0,
    client_visible: true,
    created_by: userId
  });

  if (error) fail(projectId, error.message);
  revalidateSchedule(projectId);
}

export async function updateScheduleTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const taskId = text(formData, "taskId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const plannedStart = optionalText(formData, "plannedStart");
  const plannedEnd = optionalText(formData, "plannedEnd");
  const durationDays = optionalNumber(formData, "durationDays") ?? 1;
  const progressPercent = optionalNumber(formData, "progressPercent") ?? 0;

  if (!projectId || !taskId || !code || !title) fail(projectId, "A atividade está incompleta.");
  if (durationDays < 0) fail(projectId, "A duração não pode ser negativa.");
  if (progressPercent < 0 || progressPercent > 100) fail(projectId, "O avanço deve ficar entre 0% e 100%.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId } = await requireOrganizationContext(scheduleRoles);
  const { error } = await supabase
    .from("project_tasks")
    .update({
      wbs_id: optionalText(formData, "wbsId"),
      parent_task_id: optionalText(formData, "parentTaskId"),
      code,
      title,
      description: optionalText(formData, "description"),
      status: text(formData, "status") || "BACKLOG",
      priority: text(formData, "priority") || "NORMAL",
      sequence: optionalNumber(formData, "sequence") ?? 0,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      duration_days: durationDays,
      progress: progressPercent / 100,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId);

  if (error) fail(projectId, error.message);
  revalidateSchedule(projectId);
}

export async function createScheduleDependency(formData: FormData) {
  const projectId = text(formData, "projectId");
  const predecessorTaskId = text(formData, "predecessorTaskId");
  const successorTaskId = text(formData, "successorTaskId");

  if (!projectId || !predecessorTaskId || !successorTaskId) {
    fail(projectId, "Selecione a atividade predecessora e a sucessora.");
  }
  if (predecessorTaskId === successorTaskId) {
    fail(projectId, "Uma atividade não pode depender dela mesma.");
  }

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  const { error } = await supabase.from("task_dependencies").insert({
    organization_id: organizationId,
    project_id: projectId,
    predecessor_task_id: predecessorTaskId,
    successor_task_id: successorTaskId,
    dependency_type: text(formData, "dependencyType") || "FS",
    lag_days: optionalNumber(formData, "lagDays") ?? 0,
    created_by: userId
  });

  if (error) fail(projectId, error.message);
  revalidateSchedule(projectId);
}

export async function deleteScheduleDependency(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dependencyId = text(formData, "dependencyId");
  if (!projectId || !dependencyId) fail(projectId, "Relação de dependência inválida.");

  const { supabase, organizationId } = await requireOrganizationContext(scheduleRoles);
  const { error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("id", dependencyId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId);

  if (error) fail(projectId, error.message);
  revalidateSchedule(projectId);
}
