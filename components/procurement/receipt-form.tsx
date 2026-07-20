"use client";

import {useState} from "react";
import {createProcurementReceipt} from "@/app/actions/procurement";

type OrderItem={id:string;description:string;unit:string;orderedQuantity:number;receivedQuantity:number};
type ReceiptRow={orderItemId:string;receivedQuantity:number;acceptedQuantity:number;rejectedQuantity:number;notes:string};

export function ReceiptForm({orderId,projectId,items}:{orderId:string;projectId:string;items:OrderItem[]}){
  const[rows,setRows]=useState<ReceiptRow[]>(items.map(item=>{const remaining=Math.max(0,Number(item.orderedQuantity)-Number(item.receivedQuantity));return{orderItemId:item.id,receivedQuantity:remaining,acceptedQuantity:remaining,rejectedQuantity:0,notes:""};}));
  function update(id:string,key:keyof ReceiptRow,value:string|number){setRows(current=>current.map(item=>item.orderItemId===id?{...item,[key]:value}:item));}
  return <form action={createProcurementReceipt} className="card card-pad procurement-receipt-form">
    <input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="itemsJson" value={JSON.stringify(rows.filter(row=>row.receivedQuantity>0))}/>
    <div className="section-heading"><div><span className="eyebrow">RECEBIMENTO</span><h2>Registrar entrada e abrir FVM</h2></div></div>
    <div className="procurement-item-list">{items.map((item,index)=>{const row=rows[index];const remaining=Math.max(0,Number(item.orderedQuantity)-Number(item.receivedQuantity));return <article className="procurement-item-card" key={item.id}><div className="procurement-item-number">{index+1}</div><div><strong>{item.description}</strong><small>Saldo: {remaining} {item.unit}</small></div><div className="form-grid form-grid-3"><label>Recebido<input min="0" max={remaining} step="0.0001" type="number" value={row.receivedQuantity} onChange={event=>update(item.id,"receivedQuantity",Number(event.target.value))}/></label><label>Aceito<input min="0" step="0.0001" type="number" value={row.acceptedQuantity} onChange={event=>update(item.id,"acceptedQuantity",Number(event.target.value))}/></label><label>Rejeitado<input min="0" step="0.0001" type="number" value={row.rejectedQuantity} onChange={event=>update(item.id,"rejectedQuantity",Number(event.target.value))}/></label></div><label>Observações<input value={row.notes} onChange={event=>update(item.id,"notes",event.target.value)}/></label></article>})}</div>
    <div className="form-grid form-grid-2"><label>Nota fiscal<input name="invoiceNumber"/></label><label>Observações gerais<input name="notes"/></label></div>
    <p className="form-help">Após o recebimento, uma FVM interna será aberta automaticamente quando o modelo padrão estiver disponível.</p>
    <button className="button button-primary" type="submit">Concluir recebimento</button>
  </form>;
}
