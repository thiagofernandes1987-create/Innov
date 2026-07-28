"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { fileSecurityMessage } from "@/lib/file-security/domain";
import { secureUpload } from "@/lib/file-security/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { safeFileName, sha256 } from "@/lib/signatures/crypto";

const MAX_FILE = 25 * 1024 * 1024;
const MIMES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
type Installment = { dueDate: string; amount: number; notes?: string };
type MeasurementItem = { description: string; unit: string; previousQuantity: number; currentQuantity: number; unitPrice: number; notes?: string };
function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function optional(data: FormData, key: string) { return text(data, key) || null; }
function numberValue(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function fail(path: string, message: string): never { redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`); }
function code(prefix: string) { return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`; }
function parseArray(raw: string) { const value: unknown = JSON.parse(raw); if (!Array.isArray(value)) throw new Error("Lista inválida."); return value; }
function parseInstallments(raw: string): Installment[] { return parseArray(raw).map((item, index) => { if (typeof item !== "object" || item === null) throw new Error(`Parcela ${index + 1} inválida.`); const row = item as Record<string, unknown>; const dueDate = String(row.dueDate ?? ""); const amount = numberValue(row.amount); if (!dueDate || amount <= 0) throw new Error(`Informe vencimento e valor da parcela ${index + 1}.`); return { dueDate, amount, notes: String(row.notes ?? "").trim() }; }); }
function parseMeasurementItems(raw: string): MeasurementItem[] { return parseArray(raw).map((item, index) => { if (typeof item !== "object" || item === null) throw new Error(`Item ${index + 1} inválido.`); const row = item as Record<string, unknown>; const description = String(row.description ?? "").trim(); const unit = String(row.unit ?? "").trim(); const currentQuantity = numberValue(row.currentQuantity); const unitPrice = numberValue(row.unitPrice); if (!description || !unit || currentQuantity <= 0 || unitPrice < 0) throw new Error(`Preencha o item medido ${index + 1}.`); return { description, unit, currentQuantity, unitPrice, previousQuantity: numberValue(row.previousQuantity), notes: String(row.notes ?? "").trim() }; }); }

export async function createFinanceCategory(data: FormData) { const context = await requireCapability("financeiro", "manage"); const { error } = await context.supabase.from("finance_categories").insert({ organization_id: context.organizationId, code: text(data, "code").toUpperCase(), name: text(data, "name"), direction: optional(data, "direction"), created_by: context.userId }); if (error) fail("/app/financeiro/configuracoes", error.message); revalidatePath("/app/financeiro/configuracoes"); }
export async function createFinanceCostCenter(data: FormData) { const context = await requireCapability("financeiro", "manage"); const { error } = await context.supabase.from("finance_cost_centers").insert({ organization_id: context.organizationId, project_id: optional(data, "projectId"), code: text(data, "code").toUpperCase(), name: text(data, "name"), created_by: context.userId }); if (error) fail("/app/financeiro/configuracoes", error.message); revalidatePath("/app/financeiro/configuracoes"); }
export async function createFinanceCashAccount(data: FormData) { const context = await requireCapability("financeiro", "manage"); const { error } = await context.supabase.from("finance_cash_accounts").insert({ organization_id: context.organizationId, name: text(data, "name"), account_type: text(data, "accountType") || "BANK", bank_name: optional(data, "bankName"), branch: optional(data, "branch"), account_last4: optional(data, "accountLast4"), opening_balance: numberValue(text(data, "openingBalance")), created_by: context.userId }); if (error) fail("/app/financeiro/configuracoes", error.message); revalidatePath("/app/financeiro/configuracoes"); }

export async function createFinanceEntry(data: FormData) {
  const projectId = optional(data, "projectId"); const context = await requireCapability("financeiro", "create", projectId); let installments: Installment[];
  try { installments = parseInstallments(text(data, "installmentsJson")); } catch (error) { fail("/app/financeiro/lancamentos/novo", error instanceof Error ? error.message : "Parcelas inválidas."); }
  const total = numberValue(text(data, "totalAmount")); const scheduled = installments.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0 || Math.abs(total - scheduled) > 0.01) fail("/app/financeiro/lancamentos/novo", "A soma das parcelas deve ser igual ao total.");
  const { data: entry, error } = await context.supabase.from("finance_entries").insert({ organization_id: context.organizationId, project_id: projectId, client_id: optional(data, "clientId"), supplier_id: optional(data, "supplierId"), category_id: optional(data, "categoryId"), cost_center_id: optional(data, "costCenterId"), code: code(text(data, "direction") === "RECEIVABLE" ? "REC" : "PAG"), direction: text(data, "direction"), source_type: "MANUAL", description: text(data, "description"), document_number: optional(data, "documentNumber"), total_amount: total, issue_date: text(data, "issueDate") || new Date().toISOString().slice(0, 10), competence_date: optional(data, "competenceDate"), notes: text(data, "notes"), created_by: context.userId }).select("id").single();
  if (error || !entry) fail("/app/financeiro/lancamentos/novo", error?.message ?? "Não foi possível criar o lançamento.");
  const { error: installmentError } = await context.supabase.from("finance_installments").insert(installments.map((item, index) => ({ organization_id: context.organizationId, entry_id: entry.id, installment_number: index + 1, due_date: item.dueDate, original_amount: item.amount, notes: item.notes ?? "" })));
  if (installmentError) { await context.supabase.from("finance_entries").delete().eq("id", entry.id); fail("/app/financeiro/lancamentos/novo", installmentError.message); }
  redirect(`/app/financeiro/lancamentos/${entry.id}`);
}

