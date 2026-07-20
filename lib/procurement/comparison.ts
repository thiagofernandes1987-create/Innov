export type ProcurementQuoteForComparison = {
  id:string;
  supplierName:string;
  total:number;
  leadTimeDays:number|null;
  quotedItems:number;
  totalItems:number;
  paymentTerms?:string|null;
};

export type ProcurementComparisonRow = ProcurementQuoteForComparison & {
  coveragePercent:number;
  priceScore:number;
  leadTimeScore:number;
  coverageScore:number;
  finalScore:number;
  rank:number;
};

function finiteNonNegative(value:number){return Number.isFinite(value)&&value>=0?value:0;}
function round(value:number){return Math.round(value*100)/100;}

export function compareProcurementQuotes(quotes:ProcurementQuoteForComparison[]):ProcurementComparisonRow[]{
  const valid=quotes.filter(item=>finiteNonNegative(item.total)>0&&item.totalItems>0);
  if(!valid.length)return[];
  const minTotal=Math.min(...valid.map(item=>item.total));
  const positiveLeadTimes=valid.map(item=>item.leadTimeDays).filter((value):value is number=>value!=null&&value>=0);
  const minLead=positiveLeadTimes.length?Math.min(...positiveLeadTimes):null;
  const rows=valid.map(item=>{
    const coveragePercent=Math.min(100,Math.max(0,(item.quotedItems/item.totalItems)*100));
    const priceScore=round((minTotal/item.total)*60);
    const leadTimeScore=item.leadTimeDays==null||minLead==null?0:round(item.leadTimeDays===0?25:(minLead/item.leadTimeDays)*25);
    const coverageScore=round((coveragePercent/100)*15);
    return{...item,coveragePercent:round(coveragePercent),priceScore,leadTimeScore,coverageScore,finalScore:round(priceScore+leadTimeScore+coverageScore),rank:0};
  }).sort((a,b)=>b.finalScore-a.finalScore||a.total-b.total||(a.leadTimeDays??Number.MAX_SAFE_INTEGER)-(b.leadTimeDays??Number.MAX_SAFE_INTEGER));
  return rows.map((item,index)=>({...item,rank:index+1}));
}

export function formatCurrency(value:number,currency="BRL"){
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(value);
}
