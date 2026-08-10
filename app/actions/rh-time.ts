"use server";

import{mensagemDeFalha}from"@/lib/errors/data-access";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { lerMoeda } from "@/lib/validacao/moeda";

const BASE = "/app/rh/jornada";
function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function optional(data: FormData, key: string) { return text(data, key) || null; }
function number(data: FormData, key: string) { return lerMoeda(text(data, key)); }
function fail(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }
function done(path: string, message: string): never { redirect(`${path}?success=${encodeURIComponent(message)}`); }

export async function configureRhScheduleDay(data: FormData) {
  const context = await requireCapability("rh", "configure");
  const path = `${BASE}/configuracao`;
  const scheduleId = text(data, "scheduleId");
  const isoWeekday = Number(text(data, "isoWeekday"));
  const monthlyDivisor = number(data, "monthlyDivisor");
  const plannedMinutes = Number(text(data, "plannedMinutes") || "0");
  if (!scheduleId || isoWeekday < 1 || isoWeekday > 7) fail(path, "Jornada e dia da semana são obrigatórios.");
  if (monthlyDivisor != null) {
    const { error } = await context.supabase.from("rh_work_schedules").update({ monthly_divisor: monthlyDivisor }).eq("id", scheduleId).eq("organization_id", context.organizationId);
    if (error) fail(path, mensagemDeFalha("rh-time.configureRhScheduleDay", error));
  }
  const { error } = await context.supabase.from("rh_work_schedule_days").upsert({
    organization_id: context.organizationId,
    work_schedule_id: scheduleId,
    iso_weekday: isoWeekday,
    planned_minutes: plannedMinutes,
    planned_start: optional(data, "plannedStart"),
    planned_end: optional(data, "plannedEnd"),
    break_minutes: Number(text(data, "breakMinutes") || "0"),
    created_by: context.userId
  }, { onConflict: "work_schedule_id,iso_weekday" });
  if (error) fail(path, mensagemDeFalha("rh-time.configureRhScheduleDay", error));
  revalidatePath(path);
  done(path, "Dia da jornada configurado.");
}

export async function createRhTimePolicy(data: FormData) {
  const context = await requireCapability("rh", "configure");
  const path = `${BASE}/configuracao`;
  const { error } = await context.supabase.from("rh_time_policies").insert({
    organization_id: context.organizationId,
    code: text(data, "code").toUpperCase(),
    name: text(data, "name"),
    overtime_factor: number(data, "overtimeFactor") ?? 1.5,
    absence_factor: number(data, "absenceFactor") ?? 1,
    tolerance_minutes: Number(text(data, "toleranceMinutes") || "0"),
    valid_from: text(data, "validFrom"),
    valid_to: optional(data, "validTo"),
    created_by: context.userId
  });
  if (error) fail(path, mensagemDeFalha("rh-time.createRhTimePolicy", error));
  done(path, "Política de jornada criada.");
}

export async function createRhTimePeriod(data: FormData) {
  const context = await requireCapability("rh", "create");
  const path = BASE;
  const { data: period, error } = await context.supabase.from("rh_time_periods").insert({
    organization_id: context.organizationId,
    employment_id: text(data, "employmentId"),
    period_start: text(data, "periodStart"),
    period_end: text(data, "periodEnd"),
    policy_id: text(data, "policyId"),
    created_by: context.userId
  }).select("id").single();
  if (error) fail(path, mensagemDeFalha("rh-time.createRhTimePeriod", error));
  redirect(`${BASE}/periodos/${period.id}`);
}

export async function addRhTimePunch(data: FormData) {
  const context = await requireCapability("rh", "update");
  const periodId = text(data, "periodId");
  const path = `${BASE}/periodos/${periodId}`;
  const { data: period, error: periodError } = await context.supabase.from("rh_time_periods").select("employment_id,status").eq("organization_id", context.organizationId).eq("id", periodId).maybeSingle();
  if (periodError || !period) fail(path, mensagemDeFalha("rh-time.addRhTimePunch", periodError, "Período não encontrado."));
  if (!["OPEN", "CALCULATED", "PENDING", "REOPENED"].includes(period.status)) fail(path, "Período fechado não aceita marcação.");
  const punchedAt = text(data, "punchedAt");
  if (!punchedAt) fail(path, "Data/hora obrigatória.");
  const { error } = await context.supabase.from("rh_time_punches").insert({
    organization_id: context.organizationId,
    employment_id: period.employment_id,
    punched_at: new Date(punchedAt).toISOString(),
    direction: text(data, "direction"),
    source: text(data, "source") || "MANUAL",
    source_reference: optional(data, "sourceReference"),
    note: optional(data, "note"),
    created_by: context.userId
  });
  if (error) fail(path, mensagemDeFalha("rh-time.addRhTimePunch", error));
  await context.supabase.from("rh_time_periods").update({ status: "OPEN", updated_at: new Date().toISOString() }).eq("id", periodId).eq("organization_id", context.organizationId);
  revalidatePath(path);
  done(path, "Marcação registrada. A original permanece imutável.");
}

export async function calculateRhTimePeriodAction(data: FormData) {
  const context = await requireCapability("rh", "update");
  const periodId = text(data, "periodId");
  const path = `${BASE}/periodos/${periodId}`;
  const { error } = await context.supabase.rpc("calculate_rh_time_period", { p_period_id: periodId });
  if (error) fail(path, mensagemDeFalha("rh-time.calculateRhTimePeriodAction", error));
  revalidatePath(path);
  done(path, "Apuração recalculada.");
}

export async function addRhTimeAdjustment(data: FormData) {
  const context = await requireCapability("rh", "approve");
  const periodId = text(data, "periodId");
  const path = `${BASE}/periodos/${periodId}`;
  const reason = text(data, "reason");
  if (!reason) fail(path, "Motivo do tratamento é obrigatório.");
  const { error } = await context.supabase.from("rh_time_adjustments").insert({
    organization_id: context.organizationId,
    time_period_id: periodId,
    work_date: text(data, "workDate"),
    adjustment_type: text(data, "adjustmentType"),
    minutes: Number(text(data, "minutes") || "0"),
    reason,
    evidence_reference: optional(data, "evidenceReference"),
    approved_by: context.userId,
    created_by: context.userId
  });
  if (error) fail(path, mensagemDeFalha("rh-time.addRhTimeAdjustment", error));
  const { error: calcError } = await context.supabase.rpc("calculate_rh_time_period", { p_period_id: periodId });
  if (calcError) fail(path, mensagemDeFalha("rh-time.addRhTimeAdjustment", calcError));
  revalidatePath(path);
  done(path, "Tratamento registrado e apuração recalculada.");
}

export async function closeRhTimePeriodToPayroll(data: FormData) {
  const context = await requireCapability("rh", "approve");
  const periodId = text(data, "periodId");
  const path = `${BASE}/periodos/${periodId}`;
  const { error } = await context.supabase.rpc("close_rh_time_period_to_payroll", {
    p_time_period_id: periodId,
    p_payroll_period_id: text(data, "payrollPeriodId"),
    p_overtime_rubric_version_id: text(data, "overtimeRubricVersionId"),
    p_absence_rubric_version_id: text(data, "absenceRubricVersionId")
  });
  if (error) fail(path, mensagemDeFalha("rh-time.closeRhTimePeriodToPayroll", error));
  done(path, "Ponto fechado e fatos exportados para a folha.");
}
