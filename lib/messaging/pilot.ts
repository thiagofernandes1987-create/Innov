export type PilotDecision = "GO" | "HOLD" | "NO_GO";
export type LegalReviewStatus = "NOT_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED";

export type PilotWindow = {
  timezone: string;
  startHour: number;
  endHour: number;
  weekdays: readonly number[];
};

export type PilotLimits = {
  maximumTeamMembers: number;
  maximumConversations: number;
  maximumDailyMessages: number;
  window: PilotWindow;
  campaignsEnabled: false;
  aiMode: "DRAFT_ONLY";
};

export type PilotSli = {
  id:
    | "AVAILABILITY"
    | "DELIVERY_SUCCESS"
    | "DUPLICATE_RATE"
    | "HANDOFF_LATENCY"
    | "SECURITY_INCIDENTS"
    | "COST_PER_CONVERSATION";
  unit: "PERCENT" | "COUNT" | "SECONDS" | "MICROS";
  objective: number;
  comparison: "AT_LEAST" | "AT_MOST";
};

export const DEFAULT_PILOT_SLIS: readonly PilotSli[] = [
  { id: "AVAILABILITY", unit: "PERCENT", objective: 99, comparison: "AT_LEAST" },
  { id: "DELIVERY_SUCCESS", unit: "PERCENT", objective: 98, comparison: "AT_LEAST" },
  { id: "DUPLICATE_RATE", unit: "PERCENT", objective: 0, comparison: "AT_MOST" },
  { id: "HANDOFF_LATENCY", unit: "SECONDS", objective: 300, comparison: "AT_MOST" },
  { id: "SECURITY_INCIDENTS", unit: "COUNT", objective: 0, comparison: "AT_MOST" },
  { id: "COST_PER_CONVERSATION", unit: "MICROS", objective: 500_000, comparison: "AT_MOST" }
];

export type PilotAbortCriterion = {
  id: string;
  severity: "WARNING" | "CRITICAL";
  trigger: string;
  immediateRollback: boolean;
};

export const PILOT_ABORT_CRITERIA: readonly PilotAbortCriterion[] = [
  { id: "SESSION_RESTRICTION", severity: "CRITICAL", trigger: "Provider reports logout, restriction or unauthorized state", immediateRollback: true },
  { id: "DUPLICATE_SEND", severity: "CRITICAL", trigger: "Any duplicate outbound side effect", immediateRollback: true },
  { id: "CROSS_TENANT", severity: "CRITICAL", trigger: "Any cross-tenant access or scope mismatch", immediateRollback: true },
  { id: "KEY_PERSISTENCE", severity: "CRITICAL", trigger: "Any credential/key persistence failure", immediateRollback: true },
  { id: "LEASE_CONFLICT", severity: "CRITICAL", trigger: "Any split-brain or unresolved lease conflict", immediateRollback: true },
  { id: "DLQ_GROWTH", severity: "WARNING", trigger: "DLQ exceeds agreed threshold for two windows", immediateRollback: false },
  { id: "SLO_BREACH", severity: "WARNING", trigger: "Two consecutive SLO windows fail", immediateRollback: false },
  { id: "LEGAL_OR_COMPLIANCE", severity: "CRITICAL", trigger: "Legal or compliance objection", immediateRollback: true }
];

export type PilotFeatureFlags = {
  organizationEnabled: boolean;
  sessionEnabled: boolean;
  campaignsEnabled: false;
  aiMode: "DRAFT_ONLY";
  killSwitch: boolean;
};

export type ProviderPilotComparison = {
  provider: "META_CLOUD" | "WHATSAPP_WEB_BAILEYS";
  evidenceLevel: "SYNTHETIC" | "REAL_PILOT";
  availabilityPercent: number | null;
  deliverySuccessPercent: number | null;
  duplicateRatePercent: number | null;
  operationalComplexity: "LOW" | "MEDIUM" | "HIGH";
  policyRisk: "LOW" | "MEDIUM" | "HIGH";
  costMicros: number | null;
};

