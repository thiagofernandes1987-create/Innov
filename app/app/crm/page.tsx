import { PaginaDeFunil } from "@/components/pipeline/pagina-de-funil";

export const dynamic = "force-dynamic";

// A tela inicial do CRM é o funil, não um índice.
//
// A referência do atlas (crm-001 a crm-020) abre "CRM > Vendas > Meu funil"
// direto no kanban, com a barra de controle por cima: Novo à esquerda, seletor
// de visão, busca com faceta ao centro e as visualizações à direita. O que
// existia aqui — seis cards de navegação, quatro KPIs, quatro cards de
// descrição, duas listas e uma tabela — foi decisão minha e contrariava a
// referência: o vendedor entra no CRM para trabalhar o funil, não para ler o
// que é um lead.
//
// O índice não foi jogado fora, virou `/app/crm/visao-geral`, que é onde ele
// serve: consulta de números, não operação diária.
export default async function CrmPage({
  searchParams
}: {
  searchParams: Promise<{ funil?: string }>;
}) {
  const { funil } = await searchParams;
  return <PaginaDeFunil trilha="cliente" funil={funil} />;
}
