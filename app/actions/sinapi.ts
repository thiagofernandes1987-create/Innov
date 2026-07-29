"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { runSinapiAutomaticUpdate } from "@/lib/sinapi/automatic-update";

const allowedRoles = ["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA", "FINANCEIRO"] as const;
const updateRoles = ["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA"] as const;

function catalogError(message: string): never {
  redirect(`/app/orcamentos/sinapi?error=${encodeURIComponent(message)}`);
}

function automaticRedirect(region: string, taxRelief: boolean, key: "error" | "success", message: string): never {
  const params = new URLSearchParams({
    region,
    relief: String(taxRelief),
    [key]: message
  });
  redirect(`/app/orcamentos/sinapi?${params.toString()}`);
}

export async function updateSinapiAutomatically(formData: FormData) {
  const region = String(formData.get("region") ?? "").trim().toUpperCase();
  const taxRelief = String(formData.get("taxRelief") ?? "false") === "true";
  if (!/^[A-Z]{2}$/.test(region)) automaticRedirect("SP", taxRelief, "error", "UF inválida para atualização SINAPI.");

  const { organizationId } = await requireOrganizationContext(updateRoles);
  let result;
  try {
    result = await runSinapiAutomaticUpdate({ organizationId, region, taxRelief });
  } catch (error) {
    automaticRedirect(
      region,
      taxRelief,
      "error",
      error instanceof Error ? error.message : "Falha desconhecida na atualização automática do SINAPI."
    );
  }

  revalidatePath("/app/orcamentos/sinapi");
  const regime = taxRelief ? "com desoneração" : "sem desoneração";
  const month = new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${result.baseDate}T12:00:00Z`));
  const message = result.status === "updated"
    ? `SINAPI ${region} ${regime} atualizado para ${month}: ${result.inputs.toLocaleString("pt-BR")} insumos e ${result.compositions.toLocaleString("pt-BR")} composições.`
    : result.status === "already_current"
      ? `A base SINAPI ${region} ${regime} de ${month} já estava atualizada.`
      : `A base local SINAPI ${region} ${regime} (${month}) é mais nova que o pacote encontrado na CAIXA; nenhum dado foi substituído.`;
  automaticRedirect(region, taxRelief, "success", message);
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
