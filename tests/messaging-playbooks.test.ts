import { describe, expect, it } from "vitest";
import {
  PlaybookPolicyError,
  assertPlaybookPolicy,
  createPlaybookExecutionSnapshot,
  reproducePlaybookExecution,
  validatePlaybookVariables,
  type CommunicationPlaybookVersion
} from "@/lib/messaging/playbooks";

const source = {
  sourceType: "CONTRACT_VERSION",
  sourceId: "source-1",
  sourceField: "RENDERED_BODY",
  sourceVersion: 3,
  sourceName: "Contrato padrão",
  sha256: "a".repeat(64),
  resolvedAt: "2026-08-04T17:00:00.000Z"
};

function version(overrides: Partial<CommunicationPlaybookVersion> = {}): CommunicationPlaybookVersion {
  return {
    id: "version-1",
    playbookId: "playbook-1",
    versionNumber: 1,
    bindingId: "binding-1",
    variableSchema: {
      cliente_nome: { type: "string", required: true, minLength: 2, maxLength: 100 },
      obra_codigo: { type: "string", required: true, pattern: "^OB-[0-9]{4}$" }
    },
    autonomy: "HUMAN_ONLY",
    sensitivity: "CONTRACTUAL",
    contentMode: "CANONICAL_ONLY",
    approvalRequired: true,
    approved: true,
    ...overrides
  };
}

describe("Communication playbooks W-14", () => {
  it("valida variáveis declaradas pelo schema", () => {
    expect(validatePlaybookVariables(version().variableSchema, {
      cliente_nome: "Marcos",
      obra_codigo: "OB-0026"
    })).toEqual({ cliente_nome: "Marcos", obra_codigo: "OB-0026" });
  });

  it("rejeita variável obrigatória, desconhecida e formato inválido", () => {
    expect(() => validatePlaybookVariables(version().variableSchema, {
      cliente_nome: "Marcos"
    })).toThrowError(/obra_codigo/);
    expect(() => validatePlaybookVariables(version().variableSchema, {
      cliente_nome: "Marcos",
      obra_codigo: "OB-0026",
      corpo_livre: "não permitido"
    })).toThrowError(/não declaradas/);
    expect(() => validatePlaybookVariables(version().variableSchema, {
      cliente_nome: "Marcos",
      obra_codigo: "invalido"
    })).toThrowError(/formato/);
  });

  it("bloqueia autonomia não humana para conteúdo contratual", () => {
    expect(() => assertPlaybookPolicy(version({ autonomy: "DRAFT_ASSIST" })))
      .toThrowError(PlaybookPolicyError);
  });

  it("exige aprovação humana para conteúdo sensível", () => {
    expect(() => assertPlaybookPolicy(version({ approved: false })))
      .toThrowError(/ainda não foi aprovada/);
  });

  it("bloqueia reescrita contratual livre", () => {
    expect(() => createPlaybookExecutionSnapshot({
      version: version(),
      variables: { cliente_nome: "Marcos", obra_codigo: "OB-0026" },
      source,
      resolved: { kind: "TEXT", body: "Texto canônico" },
      freeTextOverride: "reescrever cláusulas"
    })).toThrowError(/substituir livremente/);
  });

  it("registra snapshot, versão, binding e SHA reproduzível", () => {
    const first = createPlaybookExecutionSnapshot({
      version: version(),
      variables: { cliente_nome: "Marcos", obra_codigo: "OB-0026" },
      source,
      resolved: { kind: "TEXT", body: "Texto canônico" },
      capturedAt: "2026-08-04T17:10:00.000Z"
    });
    const second = createPlaybookExecutionSnapshot({
      version: version(),
      variables: { cliente_nome: "Marcos", obra_codigo: "OB-0026" },
      source,
      resolved: { kind: "TEXT", body: "Texto canônico" },
      capturedAt: "2026-08-04T18:10:00.000Z"
    });
    expect(first.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(first.contentSha256).toBe(second.contentSha256);
    expect(first.playbookVersionNumber).toBe(1);
    expect(first.bindingId).toBe("binding-1");
  });

  it("reproduz histórico sem consultar a versão atual", () => {
    const captured = createPlaybookExecutionSnapshot({
      version: version(),
      variables: { cliente_nome: "Marcos", obra_codigo: "OB-0026" },
      source,
      resolved: { kind: "TEXT", body: "Texto canônico V1" }
    });
    const reproduced = reproducePlaybookExecution(captured);
    expect(reproduced).toEqual(captured);
    expect(Object.isFrozen(reproduced)).toBe(true);
    expect(Object.isFrozen(reproduced.source)).toBe(true);
  });

  it("nova versão não altera snapshot histórico", () => {
    const historical = createPlaybookExecutionSnapshot({
      version: version(),
      variables: { cliente_nome: "Marcos", obra_codigo: "OB-0026" },
      source,
      resolved: { kind: "TEXT", body: "Texto canônico V1" }
    });
    const current = createPlaybookExecutionSnapshot({
      version: version({ id: "version-2", versionNumber: 2 }),
      variables: { cliente_nome: "Marcos", obra_codigo: "OB-0026" },
      source: { ...source, sourceVersion: 4, sha256: "b".repeat(64) },
      resolved: { kind: "TEXT", body: "Texto canônico V2" }
    });
    expect(historical.playbookVersionNumber).toBe(1);
    expect(historical.resolved).toEqual({ kind: "TEXT", body: "Texto canônico V1" });
    expect(current.contentSha256).not.toBe(historical.contentSha256);
  });
});
