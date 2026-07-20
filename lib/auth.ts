import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppAccessLevel = "NONE" | "READ" | "EDIT" | "DELETE";

export type ModuleAccess = {
  module_id: string;
  module_key: string;
  module_name: string;
  module_description: string;
  module_href: string;
  icon_key: string;
  display_order: number;
  sensitive: boolean;
  access_level: AppAccessLevel;
  can_approve: boolean;
  can_release: boolean;
  can_sign: boolean;
  can_export: boolean;
  can_administer: boolean;
  can_view_sensitive: boolean;
  permission_source: string;
};

export type OrganizationContext = {
  organizationId: string;
  role: string;
  userId: string;
  email: string | null;
};

export async function requireUser(redirectTo = "/login") {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(redirectTo);
  }

  return { supabase, user: data.user };
}

export async function requireOrganizationContext(
  allowedRoles?: readonly string[]
): Promise<OrganizationContext & { supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }> {
  const { supabase, user } = await requireUser();

  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    redirect("/login?error=sem-organizacao");
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    redirect("/acesso-negado");
  }

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    organizationId: membership.organization_id,
    role: membership.role
  };
}

export async function listAccessibleModules(
  context?: Awaited<ReturnType<typeof requireOrganizationContext>>
): Promise<ModuleAccess[]> {
  const current = context ?? await requireOrganizationContext();
  const { data, error } = await current.supabase.rpc("list_my_modules", {
    p_organization_id: current.organizationId
  });

  if (error) {
    throw new Error(`Não foi possível carregar os módulos: ${error.message}`);
  }

  return (data ?? []) as ModuleAccess[];
}

export async function getEffectiveModuleAccess(
  moduleKey: string,
  projectId?: string | null,
  context?: Awaited<ReturnType<typeof requireOrganizationContext>>
): Promise<ModuleAccess | null> {
  const current = context ?? await requireOrganizationContext();
  const { data, error } = await current.supabase.rpc("effective_module_permissions", {
    p_organization_id: current.organizationId,
    p_user_id: current.userId,
    p_project_id: projectId ?? null
  });

  if (error) {
    throw new Error(`Não foi possível verificar o acesso: ${error.message}`);
  }

  return ((data ?? []) as ModuleAccess[]).find((item) => item.module_key === moduleKey) ?? null;
}

export async function requireModulePermission(
  moduleKey: string,
  requiredLevel: AppAccessLevel = "READ",
  options?: {
    projectId?: string | null;
    action?: "approve" | "release" | "sign" | "export" | "administer" | "sensitive";
    redirectTo?: string;
  }
) {
  const context = await requireOrganizationContext();
  const { data, error } = await context.supabase.rpc("has_module_permission", {
    p_organization_id: context.organizationId,
    p_module_key: moduleKey,
    p_required_level: requiredLevel,
    p_project_id: options?.projectId ?? null,
    p_action: options?.action ?? null
  });

  if (error || data !== true) {
    redirect(options?.redirectTo ?? `/acesso-negado?modulo=${encodeURIComponent(moduleKey)}`);
  }

  const moduleAccess = await getEffectiveModuleAccess(
    moduleKey,
    options?.projectId,
    context
  );

  return { ...context, moduleAccess };
}

export async function requireClientContext() {
  const { supabase, user } = await requireUser();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, organization_id, legal_name, trade_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !client) {
    redirect("/acesso-negado");
  }

  return { supabase, user, client };
}
