import { sanitizeSecurityLog } from "@/lib/messaging/security";

export const MESSAGING_METRICS = {
  sessionState: "messaging_session_state",
  sessionReconnects: "messaging_session_reconnect_total",
  ingressTotal: "messaging_ingress_total",
  ingressLatency: "messaging_ingress_latency_ms",
  egressTotal: "messaging_egress_total",
  egressLatency: "messaging_egress_latency_ms",
  retryTotal: "messaging_retry_total",
  dlqDepth: "messaging_dlq_depth",
  mediaTotal: "messaging_media_total",
  mediaScanLatency: "messaging_media_scan_latency_ms",
  aiInvocations: "messaging_ai_invocations_total",
  aiTokens: "messaging_ai_tokens_total",
  aiCostMicros: "messaging_ai_cost_micros_total",
  leaseConflicts: "messaging_lease_conflict_total",
  keyPersistenceFailures: "messaging_key_persistence_failure_total"
} as const;

export const METRIC_LABEL_ALLOWLIST = [
  "provider",
  "direction",
  "state",
  "result",
  "media_type",
  "model_class",
  "reason_class"
] as const;

export type MetricLabel = (typeof METRIC_LABEL_ALLOWLIST)[number];
export type MetricLabels = Partial<Record<MetricLabel, string>>;

export interface MessagingTelemetry {
  counter(name: string, value: number, labels?: MetricLabels): void;
  gauge(name: string, value: number, labels?: MetricLabels): void;
  histogram(name: string, value: number, labels?: MetricLabels): void;
  log(event: MessagingStructuredLog): void;
  span(span: MessagingTraceSpan): void;
}

export type MessagingStructuredLog = {
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  event: string;
  correlationId: string;
  causationId: string | null;
  organizationFingerprint: string | null;
  conversationFingerprint: string | null;
  provider: string | null;
  details: Readonly<Record<string, unknown>>;
};

export function structuredMessagingLog(input: MessagingStructuredLog): MessagingStructuredLog {
  return {
    ...input,
    event: input.event.slice(0, 120),
    correlationId: input.correlationId.slice(0, 160),
    causationId: input.causationId?.slice(0, 160) ?? null,
    organizationFingerprint: input.organizationFingerprint?.slice(0, 64) ?? null,
    conversationFingerprint: input.conversationFingerprint?.slice(0, 64) ?? null,
    provider: input.provider?.slice(0, 80) ?? null,
    details: sanitizeSecurityLog(input.details) as Readonly<Record<string, unknown>>
  };
}

export type MessagingTraceSpan = {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startedAt: string;
  endedAt: string;
  status: "OK" | "ERROR";
  attributes: Readonly<Record<string, string | number | boolean>>;
};

export class MessagingTrace {
  private readonly spans: MessagingTraceSpan[] = [];

  constructor(public readonly traceId: string) {}

  record(input: Omit<MessagingTraceSpan, "traceId">) {
    if (new Date(input.endedAt).getTime() < new Date(input.startedAt).getTime()) {
      throw new Error("TRACE_TIME_INVALID");
    }
    const span: MessagingTraceSpan = {
      ...input,
      traceId: this.traceId,
      name: input.name.slice(0, 120),
      attributes: Object.fromEntries(
        Object.entries(input.attributes)
          .filter(([key]) => !/(secret|token|credential|body|content)/i.test(key))
          .slice(0, 40)
      )
    };
    this.spans.push(span);
    return span;
  }

  export(): readonly MessagingTraceSpan[] {
    return [...this.spans].sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  }
}

export type MessagingOperationalSnapshot = {
  sessionState: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DEGRADED" | "ACTION_REQUIRED";
  reconnectsInWindow: number;
  dlqDepth: number;
  leaseConflictsInWindow: number;
  keyPersistenceFailuresInWindow: number;
  ingressRatePerMinute: number;
  egressRatePerMinute: number;
  retryRate: number;
  mediaQuarantineDepth: number;
  aiCostMicrosToday: number;
  observedAt: string;
};

export type MessagingAlertCode =
  | "RECONNECT_LOOP"
  | "DLQ_GROWTH"
  | "LEASE_CONFLICT"
  | "KEY_PERSISTENCE_FAILURE";

