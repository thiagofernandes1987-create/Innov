import { describe, expect, it } from "vitest";
import {
  MESSAGING_METRICS,
  MESSAGING_OPERATIONS_DASHBOARD,
  METRIC_LABEL_ALLOWLIST,
  MessagingTrace,
  evaluateMessagingAlerts,
  structuredMessagingLog,
  type MessagingOperationalSnapshot
} from "@/lib/messaging/observability";

function snapshot(overrides: Partial<MessagingOperationalSnapshot> = {}): MessagingOperationalSnapshot {
  return {
    sessionState: "CONNECTED",
    reconnectsInWindow: 0,
    dlqDepth: 0,
    leaseConflictsInWindow: 0,
    keyPersistenceFailuresInWindow: 0,
    ingressRatePerMinute: 10,
    egressRatePerMinute: 8,
    retryRate: 0.01,
    mediaQuarantineDepth: 0,
    aiCostMicrosToday: 100,
    observedAt: "2026-08-04T19:00:00.000Z",
    ...overrides
  };
}

const thresholds = {
  reconnectsPer15Minutes: 5,
  dlqDepth: 10,
  leaseConflictsPer15Minutes: 1,
  keyPersistenceFailuresPer15Minutes: 1
};

describe("observabilidade W-18", () => {
  it("cataloga métricas de sessão, tráfego, retry, DLQ, mídia, IA e custo", () => {
    expect(Object.values(MESSAGING_METRICS)).toEqual(
      expect.arrayContaining([
        "messaging_session_state",
        "messaging_ingress_total",
        "messaging_egress_total",
        "messaging_retry_total",
        "messaging_dlq_depth",
        "messaging_media_total",
        "messaging_ai_invocations_total",
        "messaging_ai_cost_micros_total"
      ])
    );
  });

  it("limita labels a baixa cardinalidade", () => {
    expect(METRIC_LABEL_ALLOWLIST).not.toContain("organization_id");
    expect(METRIC_LABEL_ALLOWLIST).not.toContain("conversation_id");
    expect(METRIC_LABEL_ALLOWLIST).toContain("provider");
  });

  it("estrutura e sanitiza logs", () => {
    const log = structuredMessagingLog({
      timestamp: "2026-08-04T19:00:00.000Z",
      level: "ERROR",
      event: "keys.persistence.failed",
      correlationId: "correlation-123",
      causationId: "causation-123",
      organizationFingerprint: "abc",
      conversationFingerprint: "def",
      provider: "WHATSAPP_WEB_BAILEYS",
      details: { token: "sk-1234567890abcdefghijklmnop", safe: "ok" }
    });
    expect(JSON.stringify(log.details)).not.toContain("sk-1234567890abcdefghijklmnop");
    expect(JSON.stringify(log.details)).toContain("REDACTED");
  });

  it("registra trace ponta a ponta sem atributos sensíveis", () => {
    const trace = new MessagingTrace("trace-1");
    trace.record({
      spanId: "span-1",
      parentSpanId: null,
      name: "ingress.persist",
      startedAt: "2026-08-04T19:00:00.000Z",
      endedAt: "2026-08-04T19:00:00.010Z",
      status: "OK",
      attributes: { provider: "META_CLOUD", body: "não deve sair", attempt: 1 }
    });
    expect(trace.export()).toHaveLength(1);
    expect(trace.export()[0].attributes).toEqual({ provider: "META_CLOUD", attempt: 1 });
  });

  it("alerta reconnect loop", () => {
    expect(evaluateMessagingAlerts(snapshot({ sessionState: "ACTION_REQUIRED", reconnectsInWindow: 6 }), thresholds)[0]).toMatchObject({
      code: "RECONNECT_LOOP",
      severity: "CRITICAL"
    });
  });

  it("alerta crescimento da DLQ", () => {
    expect(evaluateMessagingAlerts(snapshot({ dlqDepth: 20 }), thresholds)[0]).toMatchObject({
      code: "DLQ_GROWTH",
      severity: "CRITICAL"
    });
  });

  it("alerta perda ou disputa de lease", () => {
    expect(evaluateMessagingAlerts(snapshot({ leaseConflictsInWindow: 1 }), thresholds)[0]).toMatchObject({
      code: "LEASE_CONFLICT",
      severity: "CRITICAL"
    });
  });

  it("alerta falha de persistência de keys", () => {
    expect(evaluateMessagingAlerts(snapshot({ keyPersistenceFailuresInWindow: 1 }), thresholds)[0]).toMatchObject({
      code: "KEY_PERSISTENCE_FAILURE",
      severity: "CRITICAL"
    });
  });

  it("define dashboard operacional completo", () => {
    expect(MESSAGING_OPERATIONS_DASHBOARD.map(panel => panel.id)).toEqual([
      "sessions",
      "traffic",
      "reliability",
      "media",
      "ai"
    ]);
  });
});
