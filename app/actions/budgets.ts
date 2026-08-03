"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { ESCOPOS, registrarValorUsado } from "@/lib/sugestoes/servidor";

const internalRoles = ["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA", "FINANCEIRO"] as const;
const editableCostTypes = new Set(["DIRECT", "INDIRECT", "FIXED", "ADMINISTRATIVE"]);
const editableItemCategories = new Set([
  "MATERIAL",
  "LABOR",
  "EQUIPMENT",
  "SERVICE",
  "SUBCONTRACT",
  "FIXED_COST",
  "REFERENCE",
  "OTHER"
]);

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

function nonNegativeNumber(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} não pode ser negativo.`);
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

function validationMessage(callback: () => void) {
  try {
    callback();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Dados inválidos.";
  }
}

async function requireEditableVersion(
  budgetId: string,
  versionId: string,
  allowedRoles: readonly string[] = internalRoles
) {
  const context = await requireOrganizationContext(allowedRoles);
  const { data: version, error } = await context.supabase
    .from("budget_versions")
    .select("id, budget_id, organization_id, version_number, frozen_at, markup_model_id")
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

async function recalculate(
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
  let snapshotId = "";
  let area = 0;
  const invalid = validationMessage(() => {
    snapshotId = requiredText(formData, "snapshotId", "Referência oficial");
    area = positiveNumber(formData, "area", "Metragem/área");
  });
  if (invalid) budgetError(budgetId, invalid);

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
    item_category: "REFERENCE",
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
  await recalculate(supabase, budgetId, versionId);
}

export async function addManualBudgetItem(formData: FormData) {
  const budgetId = String(formData.get("budgetId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  let description = "";
  let unit = "";
  let source = "";
  let region = "";
  let baseDate = "";
  let quantity = 0;
  let unitCost = 0;
  let lossRate = 0;
  let freightRate = 0;

  const costType = String(formData.get("costType") ?? "DIRECT").trim().toUpperCase();
  const itemCategory = String(formData.get("itemCategory") ?? "MATERIAL").trim().toUpperCase();
  const code = String(formData.get("code") ?? "").trim() || null;
  const invalid = validationMessage(() => {
    description = requiredText(formData, "description", "Descrição");
    unit = requiredText(formData, "unit", "Unidade");
    source = requiredText(formData, "source", "Fonte do custo");
    region = requiredText(formData, "region", "Região");
    baseDate = requiredText(formData, "baseDate", "Data-base");
    quantity = positiveNumber(formData, "quantity", "Quantidade/metragem");
    unitCost = positiveNumber(formData, "unitCost", "Custo unitário");
    lossRate = nonNegativeRate(formData, "lossRate", "Perda");
    freightRate = nonNegativeRate(formData, "freightRate", "Frete");
    if (!editableCostTypes.has(costType)) throw new Error("Tipo contábil do custo é inválido.");
    if (!editableItemCategories.has(itemCategory)) throw new Error("Natureza do item é inválida.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) throw new Error("Data-base inválida.");
  });
  if (invalid) budgetError(budgetId, invalid);

  const { supabase, organizationId, userId } = await requireEditableVersion(budgetId, versionId);
  const sequence = await nextItemSequence(supabase, versionId);
  const { error } = await supabase.from("budget_items").insert({
    organization_id: organizationId,
    budget_version_id: versionId,
    cost_type: costType,
    item_category: itemCategory,
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
  // Depois da gravação: "m²", "vb", "cj" e "mês" são o vocabulário de medida da
  // construtora, e são o caso em que a divergência de grafia mais custa —
  // "m2", "M²" e "m ²" viram três unidades no mesmo orçamento.
  await registrarValorUsado(supabase, organizationId, ESCOPOS.unidade, unit);
  await recalculate(supabase, budgetId, versionId);
}

export async function updateBudgetPricing(formData: FormData) {
  const budgetId = String(formData.get("budgetId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  let taxRate = 0;
  let commissionRate = 0;
  let variableExpenseRate = 0;
  let desiredMarginRate = 0;
  let investedCapital = 0;

  const invalid = validationMessage(() => {
    taxRate = nonNegativeRate(formData, "taxRate", "Impostos");
    commissionRate = nonNegativeRate(formData, "commissionRate", "Comissão");
    variableExpenseRate = nonNegativeRate(formData, "variableExpenseRate", "Despesas variáveis");
    desiredMarginRate = nonNegativeRate(formData, "desiredMarginRate", "Margem desejada");
    investedCapital = nonNegativeNumber(formData, "investedCapital", "Capital investido");
    if (taxRate + commissionRate + variableExpenseRate + desiredMarginRate >= 1) {
      throw new Error("A soma de impostos, comissão, despesas variáveis e margem deve ser menor que 100%.");
    }
  });
  if (invalid) budgetError(budgetId, invalid);

  const { supabase, organizationId, userId, version } = await requireEditableVersion(budgetId, versionId);
  const modelName = `BUDGET_VERSION:${versionId}`;
  let markupModelId: string | null = null;

  if (version.markup_model_id) {
    const { data: linkedModel } = await supabase
      .from("markup_models")
      .select("id, name")
      .eq("id", version.markup_model_id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (linkedModel?.name === modelName) markupModelId = linkedModel.id;
  }

  const payload = {
    organization_id: organizationId,
    name: modelName,
    method: "DIVISOR",
    multiplier: null,
    tax_rate: taxRate,
    commission_rate: commissionRate,
    variable_expense_rate: variableExpenseRate,
    desired_margin_rate: desiredMarginRate,
    active: true,
    created_by: userId
  };

  if (markupModelId) {
    const { error } = await supabase
      .from("markup_models")
      .update(payload)
      .eq("id", markupModelId)
      .eq("organization_id", organizationId);
    if (error) budgetError(budgetId, error.message);
  } else {
    const { data, error } = await supabase
      .from("markup_models")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) budgetError(budgetId, error?.message ?? "Não foi possível configurar a formação de preço.");
    markupModelId = data.id;
  }

  const { error: versionError } = await supabase
    .from("budget_versions")
    .update({ markup_model_id: markupModelId, invested_capital: investedCapital })
    .eq("id", versionId)
    .eq("organization_id", organizationId)
    .is("frozen_at", null);

  if (versionError) budgetError(budgetId, versionError.message);
  await recalculate(supabase, budgetId, versionId);
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
  await recalculate(supabase, budgetId, versionId);
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