export type MessagingAlert = {
  code: MessagingAlertCode;
  severity: "WARNING" | "CRITICAL";
  summary: string;
  value: number;
  threshold: number;
  runbook: string;
};

export type MessagingAlertThresholds = {
  reconnectsPer15Minutes: number;
  dlqDepth: number;
  leaseConflictsPer15Minutes: number;
  keyPersistenceFailuresPer15Minutes: number;
};

export function evaluateMessagingAlerts(
  snapshot: MessagingOperationalSnapshot,
  thresholds: MessagingAlertThresholds
): readonly MessagingAlert[] {
  const alerts: MessagingAlert[] = [];
  if (snapshot.reconnectsInWindow >= thresholds.reconnectsPer15Minutes) {
    alerts.push({
      code: "RECONNECT_LOOP",
      severity: snapshot.sessionState === "ACTION_REQUIRED" ? "CRITICAL" : "WARNING",
      summary: "Sessão em loop de reconexão.",
      value: snapshot.reconnectsInWindow,
      threshold: thresholds.reconnectsPer15Minutes,
      runbook: "RUNBOOK-DESCONEXAO-W18.md"
    });
  }
  if (snapshot.dlqDepth >= thresholds.dlqDepth) {
    alerts.push({
      code: "DLQ_GROWTH",
      severity: snapshot.dlqDepth >= thresholds.dlqDepth * 2 ? "CRITICAL" : "WARNING",
      summary: "Profundidade da DLQ acima do limite.",
      value: snapshot.dlqDepth,
      threshold: thresholds.dlqDepth,
      runbook: "RUNBOOK-ROLLBACK-W18.md"
    });
  }
  if (snapshot.leaseConflictsInWindow >= thresholds.leaseConflictsPer15Minutes) {
    alerts.push({
      code: "LEASE_CONFLICT",
      severity: "CRITICAL",
      summary: "Conflitos de lease indicam disputa de single writer.",
      value: snapshot.leaseConflictsInWindow,
      threshold: thresholds.leaseConflictsPer15Minutes,
      runbook: "RUNBOOK-DESCONEXAO-W18.md"
    });
  }
  if (snapshot.keyPersistenceFailuresInWindow >= thresholds.keyPersistenceFailuresPer15Minutes) {
    alerts.push({
      code: "KEY_PERSISTENCE_FAILURE",
      severity: "CRITICAL",
      summary: "Falha ao persistir atualização de keys.",
      value: snapshot.keyPersistenceFailuresInWindow,
      threshold: thresholds.keyPersistenceFailuresPer15Minutes,
      runbook: "RUNBOOK-ROLLBACK-W18.md"
    });
  }
  return alerts;
}

export type DashboardPanel = {
  id: string;
  title: string;
  metrics: readonly string[];
  purpose: string;
};

export const MESSAGING_OPERATIONS_DASHBOARD: readonly DashboardPanel[] = [
  { id: "sessions", title: "Sessões e lifecycle", metrics: [MESSAGING_METRICS.sessionState, MESSAGING_METRICS.sessionReconnects, MESSAGING_METRICS.leaseConflicts], purpose: "Estado, reconnect e single writer" },
  { id: "traffic", title: "Ingress e egress", metrics: [MESSAGING_METRICS.ingressTotal, MESSAGING_METRICS.ingressLatency, MESSAGING_METRICS.egressTotal, MESSAGING_METRICS.egressLatency], purpose: "Volume e latência ponta a ponta" },
  { id: "reliability", title: "Retry e DLQ", metrics: [MESSAGING_METRICS.retryTotal, MESSAGING_METRICS.dlqDepth], purpose: "Falhas recuperáveis e definitivas" },
  { id: "media", title: "Mídia segura", metrics: [MESSAGING_METRICS.mediaTotal, MESSAGING_METRICS.mediaScanLatency], purpose: "Quarentena, scan e promoção" },
  { id: "ai", title: "IA e custo", metrics: [MESSAGING_METRICS.aiInvocations, MESSAGING_METRICS.aiTokens, MESSAGING_METRICS.aiCostMicros], purpose: "Uso, tokens e custo por classe" }
];
