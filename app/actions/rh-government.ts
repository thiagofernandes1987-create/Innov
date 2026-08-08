"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { lerMoeda } from "@/lib/validacao/moeda";

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function optional(data: FormData, key: string) { return text(data, key) || null; }
function money(data: FormData, key: string) { return lerMoeda(text(data, key)); }
function checkbox(data: FormData, key: string) { return data.get(key) === "on" || data.get(key) === "true"; }
function month(data: FormData, key: string) {
  const value = text(data, key);
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null;
}
function fail(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }
function done(path: string, message: string): never { redirect(`${path}?success=${encodeURIComponent(message)}`); }

export async function createDctfwebDeclaration(data: FormData) {
  const context = await requireCapability("rh", "update");
  const path = "/app/rh/obrigacoes/dctfweb";
  const referenceMonth = month(data, "referenceMonth");
  if (!referenceMonth) fail(path, "Informe uma competência válida.");
  const sourceSnapshot = {
    source: "RH_OPERATIONAL_WORKSPACE",
    note: optional(data, "sourceNote"),
    recordedAt: new Date().toISOString()
  };
  const { data: id, error } = await context.supabase.rpc("create_rh_dctfweb_declaration", {
    p_organization_id: context.organizationId,
    p_reference_month: referenceMonth,
    p_category: text(data, "category") || "GENERAL",
    p_esocial_period_closed: checkbox(data, "esocialClosed"),
    p_reinf_period_closed: checkbox(data, "reinfClosed"),
    p_mit_required: checkbox(data, "mitRequired"),
    p_source_snapshot: sourceSnapshot,
    p_source_reference: optional(data, "sourceReference")
  });
  if (error) fail(path, error.message);
  redirect(`${path}/${id}`);
}

export async function recordDctfwebExternalSnapshot(data: FormData) {
  const context = await requireCapability("rh", "update");
  const id = text(data, "declarationId");
  const path = `/app/rh/obrigacoes/dctfweb/${id}`;
  const { error } = await context.supabase.rpc("record_rh_dctfweb_external_snapshot", {
    p_declaration_id: id,
    p_external_declaration_id: optional(data, "externalDeclarationId"),
    p_receipt_number: optional(data, "receiptNumber"),
    p_total_social_security: money(data, "totalSocialSecurity"),
    p_total_other_debts: money(data, "totalOtherDebts"),
    p_total_debt: money(data, "totalDebt"),
    p_total_paid: money(data, "totalPaid") ?? 0,
    p_status: text(data, "status") || "RECONCILING",
    p_source_reference: optional(data, "sourceReference")
  });
  if (error) fail(path, error.message);
  revalidatePath(path);
  done(path, "Snapshot externo da DCTFWeb registrado.");
}

export async function upsertDctfwebReconciliation(data: FormData) {
  const context = await requireCapability("rh", "update");
  const id = text(data, "declarationId");
  const path = `/app/rh/obrigacoes/dctfweb/${id}`;
  const { error } = await context.supabase.rpc("upsert_rh_dctfweb_reconciliation_item", {
    p_declaration_id: id,
    p_dimension: text(data, "dimension"),
    p_reference_key: text(data, "referenceKey"),
    p_internal_amount: money(data, "internalAmount") ?? 0,
    p_external_amount: money(data, "externalAmount") ?? 0,
    p_status: optional(data, "status"),
    p_cause: optional(data, "cause"),
    p_action_required: optional(data, "actionRequired"),
    p_evidence_reference: optional(data, "evidenceReference")
  });
  if (error) fail(path, error.message);
  revalidatePath(path);
  done(path, "Item de reconciliação atualizado.");
}

export async function createFgtsPeriodFromPayroll(data: FormData) {
  const context = await requireCapability("rh", "update");
  const path = "/app/rh/obrigacoes/fgts-digital";
  const payrollPeriodId = text(data, "payrollPeriodId");
  const { data: id, error } = await context.supabase.rpc("create_rh_fgts_period_from_payroll", {
    p_payroll_period_id: payrollPeriodId,
    p_period_type: text(data, "periodType") || "MONTHLY",
    p_base_code: text(data, "baseCode").toUpperCase(),
    p_amount_rubric_code: text(data, "amountRubricCode").toUpperCase()
  });
  if (error) fail(path, error.message);
  redirect(`${path}/${id}`);
}

export async function updateFgtsWorkerExternal(data: FormData) {
  const context = await requireCapability("rh", "update");
  const periodId = text(data, "periodId");
  const path = `/app/rh/obrigacoes/fgts-digital/${periodId}`;
  const { error } = await context.supabase.rpc("update_rh_fgts_worker_external", {
    p_item_id: text(data, "itemId"),
    p_external_base: money(data, "externalBase"),
    p_external_amount: money(data, "externalAmount"),
    p_status: optional(data, "status"),
    p_cause: optional(data, "cause"),
    p_action_required: optional(data, "actionRequired"),
    p_evidence_reference: optional(data, "evidenceReference")
  });
  if (error) fail(path, error.message);
  revalidatePath(path);
  done(path, "Valores externos do trabalhador atualizados.");
}

export async function createFgtsGuide(data: FormData) {
  const context = await requireCapability("rh", "update");
  const periodId = text(data, "periodId");
  const path = `/app/rh/obrigacoes/fgts-digital/${periodId}`;
  const { error } = await context.supabase.rpc("create_rh_fgts_guide", {
    p_fgts_period_id: periodId,
    p_external_guide_id: optional(data, "externalGuideId"),
    p_channel_type: text(data, "channelType") || "PORTAL_ASSISTED",
    p_due_date: optional(data, "dueDate"),
    p_principal_amount: money(data, "principalAmount") ?? 0,
    p_additions_amount: money(data, "additionsAmount") ?? 0,
    p_evidence_reference: optional(data, "evidenceReference")
  });
  if (error) fail(path, error.message);
  revalidatePath(path);
  done(path, "Guia FGTS registrada.");
}

export async function recordFgtsPayment(data: FormData) {
  const context = await requireCapability("rh", "update");
  const periodId = text(data, "periodId");
  const path = `/app/rh/obrigacoes/fgts-digital/${periodId}`;
  const paidAt = text(data, "paidAt");
  const evidence = text(data, "evidenceReference");
  if (!paidAt || !evidence) fail(path, "Data e evidência do pagamento são obrigatórias.");
  const { error } = await context.supabase.rpc("record_rh_fgts_payment", {
    p_guide_id: text(data, "guideId"),
    p_amount: money(data, "amount"),
    p_paid_at: new Date(paidAt).toISOString(),
    p_payment_channel: text(data, "paymentChannel") || "PIX",
    p_external_payment_id: optional(data, "externalPaymentId"),
    p_evidence_reference: evidence
  });
  if (error) fail(path, error.message);
  revalidatePath(path);
  done(path, "Pagamento FGTS registrado e conciliado com a guia.");
}
