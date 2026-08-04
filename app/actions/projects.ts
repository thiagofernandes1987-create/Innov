"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { ESCOPOS, registrarValorUsado } from "@/lib/sugestoes/servidor";

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
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function optionalNumber(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function releaseProjectToClient(formData: FormData) {
  const projectId = text(formData, "projectId");
  const release = text(formData, "release") !== "false";
  const { supabase } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase
    .from("projects")
    .update({ client_released_at: release ? new Date().toISOString() : null })
    .eq("id", projectId);
  if (error) fail(`/app/obras/${projectId}`, error.message);
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath("/cliente/obras");
}

export async function createWbsItem(formData: FormData) {
  const projectId = text(formData, "projectId");
  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.from("work_breakdown_items").insert({
    organization_id: organizationId,
    project_id: projectId,
    parent_id: optionalText(formData, "parentId"),
    code: text(formData, "code").toUpperCase(),
    title: text(formData, "title"),
    description: optionalText(formData, "description"),
    sequence: optionalNumber(formData, "sequence") ?? 0,
    weight: (optionalNumber(formData, "weightPercent") ?? 0) / 100,
    planned_start: optionalText(formData, "plannedStart"),
    planned_end: optionalText(formData, "plannedEnd"),
    client_visible: bool(formData, "clientVisible"),
    created_by: userId
  });
  if (error) fail(`/app/obras/${projectId}/eap`, error.message);
  revalidatePath(`/app/obras/${projectId}/eap`);
}

export async function createTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const plannedStart = optionalText(formData, "plannedStart");
  const plannedEnd = optionalText(formData, "plannedEnd");

  const { error } = await supabase.from("project_tasks").insert({
    organization_id: organizationId,
    project_id: projectId,
    wbs_id: optionalText(formData, "wbsId"),
    parent_task_id: optionalText(formData, "parentTaskId"),
    code: text(formData, "code").toUpperCase(),
    title: text(formData, "title"),
    description: optionalText(formData, "description"),
    status: text(formData, "status") || "BACKLOG",
    priority: text(formData, "priority") || "NORMAL",
    sequence: optionalNumber(formData, "sequence") ?? 0,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    duration_days: optionalNumber(formData, "durationDays") ?? 1,
    weight: (optionalNumber(formData, "weightPercent") ?? 0) / 100,
    responsible_id: optionalText(formData, "responsibleId"),
    client_visible: bool(formData, "clientVisible"),
    created_by: userId
  });
  if (error) fail(`/app/obras/${projectId}/tarefas`, error.message);
  revalidatePath(`/app/obras/${projectId}/tarefas`);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
}

export async function moveTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const taskId = text(formData, "taskId");
  const { supabase } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.rpc("move_project_task", {
    p_task_id: taskId,
    p_status: text(formData, "status"),
    p_progress: optionalNumber(formData, "progressPercent") == null
      ? null
      : (optionalNumber(formData, "progressPercent") as number) / 100,
    p_reason: optionalText(formData, "reason")
  });
  if (error) fail(`/app/obras/${projectId}/tarefas`, error.message);
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath(`/app/obras/${projectId}/tarefas`);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
  revalidatePath("/cliente/obras");
}

export async function createMilestone(formData: FormData) {
  const projectId = text(formData, "projectId");
  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.from("project_milestones").insert({
    organization_id: organizationId,
    project_id: projectId,
    code: text(formData, "code").toUpperCase(),
    title: text(formData, "title"),
    description: optionalText(formData, "description"),
    planned_date: text(formData, "plannedDate"),
    client_visible: bool(formData, "clientVisible"),
    created_by: userId
  });
  if (error) fail(`/app/obras/${projectId}/cronograma`, error.message);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
}

export async function createBaseline(formData: FormData) {
  const projectId = text(formData, "projectId");
  const { supabase } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.rpc("create_schedule_baseline", {
    p_project_id: projectId,
    p_name: text(formData, "name"),
    p_notes: optionalText(formData, "notes")
  });
  if (error) fail(`/app/obras/${projectId}/cronograma`, error.message);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
}

export async function createProjectResource(formData: FormData) {
  const projectId = text(formData, "projectId");
  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.from("project_resources").insert({
    organization_id: organizationId,
    project_id: projectId,
    resource_type: text(formData, "resourceType"),
    code: optionalText(formData, "code")?.toUpperCase() ?? null,
    name: text(formData, "name"),
    unit: text(formData, "unit") || "un",
    hourly_cost: optionalNumber(formData, "hourlyCost"),
    daily_cost: optionalNumber(formData, "dailyCost"),
    created_by: userId
  });
  if (error) fail(`/app/obras/${projectId}/equipes`, error.message);
  revalidatePath(`/app/obras/${projectId}/equipes`);
}

