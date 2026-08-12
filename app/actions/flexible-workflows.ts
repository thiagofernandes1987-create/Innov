"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import type { ProjectCreationState } from "@/lib/forms/project-creation-state";
import { campoDeTexto } from "@/lib/forms/campos";
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

export type ProposalCreationState = {
  status: "idle" | "error";
  message?: string;
};

export type ProposalUploadPreparation =
  | { ok: true; path: string; token: string }
  | { ok: false; message: string };

function text(formData: FormData, key: string) {
  return campoDeTexto(formData, key).trim();
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

function proposalError(message: string): ProposalCreationState {
  return { status: "error", message };
}

function validProposalPath(path: string, organizationId: string) {
  return path.startsWith(`${organizationId}/proposals/`) && !path.includes("..") && !path.includes("\\");
}

async function removeProposalUpload(
  supabase: Awaited<ReturnType<typeof requireCapability>>["supabase"],
  storagePath: string | null
) {
  if (!storagePath) return;
  const removal = await supabase.storage.from("commercial-documents").remove([storagePath]);
  reportDataAccessError("proposal-upload.cleanup", removal.error);
}

export async function prepareProposalUpload(input: {
  name: string;
  type: string;
  size: number;
}): Promise<ProposalUploadPreparation> {
  const context = await requireCapability("propostas", "create");
  const name = String(input.name ?? "").trim();
  const type = String(input.type ?? "").trim().toLowerCase();
  const size = Number(input.size ?? 0);

  if (!name || (!name.toLowerCase().endsWith(".pdf") && type !== PDF_MIME)) {
    return { ok: false, message: "Selecione um arquivo PDF válido." };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: "O PDF selecionado está vazio ou não pôde ser lido." };
  }
  if (size > MAX_COMMERCIAL_PDF_SIZE) {
    return { ok: false, message: "O PDF excede o limite de 20 MB." };
  }

  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${context.organizationId}/proposals/${randomUUID()}-${safeName}`;
  const signed = await context.supabase.storage
    .from("commercial-documents")
    .createSignedUploadUrl(storagePath);

  if (signed.error || !signed.data?.token) {
    reportDataAccessError("proposal-upload.prepare", signed.error);
    return { ok: false, message: "Não foi possível preparar o envio do PDF. Tente novamente." };
  }

  return { ok: true, path: storagePath, token: signed.data.token };
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

export async function createFlexibleProposal(
  _previousState: ProposalCreationState,
  formData: FormData
): Promise<ProposalCreationState> {
  const context = await requireCapability("propostas", "create");
  const pricingMode = text(formData, "pricingMode") || "FIXED";
  const budgetVersionId = optional(formData, "budgetVersionId");
  const fixedValue = decimal(formData, "fixedValue", 0);
  const discountPercent = decimal(formData, "discountPercent", 0);
  const discountReason = optional(formData, "discountReason");
  const releaseClient = formData.get("releaseClient") !== null;
  const storagePath = optional(formData, "uploadedPath");

  if (pricingMode !== "BUDGET" && pricingMode !== "FIXED") {
    return proposalError("Escolha como o valor da proposta será formado.");
  }
  if (pricingMode === "BUDGET" && !budgetVersionId) {
    return proposalError("Selecione um orçamento calculado para continuar.");
  }
  if (pricingMode === "FIXED" && fixedValue <= 0) {
    return proposalError("Informe um valor fixo maior que zero.");
  }
  if (!text(formData, "code") || !text(formData, "title")) {
    return proposalError("Preencha o código e o título da proposta.");
  }
  if (!text(formData, "objectText") || !text(formData, "scopeText")) {
    return proposalError("Preencha o objeto e o escopo da proposta.");
  }
  if (discountPercent < 0 || discountPercent >= 100) {
    return proposalError("O desconto precisa estar entre 0% e 99,99%.");
  }
  if (discountPercent > 7 && !discountReason) {
    return proposalError("Justifique o desconto acima de 7% para solicitar aprovação da diretoria.");
  }
  if (releaseClient && !storagePath) {
    return proposalError("Anexe o PDF final antes de liberar a proposta ao portal do cliente.");
  }
  if (storagePath && !validProposalPath(storagePath, context.organizationId)) {
    reportDataAccessError("proposal-upload.invalid-path", { code: "INVALID_PATH" });
    return proposalError("O PDF anexado não pertence a esta organização. Selecione o arquivo novamente.");
  }

  let sha256: string | null = null;
  if (storagePath) {
    const downloaded = await context.supabase.storage.from("commercial-documents").download(storagePath);
    if (downloaded.error || !downloaded.data) {
      reportDataAccessError("proposal-upload.download", downloaded.error);
      return proposalError("O PDF não pôde ser confirmado no armazenamento. Selecione o arquivo novamente.");
    }

    if (downloaded.data.size <= 0 || downloaded.data.size > MAX_COMMERCIAL_PDF_SIZE) {
      await removeProposalUpload(context.supabase, storagePath);
      return proposalError("O PDF está vazio ou excede o limite de 20 MB.");
    }

    const bytes = Buffer.from(await downloaded.data.arrayBuffer());
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      await removeProposalUpload(context.supabase, storagePath);
      return proposalError("O arquivo enviado não possui uma assinatura PDF válida.");
    }
    sha256 = createHash("sha256").update(bytes).digest("hex");
  }

  const { data, error } = await context.supabase.rpc("create_commercial_proposal", {
    p_client_id: optional(formData, "clientId"),
    p_budget_version_id: budgetVersionId,
    p_pricing_mode: pricingMode,
    p_fixed_value: fixedValue,
    p_discount_rate: discountPercent / 100,
    p_discount_reason: discountReason,
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
    p_release_client: releaseClient
  });

  if (error || !data) {
    reportDataAccessError("create-flexible-proposal.rpc", error);
    await removeProposalUpload(context.supabase, storagePath);
    return proposalError("Não foi possível criar a proposta. Revise os dados e tente novamente.");
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

  if (error) {
    reportDataAccessError("proposal-discount.decision", error);
    fail("/app/propostas", "Não foi possível registrar a decisão de desconto.");
  }
  revalidatePath("/app/propostas");
}
