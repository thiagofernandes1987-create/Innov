"use server";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";

function text(d:FormData,k:string){return String(d.get(k)??"").trim();}
function num(d:FormData,k:string){const v=text(d,k);return v?Number(v):null;}
function digits(v:string){return v.replace(/\D/g,"");}
function cpfs(v:string){return v.split(/[\s,;]+/).map(digits).filter(Boolean);}

export async function saveAdmissionEsocialSpecialProfile(data:FormData){
 const caseId=text(data,"caseId");const context=await requireCapability("rh","update");
 const path=`/app/rh/admissoes/${caseId}/esocial-especial`;
 const payload={
  immigrant_residence_term:num(data,"immigrantResidenceTerm"),
  immigrant_entry_condition:num(data,"immigrantEntryCondition"),
  temporary_legal_hypothesis:num(data,"temporaryLegalHypothesis"),
  temporary_justification:text(data,"temporaryJustification")||null,
  temporary_client_registration_type:num(data,"temporaryClientRegistrationType"),
  temporary_client_registration_number:text(data,"temporaryClientRegistrationNumber")?digits(text(data,"temporaryClientRegistrationNumber")):null,
  temporary_substituted_cpfs:cpfs(text(data,"temporarySubstitutedCpfs")),
  apprentice_hiring_mode:num(data,"apprenticeHiringMode"),
  apprentice_qualifier_cnpj:text(data,"apprenticeQualifierCnpj")?digits(text(data,"apprenticeQualifierCnpj")):null,
  apprentice_indirect_registration_type:num(data,"apprenticeIndirectRegistrationType"),
  apprentice_indirect_registration_number:text(data,"apprenticeIndirectRegistrationNumber")?digits(text(data,"apprenticeIndirectRegistrationNumber")):null,
  apprentice_practice_cnpj:text(data,"apprenticePracticeCnpj")?digits(text(data,"apprenticePracticeCnpj")):null,
  updated_at:new Date().toISOString()
 };
 const{data:profile,error:profileError}=await context.supabase.from("rh_admission_esocial_profiles").select("id").eq("organization_id",context.organizationId).eq("admission_case_id",caseId).maybeSingle();
 if(profileError)redirect(`${path}?error=${encodeURIComponent(profileError.message)}`);
 if(!profile)redirect(`${path}?error=${encodeURIComponent("Salve primeiro o perfil eSocial principal da admissão.")}`);
 const{error}=await context.supabase.from("rh_admission_esocial_profiles").update(payload).eq("organization_id",context.organizationId).eq("admission_case_id",caseId);
 if(error)redirect(`${path}?error=${encodeURIComponent(error.message)}`);
 revalidatePath(`/app/rh/admissoes/${caseId}`);revalidatePath(path);redirect(`${path}?success=1`);
}
