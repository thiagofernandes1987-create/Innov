"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationContext } from "@/lib/auth";
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
