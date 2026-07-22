export type UnknownRecord=Record<string,unknown>;
export type SupabaseRelation<T>=T|T[]|null|undefined;

export function isUnknownRecord(value:unknown):value is UnknownRecord{
 return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

/**
 * Normaliza relações Supabase que podem ser inferidas como objeto, lista ou null.
 */
export function singleRelation<T>(value:SupabaseRelation<T>):T|null{
 return Array.isArray(value)?value[0]??null:value??null;
}

/**
 * Retorna somente registros válidos de uma relação, sem casts locais inseguros.
 */
export function relationRecords(value:unknown):UnknownRecord[]{
 if(Array.isArray(value))return value.filter(isUnknownRecord);
 return isUnknownRecord(value)?[value]:[];
}

/**
 * Retorna um registro único de uma relação objeto | array | null.
 */
export function relationRecord(value:unknown):UnknownRecord|null{
 return singleRelation(relationRecords(value));
}

/**
 * Lê um campo de uma relação sem converter array diretamente para Record.
 */
export function relationField(value:unknown,key:string):unknown{
 return relationRecord(value)?.[key]??null;
}
