"use server";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{hasCapability,requireCapability}from"@/lib/authorization";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function numberOrNull(value:unknown){if(value===null||value===undefined||String(value).trim()==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}

export async function createInventoryLot(data:FormData){
 const itemId=text(data,"itemId");const context=await requireCapability("estoque","create");const path=`/app/estoque/itens/${itemId}`;
 const{error}=await context.supabase.from("inventory_lots").insert({
  organization_id:context.organizationId,item_id:itemId,supplier_id:optional(data,"supplierId"),batch_number:text(data,"batchNumber"),
  manufactured_on:optional(data,"manufacturedOn"),expires_on:optional(data,"expiresOn"),notes:text(data,"notes"),active:true,created_by:context.userId
 });
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function createInventoryCategory(data:FormData){
 const context=await requireCapability("estoque","create");const path="/app/estoque/itens/novo";
 const{error}=await context.supabase.from("inventory_categories").insert({
  organization_id:context.organizationId,parent_id:optional(data,"parentId"),code:text(data,"code").toUpperCase(),name:text(data,"name"),description:text(data,"description"),created_by:context.userId
 });
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function createInventoryUnit(data:FormData){
 const context=await requireCapability("estoque","create");const path="/app/estoque/itens/novo";
 const{error}=await context.supabase.from("inventory_units").insert({
  organization_id:context.organizationId,code:text(data,"code"),name:text(data,"name"),decimal_places:numberOrNull(text(data,"decimalPlaces"))??4,created_by:context.userId
 });
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function createInventoryMaintenance(data:FormData){
 const assetId=text(data,"assetId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);const path=`/app/estoque/ativos/${assetId}`;
 const cost=numberOrNull(text(data,"cost"));
 if(cost!==null&&!await hasCapability("estoque","view_sensitive_financials",projectId,context))fail(path,"Seu perfil não pode registrar custo de manutenção.");
 const{error}=await context.supabase.from("inventory_asset_maintenance").insert({
  organization_id:context.organizationId,asset_id:assetId,status:text(data,"status")||"SCHEDULED",title:text(data,"title"),
  description:text(data,"description"),provider_name:optional(data,"providerName"),scheduled_for:optional(data,"scheduledFor"),
  cost,notes:text(data,"notes"),created_by:context.userId
 });
 if(error)fail(path,error.message);revalidatePath(path);
}
