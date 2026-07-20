import{describe,expect,it}from"vitest";
import{cashFlowRisk,summarizeCashFlow}from"./cash-flow";

describe("summarizeCashFlow",()=>{
 it("ordena os meses e calcula saldos acumulados",()=>{
  const rows=summarizeCashFlow([
   {month:"2026-08-01",plannedInflow:1000,plannedOutflow:300,realizedInflow:800,realizedOutflow:200},
   {month:"2026-07-01",plannedInflow:500,plannedOutflow:700,realizedInflow:400,realizedOutflow:600}
  ],100);
  expect(rows.map(row=>row.month)).toEqual(["2026-07-01","2026-08-01"]);
  expect(rows[0].accumulatedPlanned).toBe(-100);
  expect(rows[1].accumulatedPlanned).toBe(600);
  expect(rows[1].accumulatedRealized).toBe(500);
 });

 it("calcula necessidade máxima de caixa",()=>{
  const rows=summarizeCashFlow([
   {month:"2026-07-01",plannedInflow:0,plannedOutflow:1000,realizedInflow:0,realizedOutflow:0},
   {month:"2026-08-01",plannedInflow:400,plannedOutflow:300,realizedInflow:0,realizedOutflow:0}
  ]);
  expect(cashFlowRisk(rows)).toEqual({minimumProjectedBalance:-1000,maximumCashRequirement:1000,negativeMonths:["2026-07-01","2026-08-01"]});
 });
});
