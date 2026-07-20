export type CashFlowPoint={month:string;plannedInflow:number;plannedOutflow:number;realizedInflow:number;realizedOutflow:number};
export type CashFlowSummary=CashFlowPoint&{plannedNet:number;realizedNet:number;accumulatedPlanned:number;accumulatedRealized:number};

function finite(value:number){return Number.isFinite(value)?value:0;}
function round(value:number){return Math.round(value*100)/100;}

export function summarizeCashFlow(points:CashFlowPoint[],openingBalance=0):CashFlowSummary[]{
  let planned=finite(openingBalance);let realized=finite(openingBalance);
  return [...points].sort((a,b)=>a.month.localeCompare(b.month)).map(point=>{
    const plannedInflow=finite(point.plannedInflow);const plannedOutflow=finite(point.plannedOutflow);
    const realizedInflow=finite(point.realizedInflow);const realizedOutflow=finite(point.realizedOutflow);
    const plannedNet=plannedInflow-plannedOutflow;const realizedNet=realizedInflow-realizedOutflow;
    planned+=plannedNet;realized+=realizedNet;
    return{...point,plannedInflow:round(plannedInflow),plannedOutflow:round(plannedOutflow),realizedInflow:round(realizedInflow),realizedOutflow:round(realizedOutflow),plannedNet:round(plannedNet),realizedNet:round(realizedNet),accumulatedPlanned:round(planned),accumulatedRealized:round(realized)};
  });
}

export function cashFlowRisk(summary:CashFlowSummary[]){
  const minimum=summary.reduce((value,row)=>Math.min(value,row.accumulatedPlanned),0);
  return{minimumProjectedBalance:round(minimum),maximumCashRequirement:round(Math.max(0,-minimum)),negativeMonths:summary.filter(row=>row.accumulatedPlanned<0).map(row=>row.month)};
}

export function formatMoney(value:number,currency="BRL"){
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(value);
}