export async function createTeam(formData: FormData) {
  const projectId = text(formData, "projectId");
  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.from("project_teams").insert({
    organization_id: organizationId,
    project_id: projectId,
    name: text(formData, "name"),
    specialty: optionalText(formData, "specialty"),
    leader_user_id: optionalText(formData, "leaderUserId"),
    created_by: userId
  });
  if (error) fail(`/app/obras/${projectId}/equipes`, error.message);
  revalidatePath(`/app/obras/${projectId}/equipes`);
}

export async function createDailyLog(formData: FormData) {
  const projectId = text(formData, "projectId");
  const { supabase, organizationId, userId } = await requireOrganizationContext(fieldRoles);
  const { data, error } = await supabase.from("daily_logs").insert({
    organization_id: organizationId,
    project_id: projectId,
    log_date: text(formData, "logDate"),
    shift: text(formData, "shift") || "DAY",
    weather: optionalText(formData, "weather"),
    min_temperature: optionalNumber(formData, "minTemperature"),
    max_temperature: optionalNumber(formData, "maxTemperature"),
    summary: optionalText(formData, "summary"),
    planned_activities: optionalText(formData, "plannedActivities"),
    executed_activities: optionalText(formData, "executedActivities"),
    occurrences: optionalText(formData, "occurrences"),
    safety_notes: optionalText(formData, "safetyNotes"),
    quality_notes: optionalText(formData, "qualityNotes"),
    delay_notes: optionalText(formData, "delayNotes"),
    created_by: userId
  }).select("id").single();
  if (error || !data) fail(`/app/obras/${projectId}/diario`, error?.message ?? "Não foi possível criar o diário.");
  redirect(`/app/obras/${projectId}/diario/${data.id}`);
}

export async function updateDailyLog(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dailyLogId = text(formData, "dailyLogId");
  const { supabase } = await requireOrganizationContext(fieldRoles);
  const { error } = await supabase.from("daily_logs").update({
    weather: optionalText(formData, "weather"),
    min_temperature: optionalNumber(formData, "minTemperature"),
    max_temperature: optionalNumber(formData, "maxTemperature"),
    summary: optionalText(formData, "summary"),
    planned_activities: optionalText(formData, "plannedActivities"),
    executed_activities: optionalText(formData, "executedActivities"),
    occurrences: optionalText(formData, "occurrences"),
    safety_notes: optionalText(formData, "safetyNotes"),
    quality_notes: optionalText(formData, "qualityNotes"),
    delay_notes: optionalText(formData, "delayNotes"),
    updated_at: new Date().toISOString()
  }).eq("id", dailyLogId).in("status", ["DRAFT", "REJECTED"]);
  if (error) fail(`/app/obras/${projectId}/diario/${dailyLogId}`, error.message);
  revalidatePath(`/app/obras/${projectId}/diario/${dailyLogId}`);
}

export async function addDailyLogActivity(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dailyLogId = text(formData, "dailyLogId");
  const { supabase, organizationId, userId } = await requireOrganizationContext(fieldRoles);
  const progressBefore = optionalNumber(formData, "progressBefore");
  const progressAfter = optionalNumber(formData, "progressAfter");
  const { error } = await supabase.from("daily_log_activities").insert({
    organization_id: organizationId,
    project_id: projectId,
    daily_log_id: dailyLogId,
    task_id: optionalText(formData, "taskId"),
    description: text(formData, "description"),
    unit: optionalText(formData, "unit"),
    executed_quantity: optionalNumber(formData, "executedQuantity"),
    progress_before: progressBefore == null ? null : progressBefore / 100,
    progress_after: progressAfter == null ? null : progressAfter / 100,
    created_by: userId
  });
  if (error) fail(`/app/obras/${projectId}/diario/${dailyLogId}`, error.message);
  revalidatePath(`/app/obras/${projectId}/diario/${dailyLogId}`);
}

