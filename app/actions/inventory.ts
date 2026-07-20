"use server";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function numberOrNull(value:unknown){if(value===null||value===undefined||String(value).trim()==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}
function boolean(data:FormData,key:string){return data.get(key)!==null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function parseArray(raw:string,label:string){try{const value:unknown=JSON.parse(raw);if(!Array.isArray(value)||value.length===0)throw new Error();return value;}catch{throw new Error(`${label} inválidos.`);}}

export async function createInventoryItem(data:FormData){
 const context=await requireCapability("estoque","create");const path="/app/estoque/itens/novo";
 const code=text(data,"code");const name=text(data,"name");const unitId=text(data,"unitId");
 if(!code||!name||!unitId)fail(path,"Informe código, nome e unidade.");
 const{data:item,error}=await context.supabase.rpc("create_inventory_item",{
  p_organization_id:context.organizationId,p_category_id:optional(data,"categoryId"),p_unit_id:unitId,
  p_code:code,p_name:name,p_kind:text(data,"kind")||"MATERIAL",p_description:text(data,"description"),
  p_specification:text(data,"specification"),p_sku:optional(data,"sku"),p_barcode:optional(data,"barcode"),
  p_minimum_stock:numberOrNull(text(data,"minimumStock"))??0,p_reference_unit_cost:numberOrNull(text(data,"referenceUnitCost")),
  p_controls_lot:boolean(data,"controlsLot"),p_controls_expiry:boolean(data,"controlsExpiry"),
  p_controls_individual_asset:boolean(data,"controlsIndividualAsset")
 });
 if(error)fail(path,error.message);const result=Array.isArray(item)?item[0]:item;redirect(`/app/estoque/itens/${result?.id??""}`);
}

export async function updateInventoryItem(data:FormData){
 const itemId=text(data,"itemId");const context=await requireCapability("estoque","update");const path=`/app/estoque/itens/${itemId}`;
 const{error}=await context.supabase.from("inventory_items").update({
  category_id:optional(data,"categoryId"),unit_id:text(data,"unitId"),name:text(data,"name"),description:text(data,"description"),
  specification:text(data,"specification"),sku:optional(data,"sku"),barcode:optional(data,"barcode"),kind:text(data,"kind"),
  minimum_stock:numberOrNull(text(data,"minimumStock"))??0,reference_unit_cost:numberOrNull(text(data,"referenceUnitCost")),
  controls_lot:boolean(data,"controlsLot"),controls_expiry:boolean(data,"controlsExpiry"),
  controls_individual_asset:boolean(data,"controlsIndividualAsset"),active:data.get("active")!==null,updated_at:new Date().toISOString()
 }).eq("id",itemId).eq("organization_id",context.organizationId);
 if(error)fail(path,error.message);revalidatePath(path);revalidatePath("/app/estoque");
}

export async function createInventoryWarehouse(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path="/app/estoque/depositos";
 const{data:warehouse,error}=await context.supabase.rpc("create_inventory_warehouse",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_code:text(data,"code"),p_name:text(data,"name"),
  p_kind:text(data,"kind")||"GENERAL",p_address:text(data,"address"),p_responsible_user_id:optional(data,"responsibleUserId"),
  p_default_location_code:text(data,"defaultLocationCode")||"PADRAO",p_default_location_name:text(data,"defaultLocationName")||"Localização padrão"
 });
 if(error)fail(path,error.message);const result=Array.isArray(warehouse)?warehouse[0]:warehouse;redirect(`/app/estoque/depositos/${result?.id??""}`);
}

export async function createInventoryLocation(data:FormData){
 const warehouseId=text(data,"warehouseId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path=`/app/estoque/depositos/${warehouseId}`;
 const{error}=await context.supabase.from("inventory_locations").insert({
  organization_id:context.organizationId,warehouse_id:warehouseId,code:text(data,"code").toUpperCase(),name:text(data,"name"),
  description:text(data,"description"),is_default:false,active:true,created_by:context.userId
 });
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function createInventoryMovement(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path="/app/estoque/movimentos/novo";let lines:unknown[];
 try{lines=parseArray(text(data,"linesJson"),"Itens do movimento");}catch(error){fail(path,error instanceof Error?error.message:"Itens inválidos.");}
 const{data:movement,error}=await context.supabase.rpc("create_inventory_movement",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_movement_type:text(data,"movementType"),
  p_occurred_at:optional(data,"occurredAt"),p_reason:text(data,"reason"),p_notes:text(data,"notes"),p_lines:lines,
  p_idempotency_key:optional(data,"idempotencyKey"),p_post:boolean(data,"postNow")
 });
 if(error)fail(path,error.message);const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??""}`);
}

export async function postInventoryMovement(data:FormData){
 const id=text(data,"movementId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("post_inventory_movement",{p_movement_id:id});if(error)fail(`/app/estoque/movimentos/${id}`,error.message);
 revalidatePath(`/app/estoque/movimentos/${id}`);revalidatePath("/app/estoque");
}

export async function reverseInventoryMovement(data:FormData){
 const id=text(data,"movementId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","manage",projectId);
 const{data:movement,error}=await context.supabase.rpc("reverse_inventory_movement",{p_movement_id:id,p_reason:text(data,"reason")});
 if(error)fail(`/app/estoque/movimentos/${id}`,error.message);const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??id}`);
}

