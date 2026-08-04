import "server-only";
import { cookies } from "next/headers";
import { requireOrganizationContext } from "@/lib/auth";
import { MODULE_BY_KEY } from "@/lib/modules/registry";
import { descreverNotificacaoOperacional } from "@/lib/operations/notifications";
import type { PersonaId } from "@/lib/personas/catalog";
import type { Trilha } from "@/lib/pipeline/domain";

// O canto direito da barra: mensagens e notificações.
//
// Nada aqui é contador decorativo. Mensagem é observação que outra pessoa
// escreveu em cartão que me pertence ou que eu sigo; notificação é atividade
// agendada para mim que já venceu ou vence hoje. Badge que conta coisa
// inexistente ensina o usuário a ignorar o badge — e aí ele ignora também o
// dia em que a conta é verdadeira.
//
// O "não lido" é um marco de tempo em cookie, não uma tabela de leitura por
// linha: guardar um instante por usuário resolve o mesmo problema sem uma
// escrita a cada rolagem de painel. O custo é que ler em um dispositivo não
// marca lido no outro, e isso é aceitável para um aviso.

export const COOKIE_VISTO_MENSAGENS = "innovar_visto_mensagens";
export const COOKIE_VISTO_ATIVIDADES = "innovar_visto_atividades";

const JANELA_DIAS = 14;

export type MensagemAviso = {
  id: string;
  cardId: string;
  trilha: Trilha;
  cartao: string;
  autor: string;
  tipo: string;
  corpo: string;
  quando: string;
  nova: boolean;
};

export type AtividadeAviso = {
  id: string;
  cardId: string;
  trilha: Trilha;
  cartao: string;
  tipo: string;
  titulo: string;
  prazo: string | null;
  atrasada: boolean;
  nova: boolean;
};

export type NotificacaoOperacionalAviso = {
  id: string;
  eventoId: string;
  titulo: string;
  corpo: string;
  modulo: string;
  moduloNome: string;
  href: string;
  persona: PersonaId;
  prazoResposta: string;
  escalada: boolean;
  nova: boolean;
  criadaEm: string;
};

export type Avisos = {
  mensagens: MensagemAviso[];
  atividades: AtividadeAviso[];
  operacionais: NotificacaoOperacionalAviso[];
  naoLidas: number;
  pendentes: number;
};

function instanteDoCookie(valor: string | undefined): number {
  if (!valor) return 0;
  const instante = Date.parse(valor);
  return Number.isFinite(instante) ? instante : 0;
}

