import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireOrganizationContext, type OrganizationContext } from "@/lib/auth";
import {
  MODULE_BY_KEY,
  toUiAccessLevel,
  type DatabaseAccessLevel,
  type ModuleAccessLevel,
  type ModuleCapabilityKey
} from "@/lib/modules/registry";

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
  canApprove?: boolean;
  canRelease?: boolean;
  canSign?: boolean;
  canExport?: boolean;
  canAdminister?: boolean;
  canViewSensitive?: boolean;
};

function recordAuthorizationFailure(operation:string,context:ContextWithClient,error:unknown){
  const correlationId=randomUUID();
  const errorCode=typeof error==="object"&&error!==null&&"code" in error?String((error as {code?:unknown}).code??"UNKNOWN"):"UNKNOWN";
  console.error(JSON.stringify({event:"authorization.rpc_failed",correlationId,operation,errorCode,userId:context.userId,organizationId:context.organizationId}));
  return correlationId;
}

export async function getEffectiveApplications(existing?: ContextWithClient): Promise<{ context: ContextWithClient; applications: EffectiveApplication[] }> {
  const context = existing ?? await requireOrganizationContext();
  const { data, error } = await context.supabase.rpc("list_my_modules", { p_organization_id: context.organizationId });
  if (error || !Array.isArray(data)) {
    recordAuthorizationFailure("list_my_modules",context,error);
    return { context, applications: [] };
  }
  const applications: EffectiveApplication[] = data.map((row: Record<string, unknown>) => {
    const key=String(row.module_key);
    const manifest=MODULE_BY_KEY.get(key);
    return {
      applicationKey:key,
      name:String(row.module_name ?? manifest?.name ?? key),
      description:String(row.module_description ?? manifest?.description ?? ""),
      icon:String(manifest?.icon ?? row.icon_key ?? "app"),
      category:String(manifest?.category ?? "Aplicativos"),
      routePrefix:String(row.module_href ?? manifest?.routePrefix ?? `/app/${key}`),
      sortOrder:Number(row.display_order ?? manifest?.sortOrder ?? 100),
      accessLevel:toUiAccessLevel(String(row.access_level) as DatabaseAccessLevel),
      canApprove:Boolean(row.can_approve),canRelease:Boolean(row.can_release),canSign:Boolean(row.can_sign),
      canExport:Boolean(row.can_export),canAdminister:Boolean(row.can_administer),canViewSensitive:Boolean(row.can_view_sensitive)
    };
  });
  return { context, applications };
}

function requirementFor(capability: ModuleCapabilityKey): { level:DatabaseAccessLevel; action:string|null } {
  if(capability==="delete")return{level:"DELETE",action:null};
  if(capability==="create"||capability==="update")return{level:"EDIT",action:null};
  if(capability==="approve")return{level:"READ",action:"approve"};
  if(capability==="release_to_client")return{level:"READ",action:"release"};
  if(capability==="sign")return{level:"READ",action:"sign"};
  if(capability==="export")return{level:"READ",action:"export"};
  if(capability==="manage"||capability==="assign_users"||capability==="configure")return{level:"READ",action:"administer"};
  if(capability==="view_sensitive_financials")return{level:"READ",action:"sensitive"};
  return{level:"READ",action:null};
}

export async function hasCapability(applicationKey: string, capabilityKey: ModuleCapabilityKey, scopeId?: string | null, existing?: ContextWithClient): Promise<boolean> {
  const context=existing??await requireOrganizationContext();
  const required=requirementFor(capabilityKey);
  const {data,error}=await context.supabase.rpc("has_module_permission",{
    p_organization_id:context.organizationId,p_module_key:applicationKey,p_required_level:required.level,
    p_project_id:scopeId??null,p_action:required.action
  });
  if(error||typeof data!=="boolean"){
    recordAuthorizationFailure("has_module_permission",context,error);
    return false;
  }
  return data;
}

export async function requireCapability(applicationKey:string,capabilityKey:ModuleCapabilityKey,scopeId?:string|null){
  const context=await requireOrganizationContext();
  if(!await hasCapability(applicationKey,capabilityKey,scopeId,context))redirect("/acesso-negado");
  return context;
}

export async function requireAccessAdministration(){return requireCapability("administracao","manage");}
