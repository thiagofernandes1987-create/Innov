"use server";

import{mensagemDeFalha}from"@/lib/errors/data-access";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";

function text(d:FormData,k:string){return String(d.get(k)??"").trim();}
function num(d:FormData,k:string){const v=text(d,k);return v?Number(v):null;}
function digits(v:string){return v.replace(/\D/g,"");}
export async function saveLeaveEsocialSpecial(data:FormData){const leaveId=text(data,"leaveId");const context=await requireCapability("rh","update");const path=`/app/rh/afastamentos/${leaveId}/esocial`;const payload={esocial_same_reason_60_days:text(data,"sameReason")||null,esocial_traffic_accident_type:num(data,"trafficAccidentType"),vacation_acquisition_start:text(data,"vacationAcquisitionStart")||null,vacation_acquisition_end:text(data,"vacationAcquisitionEnd")||null,cession_cnpj:text(data,"cessionCnpj")?digits(text(data,"cessionCnpj")):null,cession_burden:num(data,"cessionBurden"),union_mandate_cnpj:text(data,"unionMandateCnpj")?digits(text(data,"unionMandateCnpj")):null,union_remuneration_burden:num(data,"unionRemunerationBurden"),elective_mandate_cnpj:text(data,"electiveMandateCnpj")?digits(text(data,"electiveMandateCnpj")):null,elected_position_remuneration:text(data,"electedPositionRemuneration")||null,rectification_receipt:text(data,"rectificationReceipt")||null,rectification_previous_reason:text(data,"rectificationPreviousReason")||null,rectification_origin:num(data,"rectificationOrigin"),rectification_process_type:num(data,"rectificationProcessType"),rectification_process_number:text(data,"rectificationProcessNumber")?digits(text(data,"rectificationProcessNumber")):null,updated_at:new Date().toISOString()};const{error}=await context.supabase.from("rh_leave_cases").update(payload).eq("organization_id",context.organizationId).eq("id",leaveId);if(error)redirect(`${path}?error=${encodeURIComponent(mensagemDeFalha("rh-leave-esocial-special.saveLeaveEsocialSpecial", error))}`);revalidatePath("/app/rh/afastamentos");revalidatePath(path);redirect(`${path}?success=1`);}
