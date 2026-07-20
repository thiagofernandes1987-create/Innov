import"server-only";
import{requireCapability}from"@/lib/authorization";
import{normalizeInventoryDashboard}from"@/lib/inventory/domain";

export async function loadInventoryDashboard(input:{projectId?:string|null;warehouseId?:string|null}={}){
 const projectId=input.projectId||null;const warehouseId=input.warehouseId||null;
 const context=await requireCapability("estoque","read",projectId);
 const{data,error}=await context.supabase.rpc("get_inventory_dashboard",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_warehouse_id:warehouseId
 });
 if(error)throw new Error(error.message);
 return{context,dashboard:normalizeInventoryDashboard(data),projectId,warehouseId};
}
