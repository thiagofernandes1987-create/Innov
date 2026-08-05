import { describe, expect, it } from "vitest";
import {
  CURRENT_PILOT_LIMITS,
  DEFAULT_PILOT_SLIS,
  PILOT_ABORT_CRITERIA,
  PILOT_DAILY_INCIDENT_REVIEW,
  PILOT_INSTANT_ROLLBACK,
  SYNTHETIC_PROVIDER_COMPARISON,
  assessPilotReadiness,
  currentPilotAssessment
} from "@/lib/messaging/pilot";

function readyInput() {
  return {
    homologationDecision: "READY_FOR_AUTHORIZED_EXECUTION" as const,
    legalReviewStatus: "APPROVED" as const,
    selectedTeamMembers: 3,
    selectedConversations: 10,
    limits: CURRENT_PILOT_LIMITS,
    flags: {
      organizationEnabled: true,
      sessionEnabled: true,
      campaignsEnabled: false as const,
      aiMode: "DRAFT_ONLY" as const,
      killSwitch: false
    },
    slis: DEFAULT_PILOT_SLIS,
    abortCriteria: PILOT_ABORT_CRITERIA,
    rollbackTestedSynthetic: true,
    dailyReviewDefined: true,
    providerComparison: SYNTHETIC_PROVIDER_COMPARISON,
    costMeasuredSynthetic: true,
    realPilotAuthorization: true
  };
}

describe("piloto limitado W-21", () => {
  it("mantém estado atual em HOLD sem homologação, jurídico e autorização", () => {
    const assessment = currentPilotAssessment();
    expect(assessment.decision).toBe("HOLD");
    expect(assessment.blockers).toEqual(expect.arrayContaining([
      "HOMOLOGATION_GATE_BLOCKED",
      "LEGAL_REVIEW_NOT_APPROVED",
      "REAL_PILOT_NOT_AUTHORIZED",
      "TEAM_LIMIT_INVALID",
      "CONVERSATION_LIMIT_INVALID",
      "FEATURE_FLAGS_NOT_ENABLED"
    ]));
    expect(assessment.realPilotExecuted).toBe(false);
  });

  it("limita equipe, conversas, mensagens e horário", () => {
    expect(CURRENT_PILOT_LIMITS.maximumTeamMembers).toBe(5);
    expect(CURRENT_PILOT_LIMITS.maximumConversations).toBe(20);
    expect(CURRENT_PILOT_LIMITS.maximumDailyMessages).toBe(100);
    expect(CURRENT_PILOT_LIMITS.window).toMatchObject({ startHour: 9, endHour: 17 });
  });

  it("mantém campanhas desativadas e IA em draft_only", () => {
    expect(CURRENT_PILOT_LIMITS.campaignsEnabled).toBe(false);
    expect(CURRENT_PILOT_LIMITS.aiMode).toBe("DRAFT_ONLY");
  });

  it("define seis SLIs e SLOs mensuráveis", () => {
    expect(DEFAULT_PILOT_SLIS.map(item => item.id)).toEqual([
      "AVAILABILITY",
      "DELIVERY_SUCCESS",
      "DUPLICATE_RATE",
      "HANDOFF_LATENCY",
      "SECURITY_INCIDENTS",
      "COST_PER_CONVERSATION"
    ]);
  });

  it("define critérios de aborto com rollback imediato para riscos críticos", () => {
    expect(PILOT_ABORT_CRITERIA.length).toBeGreaterThanOrEqual(8);
    expect(PILOT_ABORT_CRITERIA.filter(item => item.severity === "CRITICAL").every(item => item.immediateRollback)).toBe(true);
    expect(PILOT_ABORT_CRITERIA.map(item => item.id)).toContain("LEGAL_OR_COMPLIANCE");
  });

  it("exige feature flag por organização e sessão", () => {
    const assessment = assessPilotReadiness({
      ...readyInput(),
      flags: { ...readyInput().flags, sessionEnabled: false }
    });
    expect(assessment.blockers).toContain("FEATURE_FLAGS_NOT_ENABLED");
  });

  it("declara rollback instantâneo fail-closed", () => {
    expect(PILOT_INSTANT_ROLLBACK[0]).toContain("KILL_SWITCH");
    expect(PILOT_INSTANT_ROLLBACK).toContain("STOP_OUTBOX_CLAIMS");
    expect(PILOT_INSTANT_ROLLBACK.at(-1)).toContain("HUMANS");
  });

  it("define revisão diária de incidentes, custo e jurídico", () => {
    expect(PILOT_DAILY_INCIDENT_REVIEW).toEqual(expect.arrayContaining([
      "OPEN_SECURITY_INCIDENTS",
      "DUPLICATE_SIDE_EFFECTS",
      "COST_AND_BUDGET_VARIANCE",
      "LEGAL_OR_COMPLIANCE_OBJECTIONS"
    ]));
  });

  it("compara Meta oficial e provider não oficial sem inventar métricas reais", () => {
    expect(SYNTHETIC_PROVIDER_COMPARISON.map(item => item.provider)).toEqual([
      "META_CLOUD",
      "WHATSAPP_WEB_BAILEYS"
    ]);
    expect(SYNTHETIC_PROVIDER_COMPARISON.every(item => item.evidenceLevel === "SYNTHETIC")).toBe(true);
    expect(SYNTHETIC_PROVIDER_COMPARISON.every(item => item.availabilityPercent === null)).toBe(true);
  });

  it("recusa escopo grande, campanhas ou IA autônoma com NO_GO", () => {
    const oversized = assessPilotReadiness({
      ...readyInput(),
      limits: { ...CURRENT_PILOT_LIMITS, maximumTeamMembers: 10 }
    });
    expect(oversized.decision).toBe("NO_GO");
    expect(oversized.blockers).toContain("PILOT_SCOPE_TOO_LARGE");

    const campaigns = assessPilotReadiness({
      ...readyInput(),
      flags: { ...readyInput().flags, campaignsEnabled: true as never }
    });
    expect(campaigns.decision).toBe("NO_GO");
    expect(campaigns.blockers).toContain("CAMPAIGNS_MUST_BE_DISABLED");
  });

  it("somente retorna GO com gates externos aprovados e limites válidos", () => {
    expect(assessPilotReadiness(readyInput()).decision).toBe("GO");
  });

  it("nunca afirma piloto real ou produção", () => {
    const result = assessPilotReadiness(readyInput());
    expect(result.realPilotExecuted).toBe(false);
    expect(result.realConversationsUsed).toBe(false);
    expect(result.productionAuthorized).toBe(false);
  });
});