export async function carregarAvisos(): Promise<Avisos> {
  const { supabase, userId, organizationId } = await requireOrganizationContext();
  const jar = await cookies();
  const vistoMensagens = instanteDoCookie(jar.get(COOKIE_VISTO_MENSAGENS)?.value);
  const vistoAtividades = instanteDoCookie(jar.get(COOKIE_VISTO_ATIVIDADES)?.value);

  const desde = new Date(Date.now() - JANELA_DIAS * 86_400_000).toISOString();
  const hoje = new Date().toISOString().slice(0, 10);

  // Meus cartões são os que eu respondo mais os que eu sigo. Sem os seguidos,
  // acompanhar um cartão não teria consequência nenhuma na tela.
  const [meusResultado, seguidosResultado, atividadesResultado, notificacoesResultado] = await Promise.all([
    supabase.from("pipeline_cards").select("id").eq("responsavel_id", userId).is("arquivado_em", null).limit(300),
    supabase.from("pipeline_card_followers").select("card_id").eq("user_id", userId).limit(300),
    // Atividade sem prazo entra: é compromisso no nome de alguém, e filtrar
    // por `prazo <= hoje` a descartaria para sempre — o que se marca "para
    // fazer, sem data" é justamente o que se esquece.
    supabase
      .from("pipeline_card_activities")
      .select("id,card_id,tipo,titulo,prazo,criado_em")
      .eq("responsavel_id", userId)
      .is("concluida_em", null)
      .or(`prazo.is.null,prazo.lte.${hoje}`)
      .order("prazo", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from("operational_notifications")
      .select("id,event_id,recipient_persona,escalated,read_at,created_at")
      .eq("organization_id", organizationId)
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const idsCartao = [
    ...new Set([
      ...((meusResultado.data ?? []) as { id: string }[]).map(linha => linha.id),
      ...((seguidosResultado.data ?? []) as { card_id: string }[]).map(linha => linha.card_id)
    ])
  ];

  const notasResultado = idsCartao.length
    ? await supabase
        .from("pipeline_card_notes")
        .select("id,card_id,tipo,corpo,autor_id,created_at")
        .in("card_id", idsCartao)
        .neq("autor_id", userId)
        .gte("created_at", desde)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const linhasNota = (notasResultado.data ?? []) as {
    id: string;
    card_id: string;
    tipo: string;
    corpo: string;
    autor_id: string | null;
    created_at: string;
  }[];
  const linhasAtividade = (atividadesResultado.data ?? []) as {
    id: string;
    card_id: string;
    tipo: string;
    titulo: string;
    prazo: string | null;
    criado_em: string;
  }[];
  const linhasNotificacao = (notificacoesResultado.data ?? []) as {
    id: string;
    event_id: string;
    recipient_persona: PersonaId;
    escalated: boolean;
    read_at: string | null;
    created_at: string;
  }[];

  // Título e trilha do cartão: sem eles o aviso diz "alguém escreveu algo" e
  // obriga a abrir para descobrir onde.
  const idsCitados = [...new Set([...linhasNota.map(n => n.card_id), ...linhasAtividade.map(a => a.card_id)])];
  const cartoesResultado = idsCitados.length
    ? await supabase.from("pipeline_cards").select("id,titulo,trilha").in("id", idsCitados)
    : { data: [] };
  const cartaoPorId = new Map(
    ((cartoesResultado.data ?? []) as { id: string; titulo: string; trilha: string }[]).map(linha => [linha.id, linha])
  );

  const idsAutor = [...new Set(linhasNota.map(n => n.autor_id).filter((id): id is string => Boolean(id)))];
  const autoresResultado = idsAutor.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", idsAutor)
    : { data: [] };
  const autorPorId = new Map(
    ((autoresResultado.data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(linha => [
      linha.id,
      linha.full_name?.trim() || linha.email || "Sem nome"
    ])
  );

  // O embed PostgREST não é usado aqui. Além de tornar o relacionamento
  // ambíguo quando surgem novas FKs, consultar os fatos em uma segunda etapa
  // mantém a caixa compatível com ambientes em atualização.
  const idsEvento = [...new Set(linhasNotificacao.map(item => item.event_id))];
  const eventosResultado = idsEvento.length
    ? await supabase
        .from("operational_events")
        .select("id,event_code,module_key,title,impact,response_due_at")
        .in("id", idsEvento)
    : { data: [] };
  const eventoPorId = new Map(
    ((eventosResultado.data ?? []) as {
      id: string;
      event_code: string;
      module_key: string;
      title: string;
      impact: string;
      response_due_at: string;
    }[]).map(item => [item.id, item])
  );

  const mensagens: MensagemAviso[] = linhasNota.map(linha => {
    const cartao = cartaoPorId.get(linha.card_id);
    return {
      id: linha.id,
      cardId: linha.card_id,
      trilha: (cartao?.trilha ?? "cliente") as Trilha,
      cartao: cartao?.titulo ?? "Cartão",
      autor: linha.autor_id ? (autorPorId.get(linha.autor_id) ?? "Usuário removido") : "Sistema",
      tipo: linha.tipo,
      corpo: linha.corpo.length > 140 ? `${linha.corpo.slice(0, 140)}…` : linha.corpo,
      quando: linha.created_at,
      nova: Date.parse(linha.created_at) > vistoMensagens
    };
  });

  const atividades: AtividadeAviso[] = linhasAtividade.map(linha => {
    const cartao = cartaoPorId.get(linha.card_id);
    return {
      id: linha.id,
      cardId: linha.card_id,
      trilha: (cartao?.trilha ?? "cliente") as Trilha,
      cartao: cartao?.titulo ?? "Cartão",
      tipo: linha.tipo,
      titulo: linha.titulo,
      prazo: linha.prazo,
      atrasada: Boolean(linha.prazo && linha.prazo < hoje),
      nova: Date.parse(linha.criado_em) > vistoAtividades
    };
  });

  const operacionais: NotificacaoOperacionalAviso[] = linhasNotificacao.flatMap(linha => {
    const evento = eventoPorId.get(linha.event_id);
    if (!evento) return [];
    const modulo = MODULE_BY_KEY.get(evento.module_key);
    return [{
      id: linha.id,
      eventoId: linha.event_id,
      titulo: evento.title,
      corpo: descreverNotificacaoOperacional({
        title: evento.title,
        impact: evento.impact,
        responseDueAt: evento.response_due_at
      }, linha.recipient_persona),
      modulo: evento.module_key,
      moduloNome: modulo?.name ?? evento.module_key,
      href: modulo?.routePrefix ?? "/app",
      persona: linha.recipient_persona,
      prazoResposta: evento.response_due_at,
      escalada: linha.escalated,
      nova: linha.read_at === null,
      criadaEm: linha.created_at
    }];
  });

  return {
    mensagens,
    atividades,
    operacionais,
    naoLidas: mensagens.filter(item => item.nova).length,
    pendentes: atividades.length + operacionais.filter(item => item.nova).length
  };
}
