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
function boolean(data:FormData,key:string){return data.get(key)!==null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function failData(path:string,operation:string,error:ProviderLikeError|null|undefined,message:string):never{reportDataAccessError(`inventory.${operation}`,error);fail(path,message);}
function parseArray(raw:string,label:string){try{const value:unknown=JSON.parse(raw);if(!Array.isArray(value)||value.length===0)throw new Error();return value;}catch{throw new Error(`${label} inválidos.`);}}

export async function createInventoryItem(data:FormData){
 const context=await requireCapability("estoque","create");const path="/app/estoque/itens/novo";
 const code=text(data,"code");const name=text(data,"name");const unitId=text(data,"unitId");const referenceCost=numberOrNull(text(data,"referenceUnitCost"));
 if(!code||!name||!unitId)fail(path,"Informe código, nome e unidade.");
 if(referenceCost!==null&&!await hasCapability("estoque","view_sensitive_financials",null,context))fail(path,"Seu perfil não pode definir custo de referência.");
 const{data:item,error}=await context.supabase.rpc("create_inventory_item",{
  p_organization_id:context.organizationId,p_category_id:optional(data,"categoryId"),p_unit_id:unitId,
  p_code:code,p_name:name,p_kind:text(data,"kind")||"MATERIAL",p_description:text(data,"description"),
  p_specification:text(data,"specification"),p_sku:optional(data,"sku"),p_barcode:optional(data,"barcode"),
  p_minimum_stock:numberOrNull(text(data,"minimumStock"))??0,p_reference_unit_cost:referenceCost,
  p_controls_lot:boolean(data,"controlsLot"),p_controls_expiry:boolean(data,"controlsExpiry"),
  p_controls_individual_asset:boolean(data,"controlsIndividualAsset")
 });
 if(error)failData(path,"create-item",error,"Não foi possível criar o item de estoque.");const result=Array.isArray(item)?item[0]:item;redirect(`/app/estoque/itens/${result?.id??""}`);
}

export async function updateInventoryItem(data:FormData){
 const itemId=text(data,"itemId");const context=await requireCapability("estoque","update");const path=`/app/estoque/itens/${itemId}`;
 const payload:Record<string,unknown>={
  category_id:optional(data,"categoryId"),unit_id:text(data,"unitId"),name:text(data,"name"),description:text(data,"description"),
  specification:text(data,"specification"),sku:optional(data,"sku"),barcode:optional(data,"barcode"),kind:text(data,"kind"),
  minimum_stock:numberOrNull(text(data,"minimumStock"))??0,controls_lot:boolean(data,"controlsLot"),
  controls_expiry:boolean(data,"controlsExpiry"),controls_individual_asset:boolean(data,"controlsIndividualAsset"),
  active:data.get("active")!==null,updated_at:new Date().toISOString()
 };
 if(await hasCapability("estoque","view_sensitive_financials",null,context))payload.reference_unit_cost=numberOrNull(text(data,"referenceUnitCost"));
 const{error}=await context.supabase.from("inventory_items").update(payload).eq("id",itemId).eq("organization_id",context.organizationId);
 if(error)failData(path,"update-item",error,"Não foi possível atualizar o item de estoque.");revalidatePath(path);revalidatePath("/app/estoque");
}

export async function createInventoryWarehouse(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path="/app/estoque/depositos";
 const{data:warehouse,error}=await context.supabase.rpc("create_inventory_warehouse",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_code:text(data,"code"),p_name:text(data,"name"),
  p_kind:text(data,"kind")||"GENERAL",p_address:text(data,"address"),p_responsible_user_id:optional(data,"responsibleUserId"),
  p_default_location_code:text(data,"defaultLocationCode")||"PADRAO",p_default_location_name:text(data,"defaultLocationName")||"Localização padrão"
 });
 if(error)failData(path,"create-warehouse",error,"Não foi possível criar o depósito.");const result=Array.isArray(warehouse)?warehouse[0]:warehouse;redirect(`/app/estoque/depositos/${result?.id??""}`);
}

