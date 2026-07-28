import { MODULE_BY_KEY } from "@/lib/modules/registry";
import { planejarNotificacoesOperacionais, type OperationalObjectType } from "./notifications";
import { PERSONAS_OPERACIONAIS, type PersonaId } from "@/lib/personas/catalog";

export type OperationalRoutine = {
  persona: PersonaId;
  module: string;
  objectType: OperationalObjectType;
  obligation: PersonaId;
};

const OBJECT_TYPE_BY_MODULE: Record<string, OperationalObjectType> = {
  crm: "client",
  clientes: "client",
  obras: "project",
  planejamento: "project",
  tarefas: "task",
  diario: "project",
  equipes: "project",
  orcamentos: "financial",
  propostas: "document",
  contratos: "document",
  aditivos: "document",
  assinaturas: "document",
  documentos: "document",
  qualidade: "quality",
  compras: "purchase",
  estoque: "inventory",
  financeiro: "financial",
  sac: "ticket",
  relatorios: "project",
  auditoria: "security",
  administracao: "security"
};

/**
 * Matriz executável persona × aplicativo.
 *
 * Antes, cada profissional era ensaiado em apenas um aplicativo, embora a
 * matriz canônica declarasse vários. Isso deixava propostas, aditivos,
 * assinaturas e equipes fora do loop. Agora cada combinação declarada no
 * catálogo produz uma rotina e três cenários.
 */
export const ROTINAS_OPERACIONAIS: readonly OperationalRoutine[] =
  PERSONAS_OPERACIONAIS.flatMap(persona =>
    persona.modules
      .filter(module => module !== "dashboard")
      .map(module => {
        const objectType = OBJECT_TYPE_BY_MODULE[module];
        if (!objectType) throw new Error(`Tipo operacional ausente para o módulo ${module}.`);
        return {
          persona: persona.id,
          module,
          objectType,
          obligation: persona.scenarios.pessimistic.notify[0]
        };
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
