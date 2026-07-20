"use client";

import{useMemo,useState}from"react";
import{submitInventoryStocktake}from"@/app/actions/inventory";

type Line={id:string;line_number:number;expected_quantity:number;counted_quantity:number|null;recount_quantity:number|null;count_notes:string;inventory_items:{code:string;name:string}|null;inventory_locations:{name:string}|null;inventory_lots:{batch_number:string}|null};

export function InventoryStocktakeCountForm({stocktakeId,projectId,lines}:{stocktakeId:string;projectId:string|null;lines:Line[]}){
 const[counts,setCounts]=useState(()=>lines.map(line=>({lineId:line.id,countedQuantity:line.counted_quantity==null?String(line.expected_quantity):String(line.counted_quantity),recountQuantity:line.recount_quantity==null?"":String(line.recount_quantity),notes:line.count_notes??""})));
 const payload=useMemo(()=>counts.map(row=>({lineId:row.lineId,countedQuantity:Number(row.countedQuantity),recountQuantity:row.recountQuantity===""?null:Number(row.recountQuantity),notes:row.notes})),[counts]);
 function update(index:number,patch:Partial<(typeof counts)[number]>){setCounts(current=>current.map((row,i)=>i===index?{...row,...patch}:row));}
 return <form action={submitInventoryStocktake} className="card card-pad"><input type="hidden" name="stocktakeId" value={stocktakeId}/><input type="hidden" name="projectId" value={projectId??""}/><input type="hidden" name="countsJson" value={JSON.stringify(payload)}/><div className="section-heading"><div><span className="eyebrow">CONTAGEM FÍSICA</span><h2>Informe as quantidades encontradas</h2></div></div><div className="inventory-count-list">{lines.map((line,index)=><article className="inventory-count-row" key={line.id}><div><strong>{line.inventory_items?.code} · {line.inventory_items?.name}</strong><small>{line.inventory_locations?.name??"Sem localização"}{line.inventory_lots?.batch_number?` · lote ${line.inventory_lots.batch_number}`:""} · esperado {Number(line.expected_quantity).toLocaleString("pt-BR",{maximumFractionDigits:4})}</small></div><label>Contado<input type="number" min="0" step="0.0001" value={counts[index].countedQuantity} onChange={event=>update(index,{countedQuantity:event.target.value})} required/></label><label>Recontagem<input type="number" min="0" step="0.0001" value={counts[index].recountQuantity} onChange={event=>update(index,{recountQuantity:event.target.value})}/></label><label>Observação<input value={counts[index].notes} onChange={event=>update(index,{notes:event.target.value})}/></label></article>)}</div><button className="button button-primary">Enviar para revisão</button></form>;
}
