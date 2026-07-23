import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_ORGANIZATION_COOKIE, safeInternalReturnPath } from "@/lib/organization-context";
import { moduleForPath } from "@/lib/modules/registry";

const protectedPrefixes = ["/app", "/cliente"];

function safeToken(value?: string) {
  return value?.replace(/[^a-z0-9_-]/gi, "").slice(0, 64) ?? null;
}

function denied(request: NextRequest, reason: string, moduleKey?: string) {
  const correlationId = crypto.randomUUID();
  console.error(JSON.stringify({
    event: "authorization.proxy_denied",
    correlationId,
    reason,
    moduleKey: safeToken(moduleKey)
  }));
  const url = request.nextUrl.clone();
  url.pathname = "/acesso-negado";
  url.searchParams.set("reason", reason);
  url.searchParams.set("correlationId", correlationId);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const isProtected = protectedPrefixes.some(prefix =>
    request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)
  );
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (!isProtected) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "Autenticação indisponível.");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (isProtected && (userError || !user)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("redirect", safeInternalReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(login);
  }

  if (user && (request.nextUrl.pathname === "/app" || request.nextUrl.pathname.startsWith("/app/"))) {
    const { data: memberships, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("active", true);

    if (membershipError || !Array.isArray(memberships) || memberships.length === 0) {
      return denied(request, "membership-unavailable");
    }

    const selected = request.cookies.get(ACTIVE_ORGANIZATION_COOKIE)?.value ?? null;
    const membership = selected
      ? memberships.find(item => item.organization_id === selected)
      : memberships.length === 1
        ? memberships[0]
        : null;

    if (!membership) {
      const select = request.nextUrl.clone();
      select.pathname = "/selecionar-organizacao";
      select.searchParams.set("returnTo", safeInternalReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
      return NextResponse.redirect(select);
    }

    const matchedModule = moduleForPath(request.nextUrl.pathname);
    if (matchedModule) {
      const { data: allowed, error } = await supabase.rpc("has_module_permission", {
        p_organization_id: membership.organization_id,
        p_module_key: matchedModule.key,
        p_required_level: "READ",
        p_project_id: null,
        p_action: null
      });
      if (error || allowed !== true) {
        return denied(request, error ? "permission-rpc-failed" : "permission-denied", matchedModule.key);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
