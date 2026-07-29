"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";

const internalRoles = ["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA", "FINANCEIRO"] as const;
const editableCostTypes = new Set(["DIRECT", "INDIRECT", "FIXED", "ADMINISTRATIVE"]);

function budgetError(budgetId: string, message: string): never {
  redirect(`/app/orcamentos/${budgetId}?error=${encodeURIComponent(message)}`);
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} é obrigatório.`);
  return value;
}

function positiveNumber(formData: FormData, key: string, label: string) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser maior que zero.`);
  return value;
}

function nonNegativeRate(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error(`${label} deve estar entre 0% e 100%.`);
  }
  return percent / 100;
}

async function requireEditableVersion(
  budgetId: string,
  versionId: string,
  allowedRoles: readonly string[] = internalRoles
) {
  const context = await requireOrganizationContext(allowedRoles);
  const { data: version, error } = await context.supabase
    .from("budget_versions")
    .select("id, budget_id, organization_id, frozen_at")
    .eq("id", versionId)
    .eq("budget_id", budgetId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (error || !version) budgetError(budgetId, error?.message ?? "Versão de orçamento não encontrada.");
  if (version.frozen_at) budgetError(budgetId, "Versões congeladas não podem receber alterações.");

  return { ...context, version };
}

async function nextItemSequence(
  supabase: Awaited<ReturnType<typeof requireOrganizationContext>>["supabase"],
  versionId: string
) {
  const { data } = await supabase
    .from("budget_items")
    .select("sequence")
    .eq("budget_version_id", versionId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number(data?.sequence ?? 0) + 1;
}

async function recalculateAfterItemChange(
  supabase: Awaited<ReturnType<typeof requireOrganizationContext>>["supabase"],
  budgetId: string,
  versionId: string
) {
  const { error } = await supabase.rpc("calculate_budget_version", {
    p_version_id: versionId
  });
  if (error) budgetError(budgetId, error.message);
  revalidatePath(`/app/orcamentos/${budgetId}`);
}

export async function addCubReferenceItem(formData: FormData) {
  const budgetId = String(formData.get("budgetId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");

  try {
    const snapshotId = requiredText(formData, "snapshotId", "Referência oficial");
    const area = positiveNumber(formData, "area", "Área");
    const { supabase, organizationId, userId } = await requireEditableVersion(budgetId, versionId);

    const { data: snapshot, error: snapshotError } = await supabase
      .from("cost_reference_snapshots")
      .select("id, source_key, source_name, region, reference_code, base_date, tax_relief, unit, total_cost")
      .eq("id", snapshotId)
      .maybeSingle();

    if (snapshotError || !snapshot) {
      budgetError(budgetId, snapshotError?.message ?? "Referência oficial não encontrada.");
    }

    const sequence = await nextItemSequence(supabase, versionId);
    const reliefLabel = snapshot.tax_relief ? "com desoneração" : "sem desoneração";
    const code = `CUB-${snapshot.reference_code}-${snapshot.region}-${snapshot.base_date}-${snapshot.tax_relief ? "CD" : "SD"}`;

    const { error: insertError } = await supabase.from("budget_items").insert({
      organization_id: organizationId,
      budget_version_id: versionId,
      cost_type: "DIRECT",
      code,
      description: `Referência global ${snapshot.source_name} ${snapshot.reference_code} ${reliefLabel}`,
      unit: snapshot.unit,
      quantity: area,
      unit_cost: Number(snapshot.total_cost),
      loss_rate: 0,
      freight_rate: 0,
      source: `${snapshot.source_name} · ${snapshot.reference_code} · ${reliefLabel}`,
      region: snapshot.region,
      base_date: snapshot.base_date,
      sequence,
      created_by: userId
    });

    if (insertError) budgetError(budgetId, insertError.message);

    const { error: versionError } = await supabase
      .from("budget_versions")
      .update({ reference_snapshot_id: snapshot.id })
      .eq("id", versionId)
      .eq("organization_id", organizationId)
      .is("frozen_at", null);

    if (versionError) budgetError(budgetId, versionError.message);
    await recalculateAfterItemChange(supabase, budgetId, versionId);
  } catch (error) {
    budgetError(budgetId, error instanceof Error ? error.message : "Não foi possível aplicar a referência CUB.");
  }
}

export async function addManualBudgetItem(formData: FormData) {
  const budgetId = String(formData.get("budgetId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");

  try {
    const description = requiredText(formData, "description", "Descrição");
    const unit = requiredText(formData, "unit", "Unidade");
    const source = requiredText(formData, "source", "Fonte do custo");
    const region = requiredText(formData, "region", "Região");
    const baseDate = requiredText(formData, "baseDate", "Data-base");
    const quantity = positiveNumber(formData, "quantity", "Quantidade");
    const unitCost = positiveNumber(formData, "unitCost", "Custo unitário");
    const lossRate = nonNegativeRate(formData, "lossRate", "Perda");
    const freightRate = nonNegativeRate(formData, "freightRate", "Frete");
    const costType = String(formData.get("costType") ?? "DIRECT").trim().toUpperCase();
    const code = String(formData.get("code") ?? "").trim() || null;

    if (!editableCostTypes.has(costType)) throw new Error("Tipo de custo inválido.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) throw new Error("Data-base inválida.");

    const { supabase, organizationId, userId } = await requireEditableVersion(budgetId, versionId);
    const sequence = await nextItemSequence(supabase, versionId);

    const { error } = await supabase.from("budget_items").insert({
      organization_id: organizationId,
      budget_version_id: versionId,
      cost_type: costType,
      code,
      description,
      unit,
      quantity,
      unit_cost: unitCost,
      loss_rate: lossRate,
      freight_rate: freightRate,
      source,
      region,
      base_date: baseDate,
      sequence,
      created_by: userId
    });

    if (error) budgetError(budgetId, error.message);
    await recalculateAfterItemChange(supabase, budgetId, versionId);
  } catch (error) {
    budgetError(budgetId, error instanceof Error ? error.message : "Não foi possível incluir o item.");
  }
}

export async function removeBudgetItem(formData: FormData) {
  const budgetId = String(formData.get("budgetId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const { supabase, organizationId } = await requireEditableVersion(budgetId, versionId);

  const { error } = await supabase
    .from("budget_items")
    .delete()
    .eq("id", itemId)
    .eq("budget_version_id", versionId)
    .eq("organization_id", organizationId);

  if (error) budgetError(budgetId, error.message);
  await recalculateAfterItemChange(supabase, budgetId, versionId);
}

export async function calculateBudgetVersion(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  const budgetId = String(formData.get("budgetId") ?? "");
  const { supabase } = await requireOrganizationContext(internalRoles);

  const { error } = await supabase.rpc("calculate_budget_version", {
    p_version_id: versionId
  });

  if (error) budgetError(budgetId, error.message);
  revalidatePath(`/app/orcamentos/${budgetId}`);
}

export async function freezeBudgetVersion(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  const budgetId = String(formData.get("budgetId") ?? "");
  const { supabase } = await requireOrganizationContext(internalRoles);

  const { error } = await supabase.rpc("freeze_budget_version", {
    p_version_id: versionId
  });

  if (error) budgetError(budgetId, error.message);
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

  if (error) budgetError(budgetId, error.message);
  revalidatePath(`/app/orcamentos/${budgetId}`);
}
