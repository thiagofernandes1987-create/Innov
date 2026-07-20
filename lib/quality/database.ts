export type QualityTemplateSummary={id?:string;title?:string;description?:string;kind?:string};
export type QualityVersionSummary={id?:string;version_number?:number;template_id?:string;schema_json?:unknown;frozen_at?:string|null;quality_form_templates?:QualityTemplateSummary|QualityTemplateSummary[]|null};

export function singleRelation<T>(value:T|T[]|null|undefined):T|null{
  if(Array.isArray(value))return value[0]??null;
  return value??null;
}

export function relationFrom<T>(row:unknown,key:string):T|null{
  if(!row||typeof row!=="object")return null;
  return singleRelation((row as Record<string,unknown>)[key] as T|T[]|null|undefined);
}

export function isIsoExpired(value:string|null|undefined):boolean{
  return Boolean(value&&new Date(value).getTime()<Date.now());
}
