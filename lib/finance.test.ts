import { describe, expect, it } from "vitest";
import { calculateBdi, calculateFinancials, calculateMarkupFactor } from "./finance";

const baseInput = {
  directCost: 1_000_000,
  indirectCost: 120_000,
  fixedCost: 40_000,
  administrativeFee: 60_000,
  adminCentralRate: 0.04,
  insuranceRate: 0.01,
  guaranteeRate: 0.01,
  riskRate: 0.03,
  financialExpenseRate: 0.015,
  taxRate: 0.08,
  bdiProfitRate: 0.08,
  commissionRate: 0.02,
  variableExpenseRate: 0.01,
  desiredMarginRate: 0.18,
  markupMethod: "MULTIPLIER" as const,
  markupMultiplier: 1.42,
  investedCapital: 500_000,
  projectMonths: 12,
  monthlyCashFlow: [-200_000, -150_000, 50_000, 100_000, 150_000, 200_000],
  administrativeFeeIncludedInBdi: false,
  fixedCostsIncludedInBdi: false,
  profitIncludedInBdi: true,
  minimumMarginRate: 0.12,
  minimumRoiRate: 0.1
};

describe("motor financeiro", () => {
  it("calcula BDI pela fórmula configurada", () => {
    const bdi = calculateBdi(baseInput);
    expect(bdi).toBeGreaterThan(0);
    expect(bdi).toBeLessThan(1);
  });

  it("calcula markup divisor", () => {
    const factor = calculateMarkupFactor({
      ...baseInput,
      markupMethod: "DIVISOR",
      markupMultiplier: undefined,
      profitIncludedInBdi: false
    });
    expect(factor).toBeGreaterThan(1);
  });

  it("calcula preço, margem, ROI e necessidade de caixa", () => {
    const result = calculateFinancials(baseInput);
    expect(result.salePrice).toBeGreaterThan(result.baseCost);
    expect(result.grossMarginRate).toBeGreaterThan(0);
    expect(result.estimatedRoiRate).not.toBeNull();
    expect(result.maximumCashRequirement).toBe(350_000);
  });

  it("bloqueia dupla contagem da taxa administrativa", () => {
    const result = calculateFinancials({
      ...baseInput,
      administrativeFeeIncludedInBdi: true
    });
    expect(result.validations.some((item) => item.code === "ADMIN_FEE_DUPLICATED")).toBe(true);
  });
});
