import { describe, expect, it } from "vitest";
import {
  HOMOLOGATION_DAILY_RUNBOOK,
  HOMOLOGATION_REQUIREMENTS,
  assessHomologation,
  buildCurrentHomologationAssessment,
  type HomologationEvidence
} from "@/lib/messaging/homologation";

function evidence(overrides: Partial<HomologationEvidence> = {}): HomologationEvidence {
  return {
    requirement: "CAMPAIGNS_BLOCKED",
    level: "SYNTHETIC",
    passed: true,
    evidenceId: "evidence-1",
    notes: "controle sintético",
    ...overrides
  };
}

describe("homologação W-20", () => {
  it("exige todos os requisitos previstos", () => {
    expect(HOMOLOGATION_REQUIREMENTS).toHaveLength(11);
    expect(HOMOLOGATION_REQUIREMENTS).toContain("EXCLUSIVE_AUTHORIZED_NUMBER");
    expect(HOMOLOGATION_REQUIREMENTS).toContain("SESSION_PURGE_REHEARSAL");
  });

  it("mantém decisão bloqueada sem número, organização e usuários reais", () => {
    const assessment = buildCurrentHomologationAssessment();
    expect(assessment.decision).toBe("BLOCKED_NOT_EXECUTED");
    expect(assessment.blockers).toEqual([
      "EXCLUSIVE_AUTHORIZED_NUMBER",
      "DEDICATED_ORGANIZATION",
      "AUTHORIZED_USERS"
    ]);
    expect(assessment.realNumberUsed).toBe(false);
    expect(assessment.externalConnectionUsed).toBe(false);
  });

  it("não aceita evidência sintética para dependências reais", () => {
    const allSynthetic = HOMOLOGATION_REQUIREMENTS.map(requirement =>
      evidence({ requirement, level: "SYNTHETIC", passed: true, evidenceId: `synthetic-${requirement}` })
    );
    const assessment = assessHomologation(allSynthetic);
    expect(assessment.decision).toBe("BLOCKED_NOT_EXECUTED");
    expect(assessment.blockers).toEqual([
      "EXCLUSIVE_AUTHORIZED_NUMBER",
      "DEDICATED_ORGANIZATION",
      "AUTHORIZED_USERS"
    ]);
  });

  it("só considera readiness quando dependências externas têm evidência real", () => {
    const checks = HOMOLOGATION_REQUIREMENTS.map(requirement =>
      evidence({
        requirement,
        level: ["EXCLUSIVE_AUTHORIZED_NUMBER", "DEDICATED_ORGANIZATION", "AUTHORIZED_USERS"].includes(requirement)
          ? "REAL_VERIFIED"
          : "SYNTHETIC",
        passed: true,
        evidenceId: `verified-${requirement}`
      })
    );
    expect(assessHomologation(checks).decision).toBe("READY_FOR_AUTHORIZED_EXECUTION");
  });

  it("mantém campanhas bloqueadas e IA sem autonomia", () => {
    const assessment = buildCurrentHomologationAssessment();
    expect(assessment.checks.find(item => item.requirement === "CAMPAIGNS_BLOCKED")?.passed).toBe(true);
    expect(assessment.checks.find(item => item.requirement === "AI_DISABLED")?.notes).toContain("nenhum envio automático");
  });

  it("reconhece ensaios sintéticos de purge, handoff e incidente", () => {
    const assessment = buildCurrentHomologationAssessment();
    for (const requirement of ["SESSION_PURGE_REHEARSAL", "HUMAN_HANDOFF_REHEARSAL", "INCIDENT_REGISTRATION"] as const) {
      expect(assessment.checks.find(item => item.requirement === requirement)).toMatchObject({
        level: "SYNTHETIC",
        passed: true
      });
    }
  });

  it("define fluxo diário fail-closed", () => {
    expect(HOMOLOGATION_DAILY_RUNBOOK.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(HOMOLOGATION_DAILY_RUNBOOK[1]).toMatchObject({
      action: "VERIFY_AUTHORIZED_USERS_AND_EXCLUSIVE_NUMBER",
      abortOnFailure: true
    });
    expect(HOMOLOGATION_DAILY_RUNBOOK.at(-1)?.action).toBe("PUBLISH_DAILY_EVIDENCE_REPORT");
  });

  it("nunca autoriza produção", () => {
    expect(buildCurrentHomologationAssessment().productionAuthorized).toBe(false);
  });
});
