import { redirect } from "next/navigation";
import { requireOrganizationContext, type OrganizationContext } from "@/lib/auth";
import { MODULE_REGISTRY, type ModuleAccessLevel, type ModuleCapabilityKey } from "@/lib/modules/registry";

type ContextWithClient = OrganizationContext & { supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>> };

export type EffectiveApplication = {
  applicationKey: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  routePrefix: string;
  sortOrder: number;
  accessLevel: ModuleAccessLevel;
};

const LEGACY_MODULES: Record<string, readonly string[]> = {
  SUPER_ADMIN: MODULE_REGISTRY.map(item => item.key),
  DIRECAO: MODULE_REGISTRY.map(item => item.key),
  ADMINISTRADOR: MODULE_REGISTRY.map(item => item.key),
  COMERCIAL: ["dashboard","crm","clients","proposals","contracts","signatures"],
  FINANCEIRO: ["dashboard","finance","budgets","clients","contracts","addenda","signatures","documents"],
  ORCAMENTISTA: ["dashboard","budgets","clients","documents"],
  GESTOR_OBRAS: ["dashboard","clients","works","planning","tasks","daily","teams","documents"],
  ENGENHEIRO: ["dashboard","works","planning","tasks","daily","documents"],
  QUALIDADE: ["dashboard","works","daily","documents","quality"],
  SAC: ["dashboard","clients","works","service"],
  CLIENTE: ["dashboard"]
};

const LEGACY_FULL = new Set(["SUPER_ADMIN","DIRECAO","ADMINISTRADOR"]);

function legacyApplications(context: ContextWithClient): EffectiveApplication[] {
  const allowed = new Set(LEGACY_MODULES[context.role] ?? ["dashboard"]);
  return MODULE_REGISTRY.filter(module => allowed.has(module.key)).map(module => ({
    applicationKey: module.key,
    name: module.name,
    description: module.description,
    icon: module.icon,
    category: module.category,
    routePrefix: module.routePrefix,
    sortOrder: module.sortOrder,
    accessLevel: LEGACY_FULL.has(context.role) ? "FULL" : "READ_WRITE"
  }));
}

export async function getEffectiveApplications(existing?: ContextWithClient): Promise<{ context: ContextWithClient; applications: EffectiveApplication[] }> {
  const context = existing ?? await requireOrganizationContext();
  const { data, error } = await context.supabase.rpc("list_effective_applications", {
    p_organization_id: context.organizationId
  });

  if (error || !Array.isArray(data)) {
    return { context, applications: legacyApplications(context) };
  }

  return {
    context,
    applications: data.map((row: Record<string, unknown>) => ({
      applicationKey: String(row.application_key),
      name: String(row.name),
      description: String(row.description ?? ""),
      icon: String(row.icon ?? "app"),
      category: String(row.category ?? "Aplicativos"),
      routePrefix: String(row.route_prefix),
      sortOrder: Number(row.sort_order ?? 100),
      accessLevel: String(row.access_level ?? "READ") as ModuleAccessLevel
    }))
  };
}

export async function hasCapability(applicationKey: string, capabilityKey: ModuleCapabilityKey, scopeId?: string | null, existing?: ContextWithClient): Promise<boolean> {
  const context = existing ?? await requireOrganizationContext();
  const { data, error } = await context.supabase.rpc("has_effective_capability", {
    p_organization_id: context.organizationId,
    p_application_key: applicationKey,
    p_capability_key: capabilityKey,
    p_scope_id: scopeId ?? null
  });

  if (!error && typeof data === "boolean") return data;

  const legacy = legacyApplications(context).some(module => module.applicationKey === applicationKey);
  if (!legacy) return false;
  if (capabilityKey === "delete" || capabilityKey === "approve" || capabilityKey === "manage" || capabilityKey === "assign_users" || capabilityKey === "configure") {
    return LEGACY_FULL.has(context.role);
  }
  if (capabilityKey === "view_sensitive_financials") {
    return LEGACY_FULL.has(context.role) || context.role === "ORCAMENTISTA" || context.role === "FINANCEIRO";
  }
  return true;
}

export async function requireCapability(applicationKey: string, capabilityKey: ModuleCapabilityKey, scopeId?: string | null) {
  const context = await requireOrganizationContext();
  if (!await hasCapability(applicationKey, capabilityKey, scopeId, context)) redirect("/acesso-negado");
  return context;
}

export async function requireAccessAdministration() {
  return requireCapability("administration", "manage");
}
