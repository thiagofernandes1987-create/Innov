"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";

const versionRoles = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "ORCAMENTISTA",
  "FINANCEIRO"
] as const;

export async function createNextBudgetVersion(formData: FormData) {
  const budgetId = String(formData.get("budgetId") ?? "").trim();
  const changeSummary = String(formData.get("changeSummary") ?? "Nova revisão do orçamento").trim();
  const { supabase } = await requireOrganizationContext(versionRoles);

  if (!budgetId) redirect("/app/orcamentos?error=Orçamento inválido.");

  const { error } = await supabase.rpc("create_next_budget_version", {
    p_budget_id: budgetId,
    p_change_summary: changeSummary || "Nova revisão do orçamento"
  });

  if (error) {
    reportDataAccessError("budget-versions.create-next", error);
    redirect(`/app/orcamentos/${budgetId}?error=${encodeURIComponent("Não foi possível criar a nova versão do orçamento.")}`);
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${budgetId}`);
  redirect(`/app/orcamentos/${budgetId}`);
}