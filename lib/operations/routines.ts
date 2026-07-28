import { MODULE_BY_KEY } from "@/lib/modules/registry";
import { planejarNotificacoesOperacionais, type OperationalObjectType } from "./notifications";
import { PERSONAS_OPERACIONAIS, type PersonaId } from "@/lib/personas/catalog";

export type OperationalRoutine = {
  persona: PersonaId;
  module: string;
  objectType: OperationalObjectType;
  obligation: PersonaId;
};

const ROTINAS = [
  ["P1", "crm", "client", "P11"],
  ["P2", "planejamento", "project", "P8"],
  ["P3", "tarefas", "task", "P8"],
  ["P4", "financeiro", "financial", "P13"],
  ["P5", "sac", "ticket", "P9"],
  ["P6", "administracao", "security", "P16"],
  ["P7", "documentos", "document", "P8"],
  ["P8", "obras", "project", "P13"],
  ["P9", "compras", "purchase", "P8"],
  ["P10", "estoque", "inventory", "P10"],
  ["P11", "orcamentos", "financial", "P13"],
  ["P12", "qualidade", "quality", "P12"],
  ["P13", "relatorios", "project", "P13"],
  ["P14", "contratos", "document", "P14"],
  ["P15", "sac", "ticket", "P1"],
  ["P16", "auditoria", "security", "P13"]
] as const satisfies readonly [
  PersonaId,
  string,
  OperationalObjectType,
  PersonaId
][];

export const ROTINAS_OPERACIONAIS: readonly OperationalRoutine[] = ROTINAS.map(
  ([persona, module, objectType, obligation]) => ({
    persona,
    module,
    objectType,
    obligation
  })
);

export function executarCenariosDasPersonas() {
  return ROTINAS_OPERACIONAIS.flatMap(routine => {
    const persona = PERSONAS_OPERACIONAIS.find(item => item.id === routine.persona);
    if (!persona) throw new Error(`Persona ausente: ${routine.persona}.`);
    if (!persona.modules.includes(routine.module as never) || !MODULE_BY_KEY.has(routine.module)) {
      throw new Error(`Módulo ${routine.module} não pertence à rotina de ${routine.persona}.`);
    }
    const base = {
      eventCode: persona.scenarios.pessimistic.event,
      objectType: routine.objectType,
      objectId: "00000000-0000-0000-0000-000000000001",
      title: `Teste da rotina ${routine.persona}`,
      impact: persona.scenarios.pessimistic.description,
      actor: routine.persona,
      occurredAt: "2026-07-28T12:00:00.000Z",
      responseDueAt: "2026-07-28T16:00:00.000Z",
      clientApproved: true
    };
    return (["optimistic", "normal", "pessimistic"] as const).map(scenario => ({
      persona: routine.persona,
      module: routine.module,
      scenario,
      notifications: planejarNotificacoesOperacionais({ ...base, scenario })
    }));
  });
}
