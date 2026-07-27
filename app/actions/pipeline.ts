"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationContext } from "@/lib/auth";
import { ehTipoAtividade } from "@/lib/pipeline/atividades";
import { CODIGOS_DATA, type CodigoData } from "@/lib/pipeline/datas";
import { TRILHAS, type Trilha } from "@/lib/pipeline/domain";

// Escrita do pipeline.
//
// Toda ação valida a entrada antes de tocar no banco e devolve mensagem em
// português. Nenhum erro de PostgREST chega ao usuário — é o defeito D2, e
// repeti-lo aqui seria construir a mesma falha em tela nova.

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

function falha(erro: string): ResultadoAcao {
  return { ok: false, erro };
}

function ehUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

function trilhaValida(valor: string): valor is Trilha {
  return (TRILHAS as readonly string[]).includes(valor);
}

// O aplicativo dono de cada trilha. O funil pertence ao aplicativo, não o
// contrário — §13 do padrão de interface.
const MODULO_DA_TRILHA: Record<Trilha, string> = {
  cliente: "clientes",
  projeto: "obras",
  assistencia: "sac"
};

function revalidar(trilha: Trilha) {
  // `layout` alcança a subárvore: sem isso a rota do cartão continuava servindo
  // a versão em cache, e seguir alguém gravava no banco sem mudar a tela.
  revalidatePath(`/app/pipeline/${trilha}`, "layout");
}

/**
 * Move o cartão de etapa.
 *
 * A posição dentro da coluna é fracionária: o cartão fica na média entre os
 * dois vizinhos, e a coluna inteira não precisa ser renumerada a cada arrasto.
 */
export async function moverCartao(
  cardId: string,
  stageId: string,
  posicao?: number
): Promise<ResultadoAcao> {
  if (!ehUuid(cardId) || !ehUuid(stageId)) return falha("Cartão ou etapa inválidos.");

  const { supabase } = await requireOrganizationContext();

  const atualizacao: { stage_id: string; posicao?: number } = { stage_id: stageId };
  if (typeof posicao === "number" && Number.isFinite(posicao)) atualizacao.posicao = posicao;

  const { data, error } = await supabase
    .from("pipeline_cards")
    .update(atualizacao)
    .eq("id", cardId)
    .select("id,trilha")
    .maybeSingle();

  if (error) return falha("Não foi possível mover o cartão.");
  if (!data) return falha("Cartão não encontrado ou sem permissão de edição.");

  revalidar(data.trilha as Trilha);
  return { ok: true };
}

/**
 * Grava uma data do cartão.
 *
 * A combinação natureza × marco precisa ter sigla declarada; sem isso o banco
 * recusaria com erro de CHECK, e erro de CHECK não é mensagem para o usuário.
 * Data vazia apaga a linha: é como se corrige um prazo lançado por engano.
 */
