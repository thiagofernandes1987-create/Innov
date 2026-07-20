"use client";

import{useMemo,useState}from"react";
type Row={id:number;dueDate:string;amount:string;notes:string};
const empty=(id:number):Row=>({id,dueDate:"",amount:"",notes:""});

export function InstallmentsBuilder({total}:{total?:number}){
 const[rows,setRows]=useState<Row[]>([empty(1)]);
 const scheduled=useMemo(()=>rows.reduce((sum,row)=>sum+(Number(row.amount)||0),0),[rows]);
 function update(id:number,key:keyof Row,value:string){setRows(current=>current.map(row=>row.id===id?{...row,[key]:value}:row));}
 function add(){setRows(current=>[...current,empty(Math.max(...current.map(row=>row.id))+1)]);}
 function split(){if(!total||total<=0)return;setRows(current=>{const base=Math.floor(total/current.length*100)/100;return current.map((row,index)=>({...row,amount:String(index===current.length-1?Number((total-base*(current.length-1)).toFixed(2)):base)}));});}
 const serialized=rows.map(row=>({dueDate:row.dueDate,amount:Number(row.amount),notes:row.notes}));
 return <section className="card card-pad finance-builder"><input type="hidden" name="installmentsJson" value={JSON.stringify(serialized)}/><div className="section-heading"><div><span className="eyebrow">PARCELAMENTO</span><h2>Cronograma de vencimentos</h2><p>Programado: {scheduled.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div><div className="page-actions">{!!total&&total>0&&<button type="button" className="button button-secondary" onClick={split}>Dividir total</button>}<button type="button" className="button button-secondary" onClick={add}>Adicionar parcela</button></div></div><div className="finance-installment-list">{rows.map((row,index)=><article className="finance-installment-card" key={row.id}><strong>{index+1}ª parcela</strong><div className="form-grid form-grid-2"><label>Vencimento<input required type="date" value={row.dueDate} onChange={event=>update(row.id,"dueDate",event.target.value)}/></label><label>Valor<input required min="0.01" step="0.01" type="number" value={row.amount} onChange={event=>update(row.id,"amount",event.target.value)}/></label></div><label>Observação<input value={row.notes} onChange={event=>update(row.id,"notes",event.target.value)}/></label>{rows.length>1&&<button type="button" className="text-link danger-link" onClick={()=>setRows(current=>current.filter(candidate=>candidate.id!==row.id))}>Remover</button>}</article>)}</div></section>;
}
