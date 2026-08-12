"use server";

import { campoDeTexto } from "@/lib/forms/campos";
import{mensagemDeFalha}from"@/lib/errors/data-access";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
const CONFIG="/app/rh/configuracao/portal";
function text(d:FormData,k:string){return campoDeTexto(d, k).trim();}
function fail(msg:string):never{redirect(`${CONFIG}?error=${encodeURIComponent(msg)}`);}
export async function linkWorkerUser(data:FormData){const context=await requireCapability("rh","manage");const{error}=await context.supabase.from("rh_worker_user_links").upsert({organization_id:context.organizationId,worker_id:text(data,"workerId"),user_id:text(data,"userId"),active:true,valid_from:text(data,"validFrom")||new Date().toISOString().slice(0,10),valid_to:text(data,"validTo")||null,created_by:context.userId},{onConflict:"organization_id,worker_id,user_id"});if(error)fail(mensagemDeFalha("rh-portal.linkWorkerUser", error));revalidatePath(CONFIG);redirect(CONFIG);}
export async function unlinkWorkerUser(data:FormData){const context=await requireCapability("rh","manage");const{error}=await context.supabase.from("rh_worker_user_links").update({active:false,valid_to:new Date().toISOString().slice(0,10)}).eq("organization_id",context.organizationId).eq("id",text(data,"linkId"));if(error)fail(mensagemDeFalha("rh-portal.unlinkWorkerUser", error));revalidatePath(CONFIG);redirect(CONFIG);}
export async function publishPayslips(data:FormData){const context=await requireCapability("rh","approve");const periodId=text(data,"periodId");const{data:count,error}=await context.supabase.rpc("publish_rh_payslips",{p_period_id:periodId});if(error)redirect(`/app/rh/folha/competencias/${periodId}?error=${encodeURIComponent(mensagemDeFalha("rh-portal.publishPayslips", error))}`);redirect(`/app/rh/folha/competencias/${periodId}?success=${encodeURIComponent(`${count??0} recibo(s) publicado(s).`)}`);}
