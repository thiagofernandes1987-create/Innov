"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { fileSecurityMessage } from "@/lib/file-security/domain";
import { secureUpload } from "@/lib/file-security/server";
import { publicScheduleDatabaseMessage, type ScheduleDatabaseError } from "@/lib/planejamento/schedule-validation";
import { ESCOPOS, registrarValorUsado } from "@/lib/sugestoes/servidor";
import { createScheduleDependency } from "./schedule";

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

function failProjectDatabase(
  path: string,
  operation: string,
  error: ScheduleDatabaseError,
  fallback: string
): never {
  console.error(`[projects.${operation}]`, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null
  });
  fail(path, publicScheduleDatabaseMessage(error, fallback));
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
  const path = `/app/obras/${projectId}/eap`;
  const parentId = optionalText(formData, "parentId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const sequence = optionalNumber(formData, "sequence") ?? 0;
  const weightPercent = optionalNumber(formData, "weightPercent") ?? 0;
  const plannedStart = optionalText(formData, "plannedStart");
  const plannedEnd = optionalText(formData, "plannedEnd");

  if (!projectId || !code || !title) fail(path, "Informe código e nome da etapa da EAP.");
  if (!Number.isInteger(sequence) || sequence < 0) fail(path, "A sequência deve ser um número inteiro não negativo.");
  if (weightPercent < 0 || weightPercent > 100) fail(path, "O peso deve ficar entre 0% e 100%.");
  if (plannedStart && plannedEnd && plannedEnd < plannedStart) fail(path, "A data de término não pode ser anterior à data de início.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("work_breakdown_items")
      .select("id")
      .eq("id", parentId)
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (parentError) failProjectDatabase(path, "create-wbs.validate-parent", parentError, "Não foi possível validar a etapa superior.");
    if (!parent) fail(path, "A etapa superior não pertence a esta obra.");
  }

  const { error } = await supabase.from("work_breakdown_items").insert({
    organization_id: organizationId,
    project_id: projectId,
    parent_id: parentId,
    code,
    title,
    description: optionalText(formData, "description"),
    sequence,
    weight: weightPercent / 100,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    client_visible: bool(formData, "clientVisible"),
    created_by: userId
  });
  if (error) failProjectDatabase(path, "create-wbs", error, "Não foi possível adicionar a etapa da EAP.");
  revalidatePath(path);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
}

export async function createTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const path = `/app/obras/${projectId}/tarefas`;
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const plannedStart = optionalText(formData, "plannedStart");
  const plannedEnd = optionalText(formData, "plannedEnd");
  const durationDays = optionalNumber(formData, "durationDays") ?? 1;
  const sequence = optionalNumber(formData, "sequence") ?? 0;
  const weightPercent = optionalNumber(formData, "weightPercent") ?? 0;
  const status = text(formData, "status") || "BACKLOG";
  const priority = text(formData, "priority") || "NORMAL";
  const wbsId = optionalText(formData, "wbsId");
  const responsibleId = optionalText(formData, "responsibleId");

  if (!projectId || !code || !title) fail(path, "Informe código e título da atividade.");
  if (plannedStart && plannedEnd && plannedEnd < plannedStart) fail(path, "A data de término não pode ser anterior à data de início.");
  if (!Number.isInteger(durationDays) || durationDays < 1) fail(path, "A duração deve ser informada em dias úteis inteiros, a partir de 1.");
  if (!Number.isInteger(sequence) || sequence < 0) fail(path, "A sequência deve ser um número inteiro não negativo.");
  if (weightPercent < 0 || weightPercent > 100) fail(path, "O peso deve ficar entre 0% e 100%.");
  if (!["BACKLOG", "READY", "IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED", "CANCELED"].includes(status)) fail(path, "O status selecionado é inválido.");
  if (!["LOW", "NORMAL", "HIGH", "CRITICAL"].includes(priority)) fail(path, "A prioridade selecionada é inválida.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  if (wbsId) {
    const { data: wbs, error: wbsError } = await supabase
      .from("work_breakdown_items")
      .select("id")
      .eq("id", wbsId)
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (wbsError) {
      console.error("[projects.create-task.wbs]", wbsError);
      fail(path, publicScheduleDatabaseMessage(wbsError, "Não foi possível validar a etapa da EAP."));
    }
    if (!wbs) fail(path, "A etapa da EAP selecionada não pertence a esta obra.");
  }
  if (responsibleId) {
    const { data: membership, error: membershipError } = await supabase
      .from("project_memberships")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("user_id", responsibleId)
      .eq("active", true)
      .maybeSingle();
    if (membershipError) {
      console.error("[projects.create-task.responsible]", membershipError);
      fail(path, publicScheduleDatabaseMessage(membershipError, "Não foi possível validar o responsável."));
    }
    if (!membership) fail(path, "O responsável selecionado não participa desta obra.");
  }

  const { error } = await supabase.from("project_tasks").insert({
    organization_id: organizationId,
    project_id: projectId,
    wbs_id: wbsId,
    parent_task_id: null,
    code,
    title,
    description: optionalText(formData, "description"),
    status,
    priority,
    sequence,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    duration_days: durationDays,
    weight: weightPercent / 100,
    responsible_id: responsibleId,
    client_visible: bool(formData, "clientVisible"),
    created_by: userId
  });
  if (error) {
    console.error("[projects.create-task]", error);
    fail(path, publicScheduleDatabaseMessage(error, "Não foi possível adicionar a atividade."));
  }
  revalidatePath(path);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
}