export type PilotReadinessInput = {
  homologationDecision: "BLOCKED_NOT_EXECUTED" | "READY_FOR_AUTHORIZED_EXECUTION";
  legalReviewStatus: LegalReviewStatus;
  selectedTeamMembers: number;
  selectedConversations: number;
  limits: PilotLimits;
  flags: PilotFeatureFlags;
  slis: readonly PilotSli[];
  abortCriteria: readonly PilotAbortCriterion[];
  rollbackTestedSynthetic: boolean;
  dailyReviewDefined: boolean;
  providerComparison: readonly ProviderPilotComparison[];
  costMeasuredSynthetic: boolean;
  realPilotAuthorization: boolean;
};

export type PilotReadiness = {
  decision: PilotDecision;
  blockers: readonly string[];
  realPilotExecuted: false;
  realConversationsUsed: false;
  productionAuthorized: false;
};

export function assessPilotReadiness(input: PilotReadinessInput): PilotReadiness {
  const blockers: string[] = [];
  if (input.homologationDecision !== "READY_FOR_AUTHORIZED_EXECUTION") blockers.push("HOMOLOGATION_GATE_BLOCKED");
  if (input.legalReviewStatus !== "APPROVED") blockers.push("LEGAL_REVIEW_NOT_APPROVED");
  if (!input.realPilotAuthorization) blockers.push("REAL_PILOT_NOT_AUTHORIZED");
  if (input.selectedTeamMembers < 1 || input.selectedTeamMembers > input.limits.maximumTeamMembers) blockers.push("TEAM_LIMIT_INVALID");
  if (input.selectedConversations < 1 || input.selectedConversations > input.limits.maximumConversations) blockers.push("CONVERSATION_LIMIT_INVALID");
  if (input.limits.maximumTeamMembers > 5 || input.limits.maximumConversations > 20) blockers.push("PILOT_SCOPE_TOO_LARGE");
  if (input.limits.maximumDailyMessages > 100) blockers.push("DAILY_MESSAGE_LIMIT_TOO_HIGH");
  if (input.limits.window.startHour < 0 || input.limits.window.endHour > 24 || input.limits.window.startHour >= input.limits.window.endHour) blockers.push("OPERATING_WINDOW_INVALID");
  if (input.flags.campaignsEnabled || input.limits.campaignsEnabled) blockers.push("CAMPAIGNS_MUST_BE_DISABLED");
  if (input.flags.aiMode !== "DRAFT_ONLY" || input.limits.aiMode !== "DRAFT_ONLY") blockers.push("AI_MUST_BE_DRAFT_ONLY");
  if (!input.flags.organizationEnabled || !input.flags.sessionEnabled) blockers.push("FEATURE_FLAGS_NOT_ENABLED");
  if (input.flags.killSwitch) blockers.push("KILL_SWITCH_ACTIVE");
  if (input.slis.length !== DEFAULT_PILOT_SLIS.length) blockers.push("SLIS_INCOMPLETE");
  if (input.abortCriteria.length < PILOT_ABORT_CRITERIA.length) blockers.push("ABORT_CRITERIA_INCOMPLETE");
  if (!input.rollbackTestedSynthetic) blockers.push("ROLLBACK_NOT_TESTED");
  if (!input.dailyReviewDefined) blockers.push("DAILY_REVIEW_NOT_DEFINED");
  if (!input.providerComparison.some(item => item.provider === "META_CLOUD") || !input.providerComparison.some(item => item.provider === "WHATSAPP_WEB_BAILEYS")) blockers.push("PROVIDER_COMPARISON_INCOMPLETE");
  if (!input.costMeasuredSynthetic) blockers.push("COST_NOT_MEASURED");

  let decision: PilotDecision = "GO";
  if (blockers.includes("LEGAL_REVIEW_NOT_APPROVED") || blockers.includes("HOMOLOGATION_GATE_BLOCKED") || blockers.includes("REAL_PILOT_NOT_AUTHORIZED")) decision = "HOLD";
  if (blockers.some(item => ["PILOT_SCOPE_TOO_LARGE", "CAMPAIGNS_MUST_BE_DISABLED", "AI_MUST_BE_DRAFT_ONLY", "KILL_SWITCH_ACTIVE"].includes(item))) decision = "NO_GO";

  return {
    decision,
    blockers,
    realPilotExecuted: false,
    realConversationsUsed: false,
    productionAuthorized: false
  };
}

