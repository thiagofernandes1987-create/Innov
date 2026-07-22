"use server";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function number(data:FormData,key:string,fallback:number){const value=Number(text(data,key));return Number.isFinite(value)?value:fallback;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}

export async function runHealthSnapshot(){
 const context=await requireCapability("auditoria","manage");
 const{error}=await context.supabase.rpc("run_observability_health_snapshot",{p_organization_id:context.organizationId});
 if(error)fail("/app/auditoria/saude",error.message);revalidatePath("/app/auditoria");revalidatePath("/app/auditoria/saude");
}

export async function acknowledgeAlert(data:FormData){
 const id=text(data,"alertId");const context=await requireCapability("auditoria","manage");
 const{error}=await context.supabase.rpc("acknowledge_observability_alert",{p_alert_id:id,p_reason:text(data,"reason")});
 if(error)fail("/app/auditoria/alertas",error.message);revalidatePath("/app/auditoria");revalidatePath("/app/auditoria/alertas");
}

export async function resolveAlert(data:FormData){
 const id=text(data,"alertId");const context=await requireCapability("auditoria","manage");
 const{error}=await context.supabase.rpc("resolve_observability_alert",{p_alert_id:id,p_reason:text(data,"reason")});
 if(error)fail("/app/auditoria/alertas",error.message);revalidatePath("/app/auditoria");revalidatePath("/app/auditoria/alertas");
}

export async function createAlertRule(data:FormData){
 const context=await requireCapability("auditoria","manage");
 const{error}=await context.supabase.from("observability_alert_rules").insert({
  organization_id:context.organizationId,name:text(data,"name"),module_key:optional(data,"moduleKey"),event_type_pattern:optional(data,"eventTypePattern"),
  minimum_severity:text(data,"minimumSeverity")||"ERROR",threshold_count:number(data,"thresholdCount",1),window_minutes:number(data,"windowMinutes",15),
  cooldown_minutes:number(data,"cooldownMinutes",30),active:true,created_by:context.userId
 });
 if(error)fail("/app/auditoria/configuracao",error.message);revalidatePath("/app/auditoria/configuracao");
}

export async function updateRetentionPolicy(data:FormData){
 const context=await requireCapability("auditoria","manage");
 const sourceTable=text(data,"sourceTable");const retentionDays=number(data,"retentionDays",365);
 const{error}=await context.supabase.from("observability_retention_policies").upsert({
  organization_id:context.organizationId,source_table:sourceTable,retention_days:retentionDays,preserve_critical:data.get("preserveCritical")!==null,
  active:true,created_by:context.userId,updated_at:new Date().toISOString()
 },{onConflict:"organization_id,source_table"});
 if(error)fail("/app/auditoria/configuracao",error.message);revalidatePath("/app/auditoria/configuracao");
}
