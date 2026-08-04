// Leitura das listas cadastradas por escopo.
//
// **Curada, não observada.** É a diferença que separa esta tabela do catálogo
// de valores usados: aqui alguém decidiu quais opções existem, em que ordem
// aparecem e quais saíram de circulação. Lá, a lista nasce do uso.
//
// Motivo de perda é curado por natureza, porque alimenta contagem — "quantos
// perdemos por preço neste trimestre" — e contagem sobre texto que cada pessoa
// escreve do seu jeito não fecha.

import { chaveNormalizada } from "@/lib/sugestoes/catalogo";

type Cliente = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export type ItemDeLista = {
  id: string;
  rotulo: string;
  chave: string;
  posicao: number;
  ativo: boolean;
};

/**
 * A lista do escopo, na ordem que a empresa definiu.
 *
 * `apenasAtivos` é o padrão para quem vai **escolher**; a tela de cadastro pede
 * a lista inteira, porque item desativado precisa continuar visível para poder
 * voltar.
 */
export async function listaDoEscopo(
  supabase: Cliente,
  organizationId: string,
  escopo: string,
  opcoes: { apenasAtivos?: boolean } = {}
): Promise<ItemDeLista[]> {
  let consulta = supabase
    .from("managed_list_values")
    .select("id, label, normalized, position, active")
    .eq("organization_id", organizationId)
    .eq("scope", escopo);

  if (opcoes.apenasAtivos !== false) consulta = consulta.eq("active", true);

  const { data } = await consulta.order("position").order("label");
  return (data ?? []).map(l => ({
    id: String(l.id),
    rotulo: String(l.label),
    chave: String(l.normalized),
    posicao: Number(l.position),
    ativo: Boolean(l.active)
  }));
}

/**
 * O valor escolhido pertence à lista?
 *
 * A conferência é pela chave normalizada, e não pelo id, porque o formulário
 * envia o rótulo — é ele que vai para `lost_reason` e para o histórico. Guardar
 * o id ali amarraria um registro histórico a uma linha que pode ser renomeada
 * depois, e a perda de 2026 passaria a ter o motivo de 2027.
 */
export function pertenceALista(itens: readonly ItemDeLista[], valor: string): boolean {
  const chave = chaveNormalizada(valor);
  return chave !== "" && itens.some(i => i.chave === chave);
}