export async function mapProcurementItemToInventory(data:FormData){
 const orderItemId=text(data,"orderItemId");const inventoryItemId=text(data,"inventoryItemId");const receiptId=text(data,"receiptId");const context=await requireCapability("estoque","update");
 const{error}=await context.supabase.from("inventory_procurement_item_mappings").upsert({
  organization_id:context.organizationId,order_item_id:orderItemId,inventory_item_id:inventoryItemId,
  conversion_factor:numberOrNull(text(data,"conversionFactor"))??1,created_by:context.userId,updated_at:new Date().toISOString()
 },{onConflict:"order_item_id"});
 if(error)fail(`/app/estoque/movimentos?receiptId=${receiptId}`,error.message);revalidatePath("/app/estoque/movimentos");
}

export async function importProcurementReceipt(data:FormData){
 const receiptId=text(data,"receiptId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);let lots:Record<string,string>={};
 const raw=text(data,"lotAssignments");if(raw){try{lots=JSON.parse(raw)as Record<string,string>;}catch{fail("/app/estoque/movimentos","Lotes inválidos.");}}
 const{data:movement,error}=await context.supabase.rpc("import_procurement_receipt_to_inventory",{
  p_receipt_id:receiptId,p_warehouse_id:text(data,"warehouseId"),p_location_id:optional(data,"locationId"),p_lot_assignments:lots
 });
 if(error)fail("/app/estoque/movimentos",error.message);const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??""}`);
}

export async function createInventoryReservation(data:FormData){
 const projectId=text(data,"projectId");const context=await requireCapability("estoque","create",projectId);const path="/app/estoque/reservas";let lines:unknown[];
 try{lines=parseArray(text(data,"linesJson"),"Itens da reserva");}catch(error){fail(path,error instanceof Error?error.message:"Itens inválidos.");}
 const{data:reservation,error}=await context.supabase.rpc("create_inventory_reservation",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_warehouse_id:text(data,"warehouseId"),
  p_task_id:optional(data,"taskId"),p_needed_by:optional(data,"neededBy"),p_expires_at:optional(data,"expiresAt"),
  p_reason:text(data,"reason"),p_lines:lines,p_idempotency_key:optional(data,"idempotencyKey")
 });
 if(error)fail(path,error.message);const result=Array.isArray(reservation)?reservation[0]:reservation;redirect(`/app/estoque/reservas/${result?.id??""}`);
}

export async function releaseInventoryReservation(data:FormData){
 const id=text(data,"reservationId");const projectId=text(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("release_inventory_reservation",{p_reservation_id:id,p_reason:text(data,"reason")});
 if(error)fail(`/app/estoque/reservas/${id}`,error.message);revalidatePath(`/app/estoque/reservas/${id}`);revalidatePath("/app/estoque");
}

export async function consumeInventoryReservation(data:FormData){
 const id=text(data,"reservationId");const projectId=text(data,"projectId");const context=await requireCapability("estoque","update",projectId);let lines:unknown[];
 try{lines=parseArray(text(data,"linesJson"),"Quantidades de consumo");}catch(error){fail(`/app/estoque/reservas/${id}`,error instanceof Error?error.message:"Consumo inválido.");}
 const{data:movement,error}=await context.supabase.rpc("consume_inventory_reservation",{
  p_reservation_id:id,p_lines:lines,p_reason:text(data,"reason"),p_idempotency_key:optional(data,"idempotencyKey")
 });
 if(error)fail(`/app/estoque/reservas/${id}`,error.message);const result=Array.isArray(movement)?movement[0]:movement;redirect(`/app/estoque/movimentos/${result?.id??""}`);
}

export async function createInventoryAsset(data:FormData){
 const warehouseId=text(data,"warehouseId");const context=await requireCapability("estoque","create");const path="/app/estoque/ativos";
 const{data:asset,error}=await context.supabase.rpc("create_inventory_asset",{
  p_organization_id:context.organizationId,p_item_id:text(data,"itemId"),p_warehouse_id:warehouseId,
  p_location_id:optional(data,"locationId"),p_lot_id:optional(data,"lotId"),p_patrimony_code:optional(data,"patrimonyCode"),
  p_serial_number:optional(data,"serialNumber"),p_acquired_on:optional(data,"acquiredOn"),
  p_acquisition_cost:numberOrNull(text(data,"acquisitionCost")),p_condition:text(data,"condition")
 });
 if(error)fail(path,error.message);const result=Array.isArray(asset)?asset[0]:asset;redirect(`/app/estoque/ativos/${result?.id??""}`);
}

export async function assignInventoryAsset(data:FormData){
 const assetId=text(data,"assetId");const projectId=text(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("assign_inventory_asset",{
  p_asset_id:assetId,p_project_id:projectId,p_team_id:optional(data,"teamId"),p_responsible_user_id:optional(data,"responsibleUserId"),
  p_responsible_name:optional(data,"responsibleName"),p_expected_return_at:optional(data,"expectedReturnAt"),
  p_condition:text(data,"condition"),p_notes:text(data,"notes")
 });
 if(error)fail(`/app/estoque/ativos/${assetId}`,error.message);revalidatePath(`/app/estoque/ativos/${assetId}`);revalidatePath("/app/estoque");
}

export async function returnInventoryAsset(data:FormData){
 const assetId=text(data,"assetId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);
 const{error}=await context.supabase.rpc("return_inventory_asset",{
  p_custody_id:text(data,"custodyId"),p_warehouse_id:text(data,"warehouseId"),p_location_id:optional(data,"locationId"),
  p_condition:text(data,"condition"),p_notes:text(data,"notes")
 });
 if(error)fail(`/app/estoque/ativos/${assetId}`,error.message);revalidatePath(`/app/estoque/ativos/${assetId}`);revalidatePath("/app/estoque");
}

export async function startInventoryStocktake(data:FormData){
 const warehouseId=text(data,"warehouseId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","manage",projectId);
 const{data:stocktake,error}=await context.supabase.rpc("start_inventory_stocktake",{
  p_organization_id:context.organizationId,p_warehouse_id:warehouseId,p_name:text(data,"name"),p_notes:text(data,"notes")
 });
 if(error)fail("/app/estoque/inventarios/novo",error.message);const result=Array.isArray(stocktake)?stocktake[0]:stocktake;redirect(`/app/estoque/inventarios/${result?.id??""}`);
}

export async function submitInventoryStocktake(data:FormData){
 const id=text(data,"stocktakeId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);let counts:unknown[];
 try{counts=parseArray(text(data,"countsJson"),"Contagens");}catch(error){fail(`/app/estoque/inventarios/${id}`,error instanceof Error?error.message:"Contagens inválidas.");}
 const{error}=await context.supabase.rpc("submit_inventory_stocktake",{p_stocktake_id:id,p_counts:counts});
 if(error)fail(`/app/estoque/inventarios/${id}`,error.message);revalidatePath(`/app/estoque/inventarios/${id}`);
}

export async function approveInventoryStocktake(data:FormData){
 const id=text(data,"stocktakeId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","approve",projectId);
 const{error}=await context.supabase.rpc("approve_inventory_stocktake",{p_stocktake_id:id,p_comment:text(data,"comment")});
 if(error)fail(`/app/estoque/inventarios/${id}`,error.message);revalidatePath(`/app/estoque/inventarios/${id}`);
}

export async function postInventoryStocktake(data:FormData){
 const id=text(data,"stocktakeId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","manage",projectId);
 const{error}=await context.supabase.rpc("post_inventory_stocktake_adjustment",{p_stocktake_id:id});
 if(error)fail(`/app/estoque/inventarios/${id}`,error.message);revalidatePath(`/app/estoque/inventarios/${id}`);revalidatePath("/app/estoque");
}
