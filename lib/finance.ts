import { z } from "zod";

export const percentageSchema = z.number().finite().min(0).max(0.999999);

export const financialInputSchema = z.object({
  directCost: z.number().finite().nonnegative(),
  indirectCost: z.number().finite().nonnegative(),
  fixedCost: z.number().finite().nonnegative(),
  administrativeFee: z.number().finite().nonnegative(),
  adminCentralRate: percentageSchema,
  insuranceRate: percentageSchema,
  guaranteeRate: percentageSchema,
  riskRate: percentageSchema,
  financialExpenseRate: percentageSchema,
  taxRate: percentageSchema,
  bdiProfitRate: percentageSchema,
  commissionRate: percentageSchema.default(0),
  variableExpenseRate: percentageSchema.default(0),
  desiredMarginRate: percentageSchema,
  markupMethod: z.enum(["MULTIPLIER", "DIVISOR"]),
  markupMultiplier: z.number().finite().positive().optional(),
  investedCapital: z.number().finite().nonnegative(),
  projectMonths: z.number().int().positive(),
  monthlyCashFlow: z.array(z.number().finite()).default([]),
  administrativeFeeIncludedInBdi: z.boolean().default(false),
  fixedCostsIncludedInBdi: z.boolean().default(false),
  profitIncludedInBdi: z.boolean().default(true),
  minimumMarginRate: percentageSchema.default(0),
  minimumRoiRate: z.number().finite().min(-10).max(100).default(0)
});

export type FinancialInput = z.infer<typeof financialInputSchema>;

export type ValidationSeverity = "INFO" | "WARNING" | "BLOCKING";

export type FinancialValidation = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
};

