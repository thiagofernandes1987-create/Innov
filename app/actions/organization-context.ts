"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ACTIVE_ORGANIZATION_COOKIE, safeInternalReturnPath } from "@/lib/organization-context";

export async function selectActiveOrganization(data: FormData) {
  const organizationId = String(data.get("organizationId") ?? "").trim();
  const returnTo = safeInternalReturnPath(String(data.get("returnTo") ?? "/app"));
  const { supabase, user } = await requireUser();

  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error || !membership) redirect("/acesso-negado?reason=organizacao-invalida");

  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  redirect(returnTo);
}
