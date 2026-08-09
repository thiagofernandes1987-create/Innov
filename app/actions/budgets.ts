"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { linhasDoCub } from "@/lib/orcamentos/cub";
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
type ProviderLikeError = { code?: string | null; statusCode?: string | number | null; name?: string | null };

function budgetError(budgetId: string, message: string): never {
  redirect(`/app/orcamentos/${budgetId}?error=${encodeURIComponent(message)}`);
}

function budgetDataError(budgetId: string, operation: string, error: ProviderLikeError | null | undefined, message: string): never {
  reportDataAccessError(`budgets.${operation}`, error);
  budgetError(budgetId, message);
}

/** Deu certo, e há algo que quem fez precisa saber. Não é erro, e não some. */
function budgetNotice(budgetId: string, message: string): never {
  redirect(`/app/orcamentos/${budgetId}?aviso=${encodeURIComponent(message)}`);
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

  if (error || !version) budgetDataError(budgetId, "load-editable-version", error, "Versão de orçamento não encontrada ou indisponível.");
  if (version.frozen_at) budgetError(budgetId, "Versões congeladas não podem receber alterações.");

  return { ...context, version };
}

async function nextItemSequence(
  supabase: Awaited<ReturnType<typeof requireOrganizationContext>>["supabase"],
  versionId: string
) {
  const { data, error } = await supabase
    .from("budget_items")
    .select("sequence")
    .eq("budget_version_id", versionId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    reportDataAccessError("budgets.next-item-sequence", error);
    return null;
  }
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
  if (error) budgetDataError(budgetId, "recalculate", error, "Não foi possível recalcular o orçamento.");
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
    .select(
      "id, source_key, source_name, region, reference_code, base_date, tax_relief, unit, total_cost, materials_cost, labor_cost, administrative_cost, equipment_cost"
    )
    .eq("id", snapshotId)
    .maybeSingle();

  if (snapshotError || !snapshot) {
    budgetDataError(budgetId, "load-cost-reference", snapshotError, "Referência oficial não encontrada ou indisponível.");
  }

  const { linhas, decomposto, motivo } = linhasDoCub(
    {
      sourceName: String(snapshot.source_name),
      referenceCode: String(snapshot.reference_code),
      region: String(snapshot.region),
      baseDate: String(snapshot.base_date),
      taxRelief: Boolean(snapshot.tax_relief),
      unit: String(snapshot.unit),
      totalCost: Number(snapshot.total_cost),
      materialsCost: snapshot.materials_cost === null ? null : Number(snapshot.materials_cost),
      laborCost: snapshot.labor_cost === null ? null : Number(snapshot.labor_cost),
      administrativeCost:
        snapshot.administrative_cost === null ? null : Number(snapshot.administrative_cost),
      equipmentCost: snapshot.equipment_cost === null ? null : Number(snapshot.equipment_cost)
    },
    area
  );

  if (linhas.length === 0) budgetError(budgetId, "Informe a metragem da obra.");

  const sequence = await nextItemSequence(supabase, versionId);
  if (sequence === null) budgetError(budgetId, "Não foi possível determinar a ordem dos itens do orçamento.");
  const { error: insertError } = await supabase.from("budget_items").insert(
    linhas.map((linha, indice) => ({
      organization_id: organizationId,
      budget_version_id: versionId,
      cost_type: linha.costType,
      item_category: linha.itemCategory,
      code: linha.code,
      description: linha.description,
      unit: linha.unit,
      quantity: linha.quantity,
      unit_cost: linha.unitCost,
      loss_rate: linha.lossRate,
      freight_rate: linha.freightRate,
      source: linha.source,
      region: snapshot.region,
      base_date: snapshot.base_date,
      sequence: sequence + indice,
      created_by: userId
    }))
  );

  if (insertError) budgetDataError(budgetId, "insert-cub-items", insertError, "Não foi possível adicionar a referência oficial ao orçamento.");

  const { error: versionError } = await supabase
    .from("budget_versions")
    .update({ reference_snapshot_id: snapshot.id })
    .eq("id", versionId)
    .eq("organization_id", organizationId)
    .is("frozen_at", null);

  if (versionError) budgetDataError(budgetId, "link-cost-reference", versionError, "Não foi possível vincular a referência oficial à versão.");
  await recalculate(supabase, budgetId, versionId);
  if (!decomposto && motivo) budgetNotice(budgetId, motivo);
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
  if (sequence === null) budgetError(budgetId, "Não foi possível determinar a ordem dos itens do orçamento.");
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

  if (error) budgetDataError(budgetId, "insert-manual-item", error, "Não foi possível adicionar o item ao orçamento.");
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
    const { data: linkedModel, error: linkedModelError } = await supabase
      .from("markup_models")
      .select("id, name")
      .eq("id", version.markup_model_id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (linkedModelError) reportDataAccessError("budgets.load-linked-markup", linkedModelError);
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
    if (error) budgetDataError(budgetId, "update-markup", error, "Não foi possível atualizar a formação de preço.");
  } else {
    const { data, error } = await supabase
      .from("markup_models")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) budgetDataError(budgetId, "create-markup", error, "Não foi possível configurar a formação de preço.");
    markupModelId = data.id;
  }

  const { error: versionError } = await supabase
    .from("budget_versions")
    .update({ markup_model_id: markupModelId, invested_capital: investedCapital })
    .eq("id", versionId)
    .eq("organization_id", organizationId)
    .is("frozen_at", null);

  if (versionError) budgetDataError(budgetId, "update-pricing-version", versionError, "Não foi possível atualizar a versão do orçamento.");
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

  if (error) budgetDataError(budgetId, "remove-item", error, "Não foi possível remover o item do orçamento.");
  await recalculate(supabase, budgetId, versionId);
}

export async function calculateBudgetVersion(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  const budgetId = String(formData.get("budgetId") ?? "");
  const { supabase } = await requireOrganizationContext(internalRoles);

  const { error } = await supabase.rpc("calculate_budget_version", {
    p_version_id: versionId
  });

  if (error) budgetDataError(budgetId, "calculate-version", error, "Não foi possível calcular a versão do orçamento.");
  revalidatePath(`/app/orcamentos/${budgetId}`);
}

export async function freezeBudgetVersion(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  const budgetId = String(formData.get("budgetId") ?? "");
  const { supabase } = await requireOrganizationContext(internalRoles);

  const { error } = await supabase.rpc("freeze_budget_version", {
    p_version_id: versionId
  });

  if (error) budgetDataError(budgetId, "freeze-version", error, "Não foi possível congelar a versão do orçamento.");
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

  if (error) budgetDataError(budgetId, "decide-approval", error, "Não foi possível registrar a decisão de aprovação.");
  revalidatePath(`/app/orcamentos/${budgetId}`);
}