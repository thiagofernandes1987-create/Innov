import "server-only";
import { requireOrganizationContext } from "@/lib/auth";
import { codigoDe, type CodigoData, type Marco, type Natureza } from "./datas";
import {
  montarColunas,
  type CartaoPipeline,
  type ColunaPipeline,
  type DataDoCartao,
  type EtapaPipeline,
  type MarcadorCartao,
  type Trilha
} from "./domain";

// Leitura do pipeline.
//
// Sem `select` com embed aninhado: `pipeline_card_dates` tem duas chaves
// estrangeiras para `pipeline_cards` — a simples e a composta que carrega a
// organização —, e o PostgREST responde a isso com o mesmo erro de embed
// ambíguo que hoje vaza na tela de Documentos (defeito D2). Consultas
// separadas e junção em memória custam três viagens e não têm essa aresta.

export type PipelineCarregado = {
  organizationId: string;
  pipeline: { id: string; key: string; name: string; trilha: Trilha; moduleKey: string; descricao: string | null };
  colunas: ColunaPipeline[];
  orfaos: CartaoPipeline[];
  datasPorEtapa: Map<string, { codigo: CodigoData; natureza: Natureza; marco: Marco; obrigatoria: boolean }[]>;
};

type LinhaEtapa = {
  id: string;
  key: string;
  name: string;
  posicao: number;
  categoria: string;
  recolhida: boolean;
  cor: number;
  prazo_dias: number | null;
};

type LinhaCartao = {
  id: string;
  stage_id: string;
  trilha: string;
  titulo: string;
  descricao: string | null;
  client_id: string | null;
  project_id: string | null;
  ticket_id: string | null;
  responsavel_id: string | null;
  prioridade: number;
  valor: string | number | null;
  cor: number;
  posicao: string | number;
  created_at: string;
};