export async function uploadDailyLogMedia(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dailyLogId = text(formData, "dailyLogId");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail(`/app/obras/${projectId}/diario/${dailyLogId}`, "Selecione um arquivo.");
  if (file.size > 150 * 1024 * 1024) fail(`/app/obras/${projectId}/diario/${dailyLogId}`, "O arquivo excede 150 MB.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(fieldRoles);
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${projectId}/${dailyLogId}/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("daily-log-media").upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  if (uploadError) fail(`/app/obras/${projectId}/diario/${dailyLogId}`, uploadError.message);

  const { error } = await supabase.from("daily_log_media").insert({
    organization_id: organizationId,
    project_id: projectId,
    daily_log_id: dailyLogId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    sha256: hash,
    caption: optionalText(formData, "caption"),
    captured_at: optionalText(formData, "capturedAt"),
    client_visible: bool(formData, "clientVisible"),
    uploaded_by: userId
  });
  if (error) {
    await supabase.storage.from("daily-log-media").remove([storagePath]);
    fail(`/app/obras/${projectId}/diario/${dailyLogId}`, error.message);
  }
  revalidatePath(`/app/obras/${projectId}/diario/${dailyLogId}`);
}

export async function submitDailyLog(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dailyLogId = text(formData, "dailyLogId");
  const { supabase } = await requireOrganizationContext(fieldRoles);
  const { error } = await supabase.rpc("submit_daily_log", { p_daily_log_id: dailyLogId });
  if (error) fail(`/app/obras/${projectId}/diario/${dailyLogId}`, error.message);
  revalidatePath(`/app/obras/${projectId}/diario/${dailyLogId}`);
}

export async function decideDailyLog(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dailyLogId = text(formData, "dailyLogId");
  const approve = text(formData, "decision") === "APPROVE";
  const { supabase } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.rpc("decide_daily_log", {
    p_daily_log_id: dailyLogId,
    p_approve: approve,
    p_reason: optionalText(formData, "reason"),
    p_release_client: bool(formData, "releaseClient")
  });
  if (error) fail(`/app/obras/${projectId}/diario/${dailyLogId}`, error.message);
  revalidatePath(`/app/obras/${projectId}/diario/${dailyLogId}`);
  revalidatePath(`/cliente/obras/${projectId}`);
}

export async function uploadProjectDocument(formData: FormData) {
  const projectId = text(formData, "projectId");
  const globalUpload = text(formData, "returnPath") === "/app/documentos";
  const errorPath = globalUpload ? "/app/documentos/novo" : `/app/obras/${projectId}/documentos`;
  const file = formData.get("file");
  if (!projectId) fail(errorPath, "Selecione a obra do documento.");
  if (!(file instanceof File) || file.size === 0) fail(errorPath, "Selecione um arquivo.");
  if (file.size > 50 * 1024 * 1024) fail(errorPath, "O arquivo excede 50 MB.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const code = text(formData, "code").toUpperCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${projectId}/${code}/${randomUUID()}-${safeName}`;

  const { data: existing } = await supabase
    .from("project_documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("code", code)
    .maybeSingle();

  let documentId = existing?.id;
  if (!documentId) {
    const { data, error } = await supabase.from("project_documents").insert({
      organization_id: organizationId,
      project_id: projectId,
      code,
      title: text(formData, "title"),
      discipline: text(formData, "discipline"),
      category: text(formData, "category"),
      created_by: userId
    }).select("id").single();
    if (error || !data) fail(errorPath, error?.message ?? "Falha ao criar documento.");
    documentId = data.id;
    // Só depois de o documento existir: disciplina digitada e abandonada não
    // vira vocabulário da empresa.
    await registrarValorUsado(supabase, organizationId, ESCOPOS.disciplina, text(formData, "discipline"));
  }

  const { count } = await supabase
    .from("project_document_versions")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
  const versionNumber = (count ?? 0) + 1;

  const { error: uploadError } = await supabase.storage.from("project-documents").upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  if (uploadError) fail(errorPath, uploadError.message);

  const { error } = await supabase.from("project_document_versions").insert({
    organization_id: organizationId,
    project_id: projectId,
    document_id: documentId,
    version_number: versionNumber,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    sha256: hash,
    change_summary: optionalText(formData, "changeSummary"),
    uploaded_by: userId
  });
  if (error) {
    await supabase.storage.from("project-documents").remove([storagePath]);
    fail(errorPath, error.message);
  }
  revalidatePath(`/app/obras/${projectId}/documentos`);
  revalidatePath("/app/documentos");
  if (globalUpload) redirect("/app/documentos");
}

export async function releaseProjectDocument(formData: FormData) {
  const projectId = text(formData, "projectId");
  const versionId = text(formData, "versionId");
  const { supabase } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.rpc("release_project_document_version", { p_version_id: versionId });
  if (error) fail(`/app/obras/${projectId}/documentos`, error.message);
  revalidatePath(`/app/obras/${projectId}/documentos`);
  revalidatePath(`/cliente/obras/${projectId}`);
}
