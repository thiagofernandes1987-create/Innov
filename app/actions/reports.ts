"use server";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{defaultReportPeriod}from"@/lib/reports/server";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function numberValue(value:unknown){if(value===null||value===undefined||String(value).trim()==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}

export async function saveReportView(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("relatorios","create",projectId);
 const name=text(data,"name");const kind=text(data,"kind")||"EXECUTIVE";const periodStart=optional(data,"periodStart");const periodEnd=optional(data,"periodEnd");
 if(!name)fail("/app/relatorios/salvos","Informe o nome do relatório.");
 if(periodStart&&periodEnd&&periodEnd<periodStart)fail("/app/relatorios/salvos","O período informado é inválido.");
 const visibleMetrics=text(data,"visibleMetrics").split(",").map(item=>item.trim()).filter(Boolean);
 const{error}=await context.supabase.from("report_saved_views").insert({
  organization_id:context.organizationId,owner_user_id:context.userId,name,description:text(data,"description"),kind,
  project_id:projectId,period_start:periodStart,period_end:periodEnd,filters:{projectId,periodStart,periodEnd},visible_metrics:visibleMetrics,
  shared:data.get("shared")!==null
 });
 if(error)fail("/app/relatorios/salvos",error.message);revalidatePath("/app/relatorios/salvos");
}

export async function archiveReportView(data:FormData){
 const id=text(data,"id");const projectId=optional(data,"projectId");const context=await requireCapability("relatorios","delete",projectId);
 const{error}=await context.supabase.from("report_saved_views").update({active:false,updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",context.organizationId);
 if(error)fail("/app/relatorios/salvos",error.message);revalidatePath("/app/relatorios/salvos");
}

export async function saveReportTarget(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("relatorios","manage",projectId);
 const metricKey=text(data,"metricKey");const comparison=text(data,"comparison")==="MAX"?"MAX":"MIN";
 if(!metricKey)fail("/app/relatorios/metas","Selecione uma métrica.");
 const warningValue=numberValue(text(data,"warningValue"));const criticalValue=numberValue(text(data,"criticalValue"));
 if(warningValue===null&&criticalValue===null)fail("/app/relatorios/metas","Informe ao menos uma faixa de atenção ou crítica.");
 if(comparison==="MIN"&&warningValue!==null&&criticalValue!==null&&criticalValue>warningValue)fail("/app/relatorios/metas","Para meta mínima, o valor crítico deve ser menor ou igual ao valor de atenção.");
 if(comparison==="MAX"&&warningValue!==null&&criticalValue!==null&&criticalValue<warningValue)fail("/app/relatorios/metas","Para meta máxima, o valor crítico deve ser maior ou igual ao valor de atenção.");
 let existing=context.supabase.from("report_targets").select("id").eq("organization_id",context.organizationId).eq("metric_key",metricKey);
 existing=projectId?existing.eq("project_id",projectId):existing.is("project_id",null);
 const{data:target}=await existing.maybeSingle();
 const payload={organization_id:context.organizationId,project_id:projectId,metric_key:metricKey,comparison,warning_value:warningValue,critical_value:criticalValue,active:true,created_by:context.userId,updated_at:new Date().toISOString()};
 const{error}=target
  ?await context.supabase.from("report_targets").update(payload).eq("id",target.id)
  :await context.supabase.from("report_targets").insert(payload);
 if(error)fail("/app/relatorios/metas",error.message);revalidatePath("/app/relatorios/metas");revalidatePath("/app/relatorios");
}

export async function generateReportSnapshot(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("relatorios","update",projectId);const defaults=defaultReportPeriod();
 const periodStart=text(data,"periodStart")||defaults.start;const periodEnd=text(data,"periodEnd")||defaults.end;
 if(periodEnd<periodStart)fail("/app/relatorios/snapshots","O período informado é inválido.");
 const{data:snapshot,error}=await context.supabase.rpc("create_report_snapshot",{
  p_organization_id:context.organizationId,p_kind:text(data,"kind")||"EXECUTIVE",p_project_id:projectId,
  p_period_start:periodStart,p_period_end:periodEnd,p_saved_view_id:optional(data,"savedViewId"),
  p_filters:{projectId,periodStart,periodEnd}
 });
 if(error)fail("/app/relatorios/snapshots",error.message);
 const result=Array.isArray(snapshot)?snapshot[0]:snapshot;
 if(result?.status==="FAILED")fail("/app/relatorios/snapshots",String(result.error_message??"Falha ao gerar snapshot."));
 revalidatePath("/app/relatorios/snapshots");redirect("/app/relatorios/snapshots?created=1");
}