function numeroOuNulo(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Carrega uma trilha inteira: etapas, cartões, datas e marcadores.
 *
 * A permissão não é conferida aqui de novo: as políticas do banco resolvem o
 * módulo a partir da própria trilha. Repetir a regra na aplicação criaria uma
 * segunda fonte de verdade que envelhece sozinha.
 */
export async function carregarPipeline(
  trilha: Trilha,
  pipelineKey?: string | null
): Promise<PipelineCarregado | null> {
  const context = await requireOrganizationContext();
  const { supabase, organizationId } = context;

  let consulta = supabase
    .from("pipelines")
    .select("id,key,name,trilha,module_key,descricao,padrao")
    .eq("organization_id", organizationId)
    .eq("trilha", trilha)
    .eq("ativo", true);
  if (pipelineKey) consulta = consulta.eq("key", pipelineKey);

  const { data: pipelines, error } = await consulta
    .order("padrao", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);
  const pipeline = pipelines?.[0];
  if (!pipeline) return null;

  const [etapasResultado, cartoesResultado] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id,key,name,posicao,categoria,recolhida,cor,prazo_dias")
      .eq("pipeline_id", pipeline.id)
      .order("posicao", { ascending: true }),
    supabase
      .from("pipeline_cards")
      .select(
        "id,stage_id,trilha,titulo,descricao,client_id,project_id,ticket_id,responsavel_id,prioridade,valor,cor,posicao,created_at"
      )
      .eq("pipeline_id", pipeline.id)
      .is("arquivado_em", null)
      .order("posicao", { ascending: true })
      .limit(500)
  ]);

  if (etapasResultado.error) throw new Error(etapasResultado.error.message);
  if (cartoesResultado.error) throw new Error(cartoesResultado.error.message);

  const etapas: EtapaPipeline[] = (etapasResultado.data ?? []).map((linha: LinhaEtapa) => ({
    id: linha.id,
    key: linha.key,
    name: linha.name,
    posicao: linha.posicao,
    categoria: linha.categoria as EtapaPipeline["categoria"],
    recolhida: linha.recolhida,
    cor: linha.cor,
    prazoDias: linha.prazo_dias
  }));

  const linhasCartao = (cartoesResultado.data ?? []) as LinhaCartao[];
  const idsCartao = linhasCartao.map(linha => linha.id);
  const idsCliente = [...new Set(linhasCartao.map(linha => linha.client_id).filter((id): id is string => Boolean(id)))];

  const [datasResultado, vinculosResultado, codigosResultado, clientesResultado] = await Promise.all([
    idsCartao.length
      ? supabase.from("pipeline_card_dates").select("card_id,natureza,marco,codigo,data").in("card_id", idsCartao)
      : Promise.resolve({ data: [], error: null }),
    idsCartao.length
      ? supabase.from("pipeline_card_tags").select("card_id,tag_id").in("card_id", idsCartao)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("pipeline_stage_date_codes")
      .select("stage_id,natureza,marco,obrigatoria")
      .in("stage_id", etapas.map(etapa => etapa.id)),
    idsCliente.length
      ? supabase.from("clients").select("id,legal_name,trade_name").in("id", idsCliente)
      : Promise.resolve({ data: [], error: null })
  ]);

  const idsTag = [
    ...new Set(((vinculosResultado.data ?? []) as { tag_id: string }[]).map(vinculo => vinculo.tag_id))
  ];
  const marcadoresResultado = idsTag.length
    ? await supabase.from("pipeline_tags").select("id,nome,cor").in("id", idsTag)
    : { data: [], error: null };

  const marcadorPorId = new Map<string, MarcadorCartao>(
    ((marcadoresResultado.data ?? []) as { id: string; nome: string; cor: number }[]).map(linha => [
      linha.id,
      { id: linha.id, nome: linha.nome, cor: linha.cor }
    ])
  );

  const datasPorCartao = new Map<string, DataDoCartao[]>();
  for (const linha of (datasResultado.data ?? []) as {
    card_id: string;
    natureza: Natureza;
    marco: Marco;
    codigo: CodigoData;
    data: string;
  }[]) {
    const lista = datasPorCartao.get(linha.card_id) ?? [];
    lista.push({ natureza: linha.natureza, marco: linha.marco, codigo: linha.codigo, data: linha.data });
    datasPorCartao.set(linha.card_id, lista);
  }

  const marcadoresPorCartao = new Map<string, MarcadorCartao[]>();
  for (const vinculo of (vinculosResultado.data ?? []) as { card_id: string; tag_id: string }[]) {
    const marcador = marcadorPorId.get(vinculo.tag_id);
    if (!marcador) continue;
    const lista = marcadoresPorCartao.get(vinculo.card_id) ?? [];
    lista.push(marcador);
    marcadoresPorCartao.set(vinculo.card_id, lista);
  }

  const nomePorCliente = new Map<string, string>(
    ((clientesResultado.data ?? []) as { id: string; legal_name: string; trade_name: string | null }[]).map(linha => [
      linha.id,
      linha.trade_name?.trim() || linha.legal_name
    ])
  );

  const cartoes: CartaoPipeline[] = linhasCartao.map(linha => ({
    id: linha.id,
    stageId: linha.stage_id,
    trilha: linha.trilha as Trilha,
    titulo: linha.titulo,
    descricao: linha.descricao,
    clientId: linha.client_id,
    projectId: linha.project_id,
    ticketId: linha.ticket_id,
    subtitulo: linha.client_id ? (nomePorCliente.get(linha.client_id) ?? null) : null,
    responsavel: linha.responsavel_id,
    prioridade: linha.prioridade,
    valor: numeroOuNulo(linha.valor),
    cor: linha.cor,
    posicao: numeroOuNulo(linha.posicao) ?? 0,
    datas: datasPorCartao.get(linha.id) ?? [],
    marcadores: marcadoresPorCartao.get(linha.id) ?? [],
    criadoEm: linha.created_at
  }));

  const datasPorEtapa = new Map<string, { codigo: CodigoData; natureza: Natureza; marco: Marco; obrigatoria: boolean }[]>();
  for (const linha of (codigosResultado.data ?? []) as {
    stage_id: string;
    natureza: Natureza;
    marco: Marco;
    obrigatoria: boolean;
  }[]) {
    const lista = datasPorEtapa.get(linha.stage_id) ?? [];
    lista.push({
      codigo: siglaDe(linha.natureza, linha.marco),
      natureza: linha.natureza,
      marco: linha.marco,
      obrigatoria: linha.obrigatoria
    });
    datasPorEtapa.set(linha.stage_id, lista);
  }

  const { colunas, orfaos } = montarColunas(etapas, cartoes);

  return {
    organizationId,
    pipeline: {
      id: pipeline.id,
      key: pipeline.key,
      name: pipeline.name,
      trilha: pipeline.trilha as Trilha,
      moduleKey: pipeline.module_key,
      descricao: pipeline.descricao
    },
    colunas,
    orfaos,
    datasPorEtapa
  };
}

