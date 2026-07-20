"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccessAdministration } from "@/lib/authorization";
import { toDatabaseAccessLevel, type ModuleAccessLevel } from "@/lib/modules/registry";

function value(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}

export async function setApplicationState(formData:FormData){
  const context=await requireAccessAdministration();
  const moduleKey=value(formData,"applicationKey");
  const status=value(formData,"state");
  const reason=value(formData,"reason")||"Alteração administrativa de aplicativo.";
  if(!moduleKey||!["ENABLED","DISABLED","ARCHIVED"].includes(status))fail("/app/administracao/aplicativos","Aplicativo ou estado inválido.");
  const{error}=await context.supabase.rpc("set_organization_module_status",{p_organization_id:context.organizationId,p_module_key:moduleKey,p_status:status,p_reason:reason});
  if(error)fail("/app/administracao/aplicativos",error.message);
  revalidatePath("/app");revalidatePath("/app/administracao/aplicativos");
}

export async function createAccessProfile(formData:FormData){
  const context=await requireAccessAdministration();
  const code=value(formData,"key");const name=value(formData,"name");const description=value(formData,"description");
  if(!code||!name)fail("/app/administracao/perfis","Informe nome e identificador do perfil.");
  const{error}=await context.supabase.rpc("create_modular_access_profile",{p_organization_id:context.organizationId,p_code:code,p_name:name,p_description:description,p_base_role:null});
  if(error)fail("/app/administracao/perfis",error.message);
  revalidatePath("/app/administracao/perfis");
}

export async function setProfileAccessLevel(formData:FormData){
  const context=await requireAccessAdministration();
  const profileId=value(formData,"profileId");const moduleKey=value(formData,"applicationKey");const level=value(formData,"level") as ModuleAccessLevel;
  const reason=value(formData,"reason")||"Ajuste da matriz de acesso.";
  if(!profileId||!moduleKey||!["NONE","READ","READ_WRITE","FULL"].includes(level))fail("/app/administracao/perfis","Perfil, aplicativo ou nível inválido.");
  const full=level==="FULL";const editable=level==="READ_WRITE"||full;
  const{error}=await context.supabase.rpc("set_profile_module_permission",{
    p_profile_id:profileId,
    p_module_key:moduleKey,
    p_access_level:toDatabaseAccessLevel(level),
    p_can_approve:full,
    p_can_release:full,
    p_can_sign:full,
    p_can_export:editable,
    p_can_administer:full,
    p_can_view_sensitive:full,
    p_reason:reason
  });
  if(error)fail("/app/administracao/perfis",error.message);
  revalidatePath("/app");revalidatePath("/app/administracao/perfis");
}

export async function assignProfileToUser(formData:FormData){
  const context=await requireAccessAdministration();
  const userId=value(formData,"userId");const profileId=value(formData,"profileId");const scopeType=value(formData,"scopeType")||"ORGANIZATION";const scopeId=value(formData,"scopeId")||null;
  const reason=value(formData,"reason")||"Atribuição administrativa de perfil.";
  if(!userId||!profileId||!["ORGANIZATION","CLIENT","PROJECT"].includes(scopeType))fail("/app/administracao/usuarios","Usuário, perfil ou escopo inválido.");
  if(scopeType!=="ORGANIZATION"&&!scopeId)fail("/app/administracao/usuarios","Informe o cliente ou a obra do escopo.");
  const{error}=await context.supabase.rpc("assign_user_access_profile",{p_organization_id:context.organizationId,p_user_id:userId,p_profile_id:profileId,p_scope_type:scopeType,p_scope_id:scopeId,p_reason:reason});
  if(error)fail("/app/administracao/usuarios",error.message);
  revalidatePath("/app");revalidatePath("/app/administracao/usuarios");
}

export async function setUserCapabilityOverride(formData:FormData){
  const context=await requireAccessAdministration();
  const userId=value(formData,"userId");const moduleKey=value(formData,"applicationKey");const capabilityKey=value(formData,"capabilityKey");const effect=value(formData,"effect");const reason=value(formData,"reason");
  const scopeType=value(formData,"scopeType")||"ORGANIZATION";const scopeId=value(formData,"scopeId")||null;
  if(!userId||!moduleKey||!capabilityKey||!["ALLOW","DENY"].includes(effect)||!reason)fail("/app/administracao/usuarios","Preencha usuário, aplicativo, capacidade, efeito e justificativa.");
  if(!["ORGANIZATION","PROJECT"].includes(scopeType))fail("/app/administracao/usuarios","Escopo da exceção inválido.");
  if(scopeType==="PROJECT"&&!scopeId)fail("/app/administracao/usuarios","Informe a obra da exceção.");

  const call=scopeType==="PROJECT"
    ?context.supabase.rpc("set_project_module_capability_override",{p_project_id:scopeId,p_user_id:userId,p_module_key:moduleKey,p_capability_key:capabilityKey,p_effect:effect,p_expires_at:null,p_reason:reason})
    :context.supabase.rpc("set_user_module_capability_override",{p_organization_id:context.organizationId,p_user_id:userId,p_module_key:moduleKey,p_capability_key:capabilityKey,p_effect:effect,p_expires_at:null,p_reason:reason});
  const{error}=await call;
  if(error)fail("/app/administracao/usuarios",error.message);
  revalidatePath("/app");revalidatePath("/app/administracao/usuarios");
}
