import { describe, expect, it } from "vitest";
import {
  isScheduleDependencyType,
  publicScheduleDatabaseMessage,
  wouldCreateScheduleCycle,
  wouldCreateTaskHierarchyCycle
} from "../lib/planejamento/schedule-validation";

describe("schedule validation", () => {
  it("aceita somente os quatro tipos de dependência do domínio", () => {
    expect(isScheduleDependencyType("FS")).toBe(true);
    expect(isScheduleDependencyType("SS")).toBe(true);
    expect(isScheduleDependencyType("FF")).toBe(true);
    expect(isScheduleDependencyType("SF")).toBe(true);
    expect(isScheduleDependencyType("TI")).toBe(false);
    expect(isScheduleDependencyType("DROP TABLE")).toBe(false);
  });

  it("rejeita autorrelação e ciclo indireto no grafo", () => {
    const edges = [
      { predecessorId: "A", successorId: "B" },
      { predecessorId: "B", successorId: "C" }
    ];

    expect(wouldCreateScheduleCycle(edges, "A", "A")).toBe(true);
    expect(wouldCreateScheduleCycle(edges, "C", "A")).toBe(true);
    expect(wouldCreateScheduleCycle(edges, "C", "D")).toBe(false);
  });

  it("rejeita tarefa superior que seja a própria tarefa ou descendente", () => {
    const parents = new Map<string, string | null>([
      ["A", null],
      ["B", "A"],
      ["C", "B"]
    ]);

    expect(wouldCreateTaskHierarchyCycle(parents, "A", "A")).toBe(true);
    expect(wouldCreateTaskHierarchyCycle(parents, "A", "C")).toBe(true);
    expect(wouldCreateTaskHierarchyCycle(parents, "C", "A")).toBe(false);
    expect(wouldCreateTaskHierarchyCycle(parents, "C", null)).toBe(false);
  });

  it("não devolve detalhes técnicos do banco ao usuário", () => {
    const raw = {
      code: "XX000",
      message: "relation project_tasks does not exist",
      details: "internal schema detail",
      hint: "run migration"
    };

    const message = publicScheduleDatabaseMessage(raw, "Não foi possível salvar o cronograma.");
    expect(message).toBe("Não foi possível salvar o cronograma.");
    expect(message).not.toContain("project_tasks");
    expect(message).not.toContain("migration");
  });

  it("traduz violações conhecidas sem expor SQL", () => {
    expect(publicScheduleDatabaseMessage({ code: "23505", message: "duplicate key" }, "fallback"))
      .toBe("Já existe um registro com os mesmos dados neste cronograma.");
    expect(publicScheduleDatabaseMessage({ code: "42501", message: "permission denied" }, "fallback"))
      .toBe("Você não tem permissão para realizar esta alteração.");
  });
});
