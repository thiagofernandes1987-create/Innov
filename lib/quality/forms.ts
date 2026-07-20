export type QualityFieldType =
  | "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "DATE" | "SELECT" | "RADIO"
  | "CHECKBOX" | "YES_NO" | "RATING" | "CHECKLIST" | "FILE" | "PHOTO";

export type QualityChecklistItem = { key:string; label:string };
export type QualityFormField = {
  key:string;
  type:QualityFieldType;
  label:string;
  required?:boolean;
  placeholder?:string;
  options?:string[];
  items?:QualityChecklistItem[];
  min?:number;
  max?:number;
};
export type QualityFormSchema = {
  engineVersion:number;
  kind:"FVS"|"FVM"|"INTERNAL_FORM"|"CLIENT_FORM"|"SURVEY";
  fields:QualityFormField[];
};

const fieldTypes = new Set<QualityFieldType>([
  "SHORT_TEXT","LONG_TEXT","NUMBER","DATE","SELECT","RADIO","CHECKBOX","YES_NO",
  "RATING","CHECKLIST","FILE","PHOTO"
]);

export function parseQualityFormSchema(value:unknown):QualityFormSchema{
  if(!value||typeof value!=="object")throw new Error("Schema do formulário inválido.");
  const raw=value as Record<string,unknown>;
  if(!Array.isArray(raw.fields)||raw.fields.length===0)throw new Error("O formulário precisa possuir campos.");
  const keys=new Set<string>();
  const fields=raw.fields.map((item,index)=>{
    if(!item||typeof item!=="object")throw new Error(`Campo ${index+1} inválido.`);
    const field=item as Record<string,unknown>;
    const key=String(field.key??"").trim();
    const type=String(field.type??"") as QualityFieldType;
    const label=String(field.label??"").trim();
    if(!/^[a-z][a-z0-9_]*$/.test(key))throw new Error(`Chave inválida no campo ${index+1}.`);
    if(keys.has(key))throw new Error(`A chave ${key} está duplicada.`);keys.add(key);
    if(!fieldTypes.has(type))throw new Error(`Tipo inválido no campo ${key}.`);
    if(!label)throw new Error(`Informe o título do campo ${key}.`);
    const result:QualityFormField={key,type,label,required:Boolean(field.required)};
    if(field.placeholder)result.placeholder=String(field.placeholder);
    if(Array.isArray(field.options))result.options=field.options.map(String).filter(Boolean);
    if(Array.isArray(field.items))result.items=field.items.map((entry,i)=>{
      const data=entry as Record<string,unknown>;
      return{key:String(data.key??`item_${i+1}`),label:String(data.label??`Item ${i+1}`)};
    });
    if(Number.isFinite(Number(field.min)))result.min=Number(field.min);
    if(Number.isFinite(Number(field.max)))result.max=Number(field.max);
    if(type==="CHECKLIST"&&(!result.items||result.items.length===0))throw new Error(`Checklist ${key} sem itens.`);
    return result;
  });
  const kind=String(raw.kind??"INTERNAL_FORM") as QualityFormSchema["kind"];
  if(!["FVS","FVM","INTERNAL_FORM","CLIENT_FORM","SURVEY"].includes(kind))throw new Error("Tipo de formulário inválido.");
  return{engineVersion:Number(raw.engineVersion??1),kind,fields};
}

export type QualityAnswerMap=Record<string,unknown>;
export type QualityEvaluation={valid:boolean;errors:string[];score:number|null;result:string|null};

function isEmpty(value:unknown){return value===null||value===undefined||value===""||(Array.isArray(value)&&value.length===0);}

export function evaluateQualityResponse(schema:QualityFormSchema,answers:QualityAnswerMap):QualityEvaluation{
  const errors:string[]=[];
  let checklistConforming=0,checklistApplicable=0,nonConforming=0;
  const ratings:number[]=[];
  for(const field of schema.fields){
    const value=answers[field.key];
    if(field.required&&isEmpty(value))errors.push(`Preencha: ${field.label}.`);
    if(field.type==="NUMBER"||field.type==="RATING"){
      if(!isEmpty(value)){
        const number=Number(value);
        if(!Number.isFinite(number))errors.push(`${field.label} deve ser numérico.`);
        else{
          if(field.min!==undefined&&number<field.min)errors.push(`${field.label} deve ser no mínimo ${field.min}.`);
          if(field.max!==undefined&&number>field.max)errors.push(`${field.label} deve ser no máximo ${field.max}.`);
          if(field.type==="RATING")ratings.push(number);
        }
      }
    }
    if(field.type==="CHECKLIST"&&value&&typeof value==="object"){
      const checklist=value as Record<string,unknown>;
      for(const item of field.items??[]){
        const status=String(checklist[item.key]??"");
        if(field.required&&!status)errors.push(`Avalie: ${item.label}.`);
        if(status&&status!=="NOT_APPLICABLE"){
          checklistApplicable++;
          if(status==="CONFORMING")checklistConforming++;
          if(status==="NONCONFORMING")nonConforming++;
        }
      }
    }
  }
  let score:number|null=null,result:string|null=null;
  if(checklistApplicable>0){score=Number(((checklistConforming/checklistApplicable)*100).toFixed(2));result=nonConforming>0?"NONCONFORMING":"CONFORMING";}
  else if(ratings.length){score=Number((ratings.reduce((sum,item)=>sum+item,0)/ratings.length).toFixed(2));result="ANSWERED";}
  return{valid:errors.length===0,errors,score,result};
}

export function schemaSummary(schema:QualityFormSchema){
  return{
    fields:schema.fields.length,
    required:schema.fields.filter(item=>item.required).length,
    uploadFields:schema.fields.filter(item=>item.type==="FILE"||item.type==="PHOTO").length,
    checklistItems:schema.fields.reduce((sum,item)=>sum+(item.items?.length??0),0)
  };
}
