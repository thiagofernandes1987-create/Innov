export type InventoryItemKind="MATERIAL"|"CONSUMABLE"|"TOOL"|"ASSET";
export type InventoryMovementType="PROCUREMENT_RECEIPT"|"MANUAL_IN"|"ISSUE"|"RETURN"|"TRANSFER"|"LOSS"|"ADJUSTMENT"|"REVERSAL";
export type InventoryMovementStatus="DRAFT"|"POSTED"|"REVERSED"|"CANCELED";

export type InventoryDashboardItem={
 id:string;code:string;name:string;kind:InventoryItemKind;unitCode:string;minimumStock:number;
 physicalQuantity:number;reservedQuantity:number;availableQuantity:number;belowMinimum:boolean;
 referenceUnitCost:number|null;stockValue:number|null;lastMovementAt:string|null;
};
export type InventoryDashboardWarehouse={
 id:string;code:string;name:string;kind:string;projectId:string|null;
 physicalQuantity:number;reservedQuantity:number;availableQuantity:number;stockValue:number|null;
};
export type InventoryDashboardMovement={
 id:string;code:string;movement_type:InventoryMovementType;status:InventoryMovementStatus;project_id:string|null;
 occurred_at:string;posted_at:string|null;reason:string;line_count:number;total_cost:number|null;
};
export type InventoryDashboardAsset={
 asset_id:string;item_id:string;item_code:string;item_name:string;patrimony_code:string|null;serial_number:string|null;
 status:string;warehouse_id:string|null;warehouse_name:string|null;project_id:string|null;project_name:string|null;
 team_id:string|null;team_name:string|null;responsible_user_id:string|null;responsible_name:string|null;
 assigned_at:string|null;expected_return_at:string|null;return_overdue:boolean;
};
export type InventoryExpiryAlert={
 warehouse_id:string;location_id:string|null;item_id:string;item_code:string;item_name:string;
 lot_id:string;batch_number:string;expires_on:string;physical_quantity:number;days_to_expiry:number;expiry_health:string;
};
export type InventoryDashboard={
 sensitiveVisible:boolean;
 summary:{warehouses:number;items:number;physicalQuantity:number;reservedQuantity:number;availableQuantity:number;stockValue:number|null;belowMinimum:number;activeReservations:number;openStocktakes:number;expiredLots:number;expiringLots:number};
 items:InventoryDashboardItem[];
 warehouses:InventoryDashboardWarehouse[];
 recentMovements:InventoryDashboardMovement[];
 assets:InventoryDashboardAsset[];
 expiryAlerts:InventoryExpiryAlert[];
};

function object(value:unknown):Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function array(value:unknown){return Array.isArray(value)?value:[];}
function text(value:unknown){return value===null||value===undefined?"":String(value);}
function nullableText(value:unknown){const result=text(value);return result||null;}
function number(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
function nullableNumber(value:unknown){if(value===null||value===undefined||value==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}

export function normalizeInventoryDashboard(value:unknown):InventoryDashboard{
 const root=object(value);const summary=object(root.summary);
 return{
  sensitiveVisible:Boolean(root.sensitiveVisible),
  summary:{
   warehouses:number(summary.warehouses),items:number(summary.items),physicalQuantity:number(summary.physicalQuantity),
   reservedQuantity:number(summary.reservedQuantity),availableQuantity:number(summary.availableQuantity),stockValue:nullableNumber(summary.stockValue),
   belowMinimum:number(summary.belowMinimum),activeReservations:number(summary.activeReservations),openStocktakes:number(summary.openStocktakes),
   expiredLots:number(summary.expiredLots),expiringLots:number(summary.expiringLots)
  },
  items:array(root.items).map(value=>{const row=object(value);return{
   id:text(row.id),code:text(row.code),name:text(row.name),kind:text(row.kind) as InventoryItemKind,unitCode:text(row.unitCode),
   minimumStock:number(row.minimumStock),physicalQuantity:number(row.physicalQuantity),reservedQuantity:number(row.reservedQuantity),
   availableQuantity:number(row.availableQuantity),belowMinimum:Boolean(row.belowMinimum),referenceUnitCost:nullableNumber(row.referenceUnitCost),
   stockValue:nullableNumber(row.stockValue),lastMovementAt:nullableText(row.lastMovementAt)
  };}),
  warehouses:array(root.warehouses).map(value=>{const row=object(value);return{
   id:text(row.id),code:text(row.code),name:text(row.name),kind:text(row.kind),projectId:nullableText(row.projectId),
   physicalQuantity:number(row.physicalQuantity),reservedQuantity:number(row.reservedQuantity),availableQuantity:number(row.availableQuantity),
   stockValue:nullableNumber(row.stockValue)
  };}),
  recentMovements:array(root.recentMovements).map(value=>{const row=object(value);return{
   id:text(row.id),code:text(row.code),movement_type:text(row.movement_type) as InventoryMovementType,
   status:text(row.status) as InventoryMovementStatus,project_id:nullableText(row.project_id),occurred_at:text(row.occurred_at),
   posted_at:nullableText(row.posted_at),reason:text(row.reason),line_count:number(row.line_count),total_cost:nullableNumber(row.total_cost)
  };}),
  assets:array(root.assets).map(value=>{const row=object(value);return{
   asset_id:text(row.asset_id),item_id:text(row.item_id),item_code:text(row.item_code),item_name:text(row.item_name),
   patrimony_code:nullableText(row.patrimony_code),serial_number:nullableText(row.serial_number),status:text(row.status),
   warehouse_id:nullableText(row.warehouse_id),warehouse_name:nullableText(row.warehouse_name),project_id:nullableText(row.project_id),
   project_name:nullableText(row.project_name),team_id:nullableText(row.team_id),team_name:nullableText(row.team_name),
   responsible_user_id:nullableText(row.responsible_user_id),responsible_name:nullableText(row.responsible_name),
   assigned_at:nullableText(row.assigned_at),expected_return_at:nullableText(row.expected_return_at),return_overdue:Boolean(row.return_overdue)
  };}),
  expiryAlerts:array(root.expiryAlerts).map(value=>{const row=object(value);return{
   warehouse_id:text(row.warehouse_id),location_id:nullableText(row.location_id),item_id:text(row.item_id),item_code:text(row.item_code),
   item_name:text(row.item_name),lot_id:text(row.lot_id),batch_number:text(row.batch_number),expires_on:text(row.expires_on),
   physical_quantity:number(row.physical_quantity),days_to_expiry:number(row.days_to_expiry),expiry_health:text(row.expiry_health)
  };})
 };
}

export function formatInventoryQuantity(value:number,unit?:string){return`${value.toLocaleString("pt-BR",{maximumFractionDigits:4})}${unit?` ${unit}`:""}`;}
export function formatInventoryCurrency(value:number|null|undefined){return value===null||value===undefined?"Restrito":value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export function movementLabel(type:InventoryMovementType|string){return({PROCUREMENT_RECEIPT:"Recebimento",MANUAL_IN:"Entrada manual",ISSUE:"Saída",RETURN:"Devolução",TRANSFER:"Transferência",LOSS:"Perda",ADJUSTMENT:"Ajuste",REVERSAL:"Reversão"}as Record<string,string>)[type]??type;}
export function movementRequiresPositive(type:InventoryMovementType){return["PROCUREMENT_RECEIPT","MANUAL_IN","RETURN"].includes(type);}
export function movementRequiresNegative(type:InventoryMovementType){return["ISSUE","LOSS"].includes(type);}
