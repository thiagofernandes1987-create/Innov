"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import type { ProjectCreationState } from "@/lib/forms/project-creation-state";
import {
  classifyProjectCreationProviderError,
  validateFlexibleProject
} from "@/lib/projects/project-creation";

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

export async function createFlexibleProject(
  _previousState: ProjectCreationState,
  formData: FormData
): Promise<ProjectCreationState> {
  const context = await requireOrganizationContext(MANAGEMENT_ROLES);
  const validation = validateFlexibleProject(formData, context.organizationId);
  if (!validation.ok) return validation.state;

  const input = validation.value;
  const { data, error } = await context.supabase.rpc("create_independent_project_v3", {
    p_organization_id: input.organizationId,
    p_client_id: input.clientId,
    p_entry_mode: input.entryMode,
    p_code: input.code,
    p_name: input.name,
    p_status: input.status,
    p_description: input.description,
    p_planned_start: input.plannedStart,
    p_planned_end: input.plannedEnd,
    p_actual_start: input.actualStart,
    p_progress: input.progress,
    p_data_cutoff: input.dataCutoff,
    p_historical_cost: input.historicalCost,
    p_address_line: input.addressLine,
    p_district: input.district,
    p_city: input.city,
    p_state: input.state,
    p_postal_code: input.postalCode,
    p_manager_id: input.managerId,
    p_imported_from: input.importedFrom
  });

  if (error || !data) {
    reportDataAccessError("create-flexible-project.rpc", error);
    return classifyProjectCreationProviderError(
      error,
      "Não foi possível criar a obra ou projeto. Os dados preenchidos foram preservados para uma nova tentativa."
    );
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
