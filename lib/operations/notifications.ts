import {
  PERSONAS_OPERACIONAIS,
  type PersonaId
} from "@/lib/personas/runtime";

export type OperationalScenario = "optimistic" | "normal" | "pessimistic";
export type OperationalObjectType =
  | "client" | "project" | "task" | "ticket" | "purchase"
  | "inventory" | "financial" | "document" | "quality" | "security";

export type OperationalEvent = {
  eventCode: string;
  objectType: OperationalObjectType;
  objectId: string;
  title: string;
  impact: string;
  actor: PersonaId;
  occurredAt: string;
  responseDueAt: string;
  scenario: OperationalScenario;
  clientApproved: boolean;
};

export type PlannedOperationalNotification = {
  deduplicationKey: string;
  eventCode: string;
  objectType: OperationalObjectType;
  objectId: string;
  recipient: PersonaId;
  recipientRole: string;
  title: string;
  body: string;
  occurredAt: string;
  responseDueAt: string;
  escalated: boolean;
  eventCount: number;
};

const PERSONA_BY_ID = new Map(PERSONAS_OPERACIONAIS.map(persona => [persona.id, persona]));

export function descreverNotificacaoOperacional(
  evento: Pick<OperationalEvent, "title" | "impact" | "responseDueAt">,
  destinatario: PersonaId
): string {
  if (destinatario === "P13") {
    return `${evento.impact}. Decisão executiva apenas se a ação operacional não recuperar o compromisso.`;
  }
  if (destinatario === "P4") {
    return `${evento.impact}. Recalcule caixa, obrigação e exposição antes de autorizar novo compromisso.`;
  }
  if (destinatario === "P8") {
    return `${evento.impact}. Integre as restrições, confirme donos e publique uma única previsão.`;
  }
  if (destinatario === "P15") {
    return `A equipe está tratando “${evento.title}”. Você receberá a previsão aprovada pelo responsável.`;
  }
  if (destinatario === "P16") {
    return `${evento.impact}. Preserve fato, autor, instante, decisão e evidência para avaliar o controle.`;
  }
  return `${evento.impact}. Verifique a restrição da sua área e responda até ${new Date(evento.responseDueAt).toLocaleString("pt-BR")}.`;
}

export function planejarNotificacoesOperacionais(
  evento: OperationalEvent,
  agora = new Date(evento.occurredAt)
): PlannedOperationalNotification[] {
  // ACOMPANHAMENTO-A-DISTANCIA: normal não notifica. O fluxo continua
  // consultável no objeto; só exceção empurra informação.
  if (evento.scenario !== "pessimistic") return [];

  const emissor = PERSONA_BY_ID.get(evento.actor);
  if (!emissor || emissor.scenarios.pessimistic.event !== evento.eventCode) {
    throw new Error(`Evento ${evento.eventCode} não pertence à persona ${evento.actor}.`);
  }

  const vencido = Date.parse(evento.responseDueAt) < agora.getTime();
  const destinatarios = new Set<PersonaId>(emissor.scenarios.pessimistic.notify);
  if (!evento.clientApproved) destinatarios.delete("P15");
  if (vencido) destinatarios.add("P13");

  return [...destinatarios].map(recipient => {
    const persona = PERSONA_BY_ID.get(recipient);
    if (!persona) throw new Error(`Destinatário operacional inexistente: ${recipient}.`);
    return {
      deduplicationKey: `${evento.objectType}:${evento.objectId}:${evento.eventCode}:${recipient}`,
      eventCode: evento.eventCode,
      objectType: evento.objectType,
      objectId: evento.objectId,
      recipient,
      recipientRole: persona.role,
      title: evento.title,
      body: descreverNotificacaoOperacional(evento, recipient),
      occurredAt: evento.occurredAt,
      responseDueAt: evento.responseDueAt,
      escalated: vencido && recipient === "P13",
      eventCount: 1
    };
  });
}

export function agruparNotificacoesOperacionais(
  notificacoes: readonly PlannedOperationalNotification[]
): PlannedOperationalNotification[] {
  const grupos = new Map<string, PlannedOperationalNotification[]>();
  for (const notificacao of notificacoes) {
    const chave = `${notificacao.objectType}:${notificacao.objectId}:${notificacao.recipient}`;
    const grupo = grupos.get(chave) ?? [];
    grupo.push(notificacao);
    grupos.set(chave, grupo);
  }

  return [...grupos.values()].map(grupo => {
    const ordenado = [...grupo].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const base = ordenado[0];
    if (ordenado.length === 1) return base;
    const titulos = [...new Set(ordenado.map(item => item.title))];
    return {
      ...base,
      deduplicationKey: `${base.objectType}:${base.objectId}:${base.recipient}:summary`,
      eventCode: "operational.summary",
      title: `${ordenado.length} exceções no mesmo ${base.objectType}`,
      body: `${titulos.join("; ")}. Abra o objeto para tratar as ações na ordem do impacto.`,
      escalated: ordenado.some(item => item.escalated),
      eventCount: ordenado.length
    };
  });
}