export async function moveTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const taskId = text(formData, "taskId");
  const path = `/app/obras/${projectId}/tarefas`;
  const status = text(formData, "status");
  const progressPercent = optionalNumber(formData, "progressPercent");
  if (!projectId || !taskId) fail(path, "A tarefa informada é inválida.");
  if (!["BACKLOG", "READY", "IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED", "CANCELED"].includes(status)) fail(path, "O status selecionado é inválido.");
  if (progressPercent !== null && (progressPercent < 0 || progressPercent > 100)) fail(path, "O progresso deve ficar entre 0% e 100%.");

  const { supabase, organizationId } = await requireOrganizationContext(managementRoles);
  const { data: scopedTask, error: taskError } = await supabase
    .from("project_tasks")
    .select("id")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (taskError) failProjectDatabase(path, "move-task.validate-scope", taskError, "Não foi possível validar a tarefa.");
  if (!scopedTask) fail(path, "A tarefa não pertence a esta obra.");

  const { error } = await supabase.rpc("move_project_task", {
    p_task_id: taskId,
    p_status: status,
    p_progress: progressPercent === null ? null : progressPercent / 100,
    p_reason: optionalText(formData, "reason")
  });
  if (error) failProjectDatabase(path, "move-task", error, "Não foi possível atualizar a tarefa.");
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath(path);
  revalidatePath(`/app/obras/${projectId}/cronograma`);
  revalidatePath("/cliente/obras");
}

export async function createDependency(formData: FormData) {
  return createScheduleDependency(formData);
}

export async function createMilestone(formData: FormData) {
  const projectId = text(formData, "projectId");
  const path = `/app/obras/${projectId}/cronograma`;
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const plannedDate = text(formData, "plannedDate");
  if (!projectId || !code || !title || !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) fail(path, "Informe código, título e data válida do marco.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.from("project_milestones").insert({
    organization_id: organizationId,
    project_id: projectId,
    code,
    title,
    description: optionalText(formData, "description"),
    planned_date: plannedDate,
    client_visible: bool(formData, "clientVisible"),
    created_by: userId
  });
  if (error) failProjectDatabase(path, "create-milestone", error, "Não foi possível adicionar o marco.");
  revalidatePath(path);
}

export async function createBaseline(formData: FormData) {
  const projectId = text(formData, "projectId");
  const path = `/app/obras/${projectId}/cronograma`;
  const name = text(formData, "name");
  if (!projectId || !name) fail(path, "Informe o nome da baseline.");

  const { supabase } = await requireOrganizationContext(managementRoles);
  const { error } = await supabase.rpc("create_schedule_baseline", {
    p_project_id: projectId,
    p_name: name,
    p_notes: optionalText(formData, "notes")
  });
  if (error) failProjectDatabase(path, "create-baseline", error, "Não foi possível congelar a baseline.");
  revalidatePath(path);
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
  const path = `/app/obras/${projectId}/diario/${dailyLogId}`;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail(path, "Selecione um arquivo.");
  if (file.size > 150 * 1024 * 1024) fail(path, "O arquivo excede 150 MB.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(fieldRoles);
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${projectId}/${dailyLogId}/${randomUUID()}-${safeName}`;

  try {
    await secureUpload({
      targetBucket: "daily-log-media",
      targetPath: storagePath,
      body: bytes,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      organizationId,
      actorUserId: userId,
      correlationId: dailyLogId,
      policy: {
        allowedMimeTypes: null,
        maxBytes: 150 * 1024 * 1024,
        requireContentSignature: false
      }
    });
  } catch (error) {
    fail(path, fileSecurityMessage(error, { maxBytesLabel: "150 MB" }));
  }

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
    fail(path, error.message);
  }
  revalidatePath(path);
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
  const discipline = text(formData, "discipline");
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
      discipline,
      category: text(formData, "category"),
      created_by: userId
    }).select("id").single();
    if (error || !data) fail(errorPath, error?.message ?? "Falha ao criar documento.");
    documentId = data.id;
    await registrarValorUsado(supabase, organizationId, ESCOPOS.disciplina, discipline);
  }

  const { count } = await supabase
    .from("project_document_versions")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
  const versionNumber = (count ?? 0) + 1;

  try {
    await secureUpload({
      targetBucket: "project-documents",
      targetPath: storagePath,
      body: bytes,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      organizationId,
      actorUserId: userId,
      correlationId: documentId,
      policy: {
        allowedMimeTypes: null,
        maxBytes: 50 * 1024 * 1024,
        requireContentSignature: false
      }
    });
  } catch (error) {
    fail(errorPath, fileSecurityMessage(error, { maxBytesLabel: "50 MB" }));
  }

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
