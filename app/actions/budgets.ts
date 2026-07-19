"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";

const internalRoles = ["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA", "FINANCEIRO"] as const;

export async function calculateBudgetVersion(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  const budgetId = String(formData.get("budgetId") ?? "");
  const { supabase } = await requireOrganizationContext(internalRoles);

  const { error } = await supabase.rpc("calculate_budget_version", {
    p_version_id: versionId
  });

  if (error) {
    redirect(`/app/orcamentos/${budgetId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/app/orcamentos/${budgetId}`);
}

export async function freezeBudgetVersion(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  const budgetId = String(formData.get("budgetId") ?? "");
  const { supabase } = await requireOrganizationContext(internalRoles);

  const { error } = await supabase.rpc("freeze_budget_version", {
    p_version_id: versionId
  });

  if (error) {
    redirect(`/app/orcamentos/${budgetId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/app/orcamentos/${budgetId}`);
}

export async function decideBudgetApproval(formData: FormData) {
  const approvalId = String(formData.get("approvalId") ?? "");
  const budgetId = String(formData.get("budgetId") ?? "");
  const decision = String(formData.get("decision") ?? "REJECTED");
  const reason = String(formData.get("reason") ?? "");
  const { supabase } = await requireOrganizationContext(["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "FINANCEIRO"]);

  const { error } = await supabase.rpc("decide_budget_approval", {
    p_approval_id: approvalId,
    p_decision: decision,
    p_reason: reason
  });

  if (error) {
    redirect(`/app/orcamentos/${budgetId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/app/orcamentos/${budgetId}`);
}
