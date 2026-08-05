// Leitura da biblioteca de modelos, para qualquer aplicativo.
//
// É a metade que faz a correção de 3 de agosto valer na prática: **todo módulo
// lê o mesmo acervo**. Propostas, Obras, CRM e SAC chamam a mesma função e
// recebem o que a Administração liberou para eles — a proposta aparece em
// Projetos porque alguém marcou o check, não porque alguém abriu uma exceção no
// código.

import { SUGESTAO_POR_APLICATIVO, categoriaDoTipo, rotuloDoTipo } from "./tipos";

export type ModeloDaBiblioteca = {
  id: string;
  nome: string;
  tipo: string;
  rotuloDoTipo: string;
  categoria: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  escopo: "PLATAFORMA" | "ORGANIZACAO";
  clienteVe: boolean;
  versao: number;
  atualizadoEm: string;
};

// O mesmo cliente que `requireCapability` devolve — tipar por ele evita
// duplicar a tipagem gerada do banco e é o que o resto do repositório faz.
type Cliente = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

type Filtros = {
  /** Só os tipos liberados para este aplicativo. Omitido, traz todos. */
  aplicativo?: string;
  /** Só o que pode ir para o cliente. */
  somenteDoCliente?: boolean;
  /** Só o que está valendo. Rascunho é trabalho em andamento de alguém. */
  somentePublicados?: boolean;
  tipo?: string;
};

/**
 * Tipos que um aplicativo oferece nesta organização.
 *
 * Sem marcação gravada, cai na sugestão do catálogo — organização nova não
 * começa com todos os aplicativos vazios, o que faria a biblioteca parecer
 * quebrada no primeiro dia. Marcação existente **substitui** a sugestão, e uma
 * marcação vazia é uma decisão válida: significa "este aplicativo não oferece
 * documento nenhum".
 */
export async function tiposDoAplicativo(
  supabase: Cliente,
  organizationId: string,
  aplicativo: string
): Promise<{ tipos: string[]; origem: "marcado" | "sugerido" }> {
  const { data } = await supabase
    .from("document_module_types")
    .select("document_type")
    .eq("organization_id", organizationId)
    .eq("module_key", aplicativo);

  if (data && data.length > 0) {
    return { tipos: data.map(l => String(l.document_type)), origem: "marcado" };
  }
  // Distinguir "nunca configurado" de "configurado como vazio" exige saber se
  // já houve gravação; hoje a marcação é apagada e reescrita inteira, então
  // lista vazia no banco e lista nunca gravada são indistinguíveis. Assumir
  // "nunca configurado" é o lado seguro: o pior caso é oferecer demais, e não
  // esconder do usuário o documento que ele precisa.
  return { tipos: [...(SUGESTAO_POR_APLICATIVO[aplicativo] ?? [])], origem: "sugerido" };
}

/** Modelos disponíveis, já filtrados pelo que o aplicativo oferece. */
export async function modelosDisponiveis(
  supabase: Cliente,
  organizationId: string,
  filtros: Filtros = {}
): Promise<ModeloDaBiblioteca[]> {
  let consulta = supabase
    .from("document_templates")
    .select("id, name, document_type, status, scope, client_visible, version_number, updated_at")
    .is("archived_at", null);

  if (filtros.aplicativo) {
    const { tipos } = await tiposDoAplicativo(supabase, organizationId, filtros.aplicativo);
    if (tipos.length === 0) return [];
    consulta = consulta.in("document_type", tipos);
  }
  if (filtros.tipo) consulta = consulta.eq("document_type", filtros.tipo);
  if (filtros.somenteDoCliente) consulta = consulta.eq("client_visible", true);
  if (filtros.somentePublicados) consulta = consulta.eq("status", "PUBLISHED");

  const { data } = await consulta.order("document_type").order("name");

  return (data ?? []).map(l => ({
    id: String(l.id),
    nome: String(l.name),
    tipo: String(l.document_type),
    rotuloDoTipo: rotuloDoTipo(String(l.document_type)),
    categoria: categoriaDoTipo(String(l.document_type)),
    status: l.status as ModeloDaBiblioteca["status"],
    escopo: l.scope as ModeloDaBiblioteca["escopo"],
    clienteVe: Boolean(l.client_visible),
    versao: Number(l.version_number),
    atualizadoEm: String(l.updated_at)
  }));
}

/** Agrupa por tipo, preservando a ordem do catálogo. */
export function porTipo(modelos: ModeloDaBiblioteca[]): { tipo: string; rotulo: string; itens: ModeloDaBiblioteca[] }[] {
  const mapa = new Map<string, ModeloDaBiblioteca[]>();
  for (const m of modelos) {
    const lista = mapa.get(m.tipo) ?? [];
    lista.push(m);
    mapa.set(m.tipo, lista);
  }
  return [...mapa.entries()].map(([tipo, itens]) => ({ tipo, rotulo: rotuloDoTipo(tipo), itens }));
}
