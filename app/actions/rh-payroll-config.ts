"use server";

import { campoDeTexto } from "@/lib/forms/campos";
import{mensagemDeFalha}from"@/lib/errors/data-access";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{lerMoeda}from"@/lib/validacao/moeda";

const PATH="/app/rh/folha/configuracao";
function text(d:FormData,k:string){return campoDeTexto(d, k).trim();}
function opt(d:FormData,k:string){return text(d,k)||null;}
function date(d:FormData,k:string){return text(d,k)||null;}
function number(d:FormData,k:string){return lerMoeda(text(d,k));}
function fail(message:string):never{redirect(`${PATH}?error=${encodeURIComponent(message)}`);}
function done(message:string):never{redirect(`${PATH}?success=${encodeURIComponent(message)}`);}

export async function importRhRegulatoryTemplate(data:FormData){
 const context=await requireCapability("rh","configure");
 const templateId=text(data,"templateId"),code=text(data,"code").toUpperCase();
 if(!templateId||!code)fail("Template e código são obrigatórios.");
 const{error}=await context.supabase.rpc("create_rh_payroll_parameter_from_template",{p_organization_id:context.organizationId,p_template_id:templateId,p_code:code});
 if(error)fail(mensagemDeFalha("rh-payroll-config.importRhRegulatoryTemplate", error));done(`Parâmetro ${code} criado a partir do template oficial.`);
}

export async function createRhPayrollBase(data:FormData){
 const context=await requireCapability("rh","configure");const code=text(data,"code").toUpperCase();
 const{error}=await context.supabase.rpc("create_rh_payroll_base",{p_organization_id:context.organizationId,p_code:code,p_name:text(data,"name"),p_description:opt(data,"description")});
 if(error)fail(mensagemDeFalha("rh-payroll-config.createRhPayrollBase", error));done(`Base ${code} criada.`);
}

export async function addRhPayrollBaseMember(data:FormData){
 const context=await requireCapability("rh","configure");
 const{error}=await context.supabase.rpc("add_rh_payroll_base_member",{p_organization_id:context.organizationId,p_base_definition_id:text(data,"baseId"),p_rubric_id:text(data,"rubricId"),p_factor:number(data,"factor")??1,p_valid_from:text(data,"validFrom"),p_valid_to:date(data,"validTo")});
 if(error)fail(mensagemDeFalha("rh-payroll-config.addRhPayrollBaseMember", error));revalidatePath(PATH);done("Rubrica adicionada à composição da base.");
}

export async function createRhDerivedRubric(data:FormData){
 const context=await requireCapability("rh","configure");const code=text(data,"code").toUpperCase();
 const{error}=await context.supabase.rpc("create_rh_derived_rubric",{
  p_organization_id:context.organizationId,p_code:code,p_name:text(data,"name"),p_description:opt(data,"description"),p_payroll_kind:text(data,"payrollKind")||"DEDUCTION",p_valid_from:text(data,"validFrom"),p_valid_to:date(data,"validTo"),p_formula_type:text(data,"formulaType"),p_calculation_priority:Number(text(data,"priority")||"500"),p_base_code:text(data,"baseCode").toUpperCase(),p_parameter_code:text(data,"parameterCode").toUpperCase(),p_esocial_nature_code:opt(data,"esocialNatureCode"),p_cod_inc_cp:opt(data,"codIncCp"),p_cod_inc_irrf:opt(data,"codIncIrrf"),p_cod_inc_fgts:opt(data,"codIncFgts")
 });
 if(error)fail(mensagemDeFalha("rh-payroll-config.createRhDerivedRubric", error));done(`Rubrica automática ${code} criada.`);
}
