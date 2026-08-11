"use server";

import{mensagemDeFalha}from"@/lib/errors/data-access";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { lerMoeda } from "@/lib/validacao/moeda";
import { campoDeTexto } from "@/lib/forms/campos";

function text(data:FormData,key:string){return campoDeTexto(data, key).trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function money(data:FormData,key:string){return lerMoeda(text(data,key));}
function dateOrNull(data:FormData,key:string){const value=text(data,key);return value||null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function digits(value:string){return value.replace(/\D/g,"");}

export async function createRhWorker(data:FormData){
  const context=await requireCapability("rh","create");
  const path="/app/rh/pessoas/novo";
  const fullName=text(data,"fullName");
  const cpf=digits(text(data,"cpf"));
  const workerCode=text(data,"workerCode");
  const registrationNumber=text(data,"registrationNumber");
  const admissionDate=text(data,"admissionDate");
  if(fullName.length<2)fail(path,"Informe o nome completo.");
  if(cpf&&cpf.length!==11)fail(path,"CPF deve conter 11 dígitos.");
  if(!workerCode)fail(path,"Informe o código do trabalhador.");
  if(!registrationNumber)fail(path,"Informe a matrícula.");
  if(!admissionDate)fail(path,"Informe a data de admissão.");
  const{data:employmentId,error}=await context.supabase.rpc("create_rh_worker",{
    p_organization_id:context.organizationId,
    p_full_name:fullName,
    p_preferred_name:optional(data,"preferredName"),
    p_cpf:cpf||null,
    p_birth_date:dateOrNull(data,"birthDate"),
    p_email:optional(data,"email"),
    p_phone:optional(data,"phone"),
    p_worker_code:workerCode,
    p_registration_number:registrationNumber,
    p_employment_type:text(data,"employmentType")||"EMPLOYEE",
    p_admission_date:admissionDate,
    p_base_salary:money(data,"baseSalary")??0
  });
  if(error)fail(path,mensagemDeFalha("rh.createRhWorker", error));
  const{data:employment}=await context.supabase.from("rh_employments").select("worker_id").eq("id",String(employmentId)).single();
  redirect(`/app/rh/pessoas/${employment?.worker_id??""}`);
}

export async function createRhEmployer(data:FormData){
  const context=await requireCapability("rh","configure");const path="/app/rh/configuracao/estrutura";
  const code=text(data,"code").toUpperCase();const legalName=text(data,"legalName");const taxId=digits(text(data,"taxId"));
  if(!code||!legalName||!taxId)fail(path,"Código, razão social e CNPJ/CPF são obrigatórios.");
  const{error}=await context.supabase.from("rh_employers").insert({organization_id:context.organizationId,code,legal_name:legalName,trade_name:optional(data,"tradeName"),tax_id:taxId,created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhEmployer", error));revalidatePath(path);
}

export async function createRhEstablishment(data:FormData){
  const context=await requireCapability("rh","configure");const path="/app/rh/configuracao/estrutura";
  const{error}=await context.supabase.from("rh_establishments").insert({organization_id:context.organizationId,employer_id:text(data,"employerId"),code:text(data,"code").toUpperCase(),name:text(data,"name"),registration_type:text(data,"registrationType")||"CNPJ",registration_number:digits(text(data,"registrationNumber")),created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhEstablishment", error));revalidatePath(path);
}

export async function createRhTaxAllocation(data:FormData){
  const context=await requireCapability("rh","configure");const path="/app/rh/configuracao/estrutura";
  const{error}=await context.supabase.from("rh_tax_allocations").insert({organization_id:context.organizationId,employer_id:text(data,"employerId"),establishment_id:optional(data,"establishmentId"),code:text(data,"code").toUpperCase(),name:text(data,"name"),esocial_lotacao_code:optional(data,"esocialLotacaoCode"),valid_from:text(data,"validFrom"),valid_to:dateOrNull(data,"validTo"),created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhTaxAllocation", error));revalidatePath(path);
}

export async function createRhPosition(data:FormData){
  const context=await requireCapability("rh","configure");const path="/app/rh/configuracao/estrutura";
  const{error}=await context.supabase.from("rh_positions").insert({organization_id:context.organizationId,code:text(data,"code").toUpperCase(),name:text(data,"name"),cbo_code:optional(data,"cboCode"),created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhPosition", error));revalidatePath(path);
}

export async function createRhFunction(data:FormData){
  const context=await requireCapability("rh","configure");const path="/app/rh/configuracao/estrutura";
  const{error}=await context.supabase.from("rh_functions").insert({organization_id:context.organizationId,code:text(data,"code").toUpperCase(),name:text(data,"name"),description:optional(data,"description"),created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhFunction", error));revalidatePath(path);
}

export async function createRhUnion(data:FormData){
  const context=await requireCapability("rh","configure");const path="/app/rh/configuracao/estrutura";
  const{error}=await context.supabase.from("rh_unions").insert({organization_id:context.organizationId,code:text(data,"code").toUpperCase(),name:text(data,"name"),tax_id:digits(text(data,"taxId"))||null,category_name:optional(data,"categoryName"),valid_from:dateOrNull(data,"validFrom"),valid_to:dateOrNull(data,"validTo"),created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhUnion", error));revalidatePath(path);
}

export async function createRhWorkSchedule(data:FormData){
  const context=await requireCapability("rh","configure");const path="/app/rh/configuracao/estrutura";
  const weekly=money(data,"weeklyHours");if(weekly==null||weekly<0||weekly>168)fail(path,"Carga horária semanal inválida.");
  const{error}=await context.supabase.from("rh_work_schedules").insert({organization_id:context.organizationId,code:text(data,"code").toUpperCase(),name:text(data,"name"),weekly_hours:weekly,description:optional(data,"description"),created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhWorkSchedule", error));revalidatePath(path);
}

export async function createRhEmploymentCondition(data:FormData){
  const workerId=text(data,"workerId");const employmentId=text(data,"employmentId");const path=`/app/rh/pessoas/${workerId}`;
  const context=await requireCapability("rh","update");const salary=money(data,"baseSalary");
  if(!employmentId||!text(data,"employerId")||!text(data,"establishmentId")||!text(data,"validFrom")||salary==null)fail(path,"Preencha vínculo, empresa, estabelecimento, vigência e salário.");
  const{error}=await context.supabase.from("rh_employment_conditions").insert({organization_id:context.organizationId,employment_id:employmentId,valid_from:text(data,"validFrom"),valid_to:dateOrNull(data,"validTo"),employer_id:text(data,"employerId"),establishment_id:text(data,"establishmentId"),tax_allocation_id:optional(data,"taxAllocationId"),position_id:optional(data,"positionId"),function_id:optional(data,"functionId"),union_id:optional(data,"unionId"),work_schedule_id:optional(data,"workScheduleId"),base_salary:salary,change_reason:optional(data,"changeReason"),created_by:context.userId});
  if(error)fail(path,mensagemDeFalha("rh.createRhEmploymentCondition", error));
  if(!dateOrNull(data,"validTo")&&text(data,"validFrom")<=new Date().toISOString().slice(0,10))await context.supabase.from("rh_employments").update({base_salary:salary,updated_at:new Date().toISOString()}).eq("id",employmentId).eq("organization_id",context.organizationId);
  revalidatePath(path);revalidatePath("/app/rh/pessoas");
}

export async function createRhPayrollPeriod(data:FormData){
  const context=await requireCapability("rh","create");
  const path="/app/rh/folha/competencias/nova";
  const month=text(data,"referenceMonth");
  if(!/^\d{4}-\d{2}$/.test(month))fail(path,"Informe a competência no formato mês/ano.");
  const{data:period,error}=await context.supabase.from("rh_payroll_periods").insert({
    organization_id:context.organizationId,reference_month:`${month}-01`,processing_type:text(data,"processingType")||"MONTHLY",pay_date:dateOrNull(data,"payDate"),created_by:context.userId
  }).select("id").single();
  if(error)fail(path,mensagemDeFalha("rh.createRhPayrollPeriod", error));
  redirect(`/app/rh/folha/competencias/${period.id}`);
}

export async function addRhPayrollInput(data:FormData){
  const periodId=text(data,"periodId");
  const context=await requireCapability("rh","update");
  const path=`/app/rh/folha/competencias/${periodId}`;
  const employmentId=text(data,"employmentId");
  const rubricVersionId=text(data,"rubricVersionId");
  if(!employmentId||!rubricVersionId)fail(path,"Selecione trabalhador e rubrica.");
  const{data:period}=await context.supabase.from("rh_payroll_periods").select("status").eq("id",periodId).eq("organization_id",context.organizationId).single();
  if(!period||!["OPEN","CALCULATED","REVIEW","REOPENED"].includes(period.status))fail(path,"A competência não aceita novos lançamentos.");
  const{error}=await context.supabase.from("rh_payroll_inputs").insert({
    organization_id:context.organizationId,period_id:periodId,employment_id:employmentId,rubric_version_id:rubricVersionId,
    quantity:money(data,"quantity"),unit_rate:money(data,"unitRate"),amount:money(data,"amount"),source_type:text(data,"sourceType")||"MANUAL",notes:optional(data,"notes"),created_by:context.userId
  });
  if(error)fail(path,mensagemDeFalha("rh.addRhPayrollInput", error));
  revalidatePath(path);
}

export async function runRhPayroll(data:FormData){
  const periodId=text(data,"periodId");
  const context=await requireCapability("rh","update");
  const{error}=await context.supabase.rpc("run_rh_payroll",{p_period_id:periodId});
  if(error)fail(`/app/rh/folha/competencias/${periodId}`,mensagemDeFalha("rh.runRhPayroll", error));
  revalidatePath(`/app/rh/folha/competencias/${periodId}`);
  revalidatePath("/app/rh/folha");
}

export async function closeRhPayroll(data:FormData){
  const periodId=text(data,"periodId");
  const context=await requireCapability("rh","approve");
  const{error}=await context.supabase.rpc("close_rh_payroll",{p_period_id:periodId,p_reason:optional(data,"reason")});
  if(error)fail(`/app/rh/folha/competencias/${periodId}`,mensagemDeFalha("rh.closeRhPayroll", error));
  revalidatePath(`/app/rh/folha/competencias/${periodId}`);
  revalidatePath("/app/rh/folha");
}
