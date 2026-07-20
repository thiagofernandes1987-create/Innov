"use client";

import{useMemo,useState}from"react";
import{consumeInventoryReservation}from"@/app/actions/inventory";

type Line={id:string;remaining:number;label:string;unit:string};

export function InventoryReservationConsumeForm({reservationId,projectId,lines}:{reservationId:string;projectId:string;lines:Line[]}){
 const[quantities,setQuantities]=useState(()=>Object.fromEntries(lines.map(line=>[line.id,String(line.remaining)])));
 const payload=useMemo(()=>lines.map(line=>({reservationLineId:line.id,quantity:Number(quantities[line.id]??0)})).filter(line=>line.quantity>0),[lines,quantities]);
 return <form action={consumeInventoryReservation} className="card card-pad inventory-form"><input type="hidden" name="reservationId" value={reservationId}/><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="linesJson" value={JSON.stringify(payload)}/><div className="section-heading"><div><span className="eyebrow">CONSUMIR RESERVA</span><h2>Gerar saída de estoque</h2></div></div><div className="inventory-line-list">{lines.map(line=><label className="inventory-line" key={line.id}>{line.label}<span>Restante {line.remaining.toLocaleString("pt-BR",{maximumFractionDigits:4})} {line.unit}</span><input type="number" min="0" max={line.remaining} step="0.0001" value={quantities[line.id]??"0"} onChange={event=>setQuantities(current=>({...current,[line.id]:event.target.value}))}/></label>)}</div><label>Motivo<input name="reason" defaultValue="Consumo de material reservado"/></label><label>Chave de idempotência<input name="idempotencyKey" placeholder="Opcional"/></label><button className="button button-primary">Consumir quantidades</button></form>;
}