export async function createInventoryLocation(data:FormData){
 const warehouseId=text(data,"warehouseId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path=`/app/estoque/depositos/${warehouseId}`;
 const{error}=await context.supabase.from("inventory_locations").insert({
  organization_id:context.organizationId,warehouse_id:warehouseId,code:text(data,"code").toUpperCase(),name:text(data,"name"),
  description:text(data,"description"),is_default:false,active:true,created_by:context.userId
 });
 if(error)failData(path,"create-location",error,"Não foi possível criar a localização.");revalidatePath(path);
}

export async function createInventoryMovement(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path="/app/estoque/movimentos/novo";let lines:unknown[];
 try{lines=parseArray(text(data,"linesJson"),"Itens do movimento");}catch(validationError){fail(path,validationError instanceof Error?validationError.message:"Itens inválidos.");}
 const{data:movement,error}=await context.supabase.rpc("create_inventory_movement",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_movement_type:text(data,"movementType"),
  p_occurred_at:optional(data,"occurredAt"),p_reason:text(data,"reason"),p_notes:text(data,"notes"),p_lines:lines,
  p_idempotency_key:optional(data,"idempotencyKey"),p_post:boolean(data,"postNow")
 });
 if(error)failData(path,"create-movement",error,"Não foi possível criar o movimento de estoque.");const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??""}`);
}

export async function postInventoryMovement(data:FormData){
 const id=text(data,"movementId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("post_inventory_movement",{p_movement_id:id});if(error)failData(`/app/estoque/movimentos/${id}`,"post-movement",error,"Não foi possível efetivar o movimento.");
 revalidatePath(`/app/estoque/movimentos/${id}`);revalidatePath("/app/estoque");
}

export async function reverseInventoryMovement(data:FormData){
 const id=text(data,"movementId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","manage",projectId);
 const{data:movement,error}=await context.supabase.rpc("reverse_inventory_movement",{p_movement_id:id,p_reason:text(data,"reason")});
 if(error)failData(`/app/estoque/movimentos/${id}`,"reverse-movement",error,"Não foi possível estornar o movimento.");const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??id}`);
}

export async function mapProcurementItemToInventory(data:FormData){
 const orderItemId=text(data,"orderItemId");const inventoryItemId=text(data,"inventoryItemId");const receiptId=text(data,"receiptId");const context=await requireCapability("estoque","update");
 const{error}=await context.supabase.from("inventory_procurement_item_mappings").upsert({
  organization_id:context.organizationId,order_item_id:orderItemId,inventory_item_id:inventoryItemId,
  conversion_factor:numberOrNull(text(data,"conversionFactor"))??1,created_by:context.userId,updated_at:new Date().toISOString()
 },{onConflict:"order_item_id"});
 if(error)failData(`/app/estoque/movimentos?receiptId=${receiptId}`,"map-procurement-item",error,"Não foi possível vincular o item de compra ao estoque.");revalidatePath("/app/estoque/movimentos");
}

export async function importProcurementReceipt(data:FormData){
 const receiptId=text(data,"receiptId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);let lots:Record<string,string>={};
 const raw=text(data,"lotAssignments");if(raw){try{lots=JSON.parse(raw)as Record<string,string>;}catch{fail("/app/estoque/movimentos","Lotes inválidos.");}}
 const{data:movement,error}=await context.supabase.rpc("import_procurement_receipt_to_inventory",{
  p_receipt_id:receiptId,p_warehouse_id:text(data,"warehouseId"),p_location_id:optional(data,"locationId"),p_lot_assignments:lots
 });
 if(error)failData("/app/estoque/movimentos","import-procurement-receipt",error,"Não foi possível importar o recebimento para o estoque.");const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??""}`);
}

export async function createInventoryReservation(data:FormData){
 const projectId=text(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path="/app/estoque/reservas";let lines:unknown[];
 try{lines=parseArray(text(data,"linesJson"),"Itens da reserva");}catch(validationError){fail(path,validationError instanceof Error?validationError.message:"Itens inválidos.");}
 const{data:reservation,error}=await context.supabase.rpc("create_inventory_reservation",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_warehouse_id:text(data,"warehouseId"),
  p_task_id:optional(data,"taskId"),p_needed_by:optional(data,"neededBy"),p_expires_at:optional(data,"expiresAt"),
  p_reason:text(data,"reason"),p_lines:lines,p_idempotency_key:optional(data,"idempotencyKey")
 });
 if(error)failData(path,"create-reservation",error,"Não foi possível criar a reserva de estoque.");const result=Array.isArray(reservation)?reservation[0]:reservation;redirect(`/app/estoque/reservas/${result?.id??""}`);
}

export async function releaseInventoryReservation(data:FormData){
 const id=text(data,"reservationId");const projectId=text(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("release_inventory_reservation",{p_reservation_id:id,p_reason:text(data,"reason")});
 if(error)failData(`/app/estoque/reservas/${id}`,"release-reservation",error,"Não foi possível liberar a reserva.");revalidatePath(`/app/estoque/reservas/${id}`);revalidatePath("/app/estoque");
}

export async function consumeInventoryReservation(data:FormData){
 const id=text(data,"reservationId");const projectId=text(data,"projectId");const context=await requireCapability("estoque","update",projectId);let lines:unknown[];
 try{lines=parseArray(text(data,"linesJson"),"Quantidades de consumo");}catch(validationError){fail(`/app/estoque/reservas/${id}`,validationError instanceof Error?validationError.message:"Consumo inválido.");}
 const{data:movement,error}=await context.supabase.rpc("consume_inventory_reservation",{
  p_reservation_id:id,p_lines:lines,p_reason:text(data,"reason"),p_idempotency_key:optional(data,"idempotencyKey")
 });
 if(error)failData(`/app/estoque/reservas/${id}`,"consume-reservation",error,"Não foi possível consumir a reserva.");const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??""}`);
}

