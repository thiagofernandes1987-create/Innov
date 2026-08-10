// Leitura do histórico de EAP da organização, para descobrir os modelos.
//
// Fica separado das ações porque é leitura de página — um Server Component
// chama direto, sem passar por `"use server"`.

import { modelosDeEtapa, type ModeloDeEtapa, type OcorrenciaDeEtapa } from "./modelos-de-eap";

type Cliente = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

/**
 * Quantas etapas do histórico entram na conta.
 *
 * Corta pelas mais recentes: o modelo tem que ser o jeito de montar de hoje, e
 * uma construtora com dez anos de obras carregaria milhares de linhas para
 * descrever o que ela mudou três vezes desde então. Quinhentas etapas cobrem
 * folgadamente as obras em andamento e as recém-encerradas.
 */
const LIMITE_DE_ETAPAS = 500;

/**
 * Os modelos de EAP que emergem do que a organização já montou.
 *
 * Passa pela RLS da sessão, como todo o resto: quem não tem acesso a uma obra
 * não contribui nem consome o histórico dela. Falha em silêncio devolvendo
 * lista vazia — modelo é conveniência, e a etapa continua sendo criada à mão.
 */
export async function modelosDeEap(
  supabase: Cliente,
  organizationId: string
): Promise<ModeloDeEtapa[]> {
  const { data: etapas } = await supabase
    .from("work_breakdown_items")
    .select("id, title, created_at")
    .eq("organization_id", organizationId)
    .neq("status", "CANCELED")
    .order("created_at", { ascending: false })
    .limit(LIMITE_DE_ETAPAS);

  const linhas = etapas ?? [];
  if (linhas.length === 0) return [];

  // Ordenado, e não por acaso: a posição da atividade dentro da etapa é o que
  // dá a sequência ao modelo — escavar antes de armar. Sem `order`, o Postgres
  // devolve na ordem que quiser e o modelo sai com a ordem de construir
  // embaralhada.
  const { data: atividades } = await supabase
    .from("project_tasks")
    .select("wbs_id, title, sequence, code")
    .eq("organization_id", organizationId)
    .neq("status", "CANCELED")
    .in("wbs_id", linhas.map(e => String(e.id)))
    .order("sequence")
    .order("code");

  const porEtapa = new Map<string, string[]>();
  for (const atividade of atividades ?? []) {
    const chave = String(atividade.wbs_id ?? "");
    if (!chave) continue;
    porEtapa.set(chave, [...(porEtapa.get(chave) ?? []), String(atividade.title ?? "")]);
  }

  // Da mais nova para a mais antiga, que é o que faz a grafia exibida ser a de
  // hoje — a regra está em `modelosDeEtapa`, e a ordem é responsabilidade daqui.
  const ocorrencias: OcorrenciaDeEtapa[] = linhas.map(e => ({
    titulo: String(e.title ?? ""),
    atividades: porEtapa.get(String(e.id)) ?? []
  }));

  return modelosDeEtapa(ocorrencias);
}
