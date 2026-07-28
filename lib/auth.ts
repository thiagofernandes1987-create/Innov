import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/organization-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrganizationContext = {
  organizationId: string;
  role: string;
  userId: string;
  email: string | null;
};

export async function requireUser(redirectTo = "/login") {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect(redirectTo);
  return { supabase, user: data.user };
}

export async function requireOrganizationContext(
  allowedRoles?: readonly string[]
): Promise<OrganizationContext & { supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }> {
  const { supabase, user } = await requireUser();
  const { data: memberships, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error || !Array.isArray(memberships) || memberships.length === 0) {
    redirect("/login?error=sem-organizacao");
  }

  const selectedOrganizationId = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value ?? null;
  const membership = selectedOrganizationId
    ? memberships.find(item => item.organization_id === selectedOrganizationId)
    : memberships.length === 1
      ? memberships[0]
      : null;

  if (!membership) redirect("/selecionar-organizacao");
  if (allowedRoles && !allowedRoles.includes(membership.role)) redirect("/acesso-negado");

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    organizationId: membership.organization_id,
    role: membership.role
  };
}

export async function requireClientContext() {
  const { supabase, user } = await requireUser();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, organization_id, legal_name, trade_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !client) redirect("/acesso-negado");
  return { supabase, user, client };
}
