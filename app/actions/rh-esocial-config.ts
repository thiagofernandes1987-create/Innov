"use server";

import{redirect}from"next/navigation";
import{revalidatePath}from"next/cache";
import{requireCapability}from"@/lib/authorization";

const PATH="/app/rh/configuracao/esocial";
function text(d:FormData,k:string){return String(d.get(k)??"").trim();}
function num(d:FormData,k:string){const v=text(d,k);return v===""?null:Number(v.replace(",","."));}
function fail(message:string):never{redirect(`${PATH}?error=${encodeURIComponent(message)}`);}

export async function createEsocialEmployerProfile(data:FormData){
 const context=await requireCapability("rh","configure");
 const payload={organization_id:context.organizationId,employer_id:text(data,"employerId"),valid_from:text(data,"validFrom"),valid_to:text(data,"validTo")||null,class_trib:text(data,"classTrib"),ind_coop:Number(text(data,"indCoop")||0),ind_constr:Number(text(data,"indConstr")||0),ind_des_folha:Number(text(data,"indDesFolha")||0),ind_opt_reg_eletron:Number(text(data,"indOptRegEletron")||1),ind_ent_ed:Number(text(data,"indEntEd")||0),ind_ett:Number(text(data,"indEtt")||0),created_by:context.userId};
 if(!payload.employer_id||!payload.valid_from||!payload.class_trib)fail("Empregador, vigência e classificação tributária são obrigatórios.");
 const{error}=await context.supabase.from("rh_esocial_employer_profiles").insert(payload);if(error)fail(error.message);revalidatePath(PATH);redirect(PATH);
}

export async function createEsocialEstablishmentProfile(data:FormData){
 const context=await requireCapability("rh","configure");
 const payload={organization_id:context.organizationId,establishment_id:text(data,"establishmentId"),valid_from:text(data,"validFrom"),valid_to:text(data,"validTo")||null,cnae_preponderant:text(data,"cnaePreponderant").replace(/\D/g,""),rat_rate:num(data,"ratRate"),fap:num(data,"fap"),created_by:context.userId};
 if(!payload.establishment_id||!payload.valid_from||!payload.cnae_preponderant)fail("Estabelecimento, vigência e CNAE preponderante são obrigatórios.");
 const{error}=await context.supabase.from("rh_esocial_establishment_profiles").insert(payload);if(error)fail(error.message);revalidatePath(PATH);redirect(PATH);
}

export async function createEsocialTaxAllocationProfile(data:FormData){
 const context=await requireCapability("rh","configure");
 const payload={organization_id:context.organizationId,tax_allocation_id:text(data,"taxAllocationId"),valid_from:text(data,"validFrom"),valid_to:text(data,"validTo")||null,lotacao_type:text(data,"lotacaoType"),fpas_code:text(data,"fpasCode"),third_parties_code:text(data,"thirdPartiesCode")||null,created_by:context.userId};
 if(!payload.tax_allocation_id||!payload.valid_from||!payload.lotacao_type||!payload.fpas_code)fail("Lotação, vigência, tipo e FPAS são obrigatórios.");
 const{error}=await context.supabase.from("rh_esocial_tax_allocation_profiles").insert(payload);if(error)fail(error.message);revalidatePath(PATH);redirect(PATH);
}

export async function configureEsocialRubricVersion(data:FormData){
 const context=await requireCapability("rh","configure");const versionId=text(data,"rubricVersionId");
 if(!versionId)fail("Versão da rubrica obrigatória.");
 const{error}=await context.supabase.from("rh_rubric_versions").update({esocial_table_code:text(data,"tableCode"),esocial_rubric_type:text(data,"rubricType")}).eq("organization_id",context.organizationId).eq("id",versionId);
 if(error)fail(error.message);revalidatePath(PATH);redirect(PATH);
}
