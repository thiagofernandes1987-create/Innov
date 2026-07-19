export type SupabaseRelation<T> = T | T[] | null | undefined;

/**
 * Normaliza relações Supabase que podem ser inferidas como objeto ou array.
 * Retorna o primeiro registro quando a relação é uma lista e null quando vazia.
 */
export function singleRelation<T>(value: SupabaseRelation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
