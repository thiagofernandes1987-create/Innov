"use server";

import{mensagemDeFalha}from"@/lib/errors/data-access";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{lerMoeda}from"@/lib/validacao/moeda";

function t(d:FormData,k:string){return String(d.get(k)??"").trim();}function o(d:FormData,k:string){return t(d,k)||null;}function money(d:FormData,k:string){return lerMoeda(t(d,k));}function fail(path:string,m:string):never{redirect(`${path}?error=${encodeURIComponent(m)}`);}
export async function addFgtsRescisoryHistory(data:FormData){
 const context=await requireCapability("rh","update"),caseId=t(data,"caseId"),path=`/app/rh/obrigacoes/fgts-digital/rescisorio/${caseId}`,month=t(data,"competence");if(!/^\d{4}-\d{2}$/.test(month)||month>="2024-03")fail(path,"O arquivo oficial aceita somente competências anteriores a março/2024.");const principal=money(data,"principalAmount"),thirteenth=money(data,"thirteenthAmount"),absence=data.get("absenceFgts")==="on";if(principal==null&&thirteenth==null&&!absence)fail(path,"Informe remuneração, 13º ou ausência de base FGTS.");const category=o(data,"categoryCode");if(((principal??0)>0||(thirteenth??0)>0)&&!/^\d{3}$/.test(category??""))fail(path,"Categoria eSocial de 3 dígitos é obrigatória quando houver remuneração.");if((principal??0)<=0&&(thirteenth??0)<=0&&category)fail(path,"Sem remuneração, a categoria deve ficar vazia no leiaute 1.2.");
 let query=context.supabase.from("rh_fgts_rescisory_history_rows").select("id").eq("organization_id",context.organizationId).eq("termination_case_id",caseId).eq("competence",`${month}-01`);query=category?query.eq("category_code",category):query.is("category_code",null);const{data:existing,error:findError}=await query.maybeSingle();if(findError)fail(path,mensagemDeFalha("rh-fgts-rescisory.addFgtsRescisoryHistory", findError));
 const payload={organization_id:context.organizationId,termination_case_id:caseId,competence:`${month}-01`,category_code:category,principal_amount:principal,thirteenth_amount:thirteenth,absence_fgts:absence,source_reference:o(data,"sourceReference"),evidence_reference:o(data,"evidenceReference"),updated_at:new Date().toISOString()};const result=existing?await context.supabase.from("rh_fgts_rescisory_history_rows").update(payload).eq("organization_id",context.organizationId).eq("id",existing.id):await context.supabase.from("rh_fgts_rescisory_history_rows").insert({...payload,created_by:context.userId});if(result.error)fail(path,mensagemDeFalha("rh-fgts-rescisory.addFgtsRescisoryHistory", result.error));revalidatePath(path);
}