// O banco já grava a sigla em coluna gerada; aqui ela é recomposta apenas para
// `pipeline_stage_date_codes`, que declara a combinação e não a sigla.
function siglaDe(natureza: Natureza, marco: Marco): CodigoData {
  const codigo = codigoDe(natureza, marco);
  if (!codigo) throw new Error(`Combinação de data sem sigla declarada: ${natureza}:${marco}`);
  return codigo;
}

/** Trilhas que a organização já tem instaladas, para o seletor da tela. */
export async function trilhasDisponiveis(): Promise<{ trilha: Trilha; key: string; name: string }[]> {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("pipelines")
    .select("key,name,trilha")
    .eq("organization_id", organizationId)
    .eq("ativo", true)
    .order("trilha", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { key: string; name: string; trilha: string }[]).map(linha => ({
    trilha: linha.trilha as Trilha,
    key: linha.key,
    name: linha.name
  }));
}

// ── Cartão completo ─────────────────────────────────────────────────────────
// O que o padrão de mercado chama de formulário: barra de etapas, botões de
// estatística que levam aos objetos relacionados, abas e conversa lateral.

export type CartaoCompleto = {
  cartao: CartaoPipeline;
  pipeline: { id: string; key: string; name: string; trilha: Trilha; moduleKey: string };
  etapas: EtapaPipeline[];
  datasDaEtapa: { codigo: CodigoData; natureza: Natureza; marco: Marco; obrigatoria: boolean }[];
  cliente: Record<string, unknown> | null;
  projetos: { id: string; code: string; name: string; status: string; planned_end: string | null }[];
  documentos: { id: string; title: string | null; category: string | null; created_at: string }[];
  chamados: { id: string; code: string; title: string; status: string; created_at: string }[];
  observacoes: { id: string; tipo: string; corpo: string; autor_id: string | null; created_at: string }[];
  historico: { id: string; de_stage_id: string | null; para_stage_id: string; movido_em: string }[];
  responsavel: Pessoa | null;
  seguidores: Pessoa[];
  euSigo: boolean;
  euSou: string;
  pessoas: Pessoa[];
};

/** Quem é quem: `profiles` guarda nome e e-mail; `auth.users` só o id. */
export type Pessoa = { id: string; nome: string; email: string | null };

