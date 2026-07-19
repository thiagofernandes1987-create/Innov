"use server";

import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";

export async function createBudget(formData: FormData) {
  const { supabase, organizationId } = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "COMERCIAL", "ORCAMENTISTA"
  ]);

  const clientId = String(formData.get("clientId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const validUntil = String(formData.get("validUntil") ?? "") || null;

  const { data, error } = await supabase.rpc("create_budget", {
    p_organization_id: organizationId,
    p_client_id: clientId,
    p_code: code,
    p_title: title,
    p_valid_until: validUntil,
    p_project_id: null,
    p_opportunity_id: null
  });

  if (error || !data) {
    redirect(`/app/orcamentos/novo?error=${encodeURIComponent(error?.message ?? "Não foi possível criar o orçamento.")}`);
  }

  redirect(`/app/orcamentos/${data}`);
}