export async function createInventoryAsset(data:FormData){
 const context=await requireCapability("estoque","create");const path="/app/estoque/ativos";const acquisitionCost=numberOrNull(text(data,"acquisitionCost"));
 if(acquisitionCost!==null&&!await hasCapability("estoque","view_sensitive_financials",null,context))fail(path,"Seu perfil não pode definir custo de aquisição.");
 const{data:asset,error}=await context.supabase.rpc("create_inventory_asset",{
  p_organization_id:context.organizationId,p_item_id:text(data,"itemId"),p_warehouse_id:text(data,"warehouseId"),
  p_location_id:optional(data,"locationId"),p_lot_id:optional(data,"lotId"),p_patrimony_code:optional(data,"patrimonyCode"),
  p_serial_number:optional(data,"serialNumber"),p_acquired_on:optional(data,"acquiredOn"),
  p_acquisition_cost:acquisitionCost,p_condition:text(data,"condition")
 });
 if(error)failData(path,"create-asset",error,"Não foi possível cadastrar o ativo.");const result=Array.isArray(asset)?asset[0]:asset;redirect(`/app/estoque/ativos/${result?.id??""}`);
}

export async function assignInventoryAsset(data:FormData){
 const assetId=text(data,"assetId");const projectId=text(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("assign_inventory_asset",{
  p_asset_id:assetId,p_project_id:projectId,p_team_id:optional(data,"teamId"),p_responsible_user_id:optional(data,"responsibleUserId"),
  p_responsible_name:optional(data,"responsibleName"),p_expected_return_at:optional(data,"expectedReturnAt"),
  p_condition:text(data,"condition"),p_notes:text(data,"notes")
 });
 if(error)failData(`/app/estoque/ativos/${assetId}`,"assign-asset",error,"Não foi possível atribuir o ativo.");revalidatePath(`/app/estoque/ativos/${assetId}`);revalidatePath("/app/estoque");
}

export async function returnInventoryAsset(data:FormData){
 const assetId=text(data,"assetId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("return_inventory_asset",{
  p_custody_id:text(data,"custodyId"),p_warehouse_id:text(data,"warehouseId"),p_location_id:optional(data,"locationId"),
  p_condition:text(data,"condition"),p_notes:text(data,"notes")
 });
 if(error)failData(`/app/estoque/ativos/${assetId}`,"return-asset",error,"Não foi possível registrar a devolução do ativo.");revalidatePath(`/app/estoque/ativos/${assetId}`);revalidatePath("/app/estoque");
}

export async function startInventoryStocktake(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("estoque","manage",projectId);
 const{data:stocktake,error}=await context.supabase.rpc("start_inventory_stocktake",{
  p_organization_id:context.organizationId,p_warehouse_id:text(data,"warehouseId"),p_name:text(data,"name"),p_notes:text(data,"notes")
 });
 if(error)failData("/app/estoque/inventarios/novo","start-stocktake",error,"Não foi possível iniciar o inventário.");const result=Array.isArray(stocktake)?stocktake[0]:stocktake;redirect(`/app/estoque/inventarios/${result?.id??""}`);
}

export async function submitInventoryStocktake(data:FormData){
 const id=text(data,"stocktakeId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);let counts:unknown[];
 try{counts=parseArray(text(data,"countsJson"),"Contagens");}catch(validationError){fail(`/app/estoque/inventarios/${id}`,validationError instanceof Error?validationError.message:"Contagens inválidas.");}
 const{error}=await context.supabase.rpc("submit_inventory_stocktake",{p_stocktake_id:id,p_counts:counts});
 if(error)failData(`/app/estoque/inventarios/${id}`,"submit-stocktake",error,"Não foi possível enviar as contagens do inventário.");revalidatePath(`/app/estoque/inventarios/${id}`);
}

export async function approveInventoryStocktake(data:FormData){
 const id=text(data,"stocktakeId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","approve",projectId);
 const{error}=await context.supabase.rpc("approve_inventory_stocktake",{p_stocktake_id:id,p_comment:text(data,"comment")});
 if(error)failData(`/app/estoque/inventarios/${id}`,"approve-stocktake",error,"Não foi possível aprovar o inventário.");revalidatePath(`/app/estoque/inventarios/${id}`);
}

export async function postInventoryStocktake(data:FormData){
 const id=text(data,"stocktakeId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","manage",projectId);
 const{error}=await context.supabase.rpc("post_inventory_stocktake_adjustment",{p_stocktake_id:id});
 if(error)failData(`/app/estoque/inventarios/${id}`,"post-stocktake",error,"Não foi possível efetivar o ajuste do inventário.");revalidatePath(`/app/estoque/inventarios/${id}`);revalidatePath("/app/estoque");
}