export async function definirDataDoCartao(
  cardId: string,
  codigo: string,
  data: string | null
): Promise<ResultadoAcao> {
  if (!ehUuid(cardId)) return falha("Cartão inválido.");

  const eixos = CODIGOS_DATA[codigo as CodigoData];
  if (!eixos) return falha(`Código de data desconhecido: ${codigo}.`);

  const { supabase } = await requireOrganizationContext();

  const { data: cartao, error: erroCartao } = await supabase
    .from("pipeline_cards")
    .select("id,organization_id,trilha")
    .eq("id", cardId)
    .maybeSingle();
  if (erroCartao || !cartao) return falha("Cartão não encontrado ou sem permissão de edição.");

  const valor = (data ?? "").trim();
  if (!valor) {
    const { error } = await supabase
      .from("pipeline_card_dates")
      .delete()
      .eq("card_id", cardId)
      .eq("natureza", eixos.natureza)
      .eq("marco", eixos.marco);
    if (error) return falha("Não foi possível remover a data.");
    revalidar(cartao.trilha as Trilha);
    return { ok: true };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return falha("Informe a data no formato dia/mês/ano.");
  if (Number.isNaN(new Date(`${valor}T00:00:00Z`).getTime())) return falha("Data inexistente no calendário.");

  const { error } = await supabase.from("pipeline_card_dates").upsert(
    {
      card_id: cardId,
      organization_id: cartao.organization_id,
      natureza: eixos.natureza,
      marco: eixos.marco,
      data: valor
    },
    { onConflict: "card_id,natureza,marco" }
  );
  if (error) return falha("Não foi possível gravar a data.");

  revalidar(cartao.trilha as Trilha);
  return { ok: true };
}

/** Observação no cartão: interna por padrão, ou mensagem enviada ao cliente. */
export async function registrarObservacao(
  cardId: string,
  corpo: string,
  tipo: "nota" | "mensagem" = "nota"
): Promise<ResultadoAcao> {
  if (!ehUuid(cardId)) return falha("Cartão inválido.");

  const texto = corpo.trim();
  if (!texto) return falha("Escreva a observação antes de salvar.");
  if (texto.length > 5000) return falha("A observação passa de 5.000 caracteres.");

  const { supabase, userId } = await requireOrganizationContext();

  const { data: cartao, error: erroCartao } = await supabase
    .from("pipeline_cards")
    .select("id,organization_id,trilha")
    .eq("id", cardId)
    .maybeSingle();
  if (erroCartao || !cartao) return falha("Cartão não encontrado ou sem permissão de edição.");

  const { error } = await supabase.from("pipeline_card_notes").insert({
    card_id: cardId,
    organization_id: cartao.organization_id,
    tipo,
    corpo: texto,
    autor_id: userId
  });
  if (error) return falha("Não foi possível salvar a observação.");

  revalidar(cartao.trilha as Trilha);
  return { ok: true };
}

/** Prioridade do cartão, na escala de estrelas do padrão de mercado. */
export async function definirPrioridade(cardId: string, prioridade: number): Promise<ResultadoAcao> {
  if (!ehUuid(cardId)) return falha("Cartão inválido.");
  if (!Number.isInteger(prioridade) || prioridade < 0 || prioridade > 3) {
    return falha("A prioridade vai de 0 a 3 estrelas.");
  }

  const { supabase } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("pipeline_cards")
    .update({ prioridade })
    .eq("id", cardId)
    .select("trilha")
    .maybeSingle();

  if (error) return falha("Não foi possível alterar a prioridade.");
  if (!data) return falha("Cartão não encontrado ou sem permissão de edição.");

  revalidar(data.trilha as Trilha);
  return { ok: true };
}

/**
 * Instala uma trilha a partir de um preset.
 *
 * A permissão é conferida dentro da RPC, no banco: a mesma regra vale para
 * qualquer caminho que chegue lá, inclusive um que ainda não existe.
 */
export async function instalarTrilha(preset: string, nome?: string): Promise<ResultadoAcao> {
  const { supabase, organizationId } = await requireOrganizationContext();

  const { error } = await supabase.rpc("pipeline_criar_do_preset", {
    p_organization_id: organizationId,
    p_preset: preset,
    p_nome: nome?.trim() || null,
    p_key: null,
    p_padrao: true
  });

  if (error) {
    if (/permissão/i.test(error.message)) return falha("Sem permissão de administração para criar a trilha.");
    if (/desconhecido/i.test(error.message)) return falha("Modelo de trilha desconhecido.");
    if (/duplicate key|unique/i.test(error.message)) return falha("Já existe uma trilha padrão desse tipo.");
    return falha("Não foi possível criar a trilha.");
  }

  for (const trilha of TRILHAS) revalidar(trilha);
  return { ok: true };
}

export async function trilhaEhValida(valor: string): Promise<boolean> {
  return trilhaValida(valor);
}

/**
 * Seguir ou deixar de seguir o cartão.
 *
 * Seguir o que já se pode ler não aumenta acesso nenhum, então qualquer um que
 * enxergue o cartão pode se inscrever. Inscrever outra pessoa exige permissão
 * de edição — e quem sai da lista sempre pode ser você mesmo.
 */
export async function alternarSeguidor(cardId: string, userId?: string): Promise<ResultadoAcao> {
  if (!ehUuid(cardId)) return falha("Cartão inválido.");
  if (userId && !ehUuid(userId)) return falha("Usuário inválido.");

  const { supabase, userId: eu } = await requireOrganizationContext();
  const alvo = userId ?? eu;

  const { data: cartao, error: erroCartao } = await supabase
    .from("pipeline_cards")
    .select("id,organization_id,trilha")
    .eq("id", cardId)
    .maybeSingle();
  if (erroCartao || !cartao) return falha("Cartão não encontrado ou sem permissão de leitura.");

  const { data: existente } = await supabase
    .from("pipeline_card_followers")
    .select("user_id")
    .eq("card_id", cardId)
    .eq("user_id", alvo)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("pipeline_card_followers")
      .delete()
      .eq("card_id", cardId)
      .eq("user_id", alvo);
    if (error) return falha("Não foi possível remover o seguidor.");
  } else {
    const { error } = await supabase.from("pipeline_card_followers").insert({
      card_id: cardId,
      user_id: alvo,
      organization_id: cartao.organization_id,
      adicionado_por: eu
    });
    if (error) return falha("Não foi possível adicionar o seguidor.");
  }

  revalidar(cartao.trilha as Trilha);
  return { ok: true };
}

