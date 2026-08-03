import {
  PERSONAS_OPERACIONAIS as PERSONAS_BASE,
  type CompetenciaOperacional,
  type PersonaId,
  type PersonaOperacional
} from "@/lib/personas/catalog";

export type { CompetenciaOperacional, PersonaId, PersonaOperacional };

/**
 * Catálogo operacional efetivo da plataforma.
 *
 * O catálogo-base preserva a matriz profissional auditada. Extensões de
 * módulos novos entram aqui de forma explícita para que menus, rotinas,
 * notificações e responsabilidades sejam atualizados no mesmo ciclo sem
 * reescrever as competências e os cenários já aprovados.
 */
const MODULOS_ADICIONAIS_POR_PERSONA: Partial<Record<PersonaId, readonly string[]>> = {
  P1: ["whatsapp"],
  P5: ["whatsapp"]
};

export const PERSONAS_OPERACIONAIS: readonly PersonaOperacional[] = PERSONAS_BASE.map(
  persona => {
    const additionalModules = MODULOS_ADICIONAIS_POR_PERSONA[persona.id] ?? [];
    if (!additionalModules.length) return persona;
    return {
      ...persona,
      modules: [...new Set([...persona.modules, ...additionalModules])]
    };
  }
);
