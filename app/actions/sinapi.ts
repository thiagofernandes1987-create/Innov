"use server";

import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";

const allowedRoles = ["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA", "FINANCEIRO"] as const;

function catalogError(message: string): never {
  redirect(`/app/orcamentos/sinapi?error=${encodeURIComponent(message)}`);
}

export async function addSinapiBudgetItem(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  const kind = String(formData.get("kind") ?? "").toUpperCase();
  const referenceId = String(formData.get("referenceId") ?? "");
  const quantity = Number(formData.get("quantity"));

  if (!versionId || !referenceId || !["INPUT", "COMPOSITION"].includes(kind)) {
    catalogError("Referência SINAPI ou orçamento inválido.");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    catalogError("A quantidade precisa ser maior que zero.");
  }

  const { supabase, organizationId } = await requireOrganizationContext(allowedRoles);
  const { data: version, error: versionError } = await supabase
    .from("budget_versions")
    .select("id, budget_id, organization_id, frozen_at")
    .eq("id", versionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (versionError || !version) {
    catalogError(versionError?.message ?? "Versão de orçamento não encontrada.");
  }
  if (version.frozen_at) catalogError("A versão escolhida está congelada. Crie uma nova versão editável.");

  const { error } = await supabase.rpc("add_sinapi_reference_to_budget", {
    p_budget_version_id: version.id,
    p_kind: kind,
    p_reference_id: referenceId,
    p_quantity: quantity,
    p_section_id: null
  });

  if (error) catalogError(error.message);
  redirect(`/app/orcamentos/${version.budget_id}`);
}