/** Define quem responde pelo cartão. Passar `null` deixa sem responsável. */
export async function definirResponsavel(cardId: string, userId: string | null): Promise<ResultadoAcao> {
  if (!ehUuid(cardId)) return falha("Cartão inválido.");
  if (userId !== null && !ehUuid(userId)) return falha("Usuário inválido.");

  const { supabase } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("pipeline_cards")
    .update({ responsavel_id: userId })
    .eq("id", cardId)
    .select("trilha")
    .maybeSingle();

  if (error) return falha("Não foi possível alterar o responsável.");
  if (!data) return falha("Cartão não encontrado ou sem permissão de edição.");

  revalidar(data.trilha as Trilha);
  return { ok: true };
}

// ── Configuração da etapa ───────────────────────────────────────────────────
// Quem trabalha o kanban nomeia as colunas dele. Exigir administrador para
// renomear "Medição" transforma um ajuste de dez segundos em um chamado.

function chave(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/** Cria etapa no fim da trilha, como o campo no fim das colunas do kanban. */
export async function criarEtapa(pipelineId: string, nome: string): Promise<ResultadoAcao> {
  if (!ehUuid(pipelineId)) return falha("Trilha inválida.");
  const titulo = nome.trim();
  if (!titulo) return falha("Dê um nome à etapa.");
  if (titulo.length > 60) return falha("O nome da etapa passa de 60 caracteres.");

  const { supabase } = await requireOrganizationContext();

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id,organization_id,trilha")
    .eq("id", pipelineId)
    .maybeSingle();
  if (!pipeline) return falha("Trilha não encontrada.");

  // Nasce no fim, antes de nenhuma: a última posição mais um.
  const { data: ultima } = await supabase
    .from("pipeline_stages")
    .select("posicao")
    .eq("pipeline_id", pipelineId)
    .order("posicao", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("pipeline_stages").insert({
    pipeline_id: pipelineId,
    organization_id: pipeline.organization_id,
    key: chave(titulo) || `etapa_${Date.now()}`,
    name: titulo,
    posicao: (ultima?.posicao ?? 0) + 1
  });

  if (error) {
    if (/duplicate key|unique/i.test(error.message)) return falha("Já existe uma etapa com esse nome.");
    return falha("Não foi possível criar a etapa. Talvez você não tenha permissão de edição nesta trilha.");
  }

  revalidar(pipeline.trilha as Trilha);
  return { ok: true };
}

/** Renomeia a etapa sem tocar na chave: a chave é o que os presets referenciam. */
export async function renomearEtapa(stageId: string, nome: string): Promise<ResultadoAcao> {
  if (!ehUuid(stageId)) return falha("Etapa inválida.");
  const titulo = nome.trim();
  if (!titulo) return falha("Dê um nome à etapa.");
  if (titulo.length > 60) return falha("O nome da etapa passa de 60 caracteres.");

  const { supabase } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("pipeline_stages")
    .update({ name: titulo, updated_at: new Date().toISOString() })
    .eq("id", stageId)
    .select("pipeline_id")
    .maybeSingle();

  if (error) return falha("Não foi possível renomear a etapa.");
  if (!data) return falha("Etapa não encontrada ou sem permissão de edição.");

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("trilha")
    .eq("id", data.pipeline_id)
    .maybeSingle();
  if (pipeline) revalidar(pipeline.trilha as Trilha);
  return { ok: true };
}

/** Recolhe ou expande a coluna — o `fold` do padrão de mercado. */
export async function alternarEtapaRecolhida(stageId: string): Promise<ResultadoAcao> {
  if (!ehUuid(stageId)) return falha("Etapa inválida.");

  const { supabase } = await requireOrganizationContext();
  const { data: etapa } = await supabase
    .from("pipeline_stages")
    .select("id,recolhida,pipeline_id")
    .eq("id", stageId)
    .maybeSingle();
  if (!etapa) return falha("Etapa não encontrada.");

  const { error } = await supabase
    .from("pipeline_stages")
    .update({ recolhida: !etapa.recolhida })
    .eq("id", stageId);
  if (error) return falha("Não foi possível recolher a etapa.");

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("trilha")
    .eq("id", etapa.pipeline_id)
    .maybeSingle();
  if (pipeline) revalidar(pipeline.trilha as Trilha);
  return { ok: true };
}

/**
 * Exclui a etapa.
 *
 * A chave estrangeira do cartão é `on delete restrict`, então o banco já
 * recusa apagar etapa com cartão dentro. O que falta é a frase: erro de chave
 * estrangeira não é mensagem que se mostra a ninguém.
 */
export async function excluirEtapa(stageId: string): Promise<ResultadoAcao> {
  if (!ehUuid(stageId)) return falha("Etapa inválida.");

  const { supabase } = await requireOrganizationContext();
  const { data: etapa } = await supabase
    .from("pipeline_stages")
    .select("id,pipeline_id,name")
    .eq("id", stageId)
    .maybeSingle();
  if (!etapa) return falha("Etapa não encontrada.");

  const { count } = await supabase
    .from("pipeline_cards")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", stageId)
    .is("arquivado_em", null);

  if ((count ?? 0) > 0) {
    return falha(
      `“${etapa.name}” tem ${count} ${count === 1 ? "cartão" : "cartões"}. Mova ou arquive antes de excluir a etapa.`
    );
  }

  const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);
  if (error) {
    if (/foreign key|violates/i.test(error.message)) {
      return falha("Esta etapa ainda tem registros ligados a ela. Mova-os antes de excluir.");
    }
    return falha("Não foi possível excluir a etapa.");
  }

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("trilha")
    .eq("id", etapa.pipeline_id)
    .maybeSingle();
  if (pipeline) revalidar(pipeline.trilha as Trilha);
  return { ok: true };
}

/**
 * Cria cartão direto na coluna, como o `+` do cabeçalho.
 *
 * Cada trilha exige o seu registro — o CHECK do banco recusa cartão de
 * assistência sem chamado. Por isso o formulário rápido pede o registro, não
 * só o título: aceitar só o título faria o botão falhar sempre.
 */
export async function criarCartao(
  pipelineId: string,
  stageId: string,
  titulo: string,
  registroId: string
): Promise<ResultadoAcao> {
  if (!ehUuid(pipelineId) || !ehUuid(stageId)) return falha("Trilha ou etapa inválidas.");
  if (!ehUuid(registroId)) return falha("Escolha o registro que este cartão acompanha.");

  const nome = titulo.trim();
  if (!nome) return falha("Dê um título ao cartão.");
  if (nome.length > 160) return falha("O título passa de 160 caracteres.");

  const { supabase, userId } = await requireOrganizationContext();

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id,organization_id,trilha")
    .eq("id", pipelineId)
    .maybeSingle();
  if (!pipeline) return falha("Trilha não encontrada.");

  const trilha = pipeline.trilha as Trilha;
  const vinculo: Record<string, string> = {};
  if (trilha === "cliente") vinculo.client_id = registroId;
  if (trilha === "projeto") vinculo.project_id = registroId;
  if (trilha === "assistencia") vinculo.ticket_id = registroId;

  // O cartão de assistência também guarda o cliente, para o cartão resumido
  // mostrar de quem é sem uma segunda consulta por linha.
  if (trilha === "assistencia") {
    const { data: chamado } = await supabase
      .from("sac_tickets")
      .select("client_id")
      .eq("id", registroId)
      .maybeSingle();
    if (chamado?.client_id) vinculo.client_id = chamado.client_id;
  }
  if (trilha === "projeto") {
    const { data: projeto } = await supabase
      .from("projects")
      .select("client_id")
      .eq("id", registroId)
      .maybeSingle();
    if (projeto?.client_id) vinculo.client_id = projeto.client_id;
  }

  const { data: ultimo } = await supabase
    .from("pipeline_cards")
    .select("posicao")
    .eq("stage_id", stageId)
    .order("posicao", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("pipeline_cards").insert({
    organization_id: pipeline.organization_id,
    pipeline_id: pipelineId,
    stage_id: stageId,
    trilha,
    titulo: nome,
    posicao: Number(ultimo?.posicao ?? 0) + 1,
    created_by: userId,
    responsavel_id: userId,
    ...vinculo
  });

  if (error) {
    if (/pipeline_cards_origem_coerente/i.test(error.message)) {
      return falha("O registro escolhido não serve para esta trilha.");
    }
    return falha("Não foi possível criar o cartão.");
  }

  revalidar(trilha);
  return { ok: true };
}

// ── Conversa ────────────────────────────────────────────────────────────────

/**
 * Registra a mensagem de WhatsApp e devolve o endereço para abrir a conversa.
 *
 * Não existe integração de envio aqui, e fingir que existe seria pior que não
 * ter: a plataforma **registra** o que foi dito e abre o WhatsApp com o texto
 * pronto. Quem envia é a pessoa, e o registro fica no cartão de qualquer jeito.
 */
export async function registrarWhatsApp(
  cardId: string,
  corpo: string,
  telefone: string
): Promise<ResultadoAcao & { link?: string }> {
  if (!ehUuid(cardId)) return falha("Cartão inválido.");

  const texto = corpo.trim();
  if (!texto) return falha("Escreva a mensagem antes de enviar.");

  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return falha("O cliente não tem telefone válido cadastrado.");

  const { supabase, userId } = await requireOrganizationContext();
  const { data: cartao } = await supabase
    .from("pipeline_cards")
    .select("id,organization_id,trilha")
    .eq("id", cardId)
    .maybeSingle();
  if (!cartao) return falha("Cartão não encontrado ou sem permissão de edição.");

  const { error } = await supabase.from("pipeline_card_notes").insert({
    card_id: cardId,
    organization_id: cartao.organization_id,
    tipo: "whatsapp",
    corpo: texto,
    destino: digitos,
    autor_id: userId
  });
  if (error) return falha("Não foi possível registrar a mensagem.");

  revalidar(cartao.trilha as Trilha);
  const comPais = digitos.length <= 11 ? `55${digitos}` : digitos;
  return { ok: true, link: `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}` };
}

/** Agenda o que ainda precisa acontecer. Observação registra o passado. */
export async function agendarAtividade(
  cardId: string,
  tipo: string,
  titulo: string,
  prazo: string | null,
  responsavelId?: string | null
): Promise<ResultadoAcao> {
  if (!ehUuid(cardId)) return falha("Cartão inválido.");
  if (!ehTipoAtividade(tipo)) return falha("Tipo de atividade desconhecido.");

  const nome = titulo.trim();
  if (!nome) return falha("Diga o que precisa ser feito.");
  if (nome.length > 160) return falha("O título passa de 160 caracteres.");
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return falha("Informe o prazo no formato dia/mês/ano.");
  if (responsavelId && !ehUuid(responsavelId)) return falha("Responsável inválido.");

  const { supabase, userId } = await requireOrganizationContext();
  const { data: cartao } = await supabase
    .from("pipeline_cards")
    .select("id,organization_id,trilha")
    .eq("id", cardId)
    .maybeSingle();
  if (!cartao) return falha("Cartão não encontrado ou sem permissão de edição.");

  const { error } = await supabase.from("pipeline_card_activities").insert({
    card_id: cardId,
    organization_id: cartao.organization_id,
    tipo,
    titulo: nome,
    prazo: prazo || null,
    responsavel_id: responsavelId || userId,
    criado_por: userId
  });
  if (error) return falha("Não foi possível agendar a atividade.");

  revalidar(cartao.trilha as Trilha);
  return { ok: true };
}

/** Conclui ou reabre a atividade. Reabrir existe porque errar é comum. */
export async function alternarAtividade(atividadeId: string): Promise<ResultadoAcao> {
  if (!ehUuid(atividadeId)) return falha("Atividade inválida.");

  const { supabase, userId } = await requireOrganizationContext();
  const { data: atividade } = await supabase
    .from("pipeline_card_activities")
    .select("id,card_id,concluida_em")
    .eq("id", atividadeId)
    .maybeSingle();
  if (!atividade) return falha("Atividade não encontrada.");

  const concluir = atividade.concluida_em === null;
  const { error } = await supabase
    .from("pipeline_card_activities")
    .update({
      concluida_em: concluir ? new Date().toISOString() : null,
      concluida_por: concluir ? userId : null
    })
    .eq("id", atividadeId);
  if (error) return falha("Não foi possível atualizar a atividade.");

  const { data: cartao } = await supabase
    .from("pipeline_cards")
    .select("trilha")
    .eq("id", atividade.card_id)
    .maybeSingle();
  if (cartao) revalidar(cartao.trilha as Trilha);
  return { ok: true };
}

// ── Funis: criar, renomear, arquivar e excluir ──────────────────────────────
//
// A pesquisa de campo da §13 do padrão de interface concluiu que "criar um
// pipeline" é criar um **escopo** dentro do aplicativo dono — no Odoo é o Sales
// Team no CRM e o próprio projeto em Project. Aqui o escopo é a linha em
// `pipelines`, e o aplicativo dono sai da trilha.
//
// O esquema já aceitava vários por trilha: `pipelines_padrao_unico_idx` é
// índice parcial e limita só quantos são padrão. Nada disto exigiu migration.

/** Cria funil vazio ou a partir de um modelo pronto. */
export async function criarFunil(
  trilha: string,
  nome: string,
  preset?: string | null
): Promise<ResultadoAcao> {
  if (!trilhaValida(trilha)) return falha("Trilha inválida.");

  const titulo = nome.trim();
  if (!titulo) return falha("Dê um nome ao funil.");
  if (titulo.length > 80) return falha("O nome do funil passa de 80 caracteres.");

  const { supabase, organizationId } = await requireOrganizationContext();

  // Com preset, quem cria é a RPC — ela semeia etapas e códigos de data numa
  // transação só. Preset é atalho, não obrigação: quem cria "SDR" não deve
  // receber "medição" e "fabricação" dentro.
  if (preset) {
    const { error } = await supabase.rpc("pipeline_criar_do_preset", {
      p_organization_id: organizationId,
      p_preset: preset,
      p_nome: titulo,
      p_key: chave(titulo) || `funil_${Date.now()}`,
      p_padrao: false
    });
    if (error) {
      if (/permissão/i.test(error.message)) return falha("Sem permissão para criar funil nesta trilha.");
      if (/desconhecido/i.test(error.message)) return falha("Modelo de funil desconhecido.");
      if (/duplicate key|unique/i.test(error.message)) return falha("Já existe um funil com esse nome.");
      return falha("Não foi possível criar o funil.");
    }
    revalidar(trilha);
    return { ok: true };
  }

  // Sem preset o funil nasce vazio, e a primeira etapa é criada na própria
  // coluna — o mesmo caminho de quem ajusta um funil existente.
  const { error } = await supabase.from("pipelines").insert({
    organization_id: organizationId,
    key: chave(titulo) || `funil_${Date.now()}`,
    name: titulo,
    trilha,
    module_key: MODULO_DA_TRILHA[trilha],
    padrao: false,
    ativo: true
  });

  if (error) {
    if (/duplicate key|unique/i.test(error.message)) return falha("Já existe um funil com esse nome.");
    if (/row-level security|policy/i.test(error.message)) return falha("Sem permissão para criar funil nesta trilha.");
    return falha("Não foi possível criar o funil.");
  }

  revalidar(trilha);
  return { ok: true };
}

export async function renomearFunil(pipelineId: string, nome: string): Promise<ResultadoAcao> {
  if (!ehUuid(pipelineId)) return falha("Funil inválido.");
  const titulo = nome.trim();
  if (!titulo) return falha("Dê um nome ao funil.");
  if (titulo.length > 80) return falha("O nome do funil passa de 80 caracteres.");

  const { supabase } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("pipelines")
    .update({ name: titulo, updated_at: new Date().toISOString() })
    .eq("id", pipelineId)
    .select("trilha")
    .maybeSingle();

  if (error) return falha("Não foi possível renomear o funil.");
  if (!data) return falha("Funil não encontrado ou sem permissão de edição.");

  revalidar(data.trilha as Trilha);
  return { ok: true };
}

/**
 * Arquivar é o caminho normal; excluir é para o que nasceu errado.
 *
 * Funil arquivado some do seletor e mantém o histórico — o que importa quando
 * um funil de venda de 2025 já tem contrato fechado pendurado nele.
 */
export async function arquivarFunil(pipelineId: string, arquivar: boolean): Promise<ResultadoAcao> {
  if (!ehUuid(pipelineId)) return falha("Funil inválido.");

  const { supabase } = await requireOrganizationContext();
  const { data: funil } = await supabase
    .from("pipelines")
    .select("id,trilha,padrao,name")
    .eq("id", pipelineId)
    .maybeSingle();
  if (!funil) return falha("Funil não encontrado.");

  // O padrão é o que a trilha abre quando ninguém escolhe. Arquivá-lo deixaria
  // a tela sem funil nenhum para mostrar.
  if (arquivar && funil.padrao) {
    return falha(`"${funil.name}" é o funil padrão da trilha. Defina outro como padrão antes de arquivar este.`);
  }

  const { error } = await supabase.from("pipelines").update({ ativo: !arquivar }).eq("id", pipelineId);
  if (error) return falha(arquivar ? "Não foi possível arquivar o funil." : "Não foi possível reativar o funil.");

  revalidar(funil.trilha as Trilha);
  return { ok: true };
}

/** Qual funil a trilha abre quando ninguém escolhe. */
export async function definirFunilPadrao(pipelineId: string): Promise<ResultadoAcao> {
  if (!ehUuid(pipelineId)) return falha("Funil inválido.");

  const { supabase, organizationId } = await requireOrganizationContext();
  const { data: funil } = await supabase
    .from("pipelines")
    .select("id,trilha")
    .eq("id", pipelineId)
    .maybeSingle();
  if (!funil) return falha("Funil não encontrado.");

  // Tira o padrão do anterior antes de pôr no novo: o índice parcial
  // `pipelines_padrao_unico_idx` recusa dois padrões na mesma trilha, e é ele
  // que garante que a tela nunca fique sem saber qual abrir.
  const { error: erroLimpeza } = await supabase
    .from("pipelines")
    .update({ padrao: false })
    .eq("organization_id", organizationId)
    .eq("trilha", funil.trilha)
    .eq("padrao", true);
  if (erroLimpeza) return falha("Não foi possível trocar o funil padrão.");

  const { error } = await supabase.from("pipelines").update({ padrao: true }).eq("id", pipelineId);
  if (error) return falha("Não foi possível definir o funil padrão.");

  revalidar(funil.trilha as Trilha);
  return { ok: true };
}

/** Excluir recusa com frase quando há cartão dentro. Arquivar é o caminho. */
export async function excluirFunil(pipelineId: string): Promise<ResultadoAcao> {
  if (!ehUuid(pipelineId)) return falha("Funil inválido.");

  const { supabase } = await requireOrganizationContext();
  const { data: funil } = await supabase
    .from("pipelines")
    .select("id,trilha,name,padrao")
    .eq("id", pipelineId)
    .maybeSingle();
  if (!funil) return falha("Funil não encontrado.");

  if (funil.padrao) {
    return falha(`"${funil.name}" é o funil padrão da trilha. Defina outro como padrão antes de excluir este.`);
  }

  const { count } = await supabase
    .from("pipeline_cards")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId);

  if ((count ?? 0) > 0) {
    return falha(
      `"${funil.name}" tem ${count} ${count === 1 ? "cartão" : "cartões"}. Arquive o funil para preservar o histórico, ou mova os cartões antes de excluir.`
    );
  }

  const { error } = await supabase.from("pipelines").delete().eq("id", pipelineId);
  if (error) {
    if (/foreign key|violates/i.test(error.message)) {
      return falha("Este funil ainda tem registros ligados a ele. Arquive em vez de excluir.");
    }
    return falha("Não foi possível excluir o funil.");
  }

  revalidar(funil.trilha as Trilha);
  return { ok: true };
}
