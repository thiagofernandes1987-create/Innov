"use server";

import { campoDeTexto } from "@/lib/forms/campos";
import{mensagemDeFalha}from"@/lib/errors/data-access";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
function text(d:FormData,k:string){return campoDeTexto(d, k).trim();}function num(d:FormData,k:string){const v=text(d,k);return v?Number(v):null;}function digits(v:string){return v.replace(/\D/g,"");}
export async function saveTerminationEsocialSpecial(data:FormData){const caseId=text(data,"caseId");const context=await requireCapability("rh","update");const path=`/app/rh/desligamentos/${caseId}/esocial-especial`;const payload={esocial_judicial_process_number:text(data,"judicialProcessNumber")?digits(text(data,"judicialProcessNumber")):null,successor_registration_type:num(data,"successorRegistrationType"),successor_registration_number:text(data,"successorRegistrationNumber")?digits(text(data,"successorRegistrationNumber")):null,new_cpf:text(data,"newCpf")?digits(text(data,"newCpf")):null,post_termination_remuneration_indicator:num(data,"postTerminationRemunerationIndicator"),post_termination_remuneration_end:text(data,"postTerminationRemunerationEnd")||null,updated_at:new Date().toISOString()};const{error}=await context.supabase.from("rh_termination_cases").update(payload).eq("organization_id",context.organizationId).eq("id",caseId);if(error)redirect(`${path}?error=${encodeURIComponent(mensagemDeFalha("rh-termination-esocial-special.saveTerminationEsocialSpecial", error))}`);revalidatePath(`/app/rh/desligamentos/${caseId}`);revalidatePath(path);redirect(`${path}?success=1`);}
