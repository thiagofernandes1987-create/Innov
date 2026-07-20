import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { moduleForPath } from "@/lib/modules/registry";

const protectedPrefixes = ["/app", "/cliente"];
const legacyAdmin = new Set(["SUPER_ADMIN","DIRECAO","ADMINISTRADOR"]);
const legacyModules: Record<string, readonly string[]> = {
  COMERCIAL:["crm","clients","proposals","contracts","signatures"],
  FINANCEIRO:["finance","budgets","clients","contracts","addenda","signatures","documents"],
  ORCAMENTISTA:["budgets","clients","documents"],
  GESTOR_OBRAS:["clients","works","planning","tasks","daily","teams","documents"],
  ENGENHEIRO:["works","planning","tasks","daily","documents"],
  QUALIDADE:["works","daily","documents","quality"],
  SAC:["clients","works","service"]
};

export async function proxy(request: NextRequest) {
  const isProtected = protectedPrefixes.some(prefix => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (!isProtected) return NextResponse.next();
    const url=request.nextUrl.clone(); url.pathname="/login"; url.searchParams.set("error","Autenticação ainda não configurada neste ambiente.");
    return NextResponse.redirect(url);
  }

  let response=NextResponse.next({request});
  const supabase=createServerClient(supabaseUrl,supabaseKey,{cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
  }});

  const {data:{user}}=await supabase.auth.getUser();
  if(isProtected&&!user){const login=request.nextUrl.clone();login.pathname="/login";login.searchParams.set("redirect",`${request.nextUrl.pathname}${request.nextUrl.search}`);return NextResponse.redirect(login);}

  const module=moduleForPath(request.nextUrl.pathname);
  if(user&&request.nextUrl.pathname.startsWith("/app/")&&module){
    const {data:membership}=await supabase.from("organization_memberships").select("organization_id,role").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
    if(!membership){const denied=request.nextUrl.clone();denied.pathname="/acesso-negado";return NextResponse.redirect(denied);}

    const {data:allowed,error}=await supabase.rpc("has_effective_capability",{
      p_organization_id:membership.organization_id,
      p_application_key:module.key,
      p_capability_key:"read",
      p_scope_id:null
    });

    const legacyAllowed=legacyAdmin.has(String(membership.role))||(legacyModules[String(membership.role)]??[]).includes(module.key);
    if((!error&&allowed!==true)||(error&&!legacyAllowed)){
      const denied=request.nextUrl.clone();denied.pathname="/acesso-negado";denied.searchParams.set("module",module.key);return NextResponse.redirect(denied);
    }
  }

  return response;
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
