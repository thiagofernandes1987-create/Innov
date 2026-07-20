"use client";

import {useState} from "react";

type Item={id:string;description:string;specification:string;unit:string;quantity:number;targetUnitPrice:string;notes:string};
const newItem=():Item=>({id:crypto.randomUUID(),description:"",specification:"",unit:"un",quantity:1,targetUnitPrice:"",notes:""});

export function RequestItemsBuilder(){
  const[items,setItems]=useState<Item[]>([newItem()]);
  function update(id:string,key:keyof Item,value:string|number){setItems(current=>current.map(item=>item.id===id?{...item,[key]:value}:item));}
  return <section className="card card-pad procurement-builder">
    <div className="section-heading"><div><span className="eyebrow">ITENS</span><h2>Materiais ou serviços solicitados</h2></div><button className="button button-secondary" type="button" onClick={()=>setItems(current=>[...current,newItem()])}>Adicionar item</button></div>
    <input type="hidden" name="itemsJson" value={JSON.stringify(items.map(({id:_,...item})=>({...item,targetUnitPrice:item.targetUnitPrice===""?null:Number(item.targetUnitPrice)}))}/>
    <div className="procurement-item-list">{items.map((item,index)=><article className="procurement-item-card" key={item.id}>
      <div className="procurement-item-number">{index+1}</div>
      <label>Descrição<input required value={item.description} onChange={event=>update(item.id,"description",event.target.value)} placeholder="Ex.: Cimento CP-II 50 kg"/></label>
      <label>Especificação<input value={item.specification} onChange={event=>update(item.id,"specification",event.target.value)} placeholder="Marca de referência, norma, acabamento..."/></label>
      <div className="form-grid form-grid-3"><label>Unidade<input required value={item.unit} onChange={event=>update(item.id,"unit",event.target.value)}/></label><label>Quantidade<input required min="0.0001" step="0.0001" type="number" value={item.quantity} onChange={event=>update(item.id,"quantity",Number(event.target.value))}/></label><label>Preço-alvo unitário<input min="0" step="0.01" type="number" value={item.targetUnitPrice} onChange={event=>update(item.id,"targetUnitPrice",event.target.value)}/></label></div>
      <label>Observações<input value={item.notes} onChange={event=>update(item.id,"notes",event.target.value)}/></label>
      {items.length>1&&<button className="text-link danger-link" type="button" onClick={()=>setItems(current=>current.filter(candidate=>candidate.id!==item.id))}>Remover item</button>}
    </article>)}</div>
  </section>;
}
