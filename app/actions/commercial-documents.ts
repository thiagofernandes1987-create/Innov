"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";

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
