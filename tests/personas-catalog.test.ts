import { describe, expect, it } from "vitest";
import { MODULE_REGISTRY } from "../lib/modules/registry";
import { PERSONAS_OPERACIONAIS } from "../lib/personas/runtime";

describe("catálogo operacional de personas", () => {
  it("cobre todos os aplicativos com um profissional do mundo real", () => {
    const cobertos = new Set<string>(PERSONAS_OPERACIONAIS.flatMap(persona => persona.modules));
    const faltantes = MODULE_REGISTRY
      .map(modulo => modulo.key)
      .filter(chave => !cobertos.has(chave));

    expect(faltantes).toEqual([]);
  });

  it("não aceita persona sem matriz de competência executável", () => {
    for (const persona of PERSONAS_OPERACIONAIS) {
      expect(persona.competencies.length, persona.id).toBeGreaterThanOrEqual(4);
      for (const competencia of persona.competencies) {
        expect(competencia.techniques.length, `${persona.id}:${competencia.name}`).toBeGreaterThan(0);
        expect(competencia.requiredData.length, `${persona.id}:${competencia.name}`).toBeGreaterThan(0);
      }
    }
  });

  it("obriga os três cenários e resposta do sistema no pessimista", () => {
    const ids = new Set(PERSONAS_OPERACIONAIS.map(persona => persona.id));

    for (const persona of PERSONAS_OPERACIONAIS) {
      expect(persona.scenarios.optimistic.length, persona.id).toBeGreaterThan(20);
      expect(persona.scenarios.normal.length, persona.id).toBeGreaterThan(20);
      expect(persona.scenarios.pessimistic.description.length, persona.id).toBeGreaterThan(20);
      expect(persona.scenarios.pessimistic.systemResponse.length, persona.id).toBeGreaterThan(20);
      expect(persona.scenarios.pessimistic.notify.length, persona.id).toBeGreaterThan(0);
      for (const destinatario of persona.scenarios.pessimistic.notify) {
        expect(ids.has(destinatario), `${persona.id} notifica ${destinatario}`).toBe(true);
      }
    }
  });

  it("mantém ids e profissões únicos", () => {
    const ids = PERSONAS_OPERACIONAIS.map(persona => persona.id);
    const profissoes = PERSONAS_OPERACIONAIS.map(persona => persona.profession);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(profissoes).size).toBe(profissoes.length);
  });

  it("não dá acesso administrativo à persona cliente", () => {
    const cliente = PERSONAS_OPERACIONAIS.find(persona => persona.id === "P15");
    expect(cliente?.modules).not.toContain("administracao");
    expect(cliente?.modules).not.toContain("auditoria");
  });
});
