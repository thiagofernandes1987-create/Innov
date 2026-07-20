"use server";

import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}

export async function addInventoryStocktakeLine(data:FormData){
 const stocktakeId=text(data,"stocktakeId");const projectId=optional(data,"projectId");const context=await requireCapability("estoque","update",projectId);const path=`/app/estoque/inventarios/${stocktakeId}`;
 const{error}=await context.supabase.rpc("add_inventory_stocktake_line",{
  p_stocktake_id:stocktakeId,p_item_id:text(data,"itemId"),p_location_id:optional(data,"locationId"),
  p_lot_id:optional(data,"lotId"),p_notes:text(data,"notes")
 });
 if(error)fail(path,error.message);revalidatePath(path);
}
