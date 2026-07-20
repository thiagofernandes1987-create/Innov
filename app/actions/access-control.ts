"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccessAdministration } from "@/lib/authorization";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function setApplicationState(formData: FormData) {
  const context = await requireAccessAdministration();
  const applicationKey = value(formData, "applicationKey");
  const state = value(formData, "state");
  const reason = value(formData, "reason") || "Alteração administrativa de aplicativo.";
  if (!applicationKey || !["ENABLED","DISABLED","MAINTENANCE","DEPRECATED","ARCHIVED"].includes(state)) {
    fail("/app/administracao/aplicativos", "Aplicativo ou estado inválido.");
  }
  const { error } = await context.supabase.rpc("set_organization_application_state", {
    p_organization_id: context.organizationId,
    p_application_key: applicationKey,
    p_state: state,
    p_reason: reason
  });
  if (error) fail("/app/administracao/aplicativos", error.message);
  revalidatePath("/app");
  revalidatePath("/app/administracao/aplicativos");
}

export async function createAccessProfile(formData: FormData) {
  const context = await requireAccessAdministration();
  const key = value(formData, "key");
  const name = value(formData, "name");
  const description = value(formData, "description");
  if (!key || !name) fail("/app/administracao/perfis", "Informe nome e identificador do perfil.");
  const { error } = await context.supabase.rpc("create_access_profile", {
    p_organization_id: context.organizationId,
    p_key: key,
    p_name: name,
    p_description: description
  });
  if (error) fail("/app/administracao/perfis", error.message);
  revalidatePath("/app/administracao/perfis");
}

export async function setProfileAccessLevel(formData: FormData) {
  await requireAccessAdministration();
  const profileId = value(formData, "profileId");
  const applicationKey = value(formData, "applicationKey");
  const level = value(formData, "level");
  const reason = value(formData, "reason") || "Ajuste da matriz de acesso.";
  if (!profileId || !applicationKey || !["NONE","READ","READ_WRITE","FULL"].includes(level)) {
    fail("/app/administracao/perfis", "Perfil, aplicativo ou nível inválido.");
  }
  const context = await requireAccessAdministration();
  const { error } = await context.supabase.rpc("set_profile_access_level", {
    p_profile_id: profileId,
    p_application_key: applicationKey,
    p_level: level,
    p_reason: reason
  });
  if (error) fail("/app/administracao/perfis", error.message);
  revalidatePath("/app");
  revalidatePath("/app/administracao/perfis");
}

export async function assignProfileToUser(formData: FormData) {
  const context = await requireAccessAdministration();
  const userId = value(formData, "userId");
  const profileId = value(formData, "profileId");
  const scopeType = value(formData, "scopeType") || "ORGANIZATION";
  const scopeId = value(formData, "scopeId") || null;
  const reason = value(formData, "reason") || "Atribuição administrativa de perfil.";
  if (!userId || !profileId || !["ORGANIZATION","CLIENT","PROJECT"].includes(scopeType)) {
    fail("/app/administracao/usuarios", "Usuário, perfil ou escopo inválido.");
  }
  const { error } = await context.supabase.rpc("assign_access_profile", {
    p_organization_id: context.organizationId,
    p_user_id: userId,
    p_profile_id: profileId,
    p_scope_type: scopeType,
    p_scope_id: scopeId,
    p_reason: reason
  });
  if (error) fail("/app/administracao/usuarios", error.message);
  revalidatePath("/app/administracao/usuarios");
}

export async function setUserCapabilityOverride(formData: FormData) {
  const context = await requireAccessAdministration();
  const userId = value(formData, "userId");
  const applicationKey = value(formData, "applicationKey");
  const capabilityKey = value(formData, "capabilityKey");
  const effect = value(formData, "effect");
  const scopeType = value(formData, "scopeType") || "ORGANIZATION";
  const scopeId = value(formData, "scopeId") || null;
  const reason = value(formData, "reason");
  if (!userId || !applicationKey || !capabilityKey || !["ALLOW","DENY"].includes(effect) || !reason) {
    fail("/app/administracao/usuarios", "Preencha usuário, aplicativo, capacidade, efeito e justificativa.");
  }
  const { error } = await context.supabase.rpc("set_user_capability_override", {
    p_organization_id: context.organizationId,
    p_user_id: userId,
    p_application_key: applicationKey,
    p_capability_key: capabilityKey,
    p_effect: effect,
    p_scope_type: scopeType,
    p_scope_id: scopeId,
    p_reason: reason
  });
  if (error) fail("/app/administracao/usuarios", error.message);
  revalidatePath("/app/administracao/usuarios");
}
