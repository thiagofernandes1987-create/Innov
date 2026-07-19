import { redirect } from "next/navigation";
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

export async function requireClientContext() {
  const { supabase, user } = await requireUser();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, organization_id, legal_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !client) {
    redirect("/acesso-negado");
  }

  return { supabase, user, client };
}
