"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { lerMoeda } from "@/lib/validacao/moeda";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
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
  if(error)fail(path,error.message);
  const{data:employment}=await context.supabase.from("rh_employments").select("worker_id").eq("id",String(employmentId)).single();
  redirect(`/app/rh/pessoas/${employment?.worker_id??""}`);
}

export async function createRhRubric(data:FormData){
  const context=await requireCapability("rh","configure");
  const path="/app/rh/folha/rubricas/nova";
  const code=text(data,"code").toUpperCase();
  const name=text(data,"name");
  const formulaType=text(data,"formulaType")||"MANUAL";
  const validFrom=text(data,"validFrom");
  if(!code||!name||!validFrom)fail(path,"Código, nome e início de vigência são obrigatórios.");
  const{data:rubric,error:rError}=await context.supabase.from("rh_rubrics").insert({
    organization_id:context.organizationId,code,name,description:optional(data,"description"),payroll_kind:text(data,"payrollKind")||"EARNING",created_by:context.userId
  }).select("id").single();
  if(rError)fail(path,rError.message);
  const{error:vError}=await context.supabase.from("rh_rubric_versions").insert({
    organization_id:context.organizationId,rubric_id:rubric.id,version:1,valid_from:validFrom,valid_to:dateOrNull(data,"validTo"),formula_type:formulaType,
    fixed_value:formulaType==="FIXED"?money(data,"fixedValue"):null,
    percent_value:formulaType==="PERCENT_OF_AMOUNT"?money(data,"percentValue"):null,
    calculation_priority:Number(text(data,"priority")||"100"),esocial_nature_code:optional(data,"esocialNatureCode"),
    cod_inc_cp:optional(data,"codIncCp"),cod_inc_irrf:optional(data,"codIncIrrf"),cod_inc_fgts:optional(data,"codIncFgts"),
    accounting_debit:optional(data,"accountingDebit"),accounting_credit:optional(data,"accountingCredit"),created_by:context.userId
  });
  if(vError)fail(path,vError.message);
  redirect(`/app/rh/folha/rubricas?created=${encodeURIComponent(code)}`);
}

export async function createRhPayrollPeriod(data:FormData){
  const context=await requireCapability("rh","create");
  const path="/app/rh/folha/competencias/nova";
  const month=text(data,"referenceMonth");
  if(!/^\d{4}-\d{2}$/.test(month))fail(path,"Informe a competência no formato mês/ano.");
  const{data:period,error}=await context.supabase.from("rh_payroll_periods").insert({
    organization_id:context.organizationId,reference_month:`${month}-01`,processing_type:text(data,"processingType")||"MONTHLY",pay_date:dateOrNull(data,"payDate"),created_by:context.userId
  }).select("id").single();
  if(error)fail(path,error.message);
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
  if(error)fail(path,error.message);
  revalidatePath(path);
}

export async function runRhPayroll(data:FormData){
  const periodId=text(data,"periodId");
  const context=await requireCapability("rh","update");
  const{error}=await context.supabase.rpc("run_rh_payroll",{p_period_id:periodId});
  if(error)fail(`/app/rh/folha/competencias/${periodId}`,error.message);
  revalidatePath(`/app/rh/folha/competencias/${periodId}`);
  revalidatePath("/app/rh/folha");
}

export async function closeRhPayroll(data:FormData){
  const periodId=text(data,"periodId");
  const context=await requireCapability("rh","approve");
  const{error}=await context.supabase.rpc("close_rh_payroll",{p_period_id:periodId,p_reason:optional(data,"reason")});
  if(error)fail(`/app/rh/folha/competencias/${periodId}`,error.message);
  revalidatePath(`/app/rh/folha/competencias/${periodId}`);
  revalidatePath("/app/rh/folha");
}