export async function submitFinanceEntry(data: FormData) { const id = text(data, "entryId"); const context = await requireCapability("financeiro", "update"); const { error } = await context.supabase.rpc("submit_finance_entry", { p_entry_id: id }); if (error) fail(`/app/financeiro/lancamentos/${id}`, error.message); revalidatePath(`/app/financeiro/lancamentos/${id}`); revalidatePath("/app/financeiro"); }
export async function decideFinanceApproval(data: FormData) { const id = text(data, "entryId"); const context = await requireCapability("financeiro", "approve"); const { error } = await context.supabase.rpc("decide_finance_approval", { p_approval_id: text(data, "approvalId"), p_decision: text(data, "decision"), p_comment: text(data, "comment") }); if (error) fail(`/app/financeiro/lancamentos/${id}`, error.message); revalidatePath(`/app/financeiro/lancamentos/${id}`); revalidatePath("/app/financeiro"); }

export async function registerFinanceSettlement(data: FormData) {
  const entryId = text(data, "entryId");
  const context = await requireCapability("financeiro", "update");
  const file = data.get("attachment");
  let uploadedPath: string | null = null;
  let fileBytes: Uint8Array | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;
  let fileSize: number | null = null;
  let fileHash: string | null = null;
  const admin = createSupabaseAdminClient();

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE || !MIMES.has(file.type)) fail(`/app/financeiro/lancamentos/${entryId}`, "Comprovante inválido ou superior a 25 MB.");
    fileBytes = new Uint8Array(await file.arrayBuffer());
    fileName = file.name;
    mimeType = file.type;
    fileSize = file.size;
    fileHash = sha256(fileBytes);
    uploadedPath = `${context.organizationId}/settlements/${randomUUID()}-${safeFileName(file.name)}`;
    try {
      await secureUpload({
        targetBucket: "finance-attachments", targetPath: uploadedPath, body: fileBytes,
        filename: file.name, contentType: file.type,
        organizationId: context.organizationId, actorUserId: context.userId,
        policy: { allowedMimeTypes: MIMES, maxBytes: MAX_FILE }
      });
    } catch (error) {
      fail(`/app/financeiro/lancamentos/${entryId}`, fileSecurityMessage(error, { allowedLabel: "PDF, XLSX, JPG, PNG ou WebP" }));
    }
  }

  const { error } = await context.supabase.rpc("register_finance_settlement_with_attachment", {
    p_installment_id: text(data, "installmentId"), p_amount: numberValue(text(data, "amount")),
    p_settled_at: text(data, "settledAt") || new Date().toISOString(), p_method: text(data, "method"),
    p_cash_account_id: optional(data, "cashAccountId"), p_reference: optional(data, "reference"), p_notes: text(data, "notes"),
    p_file_name: fileName, p_mime_type: mimeType, p_size_bytes: fileSize, p_storage_path: uploadedPath, p_sha256: fileHash
  });
  if (error) {
    if (uploadedPath) await admin.storage.from("finance-attachments").remove([uploadedPath]);
    fail(`/app/financeiro/lancamentos/${entryId}`, error.message);
  }
  revalidatePath(`/app/financeiro/lancamentos/${entryId}`); revalidatePath("/app/financeiro"); revalidatePath("/app/financeiro/fluxo-de-caixa");
}

