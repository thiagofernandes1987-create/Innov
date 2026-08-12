"use server";

import { campoDeTexto } from "@/lib/forms/campos";
import{mensagemDeFalha}from"@/lib/errors/data-access";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{lerMoeda}from"@/lib/validacao/moeda";
function text(d:FormData,k:string){return campoDeTexto(d, k).trim();}
function opt(d:FormData,k:string){return text(d,k)||null;}
function date(d:FormData,k:string){return text(d,k)||null;}
function digits(v:string){return v.replace(/\D/g,"");}
function money(d:FormData,k:string){return lerMoeda(text(d,k));}
function fail(path:string,msg:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(msg)}`);}

export async function createRhAdmissionCase(data:FormData){const context=await requireCapability("rh","create");const path="/app/rh/admissoes/nova";const cpf=digits(text(data,"cpf"));const{data:id,error}=await context.supabase.rpc("create_rh_admission_case",{p_organization_id:context.organizationId,p_full_name:text(data,"fullName"),p_preferred_name:opt(data,"preferredName"),p_cpf:cpf||null,p_birth_date:date(data,"birthDate"),p_email:opt(data,"email"),p_phone:opt(data,"phone"),p_worker_code:text(data,"workerCode"),p_registration_number:text(data,"registrationNumber"),p_employment_type:text(data,"employmentType")||"EMPLOYEE",p_admission_date:text(data,"admissionDate"),p_employer_id:text(data,"employerId"),p_establishment_id:text(data,"establishmentId"),p_tax_allocation_id:opt(data,"taxAllocationId"),p_position_id:opt(data,"positionId"),p_function_id:opt(data,"functionId"),p_union_id:opt(data,"unionId"),p_work_schedule_id:opt(data,"workScheduleId"),p_base_salary:money(data,"baseSalary")??0,p_esocial_strategy:text(data,"esocialStrategy")||"S2200"});if(error)fail(path,mensagemDeFalha("rh-admission.createRhAdmissionCase", error));redirect(`/app/rh/admissoes/${id}`);}

export async function setRhAdmissionChecklist(data:FormData){const id=text(data,"caseId");const context=await requireCapability("rh","update");const{error}=await context.supabase.rpc("set_rh_admission_checklist_item",{p_item_id:text(data,"itemId"),p_status:text(data,"status"),p_note:opt(data,"note")});if(error)fail(`/app/rh/admissoes/${id}`,mensagemDeFalha("rh-admission.setRhAdmissionChecklist", error));revalidatePath(`/app/rh/admissoes/${id}`);}

export async function activateRhAdmission(data:FormData){const id=text(data,"caseId");const context=await requireCapability("rh","approve");const{data:workerId,error}=await context.supabase.rpc("activate_rh_admission",{p_case_id:id});if(error)fail(`/app/rh/admissoes/${id}`,mensagemDeFalha("rh-admission.activateRhAdmission", error));redirect(`/app/rh/pessoas/${workerId}`);}
