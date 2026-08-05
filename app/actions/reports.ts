"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import {
  INITIAL_REPORT_ACTION_STATE,
  reportActionError,
  type ReportActionState
} from "@/lib/forms/report-action-state";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { defaultReportPeriod } from "@/lib/reports/server";

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function optional(data: FormData, key: string) {
  return text(data, key) || null;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function values(data: FormData): ReportActionState["values"] {
  const result: ReportActionState["values"] = {};
  for (const key of [
    "id", "name", "kind", "projectId", "periodStart", "periodEnd", "visibleMetrics",
    "description", "metricKey", "comparison", "warningValue", "criticalValue", "savedViewId"
  ] as const) {
    result[key] = text(data, key);
  }
  return result;
}

function classifyReportProviderError(error: { code?: string | null }, fallback: string) {
  if (error.code === "23505") return "Já existe um registro com esses dados.";
  if (error.code === "23503") return "Uma referência selecionada não está mais disponível.";
  if (error.code === "42501") return "Você não possui permissão para concluir esta operação.";
  if (error.code === "PGRST116") return "O registro solicitado não foi encontrado ou não está mais disponível.";
  return fallback;
}

export async function saveReportView(
  previous: ReportActionState = INITIAL_REPORT_ACTION_STATE,
  data: FormData
): Promise<ReportActionState> {
  void previous;
  const submitted = values(data);
  const projectId = optional(data, "projectId");
  const context = await requireCapability("relatorios", "create", projectId);
  const name = text(data, "name");
  const kind = text(data, "kind") || "EXECUTIVE";
  const periodStart = optional(data, "periodStart");
  const periodEnd = optional(data, "periodEnd");

  if (!name) return reportActionError("Revise os campos destacados.", submitted, { name: "Informe o nome do relatório." });
  if (name.length > 120) return reportActionError("Revise os campos destacados.", submitted, { name: "Use no máximo 120 caracteres." });
  if (periodStart && periodEnd && periodEnd < periodStart) {
    return reportActionError("Revise o período informado.", submitted, { periodEnd: "A data final não pode ser anterior à inicial." });
  }

  const visibleMetrics = text(data, "visibleMetrics").split(",").map(item => item.trim()).filter(Boolean);
  const { error } = await context.supabase.from("report_saved_views").insert({
    organization_id: context.organizationId,
    owner_user_id: context.userId,
    name,
    description: text(data, "description"),
    kind,
    project_id: projectId,
    period_start: periodStart,
    period_end: periodEnd,
    filters: { projectId, periodStart, periodEnd },
    visible_metrics: visibleMetrics,
    shared: data.get("shared") !== null
  });

  if (error) {
    reportDataAccessError("reports.save-view", error);
    return reportActionError(classifyReportProviderError(error, "Não foi possível salvar o relatório agora."), submitted);
  }

  revalidatePath("/app/relatorios/salvos");
  redirect("/app/relatorios/salvos?created=1");
}

export async function archiveReportView(data: FormData) {
  const id = text(data, "id");
  const projectId = optional(data, "projectId");
  const context = await requireCapability("relatorios", "delete", projectId);
  if (!id) redirect("/app/relatorios/salvos?error=Registro%20inv%C3%A1lido.");

  const { data: archived, error } = await context.supabase
    .from("report_saved_views")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .eq("active", true)
    .select("id")
    .maybeSingle();

  if (error) {
    reportDataAccessError("reports.archive-view", error);
    redirect(`/app/relatorios/salvos?error=${encodeURIComponent(classifyReportProviderError(error, "Não foi possível arquivar o relatório agora."))}`);
  }
  if (!archived) redirect("/app/relatorios/salvos?error=O%20relat%C3%B3rio%20j%C3%A1%20foi%20arquivado%20ou%20n%C3%A3o%20est%C3%A1%20mais%20dispon%C3%ADvel.");

  revalidatePath("/app/relatorios/salvos");
  redirect("/app/relatorios/salvos?archived=1");
}

export async function saveReportTarget(
  previous: ReportActionState = INITIAL_REPORT_ACTION_STATE,
  data: FormData
): Promise<ReportActionState> {
  void previous;
  const submitted = values(data);
  const projectId = optional(data, "projectId");
  const context = await requireCapability("relatorios", "manage", projectId);
  const metricKey = text(data, "metricKey");
  const comparison = text(data, "comparison") === "MAX" ? "MAX" : "MIN";
  const warningValue = numberValue(text(data, "warningValue"));
  const criticalValue = numberValue(text(data, "criticalValue"));

  if (!metricKey) return reportActionError("Revise os campos destacados.", submitted, { metricKey: "Selecione uma métrica." });
  if (warningValue === null && criticalValue === null) {
    return reportActionError("Revise os campos destacados.", submitted, {
      warningValue: "Informe ao menos uma faixa.",
      criticalValue: "Informe ao menos uma faixa."
    });
  }
  if (comparison === "MIN" && warningValue !== null && criticalValue !== null && criticalValue > warningValue) {
    return reportActionError("Revise os limites da meta.", submitted, { criticalValue: "Para meta mínima, o crítico deve ser menor ou igual à atenção." });
  }
  if (comparison === "MAX" && warningValue !== null && criticalValue !== null && criticalValue < warningValue) {
    return reportActionError("Revise os limites da meta.", submitted, { criticalValue: "Para meta máxima, o crítico deve ser maior ou igual à atenção." });
  }

  let existing = context.supabase.from("report_targets").select("id").eq("organization_id", context.organizationId).eq("metric_key", metricKey);
  existing = projectId ? existing.eq("project_id", projectId) : existing.is("project_id", null);
  const { data: target, error: lookupError } = await existing.maybeSingle();
  if (lookupError) {
    reportDataAccessError("reports.target-lookup", lookupError);
    return reportActionError("Não foi possível verificar a meta existente agora.", submitted);
  }

  const payload = {
    organization_id: context.organizationId,
    project_id: projectId,
    metric_key: metricKey,
    comparison,
    warning_value: warningValue,
    critical_value: criticalValue,
    active: true,
    created_by: context.userId,
    updated_at: new Date().toISOString()
  };
  const { error } = target
    ? await context.supabase.from("report_targets").update(payload).eq("id", target.id).eq("organization_id", context.organizationId)
    : await context.supabase.from("report_targets").insert(payload);

  if (error) {
    reportDataAccessError("reports.save-target", error);
    return reportActionError(classifyReportProviderError(error, "Não foi possível salvar a meta agora."), submitted);
  }

  revalidatePath("/app/relatorios/metas");
  revalidatePath("/app/relatorios");
  redirect("/app/relatorios/metas?saved=1");
}

export async function generateReportSnapshot(
  previous: ReportActionState = INITIAL_REPORT_ACTION_STATE,
  data: FormData
): Promise<ReportActionState> {
  void previous;
  const submitted = values(data);
  const projectId = optional(data, "projectId");
  const context = await requireCapability("relatorios", "update", projectId);
  const defaults = defaultReportPeriod();
  const periodStart = text(data, "periodStart") || defaults.start;
  const periodEnd = text(data, "periodEnd") || defaults.end;

  if (periodEnd < periodStart) {
    return reportActionError("Revise o período informado.", submitted, { periodEnd: "A data final não pode ser anterior à inicial." });
  }

  const { data: snapshot, error } = await context.supabase.rpc("create_report_snapshot", {
    p_organization_id: context.organizationId,
    p_kind: text(data, "kind") || "EXECUTIVE",
    p_project_id: projectId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_saved_view_id: optional(data, "savedViewId"),
    p_filters: { projectId, periodStart, periodEnd }
  });

  if (error) {
    reportDataAccessError("reports.generate-snapshot", error);
    return reportActionError(classifyReportProviderError(error, "Não foi possível gerar o snapshot agora."), submitted);
  }

  const result = Array.isArray(snapshot) ? snapshot[0] : snapshot;
  if (result?.status === "FAILED") {
    return reportActionError("O snapshot não pôde ser concluído. Revise os filtros e tente novamente.", submitted);
  }

  revalidatePath("/app/relatorios/snapshots");
  redirect("/app/relatorios/snapshots?created=1");
}
