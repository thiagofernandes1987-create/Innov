import"server-only";
import{requireCapability}from"@/lib/authorization";
import{parseDashboard,parseEvents,record,type Diagnostic,type HealthCheck,type ObservabilityAlert}from"@/lib/observability/domain";

export type EventFilters={moduleKey?:string|null;severity?:string|null;query?:string|null;correlationId?:string|null;periodStart?:string|null;periodEnd?:string|null;page?:number;pageSize?:number};

export async function loadObservabilityDashboard(periodHours=24){
 const context=await requireCapability("auditoria","read");
 const{data,error}=await context.supabase.rpc("get_observability_dashboard",{p_organization_id:context.organizationId,p_period_hours:periodHours});
 return{context,dashboard:parseDashboard(error?null:data),error:error?.message??null};
}

export async function loadObservabilityEvents(filters:EventFilters={}){
 const context=await requireCapability("auditoria","read");
 const now=new Date();const start=new Date(now.getTime()-30*86400000);
 const{data,error}=await context.supabase.rpc("get_observability_events",{
  p_organization_id:context.organizationId,p_module_key:filters.moduleKey||null,p_severity:filters.severity||null,p_query:filters.query||null,
  p_correlation_id:filters.correlationId||null,p_period_start:filters.periodStart||start.toISOString(),p_period_end:filters.periodEnd||now.toISOString(),
  p_page:filters.page??1,p_page_size:filters.pageSize??50
 });
 return{context,events:parseEvents(error?null:data),error:error?.message??null};
}

export async function loadObservabilityEvent(originTable:string,eventId:string){
 const context=await requireCapability("auditoria","read");
 const{data,error}=await context.supabase.rpc("get_observability_event_detail",{p_organization_id:context.organizationId,p_origin_table:originTable,p_event_id:eventId});
 return{context,event:record(data),error:error?.message??null};
}

export async function loadObservabilityAlerts(){
 const context=await requireCapability("auditoria","read");
 const{data,error}=await context.supabase.from("observability_alerts").select("id,module_key,severity,title,message,status,occurrence_count,first_occurred_at,last_occurred_at,correlation_id").eq("organization_id",context.organizationId).order("last_occurred_at",{ascending:false}).limit(100);
 return{context,alerts:(data??[])as unknown as ObservabilityAlert[],error:error?.message??null};
}

export async function loadObservabilityHealth(){
 const context=await requireCapability("auditoria","read");
 const[{data:checks,error:checksError},{data:diagnostics,error:diagnosticsError}]=await Promise.all([
  context.supabase.from("observability_health_checks").select("id,check_key,component,status,message,details,checked_at").eq("organization_id",context.organizationId).order("checked_at",{ascending:false}).limit(200),
  context.supabase.from("observability_diagnostics").select("id,diagnostic_type,severity,object_schema,object_name,code,message,detected_at,resolved_at").or(`organization_id.eq.${context.organizationId},organization_id.is.null`).is("resolved_at",null).order("detected_at",{ascending:false}).limit(200)
 ]);
 const latest=new Map<string,HealthCheck>();for(const item of(checks??[])as unknown as HealthCheck[])if(!latest.has(item.check_key))latest.set(item.check_key,item);
 return{context,checks:[...latest.values()],diagnostics:(diagnostics??[])as unknown as Diagnostic[],error:checksError?.message??diagnosticsError?.message??null};
}

export async function loadObservabilitySettings(){
 const context=await requireCapability("auditoria","manage");
 const[{data:rules,error:rulesError},{data:retention,error:retentionError}]=await Promise.all([
  context.supabase.from("observability_alert_rules").select("*").eq("organization_id",context.organizationId).order("name"),
  context.supabase.from("observability_retention_policies").select("*").eq("organization_id",context.organizationId).order("source_table")
 ]);
 return{context,rules:rules??[],retention:retention??[],error:rulesError?.message??retentionError?.message??null};
}
