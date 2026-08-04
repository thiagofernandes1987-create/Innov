// Leitura do catálogo de objetos para o estúdio.
//
// Fica separado das ações porque é leitura de página — um Server Component
// chama direto, sem passar por `"use server"`.
//
// O rascunho é lido de `draft_spec`; a versão publicada vive congelada em
// `object_definition_versions` e não é tocada aqui. Quem edita edita o
// rascunho, e publicar é que congela a cópia.

import type { ObjectFieldSpec, ObjectSpec } from "./spec";

type Cliente = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export type DefinicaoDeObjeto = {
  id: string;
  chave: string;
  nome: string;
  classe: string;
  moduleKey: string;
  escopo: string;
  status: string;
  versaoAtual: number | null;
  rascunho: ObjectSpec;
};

/**
 * O rascunho lido do banco, sempre com a forma esperada.
 *
 * `draft_spec` é `jsonb`: nada garante a forma na leitura. Objeto criado antes
 * desta coluna existir tem `{}`, e uma tela que confia em `spec.fields.map`
 * quebra na primeira linha antiga. Normalizar aqui é mais barato do que
 * defender em cada lugar que lê.
 */
function rascunhoDe(linha: Record<string, unknown>): ObjectSpec {
  const bruto = (linha.draft_spec ?? {}) as Partial<ObjectSpec>;
  const campos = Array.isArray(bruto.fields) ? (bruto.fields as ObjectFieldSpec[]) : [];
  return {
    key: String(bruto.key ?? linha.key ?? ""),
    name: String(bruto.name ?? linha.name ?? ""),
    class: (bruto.class ?? linha.class ?? "cadastro") as ObjectSpec["class"],
    moduleKey: String(bruto.moduleKey ?? linha.module_key ?? ""),
    scope: (bruto.scope ?? linha.scope ?? "organizacao") as ObjectSpec["scope"],
    traits: Array.isArray(bruto.traits) ? bruto.traits : [],
    fields: campos.filter(campo => campo && typeof campo.key === "string")
  };
}

function definicaoDe(linha: Record<string, unknown>): DefinicaoDeObjeto {
  return {
    id: String(linha.id ?? ""),
    chave: String(linha.key ?? ""),
    nome: String(linha.name ?? ""),
    classe: String(linha.class ?? ""),
    moduleKey: String(linha.module_key ?? ""),
    escopo: String(linha.scope ?? ""),
    status: String(linha.status ?? ""),
    versaoAtual: linha.current_version === null ? null : Number(linha.current_version),
    rascunho: rascunhoDe(linha)
  };
}

const COLUNAS = "id, key, name, class, module_key, scope, status, current_version, draft_spec";

/** Os objetos da empresa, do mais recente para o mais antigo. */
export async function definicoesDaOrganizacao(
  supabase: Cliente,
  organizationId: string
): Promise<DefinicaoDeObjeto[]> {
  const { data, error } = await supabase
    .from("object_definitions")
    .select(COLUNAS)
    .eq("organization_id", organizationId)
    .neq("status", "arquivado")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[estudio:definicoes]", error.message);
    return [];
  }
  return (data ?? []).map(linha => definicaoDe(linha as Record<string, unknown>));
}

/** Uma definição, ou `null` quando não existe ou a RLS não deixa ver. */
export async function definicaoPorId(
  supabase: Cliente,
  organizationId: string,
  id: string
): Promise<DefinicaoDeObjeto | null> {
  const { data, error } = await supabase
    .from("object_definitions")
    .select(COLUNAS)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[estudio:definicao]", error.message);
    return null;
  }
  return data ? definicaoDe(data as Record<string, unknown>) : null;
}