export const CURRENT_PILOT_LIMITS: PilotLimits = {
  maximumTeamMembers: 5,
  maximumConversations: 20,
  maximumDailyMessages: 100,
  window: { timezone: "America/Sao_Paulo", startHour: 9, endHour: 17, weekdays: [1, 2, 3, 4, 5] },
  campaignsEnabled: false,
  aiMode: "DRAFT_ONLY"
};

export const SYNTHETIC_PROVIDER_COMPARISON: readonly ProviderPilotComparison[] = [
  {
    provider: "META_CLOUD",
    evidenceLevel: "SYNTHETIC",
    availabilityPercent: null,
    deliverySuccessPercent: null,
    duplicateRatePercent: 0,
    operationalComplexity: "LOW",
    policyRisk: "LOW",
    costMicros: null
  },
  {
    provider: "WHATSAPP_WEB_BAILEYS",
    evidenceLevel: "SYNTHETIC",
    availabilityPercent: null,
    deliverySuccessPercent: null,
    duplicateRatePercent: 0,
    operationalComplexity: "HIGH",
    policyRisk: "HIGH",
    costMicros: null
  }
];

export function currentPilotAssessment(): PilotReadiness {
  return assessPilotReadiness({
    homologationDecision: "BLOCKED_NOT_EXECUTED",
    legalReviewStatus: "PENDING",
    selectedTeamMembers: 0,
    selectedConversations: 0,
    limits: CURRENT_PILOT_LIMITS,
    flags: {
      organizationEnabled: false,
      sessionEnabled: false,
      campaignsEnabled: false,
      aiMode: "DRAFT_ONLY",
      killSwitch: false
    },
    slis: DEFAULT_PILOT_SLIS,
    abortCriteria: PILOT_ABORT_CRITERIA,
    rollbackTestedSynthetic: true,
    dailyReviewDefined: true,
    providerComparison: SYNTHETIC_PROVIDER_COMPARISON,
    costMeasuredSynthetic: true,
    realPilotAuthorization: false
  });
}

export const PILOT_INSTANT_ROLLBACK = [
  "ACTIVATE_ORGANIZATION_AND_SESSION_KILL_SWITCH",
  "DISABLE_ORGANIZATION_AND_SESSION_FEATURE_FLAGS",
  "STOP_OUTBOX_CLAIMS",
  "PRESERVE_AUDIT_AND_PROVIDER_RECEIPTS",
  "RECONCILE_PENDING_COMMANDS_WITHOUT_RESEND",
  "PURGE_OR_DISABLE_SESSION_AFTER_APPROVAL",
  "ROUTE_ALL_CONVERSATIONS_TO_HUMANS"
] as const;

export const PILOT_DAILY_INCIDENT_REVIEW = [
  "OPEN_SECURITY_INCIDENTS",
  "RECONNECT_AND_LEASE_ALERTS",
  "DLQ_AND_RETRY_GROWTH",
  "DUPLICATE_SIDE_EFFECTS",
  "HANDOFF_LATENCY",
  "AI_DRAFT_REJECTIONS",
  "COST_AND_BUDGET_VARIANCE",
  "LEGAL_OR_COMPLIANCE_OBJECTIONS"
] as const;
