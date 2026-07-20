import type { QualityFormSchema } from "@/lib/quality/forms";

type Action=(formData:FormData)=>void|Promise<void>;
type Props={schema:QualityFormSchema;action:Action;hidden?:Record<string,string>;title?:string;description?:string;showRespondent?:boolean;submitLabel?:string};

export function QualityFormRenderer({schema,action,hidden={},title,description,showRespondent=false,submitLabel="Enviar resposta"}:Props){
  return <form action={action} encType="multipart/form-data" className="quality-form card card-pad">
    {Object.entries(hidden).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
    {(title||description)&&<header className="quality-form-header">{title&&<h1>{title}</h1>}{description&&<p className="muted">{description}</p>}<span className="badge">{schema.kind}</span></header>}
    {showRespondent&&<div className="quality-grid quality-grid-2"><label>Nome completo<input name="respondentName" required/></label><label>E-mail<input name="respondentEmail" type="email" required/></label></div>}
    <div className="quality-fields">
      {schema.fields.map(field=><fieldset key={field.key} className={`quality-field quality-field-${field.type.toLowerCase()}`}>
        <legend>{field.label}{field.required&&<span aria-label="obrigatório"> *</span>}</legend>
        {field.type==="SHORT_TEXT"&&<input name={`field__${field.key}`} placeholder={field.placeholder} required={field.required}/>} 
        {field.type==="LONG_TEXT"&&<textarea name={`field__${field.key}`} placeholder={field.placeholder} rows={4} required={field.required}/>} 
        {field.type==="NUMBER"&&<input name={`field__${field.key}`} type="number" step="any" min={field.min} max={field.max} required={field.required}/>} 
        {field.type==="DATE"&&<input name={`field__${field.key}`} type="date" required={field.required}/>} 
        {(field.type==="SELECT"||field.type==="RADIO")&&<div className={field.type==="RADIO"?"quality-options":""}>
          {field.type==="SELECT"?<select name={`field__${field.key}`} required={field.required}><option value="">Selecione</option>{(field.options??[]).map(option=><option key={option}>{option}</option>)}</select>:
          (field.options??[]).map(option=><label className="quality-option" key={option}><input type="radio" name={`field__${field.key}`} value={option} required={field.required}/> {option}</label>)}
        </div>}
        {field.type==="CHECKBOX"&&<label className="quality-option"><input type="checkbox" name={`field__${field.key}`}/> Confirmo</label>}
        {field.type==="YES_NO"&&<div className="quality-options"><label className="quality-option"><input type="radio" name={`field__${field.key}`} value="true" required={field.required}/> Sim</label><label className="quality-option"><input type="radio" name={`field__${field.key}`} value="false" required={field.required}/> Não</label></div>}
        {field.type==="RATING"&&<div className="quality-rating"><input name={`field__${field.key}`} type="range" min={field.min??1} max={field.max??5} defaultValue={field.min??1} required={field.required}/><div><span>{field.min??1}</span><span>{field.max??5}</span></div></div>}
        {field.type==="CHECKLIST"&&<div className="quality-checklist">{(field.items??[]).map(item=><div key={item.key} className="quality-check-row"><span>{item.label}</span><select name={`field__${field.key}__${item.key}`} required={field.required}><option value="">Avaliar</option><option value="CONFORMING">Conforme</option><option value="NONCONFORMING">Não conforme</option><option value="NOT_APPLICABLE">Não se aplica</option></select></div>)}</div>}
        {field.type==="PHOTO"&&<input type="file" name={`file__${field.key}`} accept="image/*" capture="environment" required={field.required}/>} 
        {field.type==="FILE"&&<input type="file" name={`file__${field.key}`} accept="image/*,application/pdf,.docx" required={field.required}/>} 
        {field.placeholder&&!["SHORT_TEXT","LONG_TEXT"].includes(field.type)&&<small className="muted">{field.placeholder}</small>}
      </fieldset>)}
    </div>
    <footer className="quality-form-footer"><small>Campos marcados com * são obrigatórios. Arquivos e respostas são armazenados de forma privada.</small><button className="button button-primary" type="submit">{submitLabel}</button></footer>
  </form>;
}
