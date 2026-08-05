"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { reportDataAccessError } from "@/lib/errors/data-access";

export type OpportunityCreationState = {
  status: "idle" | "error";
  message?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STAGES = new Set(["PROSPECTING", "QUALIFIED", "PROPOSAL", "NEGOTIATION"]);

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function optional(data: FormData, key: string) {
  return text(data, key) || null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function errorState(message: string): OpportunityCreationState {
  return { status: "error", message };
}

function validOptionalUuid(value: string | null) {
  return value === null || UUID_PATTERN.test(value);
}

function resultRow<T extends Record<string, unknown>>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function createCrmOpportunitySafe(
  _previousState: OpportunityCreationState,
  data: FormData
): Promise<OpportunityCreationState> {
  const context = await requireCapability("crm", "create");
  const clientId = optional(data, "clientId");
  const leadId = optional(data, "leadId");
  const title = text(data, "title");
  const stage = text(data, "stage") || "PROSPECTING";
  const probability = numberOrNull(text(data, "probability")) ?? 25;
  const estimatedValue = numberOrNull(text(data, "estimatedValue"));

  if (!validOptionalUuid(clientId) || !validOptionalUuid(leadId)) {
    return errorState("Selecione um cliente ou lead válido na lista.");
  }
  if (!title) {
    return errorState("Informe o título da oportunidade.");
  }
  if (!ALLOWED_STAGES.has(stage)) {
    return errorState("Selecione uma etapa inicial válida.");
  }
  if (probability < 0 || probability > 100) {
    return errorState("A probabilidade precisa estar entre 0% e 100%.");
  }
  if (estimatedValue !== null && estimatedValue < 0) {
    return errorState("O valor estimado não pode ser negativo.");
  }

  const { data: opportunity, error } = await context.supabase.rpc("create_crm_opportunity", {
    p_organization_id: context.organizationId,
    p_client_id: clientId,
    p_lead_id: leadId,
    p_title: title,
    p_description: optional(data, "description"),
    p_estimated_value: estimatedValue,
    p_stage: stage,
    p_probability: probability,
    p_expected_close_date: optional(data, "expectedCloseDate"),
    p_source: optional(data, "source"),
    p_owner_id: optional(data, "ownerId")
  });

  if (error) {
    reportDataAccessError("create-crm-opportunity.rpc", error);
    return errorState("Não foi possível criar a oportunidade. Revise os dados e tente novamente.");
  }

  const row = resultRow(opportunity as Record<string, unknown> | Record<string, unknown>[] | null);
  const id = typeof row?.id === "string" && UUID_PATTERN.test(row.id) ? row.id : null;
  if (!id) {
    reportDataAccessError("create-crm-opportunity.invalid-result", { code: "INVALID_RPC_RESULT" });
    return errorState("A oportunidade foi processada, mas não foi possível confirmar o registro criado.");
  }

  redirect(`/app/crm/oportunidades/${id}`);
}
