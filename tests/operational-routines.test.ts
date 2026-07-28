import { describe, expect, it } from "vitest";
import { MODULE_BY_KEY } from "../lib/modules/registry";
import { PERSONAS_OPERACIONAIS } from "../lib/personas/catalog";
import {
  executarCenariosDasPersonas,
  ROTINAS_OPERACIONAIS
} from "../lib/operations/routines";

describe("runner das rotinas profissionais", () => {
  it("liga todas as 16 profissões a um módulo real que elas utilizam", () => {
    expect(ROTINAS_OPERACIONAIS).toHaveLength(PERSONAS_OPERACIONAIS.length);
    for (const routine of ROTINAS_OPERACIONAIS) {
      const persona = PERSONAS_OPERACIONAIS.find(item => item.id === routine.persona);
      expect(MODULE_BY_KEY.has(routine.module), routine.persona).toBe(true);
      expect(persona?.modules, routine.persona).toContain(routine.module);
    }
  });

  it("executa otimista, normal e pessimista para todas as personas", () => {
    const results = executarCenariosDasPersonas();
    expect(results).toHaveLength(16 * 3);
    for (const result of results) {
      if (result.scenario === "pessimistic") {
        expect(result.notifications.length, result.persona).toBeGreaterThan(0);
      } else {
        expect(result.notifications, `${result.persona}:${result.scenario}`).toEqual([]);
      }
    }
  });

  it("entrega exatamente os destinatários declarados no cenário pessimista", () => {
    const pessimistic = executarCenariosDasPersonas()
      .filter(result => result.scenario === "pessimistic");
    for (const result of pessimistic) {
      const persona = PERSONAS_OPERACIONAIS.find(item => item.id === result.persona)!;
      expect(result.notifications.map(item => item.recipient).sort(), result.persona)
        .toEqual([...persona.scenarios.pessimistic.notify].sort());
    }
  });
});
