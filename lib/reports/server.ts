import"server-only";
import{requireCapability}from"@/lib/authorization";
import{reportDataAccessError}from"@/lib/errors/data-access";
import{normalizeReportDashboard}from"@/lib/reports/metrics";

export function defaultReportPeriod(){const end=new Date();const start=new Date(end.getFullYear(),end.getMonth()-11,1);return{start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};}

export async function loadReportDashboard(input:{projectId?:string|null;start?:string|null;end?:string|null}){
 const defaults=defaultReportPeriod();const projectId=input.projectId||null;const start=input.start||defaults.start;const end=input.end||defaults.end;
 const context=await requireCapability("relatorios","read",projectId);
 const{data,error}=await context.supabase.rpc("get_report_dashboard",{p_organization_id:context.organizationId,p_project_id:projectId,p_period_start:start,p_period_end:end});
 if(error){reportDataAccessError("reports.load-dashboard",error);throw new Error("Não foi possível carregar os indicadores do relatório.");}
 return{context,dashboard:normalizeReportDashboard(data),projectId,start,end};
}