export type FinancialResult = {
  baseCost: number;
  bdiRate: number;
  bdiAmount: number;
  markupFactor: number;
  salePrice: number;
  grossMarginRate: number;
  grossProfit: number;
  estimatedNetProfit: number;
  estimatedRoiRate: number | null;
  paybackMonth: number | null;
  maximumCashRequirement: number;
  validations: FinancialValidation[];
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundRate = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;

export function calculateBdi(input: Pick<FinancialInput,
  | "adminCentralRate"
  | "insuranceRate"
  | "guaranteeRate"
  | "riskRate"
  | "financialExpenseRate"
  | "bdiProfitRate"
  | "taxRate"
>): number {
  const numerator =
    (1 + input.adminCentralRate + input.insuranceRate + input.guaranteeRate + input.riskRate) *
    (1 + input.financialExpenseRate) *
    (1 + input.bdiProfitRate);
  const denominator = 1 - input.taxRate;

  if (denominator <= 0) {
    throw new Error("A taxa tributária torna o denominador do BDI inválido.");
  }

  return roundRate(numerator / denominator - 1);
}

export function calculateMarkupFactor(input: FinancialInput): number {
  if (input.markupMethod === "MULTIPLIER") {
    if (!input.markupMultiplier || input.markupMultiplier <= 0) {
      throw new Error("Informe um multiplicador de markup maior que zero.");
    }
    return roundRate(input.markupMultiplier);
  }

  const divisor =
    1 - input.taxRate - input.commissionRate - input.variableExpenseRate - input.desiredMarginRate;

  if (divisor <= 0) {
    throw new Error("Os componentes do markup divisor resultam em divisor menor ou igual a zero.");
  }

  return roundRate(1 / divisor);
}

export function calculatePayback(monthlyCashFlow: number[]): { month: number | null; maximumCashRequirement: number } {
  let accumulated = 0;
  let minimumAccumulated = 0;
  let month: number | null = null;

  for (let index = 0; index < monthlyCashFlow.length; index += 1) {
    accumulated += monthlyCashFlow[index] ?? 0;
    minimumAccumulated = Math.min(minimumAccumulated, accumulated);
    if (month === null && accumulated >= 0 && index > 0) {
      month = index + 1;
    }
  }

  return {
    month,
    maximumCashRequirement: roundMoney(Math.abs(minimumAccumulated))
  };
}

export function validateFinancialInput(input: FinancialInput, result?: Omit<FinancialResult, "validations">): FinancialValidation[] {
  const validations: FinancialValidation[] = [];

  if (input.administrativeFee > 0 && input.administrativeFeeIncludedInBdi) {
    validations.push({
      code: "ADMIN_FEE_DUPLICATED",
      severity: "BLOCKING",
      field: "administrativeFee",
      message: "A taxa administrativa está destacada e também marcada como incluída no BDI. Corrija ou justifique por alçada."
    });
  }

  if (input.fixedCost > 0 && input.fixedCostsIncludedInBdi) {
    validations.push({
      code: "FIXED_COST_DUPLICATED",
      severity: "BLOCKING",
      field: "fixedCost",
      message: "Os custos fixos foram rateados e também marcados como incluídos no BDI."
    });
  }

  if (input.markupMethod === "DIVISOR" && input.profitIncludedInBdi && input.desiredMarginRate > 0) {
    validations.push({
      code: "PROFIT_MARGIN_DUPLICATED",
      severity: "BLOCKING",
      field: "desiredMarginRate",
      message: "Há lucro no BDI e margem desejada no markup divisor. A política deve definir qual componente forma o preço."
    });
  }

  if (input.investedCapital <= 0) {
    validations.push({
      code: "ROI_WITHOUT_CAPITAL",
      severity: "BLOCKING",
      field: "investedCapital",
      message: "O ROI não pode ser calculado sem capital investido maior que zero."
    });
  }

  if (result) {
    if (result.salePrice < result.baseCost) {
      validations.push({
        code: "PRICE_BELOW_COST",
        severity: "BLOCKING",
        message: "O preço de venda está abaixo do custo-base."
      });
    }

    if (result.grossMarginRate < input.minimumMarginRate) {
      validations.push({
        code: "MARGIN_BELOW_POLICY",
        severity: "BLOCKING",
        message: `A margem calculada está abaixo do mínimo interno de ${(input.minimumMarginRate * 100).toFixed(2)}%.`
      });
    }

    if (result.estimatedRoiRate !== null && result.estimatedRoiRate < input.minimumRoiRate) {
      validations.push({
        code: "ROI_BELOW_POLICY",
        severity: "WARNING",
        message: `O ROI calculado está abaixo do mínimo interno de ${(input.minimumRoiRate * 100).toFixed(2)}%.`
      });
    }
  }

  return validations;
}

export function calculateFinancials(rawInput: FinancialInput): FinancialResult {
  const input = financialInputSchema.parse(rawInput);
  const baseCost = roundMoney(
    input.directCost + input.indirectCost + input.fixedCost + input.administrativeFee
  );
  const bdiRate = calculateBdi(input);
  const bdiAmount = roundMoney(baseCost * bdiRate);
  const markupFactor = calculateMarkupFactor(input);

  const salePrice = roundMoney(
    input.markupMethod === "MULTIPLIER"
      ? baseCost * markupFactor
      : baseCost * markupFactor
  );

  const grossProfit = roundMoney(salePrice - baseCost);
  const grossMarginRate = salePrice > 0 ? roundRate(grossProfit / salePrice) : 0;
  const variableDeductions = salePrice * (input.taxRate + input.commissionRate + input.variableExpenseRate);
  const estimatedNetProfit = roundMoney(salePrice - baseCost - variableDeductions);
  const estimatedRoiRate = input.investedCapital > 0
    ? roundRate(estimatedNetProfit / input.investedCapital)
    : null;
  const cash = calculatePayback(input.monthlyCashFlow);

  const provisional = {
    baseCost,
    bdiRate,
    bdiAmount,
    markupFactor,
    salePrice,
    grossMarginRate,
    grossProfit,
    estimatedNetProfit,
    estimatedRoiRate,
    paybackMonth: cash.month,
    maximumCashRequirement: cash.maximumCashRequirement
  };

  return {
    ...provisional,
    validations: validateFinancialInput(input, provisional)
  };
}
