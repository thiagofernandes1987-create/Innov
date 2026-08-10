export const HOMOLOGATION_REQUIREMENTS = [
  "EXCLUSIVE_AUTHORIZED_NUMBER",
  "DEDICATED_ORGANIZATION",
  "AUTHORIZED_USERS",
  "CAMPAIGNS_BLOCKED",
  "AI_DISABLED",
  "ALLOWED_CONTENT_TYPES",
  "DAILY_OPERATION_RUNBOOK",
  "METRICS_AND_ALERTS",
  "SESSION_PURGE_REHEARSAL",
  "HUMAN_HANDOFF_REHEARSAL",
  "INCIDENT_REGISTRATION"
] as const;

export type HomologationRequirement = (typeof HOMOLOGATION_REQUIREMENTS)[number];
export type EvidenceLevel = "NONE" | "SYNTHETIC" | "REAL_VERIFIED";

export type HomologationEvidence = {
  requirement: HomologationRequirement;
  level: EvidenceLevel;
  passed: boolean;
  evidenceId: string | null;
  notes: string;
};

export type HomologationAssessment = {
  decision: "BLOCKED_NOT_EXECUTED" | "READY_FOR_AUTHORIZED_EXECUTION";
  checks: readonly HomologationEvidence[];
  blockers: readonly HomologationRequirement[];
  realNumberUsed: false;
  qrOrPairingUsed: false;
  externalConnectionUsed: false;
  productionAuthorized: false;
};

const REAL_REQUIRED = new Set<HomologationRequirement>([
  "EXCLUSIVE_AUTHORIZED_NUMBER",
  "DEDICATED_ORGANIZATION",
  "AUTHORIZED_USERS"
]);

export function assessHomologation(evidence: readonly HomologationEvidence[]): HomologationAssessment {
  const byRequirement = new Map(evidence.map(item => [item.requirement, item]));
  const checks = HOMOLOGATION_REQUIREMENTS.map(requirement =>
    byRequirement.get(requirement) ?? {
      requirement,
      level: "NONE" as const,
      passed: false,
      evidenceId: null,
      notes: "Evidência ausente."
    }
  );
  const blockers = checks
    .filter(check => !check.passed || (REAL_REQUIRED.has(check.requirement) && check.level !== "REAL_VERIFIED"))
    .map(check => check.requirement);
  return {
    decision: blockers.length ? "BLOCKED_NOT_EXECUTED" : "READY_FOR_AUTHORIZED_EXECUTION",
    checks,
    blockers,
    realNumberUsed: false,
    qrOrPairingUsed: false,
    externalConnectionUsed: false,
    productionAuthorized: false
  };
}

export function buildCurrentHomologationAssessment(): HomologationAssessment {
  return assessHomologation([
    { requirement: "EXCLUSIVE_AUTHORIZED_NUMBER", level: "NONE", passed: false, evidenceId: null, notes: "Número exclusivo não foi fornecido nem utilizado." },
    { requirement: "DEDICATED_ORGANIZATION", level: "NONE", passed: false, evidenceId: null, notes: "Organização real dedicada não foi criada." },
    { requirement: "AUTHORIZED_USERS", level: "NONE", passed: false, evidenceId: null, notes: "Usuários reais de homologação não foram cadastrados." },
    { requirement: "CAMPAIGNS_BLOCKED", level: "SYNTHETIC", passed: true, evidenceId: "policy-no-campaigns", notes: "Campanhas e disparos em massa permanecem proibidos." },
    { requirement: "AI_DISABLED", level: "SYNTHETIC", passed: true, evidenceId: "ai-draft-only", notes: "IA autônoma desativada; nenhum envio automático." },
    { requirement: "ALLOWED_CONTENT_TYPES", level: "SYNTHETIC", passed: true, evidenceId: "capability-matrix", notes: "Texto e documentos canônicos sujeitos a revisão humana." },
    { requirement: "DAILY_OPERATION_RUNBOOK", level: "SYNTHETIC", passed: true, evidenceId: "runbook-homologation", notes: "Fluxo diário documentado, não executado com tráfego real." },
    { requirement: "METRICS_AND_ALERTS", level: "SYNTHETIC", passed: true, evidenceId: "w18-observability", notes: "Métricas e alertas validados sinteticamente." },
    { requirement: "SESSION_PURGE_REHEARSAL", level: "SYNTHETIC", passed: true, evidenceId: "w07-crypto-delete", notes: "Exclusão criptográfica ensaiada com dados sintéticos." },
    { requirement: "HUMAN_HANDOFF_REHEARSAL", level: "SYNTHETIC", passed: true, evidenceId: "w15-w16-handoff", notes: "Handoff persistente ensaiado sem conversa real." },
    { requirement: "INCIDENT_REGISTRATION", level: "SYNTHETIC", passed: true, evidenceId: "w17-incident", notes: "Incidente sintético registrado e imutável." }
  ]);
}

export type DailyHomologationStep = {
  order: number;
  action: string;
  abortOnFailure: boolean;
};

export const HOMOLOGATION_DAILY_RUNBOOK: readonly DailyHomologationStep[] = [
  { order: 1, action: "VERIFY_KILL_SWITCH_AND_FEATURE_FLAGS", abortOnFailure: true },
  { order: 2, action: "VERIFY_AUTHORIZED_USERS_AND_EXCLUSIVE_NUMBER", abortOnFailure: true },
  { order: 3, action: "VERIFY_SESSION_STATE_METRICS_ALERTS_AND_LEASE", abortOnFailure: true },
  { order: 4, action: "CONFIRM_CAMPAIGNS_BLOCKED_AND_AI_DISABLED", abortOnFailure: true },
  { order: 5, action: "ALLOW_ONLY_PREAPPROVED_SCENARIOS", abortOnFailure: true },
  { order: 6, action: "REVIEW_HANDOFFS_DLQ_AND_INCIDENTS", abortOnFailure: false },
  { order: 7, action: "PURGE_OR_DISABLE_SESSION_AT_END_OF_WINDOW", abortOnFailure: true },
  { order: 8, action: "PUBLISH_DAILY_EVIDENCE_REPORT", abortOnFailure: true }
];