export async function carregarCartao(cardId: string): Promise<CartaoCompleto | null> {
  const { supabase, userId } = await requireOrganizationContext();

  const { data: linha, error } = await supabase
    .from("pipeline_cards")
    .select(
      "id,organization_id,pipeline_id,stage_id,trilha,titulo,descricao,client_id,project_id,ticket_id,responsavel_id,prioridade,valor,cor,posicao,created_at"
    )
    .eq("id", cardId)
    .maybeSingle();
  if (error || !linha) return null;

  const cartaoLinha = linha as LinhaCartao & { pipeline_id: string; organization_id: string };

  const [pipelineResultado, etapasResultado, datasResultado, vinculosResultado, notasResultado, historicoResultado] =
    await Promise.all([
      supabase.from("pipelines").select("id,key,name,trilha,module_key").eq("id", cartaoLinha.pipeline_id).maybeSingle(),
      supabase
        .from("pipeline_stages")
        .select("id,key,name,posicao,categoria,recolhida,cor,prazo_dias")
        .eq("pipeline_id", cartaoLinha.pipeline_id)
        .order("posicao", { ascending: true }),
      supabase.from("pipeline_card_dates").select("card_id,natureza,marco,codigo,data").eq("card_id", cardId),
      supabase.from("pipeline_card_tags").select("tag_id").eq("card_id", cardId),
      supabase
        .from("pipeline_card_notes")
        .select("id,tipo,corpo,autor_id,created_at")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("pipeline_card_stage_history")
        .select("id,de_stage_id,para_stage_id,movido_em")
        .eq("card_id", cardId)
        .order("movido_em", { ascending: false })
        .limit(50)
    ]);

  const pipeline = pipelineResultado.data;
  if (!pipeline) return null;

  const idsTag = ((vinculosResultado.data ?? []) as { tag_id: string }[]).map(item => item.tag_id);
  const marcadoresResultado = idsTag.length
    ? await supabase.from("pipeline_tags").select("id,nome,cor").in("id", idsTag)
    : { data: [] };

  const codigosResultado = await supabase
    .from("pipeline_stage_date_codes")
    .select("natureza,marco,obrigatoria")
    .eq("stage_id", cartaoLinha.stage_id);

  const seguidoresResultado = await supabase
    .from("pipeline_card_followers")
    .select("user_id,adicionado_em")
    .eq("card_id", cardId)
    .order("adicionado_em", { ascending: true });

  // O que o cliente tem, para as abas e para os botões de estatística. Cada
  // consulta é opcional: falta de permissão em um módulo não pode derrubar a
  // tela inteira do outro.
  const clienteId = cartaoLinha.client_id;
  const [clienteResultado, projetosResultado, documentosResultado, chamadosResultado] = await Promise.all([
    clienteId ? supabase.from("clients").select("*").eq("id", clienteId).maybeSingle() : Promise.resolve({ data: null }),
    clienteId
      ? supabase.from("projects").select("id,code,name,status,planned_end").eq("client_id", clienteId).is("archived_at", null).limit(50)
      : Promise.resolve({ data: [] }),
    cartaoLinha.project_id
      ? supabase
          .from("project_documents")
          .select("id,title,category,created_at")
          .eq("project_id", cartaoLinha.project_id)
          .limit(50)
      : Promise.resolve({ data: [] }),
    clienteId
      ? supabase
          .from("sac_tickets")
          .select("id,code,title,status,created_at")
          .eq("client_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] })
  ]);

  // Nome de gente: sem isto o cartão mostraria uuid onde deveria mostrar
  // "quem responde por isto".
  const idsPessoa = [
    ...new Set(
      [
        cartaoLinha.responsavel_id,
        ...((seguidoresResultado.data ?? []) as { user_id: string }[]).map(item => item.user_id),
        ...((notasResultado.data ?? []) as { autor_id: string | null }[]).map(item => item.autor_id)
      ].filter((id): id is string => Boolean(id))
    )
  ];
  const pessoasResultado = idsPessoa.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", idsPessoa)
    : { data: [] };
  const pessoaPorId = new Map<string, Pessoa>(
    ((pessoasResultado.data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(linha => [
      linha.id,
      { id: linha.id, nome: linha.full_name?.trim() || linha.email || "Sem nome", email: linha.email }
    ])
  );
  const pessoa = (id: string | null | undefined): Pessoa | null =>
    id ? (pessoaPorId.get(id) ?? { id, nome: "Usuário removido", email: null }) : null;

  const seguidores = ((seguidoresResultado.data ?? []) as { user_id: string }[])
    .map(item => pessoa(item.user_id))
    .filter((item): item is Pessoa => item !== null);

  // Lista para escolher responsável e inscrever seguidor: quem é da mesma
  // organização, e ninguém além disso.
  const membrosResultado = await supabase
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", cartaoLinha.organization_id)
    .eq("active", true);
  const idsMembro = ((membrosResultado.data ?? []) as { user_id: string }[]).map(item => item.user_id);
  const membrosPerfil = idsMembro.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", idsMembro)
    : { data: [] };
  const pessoas: Pessoa[] = ((membrosPerfil.data ?? []) as { id: string; full_name: string | null; email: string | null }[])
    .map(linha => ({ id: linha.id, nome: linha.full_name?.trim() || linha.email || "Sem nome", email: linha.email }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const cliente = clienteResultado.data as Record<string, unknown> | null;
  const nomeCliente = cliente
    ? String(cliente.trade_name ?? "").trim() || String(cliente.legal_name ?? "").trim() || null
    : null;

  return {
    cartao: {
      id: cartaoLinha.id,
      stageId: cartaoLinha.stage_id,
      trilha: cartaoLinha.trilha as Trilha,
      titulo: cartaoLinha.titulo,
      descricao: cartaoLinha.descricao,
      clientId: cartaoLinha.client_id,
      projectId: cartaoLinha.project_id,
      ticketId: cartaoLinha.ticket_id,
      subtitulo: nomeCliente,
      responsavel: cartaoLinha.responsavel_id,
      prioridade: cartaoLinha.prioridade,
      valor: numeroOuNulo(cartaoLinha.valor),
      cor: cartaoLinha.cor,
      posicao: numeroOuNulo(cartaoLinha.posicao) ?? 0,
      datas: ((datasResultado.data ?? []) as {
        natureza: Natureza;
        marco: Marco;
        codigo: CodigoData;
        data: string;
      }[]).map(item => ({ natureza: item.natureza, marco: item.marco, codigo: item.codigo, data: item.data })),
      marcadores: ((marcadoresResultado.data ?? []) as { id: string; nome: string; cor: number }[]).map(item => ({
        id: item.id,
        nome: item.nome,
        cor: item.cor
      })),
      criadoEm: cartaoLinha.created_at
    },
    pipeline: {
      id: pipeline.id,
      key: pipeline.key,
      name: pipeline.name,
      trilha: pipeline.trilha as Trilha,
      moduleKey: pipeline.module_key
    },
    etapas: ((etapasResultado.data ?? []) as LinhaEtapa[]).map(item => ({
      id: item.id,
      key: item.key,
      name: item.name,
      posicao: item.posicao,
      categoria: item.categoria as EtapaPipeline["categoria"],
      recolhida: item.recolhida,
      cor: item.cor,
      prazoDias: item.prazo_dias
    })),
    datasDaEtapa: ((codigosResultado.data ?? []) as { natureza: Natureza; marco: Marco; obrigatoria: boolean }[]).map(
      item => ({
        codigo: siglaDe(item.natureza, item.marco),
        natureza: item.natureza,
        marco: item.marco,
        obrigatoria: item.obrigatoria
      })
    ),
    cliente,
    projetos: (projetosResultado.data ?? []) as CartaoCompleto["projetos"],
    documentos: (documentosResultado.data ?? []) as CartaoCompleto["documentos"],
    chamados: (chamadosResultado.data ?? []) as CartaoCompleto["chamados"],
    observacoes: (notasResultado.data ?? []) as CartaoCompleto["observacoes"],
    historico: (historicoResultado.data ?? []) as CartaoCompleto["historico"],
    responsavel: pessoa(cartaoLinha.responsavel_id),
    seguidores,
    euSigo: seguidores.some(item => item.id === userId),
    euSou: userId,
    pessoas
  };
}
