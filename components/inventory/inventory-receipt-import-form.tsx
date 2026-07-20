"use client";

import{useMemo,useState}from"react";
import{importProcurementReceipt}from"@/app/actions/inventory";

type Warehouse={id:string;name:string;inventory_locations:{id:string;name:string}[]};
type ReceiptItem={id:string;description:string;acceptedQuantity:number;inventoryItemName:string;controlsLot:boolean;lots:{id:string;batchNumber:string}[]};

export function InventoryReceiptImportForm({receiptId,projectId,warehouses,items}:{receiptId:string;projectId:string|null;warehouses:Warehouse[];items:ReceiptItem[]}){
 const[warehouseId,setWarehouseId]=useState("");const[lots,setLots]=useState<Record<string,string>>({});const warehouse=warehouses.find(value=>value.id===warehouseId);
 const lotAssignments=useMemo(()=>Object.fromEntries(Object.entries(lots).filter(([,value])=>value)),[lots]);
 return <form action={importProcurementReceipt} className="inventory-form"><input type="hidden" name="receiptId" value={receiptId}/><input type="hidden" name="projectId" value={projectId??""}/><input type="hidden" name="lotAssignments" value={JSON.stringify(lotAssignments)}/><div className="form-grid form-grid-2"><label>Depósito<select name="warehouseId" value={warehouseId} onChange={event=>setWarehouseId(event.target.value)} required><option value="">Selecione</option>{warehouses.map(value=><option key={value.id} value={value.id}>{value.name}</option>)}</select></label><label>Localização<select name="locationId"><option value="">Sem localização</option>{(warehouse?.inventory_locations??[]).map(value=><option key={value.id} value={value.id}>{value.name}</option>)}</select></label></div>{items.some(item=>item.controlsLot)&&<div className="inventory-line-list">{items.filter(item=>item.controlsLot).map(item=><label className="inventory-line" key={item.id}>Lote para {item.description} · {item.inventoryItemName}<select value={lots[item.id]??""} onChange={event=>setLots(current=>({...current,[item.id]:event.target.value}))} required><option value="">Selecione</option>{item.lots.map(lot=><option key={lot.id} value={lot.id}>{lot.batchNumber}</option>)}</select></label>)}</div>}<button className="button button-primary">Importar quantidades aceitas</button></form>;
}
