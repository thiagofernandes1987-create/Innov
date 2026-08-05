import { describe, expect, it } from "vitest";
import { MODULE_BY_KEY } from "../lib/modules/registry";
import { PERSONAS_OPERACIONAIS } from "../lib/personas/runtime";
import {
  executarCenariosDasPersonas,
  ROTINAS_OPERACIONAIS
} from "../lib/operations/routines";

describe("runner das rotinas profissionais", () => {
  it("liga cada profissão a todos os aplicativos que ela utiliza", () => {
    const expected = PERSONAS_OPERACIONAIS.reduce(
      (total, persona) => total + persona.modules.filter(module => module !== "dashboard").length,
      0
    );
    expect(ROTINAS_OPERACIONAIS).toHaveLength(expected);
    for (const routine of ROTINAS_OPERACIONAIS) {
      const persona = PERSONAS_OPERACIONAIS.find(item => item.id === routine.persona);
      expect(MODULE_BY_KEY.has(routine.module), routine.persona).toBe(true);
      expect(persona?.modules, routine.persona).toContain(routine.module);
    }
  });

  it("executa otimista, normal e pessimista em todos os aplicativos, sem exceção", () => {
    const results = executarCenariosDasPersonas();
    expect(results).toHaveLength(ROTINAS_OPERACIONAIS.length * 3);
    const modulesTested = new Set(results.map(result => result.module));
    const installedModules = [...MODULE_BY_KEY.keys()].filter(module => module !== "dashboard");
    expect(modulesTested).toEqual(new Set(installedModules));
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