export async function importProcurementOrderPayable(data: FormData) { const context = await requireCapability("financeiro", "create"); const { data: entry, error } = await context.supabase.rpc("create_finance_entry_from_procurement_order", { p_order_id: text(data, "orderId"), p_first_due_date: text(data, "firstDueDate"), p_installments: numberValue(text(data, "installments")) || 1 }); if (error || !entry) fail("/app/financeiro/lancamentos/novo", error?.message ?? "Não foi possível importar o pedido."); const result = Array.isArray(entry) ? entry[0] : entry; redirect(`/app/financeiro/lancamentos/${result.id}`); }
export async function importContractReceivable(data: FormData) { const context = await requireCapability("financeiro", "create"); const { data: entry, error } = await context.supabase.rpc("create_finance_entry_from_contract", { p_contract_id: text(data, "contractId"), p_first_due_date: text(data, "firstDueDate"), p_installments: numberValue(text(data, "installments")) || 1 }); if (error || !entry) fail("/app/financeiro/lancamentos/novo", error?.message ?? "Não foi possível importar o contrato."); const result = Array.isArray(entry) ? entry[0] : entry; redirect(`/app/financeiro/lancamentos/${result.id}`); }

export async function createFinanceMeasurement(data: FormData) {
  const projectId = text(data, "projectId"); const context = await requireCapability("financeiro", "create", projectId); let items: MeasurementItem[];
  try { items = parseMeasurementItems(text(data, "itemsJson")); } catch (error) { fail("/app/financeiro/medicoes/nova", error instanceof Error ? error.message : "Itens inválidos."); }
  const contractId = text(data, "contractId");
  const { data: contract } = await context.supabase.from("contracts").select("client_id,project_id,organization_id").eq("id", contractId).eq("organization_id", context.organizationId).single();
  if (!contract || contract.project_id !== projectId) fail("/app/financeiro/medicoes/nova", "O contrato não pertence à obra selecionada.");
  const { data: measurement, error } = await context.supabase.from("finance_measurements").insert({ organization_id: context.organizationId, project_id: projectId, contract_id: contractId, client_id: contract.client_id, code: code("MED"), period_start: text(data, "periodStart"), period_end: text(data, "periodEnd"), due_date: text(data, "dueDate"), description: text(data, "description"), retention_amount: numberValue(text(data, "retentionAmount")), deduction_amount: numberValue(text(data, "deductionAmount")), created_by: context.userId }).select("id").single();
  if (error || !measurement) fail("/app/financeiro/medicoes/nova", error?.message ?? "Não foi possível criar a medição.");
  const { error: itemsError } = await context.supabase.from("finance_measurement_items").insert(items.map((item, index) => ({ organization_id: context.organizationId, measurement_id: measurement.id, line_number: index + 1, description: item.description, unit: item.unit, previous_quantity: item.previousQuantity, current_quantity: item.currentQuantity, unit_price: item.unitPrice, notes: item.notes ?? "" })));
  if (itemsError) { await context.supabase.from("finance_measurements").delete().eq("id", measurement.id); fail("/app/financeiro/medicoes/nova", itemsError.message); }
  redirect(`/app/financeiro/medicoes/${measurement.id}`);
}
export async function submitFinanceMeasurement(data: FormData) { const id = text(data, "measurementId"); const context = await requireCapability("financeiro", "update"); const { error } = await context.supabase.rpc("submit_finance_measurement", { p_measurement_id: id }); if (error) fail(`/app/financeiro/medicoes/${id}`, error.message); revalidatePath(`/app/financeiro/medicoes/${id}`); }
export async function decideFinanceMeasurement(data: FormData) { const id = text(data, "measurementId"); const context = await requireCapability("financeiro", "approve"); const { error } = await context.supabase.rpc("decide_finance_measurement", { p_measurement_id: id, p_decision: text(data, "decision"), p_comment: text(data, "comment") }); if (error) fail(`/app/financeiro/medicoes/${id}`, error.message); revalidatePath(`/app/financeiro/medicoes/${id}`); revalidatePath("/app/financeiro/lancamentos"); }
