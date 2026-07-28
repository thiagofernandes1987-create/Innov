"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";

const PDF_MIME = "application/pdf";
const MAX_COMMERCIAL_PDF_SIZE = 20 * 1024 * 1024;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function numberValue(formData: FormData, key: string) {
  const value = Number(text(formData, key).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createProposalFromBudget(formData: FormData) {
  const context = await requireCapability("propostas", "create");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    fail("/app/propostas/nova", "Selecione o PDF final da proposta.");
  }
  if (file.type !== PDF_MIME) {
    fail("/app/propostas/nova", "A proposta comercial precisa ser enviada em PDF.");
  }
  if (file.size > MAX_COMMERCIAL_PDF_SIZE) {
    fail("/app/propostas/nova", "O PDF excede o limite de 20 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${context.organizationId}/proposals/${randomUUID()}-${safeName}`;
  const upload = await context.supabase.storage
    .from("commercial-documents")
    .upload(storagePath, bytes, { contentType: PDF_MIME, upsert: false });

  if (upload.error) fail("/app/propostas/nova", upload.error.message);

  const { data, error } = await context.supabase.rpc("create_proposal_from_budget_version", {
    p_budget_version_id: text(formData, "budgetVersionId"),
    p_code: text(formData, "code"),
    p_title: text(formData, "title"),
    p_object_text: text(formData, "objectText"),
    p_scope_text: text(formData, "scopeText"),
    p_inclusions: text(formData, "inclusions"),
    p_exclusions: text(formData, "exclusions"),
    p_assumptions: text(formData, "assumptions"),
    p_commercial_summary: text(formData, "commercialSummary"),
    p_payment_terms: text(formData, "paymentTerms"),
    p_deadline_text: text(formData, "deadlineText"),
    p_warranty_text: text(formData, "warrantyText"),
    p_notes: text(formData, "notes"),
    p_valid_until: optional(formData, "validUntil"),
    p_document_path: storagePath,
    p_document_sha256: sha256,
    p_release_client: formData.get("releaseClient") !== null
  });

  if (error || !data) {
    await context.supabase.storage.from("commercial-documents").remove([storagePath]);
    fail("/app/propostas/nova", error?.message ?? "Não foi possível criar a proposta.");
  }

  revalidatePath("/app/propostas");
  redirect("/app/propostas");
}

export async function createContractFromProposal(formData: FormData) {
  const context = await requireCapability("contratos", "create");
  const { data, error } = await context.supabase.rpc("create_contract_from_proposal", {
    p_proposal_version_id: text(formData, "proposalVersionId"),
    p_contract_code: text(formData, "code"),
    p_contract_title: text(formData, "title"),
    p_rendered_body: text(formData, "renderedBody"),
    p_template_id: optional(formData, "templateId")
  });
  if (error || !data) {
    fail("/app/contratos/novo", error?.message ?? "Não foi possível criar o contrato.");
  }
  revalidatePath("/app/contratos");
  redirect("/app/contratos");
}

export async function createAmendment(formData: FormData) {
  const context = await requireCapability("aditivos", "create");
  const { data, error } = await context.supabase.rpc("create_amendment", {
    p_contract_id: text(formData, "contractId"),
    p_code: text(formData, "code"),
    p_reason: text(formData, "reason"),
    p_scope_delta: text(formData, "scopeDelta"),
    p_value_delta: numberValue(formData, "valueDelta"),
    p_days_delta: Math.trunc(numberValue(formData, "daysDelta")),
    p_new_end_date: optional(formData, "newEndDate"),
    p_budget_version_id: optional(formData, "budgetVersionId")
  });
  if (error || !data) {
    fail("/app/aditivos/novo", error?.message ?? "Não foi possível criar o aditivo.");
  }
  revalidatePath("/app/aditivos");
  revalidatePath("/app/contratos");
  redirect("/app/aditivos");
}
