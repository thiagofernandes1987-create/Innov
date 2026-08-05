import "server-only";
import { requireOrganizationContext } from "@/lib/auth";

// Micro-indicador do card de aplicativo, na tela inicial.
//
// Alvo visual entregue pelo responsável em 2 de agosto: cada card carrega um
// resumo operacional com **a forma escolhida conforme o dado** — série para o
// que varia no tempo, etapas para o que percorre um fluxo, faixas para o que se
// reparte, uso para o que enche, barras para distribuição. O que existia antes
// era "Permissão no módulo / Acesso completo" repetido nos 22 cards: rótulo sem
// informação, que ocupa o mesmo espaço e não responde nada.
//
// **Número aqui é contagem real, sob RLS.** O usuário lê a tela inicial como
// verdade operacional; publicar número de demonstração com cara de número real
// é a pior coisa que esta tela pode fazer. Módulo cuja contagem ainda não foi
// escrita fica **sem indicador** — o card encolhe e não mente.

export type FormaIndicador =
  | { tipo: "serie"; pontos: number[]; delta?: string }
  | { tipo: "etapas"; etapas: { rotulo: string; ativo: boolean }[] }
  | { tipo: "faixas"; faixas: { rotulo: string; valor: number; tom: string }[] }
  | { tipo: "uso"; percentual: number; apoio: string }
  | { tipo: "barras"; valores: number[] }
  | { tipo: "pessoas"; total: number };

export type Indicador = {
  rotulo: string;
  valor: string;
  apoio?: string;
  forma?: FormaIndicador;
};

const numero = new Intl.NumberFormat("pt-BR");

type Filtro = readonly [op: "eq" | "neq" | "lt" | "gt", coluna: string, valor: string];

/**
 * Conta linhas sem trazê-las. `head` evita puxar dado que não vai ser lido.
 *
 * Os filtros vêm como lista declarativa em vez de callback: o encadeamento do
 * PostgREST muda o tipo a cada chamada, e tipar o callback fazia o `tsc`
 * estourar com "type instantiation is excessively deep".
 */
async function contar(
  supabase: Awaited<ReturnType<typeof requireOrganizationContext>>["supabase"],
  tabela: string,
  organizationId: string,
  filtros: readonly Filtro[] = []
): Promise<number | null> {
  try {
    const consulta = supabase
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    for (const [op, coluna, valor] of filtros) {
      if (op === "eq") consulta.eq(coluna, valor);
      else if (op === "neq") consulta.neq(coluna, valor);
      else if (op === "lt") consulta.lt(coluna, valor);
      else consulta.gt(coluna, valor);
    }
    const { count, error } = await consulta;
    if (error) return null;
    return count ?? 0;
  } catch {
    // Tabela ausente no ambiente ou negada pela RLS: some o indicador, não
    // quebra a tela inicial. Card sem indicador é aceitável; tela inicial em
    // branco não é.
    return null;
  }
}

/**
 * Indicadores dos cards, todos em paralelo.
 *
 * Falha de um não derruba os outros nem a página: cada contagem devolve `null`
 * e o card correspondente simplesmente não mostra indicador.
 */
export async function carregarIndicadores(): Promise<Record<string, Indicador>> {
  const { supabase, organizationId } = await requireOrganizationContext();
  const org = organizationId;
  const hoje = new Date().toISOString().slice(0, 10);

  const [
    clientes,
    obrasAndamento,
    obrasPlanejamento,
    obrasConcluidas,
    tarefasAtrasadas,
    tarefasHoje,
    tarefasNoPrazo,
    equipes,
    orcamentos,
    propostas,
    contratos,
    documentos,
    naoConformidades,
    chamados,
    marcos
  ] = await Promise.all([
    contar(supabase, "clients", org),
    contar(supabase, "projects", org, [["eq", "status", "IN_PROGRESS"]]),
    contar(supabase, "projects", org, [["eq", "status", "PLANNING"]]),
    contar(supabase, "projects", org, [["eq", "status", "COMPLETED"]]),
    contar(supabase, "project_tasks", org, [
      ["lt", "planned_end", hoje], ["neq", "status", "COMPLETED"], ["neq", "status", "CANCELED"]
    ]),
    contar(supabase, "project_tasks", org, [
      ["eq", "planned_end", hoje], ["neq", "status", "COMPLETED"], ["neq", "status", "CANCELED"]
    ]),
    contar(supabase, "project_tasks", org, [
      ["gt", "planned_end", hoje], ["neq", "status", "COMPLETED"], ["neq", "status", "CANCELED"]
    ]),
    contar(supabase, "project_team_members", org),
    contar(supabase, "budgets", org),
    contar(supabase, "proposals", org),
    contar(supabase, "contracts", org),
    contar(supabase, "project_documents", org),
    contar(supabase, "quality_nonconformities", org),
    contar(supabase, "sac_tickets", org),
    contar(supabase, "project_milestones", org)
  ]);

  const saida: Record<string, Indicador> = {};

  if (clientes !== null) {
    saida.clientes = { rotulo: "Clientes cadastrados", valor: numero.format(clientes) };
  }

  if (obrasAndamento !== null) {
    const etapas = [
      { rotulo: "Planejamento", ativo: (obrasPlanejamento ?? 0) > 0 },
      { rotulo: "Execução", ativo: obrasAndamento > 0 },
      { rotulo: "Finalização", ativo: (obrasConcluidas ?? 0) > 0 }
    ];
    saida.obras = { rotulo: "Em andamento", valor: numero.format(obrasAndamento), forma: { tipo: "etapas", etapas } };
  }

  if (marcos !== null) {
    saida.planejamento = { rotulo: "Marcos planejados", valor: numero.format(marcos) };
  }

  if (tarefasAtrasadas !== null && tarefasHoje !== null && tarefasNoPrazo !== null) {
    const total = tarefasAtrasadas + tarefasHoje + tarefasNoPrazo;
    saida.tarefas = {
      rotulo: "Em aberto",
      valor: numero.format(total),
      forma: {
        tipo: "faixas",
        faixas: [
          { rotulo: "Atrasadas", valor: tarefasAtrasadas, tom: "atraso" },
          { rotulo: "Hoje", valor: tarefasHoje, tom: "hoje" },
          { rotulo: "No prazo", valor: tarefasNoPrazo, tom: "prazo" }
        ]
      }
    };
  }

  if (equipes !== null) {
    saida.equipes = {
      rotulo: "Pessoas alocadas",
      valor: numero.format(equipes),
      forma: { tipo: "pessoas", total: equipes }
    };
  }

  if (orcamentos !== null) saida.orcamentos = { rotulo: "Orçamentos", valor: numero.format(orcamentos) };
  if (propostas !== null) saida.propostas = { rotulo: "Propostas", valor: numero.format(propostas) };
  if (contratos !== null) saida.contratos = { rotulo: "Contratos", valor: numero.format(contratos) };
  if (documentos !== null) saida.documentos = { rotulo: "Documentos", valor: numero.format(documentos) };
  if (naoConformidades !== null) {
    saida.qualidade = { rotulo: "Não conformidades abertas", valor: numero.format(naoConformidades) };
  }
  if (chamados !== null) saida.sac = { rotulo: "Chamados", valor: numero.format(chamados) };

  return saida;
}
