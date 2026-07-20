export type MetricComparison="MIN"|"MAX";
export type MetricHealth="OK"|"WARNING"|"CRITICAL"|"NO_TARGET"|"NO_DATA";

export type ReportTarget={
 metric_key:string;
 comparison:MetricComparison;
 warning_value:number|null;
 critical_value:number|null;
 project_id?:string|null;
};

export type ReportProject={
 project_id:string;
 code:string;
 name:string;
 status:string;
 progress:number;
 planned_progress:number;
 actual_progress:number;
 schedule_variance_pp:number;
 overdue_days:number;
 total_tasks:number;
 completed_tasks:number;
 blocked_tasks:number;
 overdue_tasks:number;
 contract_value:number|null;
 receivable_open:number|null;
 payable_open:number|null;
 overdue_installments:number|null;
 pending_finance_approvals:number|null;
 purchase_committed:number|null;
 open_purchase_orders:number;
 overdue_purchase_orders:number;
 open_purchase_requests:number;
 accepted_receipts:number;
 quality_responses:number;
 quality_approved:number;
 quality_rejected:number;
 pending_quality_reviews:number;
 average_quality_score:number;
 pending_quality_assignments:number;
 nps:number|null;
 daily_logs_30d:number;
 project_documents:number;
};

export type ReportExecutive={
 activeProjects:number;
 delayedProjects:number;
 averageProgress:number;
 contractValue:number|null;
 receivableOpen:number|null;
 payableOpen:number|null;
 purchaseCommitted:number|null;
 blockedTasks:number;
 overdueTasks:number;
 overduePurchaseOrders:number;
 pendingFinanceApprovals:number|null;
 pendingQualityReviews:number;
 averageQualityScore:number;
 nps:number|null;
};

export type ReportFinanceMonth={
 periodMonth:string;
 plannedInflow:number;
 plannedOutflow:number;
 realizedInflow:number;
 realizedOutflow:number;
 plannedNet:number;
 realizedNet:number;
};

export type ReportDashboard={
 period:{start:string;end:string};
 financialVisible:boolean;
 executive:ReportExecutive;
 projects:ReportProject[];
 financeMonthly:ReportFinanceMonth[];
 targets:ReportTarget[];
};

function numberOrNull(value:unknown):number|null{
 if(value===null||value===undefined||value==="")return null;
 const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;
}
function numberOrZero(value:unknown){return numberOrNull(value)??0;}
function object(value:unknown):Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function array(value:unknown):unknown[]{return Array.isArray(value)?value:[];}

