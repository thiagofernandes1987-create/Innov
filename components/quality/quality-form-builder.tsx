"use client";

import { useMemo, useState } from "react";
import type { QualityFieldType, QualityFormSchema } from "@/lib/quality/forms";

type Action=(formData:FormData)=>void|Promise<void>;
type BuilderField={id:string;key:string;label:string;type:QualityFieldType;required:boolean;options:string;items:string};
const types:Array<{value:QualityFieldType;label:string}>=[
  {value:"SHORT_TEXT",label:"Texto curto"},{value:"LONG_TEXT",label:"Texto longo"},{value:"NUMBER",label:"Número"},
  {value:"DATE",label:"Data"},{value:"SELECT",label:"Lista"},{value:"RADIO",label:"Escolha única"},
  {value:"CHECKBOX",label:"Confirmação"},{value:"YES_NO",label:"Sim ou não"},{value:"RATING",label:"Nota"},
  {value:"CHECKLIST",label:"Checklist conforme/não conforme"},{value:"PHOTO",label:"Fotografia"},{value:"FILE",label:"Arquivo"}
];
function slug(value:string,index:number){const result=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");return result||`campo_${index+1}`;}
function fresh(index:number):BuilderField{return{id:crypto.randomUUID(),key:`campo_${index+1}`,label:"",type:"SHORT_TEXT",required:false,options:"",items:""};}
function fromSchema(schema?:QualityFormSchema):BuilderField[]{return schema?.fields?.length?schema.fields.map(field=>({id:crypto.randomUUID(),key:field.key,label:field.label,type:field.type,required:Boolean(field.required),options:(field.options??[]).join("\n"),items:(field.items??[]).map(item=>item.label).join("\n")})):[fresh(0)];}

export function QualityFormBuilder({action,mode="create",templateId,initialKind="INTERNAL_FORM",initialSchema}:{action:Action;mode?:"create"|"version";templateId?:string;initialKind?:"FVS"|"FVM"|"INTERNAL_FORM"|"CLIENT_FORM"|"SURVEY";initialSchema?:QualityFormSchema}){
  const[kind,setKind]=useState(initialSchema?.kind??initialKind);const[fields,setFields]=useState<BuilderField[]>(()=>fromSchema(initialSchema));
  function update(id:string,patch:Partial<BuilderField>){setFields(current=>current.map(item=>item.id===id?{...item,...patch}:item));}
  function add(){setFields(current=>[...current,fresh(current.length)]);}
  function remove(id:string){setFields(current=>current.length===1?current:current.filter(item=>item.id!==id));}
  const schema=useMemo(()=>({engineVersion:1,kind,fields:fields.map((field,index)=>{
    const base:Record<string,unknown>={key:slug(field.key||field.label,index),type:field.type,label:field.label||`Campo ${index+1}`,required:field.required};
    if(["SELECT","RADIO"].includes(field.type))base.options=field.options.split("\n").map(item=>item.trim()).filter(Boolean);
    if(field.type==="CHECKLIST")base.items=field.items.split("\n").map((label,itemIndex)=>({key:slug(label,itemIndex),label:label.trim()})).filter(item=>item.label);
    if(field.type==="RATING"){base.min=kind==="SURVEY"?0:1;base.max=kind==="SURVEY"?10:5;}
    return base;
  })}),[fields,kind]);
  return <form action={action} className="quality-builder">
    {templateId&&<input type="hidden" name="templateId" value={templateId}/>}<input type="hidden" name="schemaJson" value={JSON.stringify(schema)}/>
    {mode==="create"&&<section className="card card-pad quality-builder-meta"><h2>Identificação</h2><div className="quality-grid quality-grid-2"><label>Código<input name="code" placeholder="FVS-ALVENARIA" required/></label><label>Tipo<select name="kind" value={kind} onChange={event=>setKind(event.target.value as typeof kind)}><option value="FVS">FVS</option><option value="FVM">FVM</option><option value="INTERNAL_FORM">Formulário interno</option><option value="CLIENT_FORM">Formulário para cliente</option><option value="SURVEY">Pesquisa</option></select></label><label>Título<input name="title" required/></label><label>Escopo<select name="scope"><option value="INTERNAL">Interno</option><option value="CLIENT">Cliente autenticado</option><option value="PUBLIC">Link público</option></select></label></div><label>Descrição<textarea name="description" rows={3}/></label></section>}
    {mode==="version"&&<section className="card card-pad"><label>Resumo da alteração<input name="changeSummary" placeholder="Inclui verificação de acabamento" required/></label></section>}
    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">CONSTRUTOR</span><h2>Campos do formulário</h2></div><button type="button" className="button button-secondary" onClick={add}>Adicionar campo</button></div><div className="quality-builder-list">{fields.map((field,index)=><article className="quality-builder-field" key={field.id}><div className="quality-builder-number">{String(index+1).padStart(2,"0")}</div><div className="quality-builder-content"><div className="quality-grid quality-grid-3"><label>Rótulo<input value={field.label} onChange={event=>update(field.id,{label:event.target.value,key:slug(event.target.value,index)})} placeholder="Nome do campo" required/></label><label>Chave<input value={field.key} onChange={event=>update(field.id,{key:slug(event.target.value,index)})}/></label><label>Tipo<select value={field.type} onChange={event=>update(field.id,{type:event.target.value as QualityFieldType})}>{types.map(type=><option value={type.value} key={type.value}>{type.label}</option>)}</select></label></div><label className="quality-inline-check"><input type="checkbox" checked={field.required} onChange={event=>update(field.id,{required:event.target.checked})}/> Campo obrigatório</label>{["SELECT","RADIO"].includes(field.type)&&<label>Opções, uma por linha<textarea value={field.options} onChange={event=>update(field.id,{options:event.target.value})} rows={4}/></label>}{field.type==="CHECKLIST"&&<label>Itens de verificação, um por linha<textarea value={field.items} onChange={event=>update(field.id,{items:event.target.value})} rows={5} placeholder="Execução conforme projeto&#10;Dimensões conferidas"/></label>}</div><button type="button" className="button button-danger" onClick={()=>remove(field.id)} disabled={fields.length===1}>Remover</button></article>)}</div></section>
    <section className="card card-pad quality-schema-preview"><details><summary>Visualizar contrato JSON</summary><pre>{JSON.stringify(schema,null,2)}</pre></details><button className="button button-primary" type="submit">{mode==="create"?"Criar modelo":"Criar nova versão"}</button></section>
  </form>;
}
