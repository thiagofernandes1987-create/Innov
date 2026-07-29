"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { requireOrganizationContext } from "@/lib/auth";

const PDF_MIME = "application/pdf";
const MAX_COMMERCIAL_PDF_SIZE = 20 * 1024 * 1024;
const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO"
] as const;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function decimal(formData: FormData, key: string, fallback = 0) {
  const raw = text(formData, key);
  if (!raw) return fallback;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function createFlexibleProject(formData: FormData) {
  const context = await requireOrganizationContext(MANAGEMENT_ROLES);
  const entryMode = text(formData, "entryMode") || "INDEPENDENT";
  const progressPercent = decimal(formData, "progressPercent", 0);

  const { data, error } = await context.supabase.rpc("create_independent_project", {
    p_organization_id: context.organizationId,
    p_client_id: optional(formData, "clientId"),
    p_entry_mode: entryMode,
    p_code: text(formData, "code"),
    p_name: text(formData, "name"),
    p_status: text(formData, "status") || (entryMode === "IN_PROGRESS" ? "IN_PROGRESS" : "PLANNING"),
    p_description: optional(formData, "description"),
    p_planned_start: optional(formData, "plannedStart"),
    p_planned_end: optional(formData, "plannedEnd"),
    p_actual_start: optional(formData, "actualStart"),
    p_progress: progressPercent / 100,
    p_data_cutoff: optional(formData, "dataCutoff"),
    p_historical_cost: decimal(formData, "historicalCost", 0),
    p_address_line: optional(formData, "addressLine"),
    p_city: optional(formData, "city"),
    p_state: optional(formData, "state"),
    p_postal_code: optional(formData, "postalCode"),
    p_manager_id: optional(formData, "managerId"),
    p_imported_from: optional(formData, "importedFrom")
  });

  if (error || !data) {
    fail("/app/obras/novo", error?.message ?? "Não foi possível criar a obra ou projeto.");
  }

  revalidatePath("/app/obras");
  revalidatePath("/app/planejamento");
  redirect(`/app/obras/${data}`);
}

export async function createFlexibleProposal(formData: FormData) {
  const context = await requireCapability("propostas", "create");
  const file = formData.get("file");
  let storagePath: string | null = null;
  let sha256: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.type !== PDF_MIME) {
      fail("/app/propostas/nova", "A proposta comercial precisa ser enviada em PDF.");
    }
    if (file.size > MAX_COMMERCIAL_PDF_SIZE) {
      fail("/app/propostas/nova", "O PDF excede o limite de 20 MB.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    sha256 = createHash("sha256").update(bytes).digest("hex");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    storagePath = `${context.organizationId}/proposals/${randomUUID()}-${safeName}`;
    const upload = await context.supabase.storage
      .from("commercial-documents")
      .upload(storagePath, bytes, { contentType: PDF_MIME, upsert: false });

    if (upload.error) fail("/app/propostas/nova", upload.error.message);
  }

  const pricingMode = text(formData, "pricingMode") || "FIXED";
  const discountPercent = decimal(formData, "discountPercent", 0);
  const { data, error } = await context.supabase.rpc("create_commercial_proposal", {
    p_client_id: optional(formData, "clientId"),
    p_budget_version_id: optional(formData, "budgetVersionId"),
    p_pricing_mode: pricingMode,
    p_fixed_value: decimal(formData, "fixedValue", 0),
    p_discount_rate: discountPercent / 100,
    p_discount_reason: optional(formData, "discountReason"),
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
    if (storagePath) {
      await context.supabase.storage.from("commercial-documents").remove([storagePath]);
    }
    fail("/app/propostas/nova", error?.message ?? "Não foi possível criar a proposta.");
  }

  revalidatePath("/app/propostas");
  revalidatePath("/app/orcamentos");
  redirect("/app/propostas");
}

export async function decideFlexibleProposalDiscount(formData: FormData) {
  const context = await requireOrganizationContext(["SUPER_ADMIN", "DIRECAO"]);
  const proposalVersionId = text(formData, "proposalVersionId");
  const { error } = await context.supabase.rpc("decide_proposal_discount", {
    p_proposal_version_id: proposalVersionId,
    p_decision: text(formData, "decision"),
    p_comment: text(formData, "comment")
  });

  if (error) fail("/app/propostas", error.message);
  revalidatePath("/app/propostas");
}
