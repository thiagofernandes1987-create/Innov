"use server";

import { campoDeTexto } from "@/lib/forms/campos";
import{mensagemDeFalha}from"@/lib/errors/data-access";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{lerMoeda}from"@/lib/validacao/moeda";

const BASE="/app/rh/folha/sombra";function t(d:FormData,k:string){return campoDeTexto(d, k).trim();}function o(d:FormData,k:string){return t(d,k)||null;}function n(d:FormData,k:string){return lerMoeda(t(d,k));}function fail(p:string,m:string):never{redirect(`${p}?error=${encodeURIComponent(m)}`);}
export async function createShadowPayroll(data:FormData){const c=await requireCapability("rh","create"),tol=n(data,"tolerance")??0.01;const{data:id,error}=await c.supabase.rpc("create_rh_payroll_shadow_run",{p_internal_run_id:t(data,"internalRunId"),p_source_system:t(data,"sourceSystem"),p_source_reference:o(data,"sourceReference"),p_absolute_tolerance:tol});if(error)fail(BASE,mensagemDeFalha("rh-shadow-payroll.createShadowPayroll", error));redirect(`${BASE}/${id}`);}
export async function setShadowWorkerExternal(data:FormData){const c=await requireCapability("rh","update"),id=t(data,"shadowRunId"),path=`${BASE}/${id}`;const{error}=await c.supabase.rpc("set_rh_shadow_worker_external",{p_shadow_run_id:id,p_employment_id:t(data,"employmentId"),p_gross:n(data,"gross"),p_deductions:n(data,"deductions"),p_net:n(data,"net"),p_note:o(data,"note")});if(error)fail(path,mensagemDeFalha("rh-shadow-payroll.setShadowWorkerExternal", error));revalidatePath(path);}
export async function setShadowRubricExternal(data:FormData){const c=await requireCapability("rh","update"),id=t(data,"shadowRunId"),path=`${BASE}/${id}`;const{error}=await c.supabase.rpc("set_rh_shadow_rubric_external",{p_shadow_run_id:id,p_employment_id:t(data,"employmentId"),p_rubric_code:t(data,"rubricCode"),p_amount:n(data,"amount"),p_note:o(data,"note")});if(error)fail(path,mensagemDeFalha("rh-shadow-payroll.setShadowRubricExternal", error));revalidatePath(path);}
export async function reconcileShadowPayroll(data:FormData){const c=await requireCapability("rh","approve"),id=t(data,"shadowRunId"),path=`${BASE}/${id}`;const{error}=await c.supabase.rpc("reconcile_rh_payroll_shadow",{p_shadow_run_id:id});if(error)fail(path,mensagemDeFalha("rh-shadow-payroll.reconcileShadowPayroll", error));revalidatePath(path);}
export async function acceptShadowPayroll(data:FormData){const c=await requireCapability("rh","approve"),id=t(data,"shadowRunId"),path=`${BASE}/${id}`;const{error}=await c.supabase.rpc("accept_rh_payroll_shadow",{p_shadow_run_id:id,p_notes:o(data,"notes")});if(error)fail(path,mensagemDeFalha("rh-shadow-payroll.acceptShadowPayroll", error));revalidatePath(path);}
