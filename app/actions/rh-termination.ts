"use server";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{lerMoeda}from"@/lib/validacao/moeda";

function t(d:FormData,k:string){return String(d.get(k)??"").trim();}
function o(d:FormData,k:string){return t(d,k)||null;}
function n(d:FormData,k:string){return lerMoeda(t(d,k));}
function int(d:FormData,k:string){const v=Number(t(d,k)||"0");return Number.isFinite(v)?Math.trunc(v):0;}
function fail(path:string,message:string):never{redirect(`${path}?error=${encodeURIComponent(message)}`);}

export async function createTerminationCase(data:FormData){
 const context=await requireCapability("rh","create"),path="/app/rh/desligamentos";
 const employmentId=t(data,"employmentId"),terminationDate=t(data,"terminationDate"),reason=t(data,"esocialReasonCode"),internal=t(data,"internalReason");
 if(!employmentId||!terminationDate||!reason||!internal)fail(path,"Vínculo, data, motivo eSocial e motivo interno são obrigatórios.");
 const{data:id,error}=await context.supabase.rpc("create_rh_termination_case",{
  p_organization_id:context.organizationId,p_employment_id:employmentId,p_termination_date:terminationDate,p_esocial_reason_code:reason,p_internal_reason:internal,
  p_notice_type:t(data,"noticeType")||"NOT_APPLICABLE",p_notice_days:int(data,"noticeDays"),p_projected_notice_end:o(data,"projectedNoticeEnd"),
  p_worked_days_in_month:int(data,"workedDaysInMonth"),p_thirteenth_months:int(data,"thirteenthMonths"),p_proportional_vacation_months:int(data,"proportionalVacationMonths"),
  p_outstanding_vacation_days:n(data,"outstandingVacationDays")??0,p_salary_average_base:n(data,"salaryAverageBase")??0,p_fgts_termination_base:n(data,"fgtsTerminationBase")??0,
  p_fgts_penalty_rate:n(data,"fgtsPenaltyRate")??0,p_pension_percentage:n(data,"pensionPercentage"),p_pension_amount:n(data,"pensionAmount"),p_death_certificate_number:o(data,"deathCertificateNumber")
 });
 if(error)fail(path,error.message);redirect(`/app/rh/desligamentos/${id}`);
}

export async function calculateTermination(data:FormData){const id=t(data,"caseId"),path=`/app/rh/desligamentos/${id}`,context=await requireCapability("rh","update");const{error}=await context.supabase.rpc("calculate_rh_termination",{p_case_id:id});if(error)fail(path,error.message);revalidatePath(path);}

export async function approveTermination(data:FormData){const id=t(data,"caseId"),calc=t(data,"calculationId"),path=`/app/rh/desligamentos/${id}`,context=await requireCapability("rh","approve");const{error}=await context.supabase.rpc("approve_rh_termination_calculation",{p_calculation_id:calc});if(error)fail(path,error.message);revalidatePath(path);}

export async function makeTerminationEffective(data:FormData){const id=t(data,"caseId"),path=`/app/rh/desligamentos/${id}`,context=await requireCapability("rh","approve");const{error}=await context.supabase.rpc("make_rh_termination_effective",{p_case_id:id});if(error)fail(path,error.message);revalidatePath(path);revalidatePath("/app/rh/desligamentos");revalidatePath("/app/rh/pessoas");}

export async function addTerminationAdjustment(data:FormData){
 const id=t(data,"caseId"),path=`/app/rh/desligamentos/${id}`,context=await requireCapability("rh","update"),amount=n(data,"amount");
 if(!t(data,"code")||!t(data,"description")||amount==null)fail(path,"Código, descrição e valor são obrigatórios.");
 const{error}=await context.supabase.from("rh_termination_adjustments").insert({organization_id:context.organizationId,termination_case_id:id,code:t(data,"code").toUpperCase(),description:t(data,"description"),kind:t(data,"kind")||"EARNING",amount,payroll_rubric_version_id:o(data,"payrollRubricVersionId"),evidence_reference:o(data,"evidenceReference"),created_by:context.userId});
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function updateOffboardingTask(data:FormData){
 const caseId=t(data,"caseId"),taskId=t(data,"taskId"),path=`/app/rh/desligamentos/${caseId}`,context=await requireCapability("rh","update"),status=t(data,"status");
 if(!["PENDING","IN_PROGRESS","DONE","WAIVED","BLOCKED"].includes(status))fail(path,"Status de offboarding inválido.");
 const done=status==="DONE"||status==="WAIVED";const{error}=await context.supabase.from("rh_offboarding_tasks").update({status,evidence_reference:o(data,"evidenceReference"),completed_by:done?context.userId:null,completed_at:done?new Date().toISOString():null}).eq("organization_id",context.organizationId).eq("termination_case_id",caseId).eq("id",taskId);
 if(error)fail(path,error.message);revalidatePath(path);
}