export function normalizeReportDashboard(value:unknown):ReportDashboard{
 const root=object(value);const period=object(root.period);const executive=object(root.executive);
 const projects=array(root.projects).map(item=>{const row=object(item);return{
  project_id:String(row.project_id??""),code:String(row.code??""),name:String(row.name??""),status:String(row.status??""),
  progress:numberOrZero(row.progress),planned_progress:numberOrZero(row.planned_progress),actual_progress:numberOrZero(row.actual_progress),
  schedule_variance_pp:numberOrZero(row.schedule_variance_pp),overdue_days:numberOrZero(row.overdue_days),total_tasks:numberOrZero(row.total_tasks),
  completed_tasks:numberOrZero(row.completed_tasks),blocked_tasks:numberOrZero(row.blocked_tasks),overdue_tasks:numberOrZero(row.overdue_tasks),
  contract_value:numberOrNull(row.contract_value),receivable_open:numberOrNull(row.receivable_open),payable_open:numberOrNull(row.payable_open),
  overdue_installments:numberOrNull(row.overdue_installments),pending_finance_approvals:numberOrNull(row.pending_finance_approvals),
  purchase_committed:numberOrNull(row.purchase_committed),open_purchase_orders:numberOrZero(row.open_purchase_orders),
  overdue_purchase_orders:numberOrZero(row.overdue_purchase_orders),open_purchase_requests:numberOrZero(row.open_purchase_requests),
  accepted_receipts:numberOrZero(row.accepted_receipts),quality_responses:numberOrZero(row.quality_responses),
  quality_approved:numberOrZero(row.quality_approved),quality_rejected:numberOrZero(row.quality_rejected),
  pending_quality_reviews:numberOrZero(row.pending_quality_reviews),average_quality_score:numberOrZero(row.average_quality_score),
  pending_quality_assignments:numberOrZero(row.pending_quality_assignments),nps:numberOrNull(row.nps),daily_logs_30d:numberOrZero(row.daily_logs_30d),
  project_documents:numberOrZero(row.project_documents)
 } satisfies ReportProject;});
 const financeMonthly=array(root.financeMonthly).map(item=>{const row=object(item);return{
  periodMonth:String(row.periodMonth??""),plannedInflow:numberOrZero(row.plannedInflow),plannedOutflow:numberOrZero(row.plannedOutflow),
  realizedInflow:numberOrZero(row.realizedInflow),realizedOutflow:numberOrZero(row.realizedOutflow),plannedNet:numberOrZero(row.plannedNet),realizedNet:numberOrZero(row.realizedNet)
 } satisfies ReportFinanceMonth;});
 const targets=array(root.targets).map(item=>{const row=object(item);return{
  metric_key:String(row.metric_key??""),comparison:row.comparison==="MAX"?"MAX":"MIN",warning_value:numberOrNull(row.warning_value),
  critical_value:numberOrNull(row.critical_value),project_id:row.project_id?String(row.project_id):null
 } satisfies ReportTarget;});
 return{
  period:{start:String(period.start??""),end:String(period.end??"")},financialVisible:Boolean(root.financialVisible),
  executive:{
   activeProjects:numberOrZero(executive.activeProjects),delayedProjects:numberOrZero(executive.delayedProjects),averageProgress:numberOrZero(executive.averageProgress),
   contractValue:numberOrNull(executive.contractValue),receivableOpen:numberOrNull(executive.receivableOpen),payableOpen:numberOrNull(executive.payableOpen),
   purchaseCommitted:numberOrNull(executive.purchaseCommitted),blockedTasks:numberOrZero(executive.blockedTasks),overdueTasks:numberOrZero(executive.overdueTasks),
   overduePurchaseOrders:numberOrZero(executive.overduePurchaseOrders),pendingFinanceApprovals:numberOrNull(executive.pendingFinanceApprovals),
   pendingQualityReviews:numberOrZero(executive.pendingQualityReviews),averageQualityScore:numberOrZero(executive.averageQualityScore),nps:numberOrNull(executive.nps)
  },projects,financeMonthly,targets
 };
}

export function evaluateMetric(value:number|null|undefined,target?:ReportTarget|null):MetricHealth{
 if(value===null||value===undefined||!Number.isFinite(value))return"NO_DATA";
 if(!target)return"NO_TARGET";
 if(target.comparison==="MIN"){
  if(target.critical_value!==null&&value<target.critical_value)return"CRITICAL";
  if(target.warning_value!==null&&value<target.warning_value)return"WARNING";
 }else{
  if(target.critical_value!==null&&value>target.critical_value)return"CRITICAL";
  if(target.warning_value!==null&&value>target.warning_value)return"WARNING";
 }
 return"OK";
}

export function targetFor(targets:ReportTarget[],metricKey:string,projectId?:string|null){
 return targets.find(target=>target.metric_key===metricKey&&target.project_id===projectId)
  ??targets.find(target=>target.metric_key===metricKey&&!target.project_id)
  ??null;
}

export function formatReportNumber(value:number|null|undefined,kind:"currency"|"percent"|"number"|"score"="number"){
 if(value===null||value===undefined||!Number.isFinite(value))return"Restrito";
 if(kind==="currency")return value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 if(kind==="percent")return`${value.toLocaleString("pt-BR",{maximumFractionDigits:2})}%`;
 if(kind==="score")return value.toLocaleString("pt-BR",{maximumFractionDigits:2});
 return value.toLocaleString("pt-BR",{maximumFractionDigits:2});
}

function csvCell(value:unknown){
 const text=value===null||value===undefined?"":String(value);
 return/[;"\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

export function buildProjectCsv(dashboard:ReportDashboard){
 const header=["Código","Obra","Status","Progresso (%)","Previsto (%)","Desvio (p.p.)","Dias de atraso","Tarefas bloqueadas","Tarefas atrasadas","Valor contratado","A receber","A pagar","Compras comprometidas","Pedidos atrasados","Qualidade (%)","Rejeições","NPS","Diários 30d","Documentos"];
 const rows=dashboard.projects.map(project=>[
  project.code,project.name,project.status,project.progress,project.planned_progress,project.schedule_variance_pp,project.overdue_days,
  project.blocked_tasks,project.overdue_tasks,project.contract_value,project.receivable_open,project.payable_open,project.purchase_committed,
  project.overdue_purchase_orders,project.average_quality_score,project.quality_rejected,project.nps,project.daily_logs_30d,project.project_documents
 ]);
 return[header,...rows].map(row=>row.map(csvCell).join(";")).join("\r\n");
}
