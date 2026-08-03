// Leitura do catálogo de valores, para as telas que têm campo com sugestão.
//
// Fica separado das ações porque é leitura de página — um Server Component
// chama direto, sem passar por `"use server"`.

import { chaveNormalizada, comPadroes, ordenarSugestoes, type ValorDoCatalogo } from "./catalogo";

type Cliente = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

/**
 * Escopos de sugestão em uso.
 *
 * Vale escrever a lista: escopo digitado à mão em cada tela vira "eap_etapa" num
 * lugar e "etapa_eap" noutro, e os dois catálogos ficam pela metade sem ninguém
 * perceber — o campo continua sugerindo alguma coisa.
 */
export const ESCOPOS = {
  etapaDaEap: "eap.etapa",
  atividadeDaEap: "eap.atividade",
  etapaDoFunil: "funil.etapa",
  marcador: "cartao.marcador",
  disciplina: "documento.disciplina",
  unidade: "medida.unidade",
  motivoDePerda: "negocio.motivo_perda",
  motivoDeParada: "obra.motivo_parada"
} as const;

export type EscopoDeSugestao = (typeof ESCOPOS)[keyof typeof ESCOPOS];

/**
 * O vocabulário da organização naquele escopo, já ordenado e cortado.
 *
 * Busca mais do que o limite de exibição de propósito: o corte final acontece
 * depois de descartar enganos antigos, e cortar antes deixaria a lista menor do
 * que deveria justamente na organização com muito histórico.
 */
export async function sugestoesDoEscopo(
  supabase: Cliente,
  organizationId: string,
  escopo: string,
  opcoes: { filtro?: string; padroes?: readonly string[] } = {}
): Promise<ValorDoCatalogo[]> {
  const { data } = await supabase
    .from("value_catalog")
    .select("label, normalized, uses, last_used_at")
    .eq("organization_id", organizationId)
    .eq("scope", escopo)
    .order("last_used_at", { ascending: false })
    .limit(200);

  const catalogo: ValorDoCatalogo[] = (data ?? []).map(l => ({
    rotulo: String(l.label),
    chave: String(l.normalized),
    usos: Number(l.uses),
    ultimoUso: String(l.last_used_at)
  }));

  return ordenarSugestoes(comPadroes(catalogo, opcoes.padroes ?? []), { filtro: opcoes.filtro ?? "" });
}

/**
 * Registra o uso de um valor.
 *
 * Chamada depois de gravar o registro de verdade, e **nunca antes**: valor que
 * o usuário digitou e depois abandonou não é vocabulário da empresa, e entraria
 * na lista de todo mundo.
 *
 * Falha em silêncio de propósito. O catálogo é conveniência; deixar a criação
 * de uma etapa de EAP falhar porque a sugestão não foi contabilizada seria
 * trocar o essencial pelo acessório.
 */
export async function registrarValorUsado(
  supabase: Cliente,
  organizationId: string,
  escopo: string,
  valor: string
): Promise<void> {
  const rotulo = String(valor ?? "").trim();
  const chave = chaveNormalizada(rotulo);
  if (!chave) return;
  const { error } = await supabase.rpc("registrar_valor_usado", {
    p_organization_id: organizationId,
    p_scope: escopo,
    p_label: rotulo,
    p_normalized: chave
  });
  // Silêncio para quem está usando a tela, registro para quem mantém.
  // Falhar sem deixar rastro foi o que fez o catálogo ficar vazio com a etapa
  // gravada: a tela não tinha do que reclamar, e o log também não.
  if (error) console.error(`[sugestoes:${escopo}]`, error.message ?? error);
}
