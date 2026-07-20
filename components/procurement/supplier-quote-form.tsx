"use client";

import {useMemo,useState} from "react";
import {submitSupplierProcurementQuote} from "@/app/actions/procurement";

type RequestItem={id:string;description:string;specification:string;unit:string;quantity:number};
type QuoteItem={requestItemId:string;quantity:number;unitPrice:number;brand:string;offeredSpecification:string;notes:string};

export function SupplierQuoteForm({token,items,currency="BRL"}:{token:string;items:RequestItem[];currency?:string}){
  const[rows,setRows]=useState<QuoteItem[]>(items.map(item=>({requestItemId:item.id,quantity:Number(item.quantity),unitPrice:0,brand:"",offeredSpecification:item.specification??"",notes:""})));
  const subtotal=useMemo(()=>rows.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0),[rows]);
  function update(id:string,key:keyof QuoteItem,value:string|number){setRows(current=>current.map(item=>item.requestItemId===id?{...item,[key]:value}:item));}
  return <form action={submitSupplierProcurementQuote} className="procurement-public-form">
    <input type="hidden" name="token" value={token}/><input type="hidden" name="itemsJson" value={JSON.stringify(rows)}/>
    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">ITENS DA COTAÇÃO</span><h2>Informe sua proposta</h2></div><strong>{new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(subtotal)}</strong></div>
      <div className="procurement-item-list">{items.map((item,index)=>{const row=rows[index];return <article className="procurement-item-card" key={item.id}><div className="procurement-item-number">{index+1}</div><div><strong>{item.description}</strong><p>{item.specification||"Sem especificação complementar"}</p><small>{item.quantity} {item.unit}</small></div><div className="form-grid form-grid-3"><label>Quantidade<input required min="0.0001" step="0.0001" type="number" value={row.quantity} onChange={event=>update(item.id,"quantity",Number(event.target.value))}/></label><label>Preço unitário<input required min="0" step="0.0001" type="number" value={row.unitPrice} onChange={event=>update(item.id,"unitPrice",Number(event.target.value))}/></label><label>Marca<input value={row.brand} onChange={event=>update(item.id,"brand",event.target.value)}/></label></div><label>Especificação ofertada<input value={row.offeredSpecification} onChange={event=>update(item.id,"offeredSpecification",event.target.value)}/></label><label>Observações<input value={row.notes} onChange={event=>update(item.id,"notes",event.target.value)}/></label></article>})}</div>
    </section>
    <section className="card card-pad"><div className="form-grid form-grid-3"><label>Prazo de entrega em dias<input name="leadTimeDays" min="0" type="number"/></label><label>Validade da proposta<input name="validityDate" type="date"/></label><label>Condição de pagamento<input name="paymentTerms" placeholder="Ex.: 28 dias"/></label><label>Desconto total<input name="discount" min="0" step="0.01" type="number" defaultValue="0"/></label><label>Frete<input name="freight" min="0" step="0.01" type="number" defaultValue="0"/></label><label>Impostos adicionais<input name="taxes" min="0" step="0.01" type="number" defaultValue="0"/></label></div><label>Observações<textarea name="notes" rows={4}/></label><label>Anexar proposta<input name="attachment" type="file" accept=".pdf,.docx,.xlsx,image/png,image/jpeg,image/webp"/></label></section>
    <button className="button button-primary button-large" type="submit">Enviar proposta</button>
  </form>;
}
