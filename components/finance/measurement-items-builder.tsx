"use client";

import{useMemo,useState}from"react";
type Row={id:number;description:string;unit:string;previousQuantity:string;currentQuantity:string;unitPrice:string;notes:string};
const empty=(id:number):Row=>({id,description:"",unit:"m²",previousQuantity:"0",currentQuantity:"",unitPrice:"",notes:""});

export function MeasurementItemsBuilder(){
 const[rows,setRows]=useState<Row[]>([empty(1)]);
 const gross=useMemo(()=>rows.reduce((sum,row)=>sum+(Number(row.currentQuantity)||0)*(Number(row.unitPrice)||0),0),[rows]);
 function update(id:number,key:keyof Row,value:string){setRows(current=>current.map(row=>row.id===id?{...row,[key]:value}:row));}
 function add(){setRows(current=>[...current,empty(Math.max(...current.map(row=>row.id))+1)]);}
 const serialized=rows.map(row=>({description:row.description,unit:row.unit,previousQuantity:Number(row.previousQuantity),currentQuantity:Number(row.currentQuantity),unitPrice:Number(row.unitPrice),notes:row.notes}));
 return <section className="card card-pad finance-builder"><input type="hidden" name="itemsJson" value={JSON.stringify(serialized)}/><div className="section-heading"><div><span className="eyebrow">ITENS MEDIDOS</span><h2>Boletim de medição</h2><p>Valor bruto: {gross.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div><button type="button" className="button button-secondary" onClick={add}>Adicionar item</button></div><div className="finance-installment-list">{rows.map((row,index)=><article className="finance-installment-card" key={row.id}><strong>Item {index+1}</strong><label>Descrição<input required value={row.description} onChange={event=>update(row.id,"description",event.target.value)} placeholder="Ex.: Alvenaria executada no pavimento térreo"/></label><div className="form-grid form-grid-3"><label>Unidade<input required value={row.unit} onChange={event=>update(row.id,"unit",event.target.value)}/></label><label>Quantidade anterior<input min="0" step="0.0001" type="number" value={row.previousQuantity} onChange={event=>update(row.id,"previousQuantity",event.target.value)}/></label><label>Quantidade atual<input required min="0.0001" step="0.0001" type="number" value={row.currentQuantity} onChange={event=>update(row.id,"currentQuantity",event.target.value)}/></label></div><div className="form-grid form-grid-2"><label>Preço unitário<input required min="0" step="0.0001" type="number" value={row.unitPrice} onChange={event=>update(row.id,"unitPrice",event.target.value)}/></label><label>Observação<input value={row.notes} onChange={event=>update(row.id,"notes",event.target.value)}/></label></div>{rows.length>1&&<button type="button" className="text-link danger-link" onClick={()=>setRows(current=>current.filter(candidate=>candidate.id!==row.id))}>Remover</button>}</article>)}</div></section>;
}
