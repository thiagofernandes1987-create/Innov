"use server";

import { campoDeTexto } from "@/lib/forms/campos";
import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{hasCapability,requireCapability}from"@/lib/authorization";
import{reportDataAccessError}from"@/lib/errors/data-access";

type ProviderLikeError={code?:string|null;statusCode?:string|number|null;name?:string|null};
function text(data:FormData,key:string){return campoDeTexto(data, key).trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function numberOrNull(value:unknown){if(value===null||value===undefined||String(value).trim()==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}
const CATALOGO="/app/estoque/catalogo";

function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function failData(path:string,operation:string,error:ProviderLikeError|null|undefined,message:string):never{reportDataAccessError(`inventory-extra.${operation}`,error);fail(path,message);}

export async function createInventoryLot(data:FormData){
 const itemId=text(data,"itemId");const context=await requireCapability("estoque","create");const path=`/app/estoque/itens/${itemId}`;
 const{error}=await context.supabase.from("inventory_lots").insert({
  organization_id:context.organizationId,item_id:itemId,supplier_id:optional(data,"supplierId"),batch_number:text(data,"batchNumber"),
  manufactured_on:optional(data,"manufacturedOn"),expires_on:optional(data,"expiresOn"),notes:text(data,"notes"),active:true,created_by:context.userId
 });
 if(error)failData(path,"create-lot",error,"Não foi possível criar o lote.");revalidatePath(path);
}

export async function createInventoryCategory(data:FormData){
 const context=await requireCapability("estoque","create");const path=CATALOGO;
 const{error}=await context.supabase.from("inventory_categories").insert({
  organization_id:context.organizationId,parent_id:optional(data,"parentId"),code:text(data,"code").toUpperCase(),name:text(data,"name"),description:text(data,"description"),created_by:context.userId
 });
 if(error)failData(path,"create-category",error,"Não foi possível criar a categoria de estoque.");revalidatePath(path);
}

export async function createInventoryUnit(data:FormData){
 const context=await requireCapability("estoque","create");const path=CATALOGO;
 const{error}=await context.supabase.from("inventory_units").insert({
  organization_id:context.organizationId,code:text(data,"code"),name:text(data,"name"),decimal_places:numberOrNull(text(data,"decimalPlaces"))??4,created_by:context.userId
 });
 if(error)failData(path,"create-unit",error,"Não foi possível criar a unidade de estoque.");revalidatePath(path);
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
 if(error)failData(path,"create-maintenance",error,"Não foi possível registrar a manutenção do ativo.");revalidatePath(path);
}

/**
 * Tira de circulação — e **não exclui**.
 *
 * Categoria e unidade são escolhidas por itens já cadastrados: excluir
 * arrancaria a unidade de um item que existe, e "kg" viraria nulo numa linha de
 * estoque. Desativada some do formulário de item novo e continua explicando o
 * que já foi cadastrado. É a mesma regra das listas cadastradas da S-34.
 */
export async function alternarCategoriaDeEstoque(data: FormData): Promise<void> {
  const context = await requireCapability("estoque", "update");
  const id = text(data, "id");
  if (!id) return;
  const { error } = await context.supabase
    .from("inventory_categories")
    .update({ active: text(data, "ativo") !== "sim", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", context.organizationId);
  if (error) failData(CATALOGO,"toggle-category",error,"Não foi possível alterar a categoria de estoque.");
  revalidatePath(CATALOGO);
}

export async function alternarUnidadeDeEstoque(data: FormData): Promise<void> {
  const context = await requireCapability("estoque", "update");
  const id = text(data, "id");
  if (!id) return;
  const { error } = await context.supabase
    .from("inventory_units")
    .update({ active: text(data, "ativo") !== "sim", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", context.organizationId);
  if (error) failData(CATALOGO,"toggle-unit",error,"Não foi possível alterar a unidade de estoque.");
  revalidatePath(CATALOGO);
}