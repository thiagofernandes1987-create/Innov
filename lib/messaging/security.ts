import { createHash } from "node:crypto";

export const MESSAGING_SECURITY_ASSETS = [
  "SESSION_CREDENTIALS",
  "MESSAGE_CONTENT",
  "CONTACT_IDENTITIES",
  "MEDIA_OBJECTS",
  "CANONICAL_DOCUMENTS",
  "AI_CONTEXT",
  "AUDIT_EVENTS",
  "SIGNING_SECRETS"
] as const;

export const MESSAGING_TRUST_BOUNDARIES = [
  "PUBLIC_CLIENT_TO_APP",
  "APP_TO_SUPABASE",
  "APP_TO_GATEWAY",
  "GATEWAY_TO_PROVIDER_ADAPTER",
  "ADAPTER_TO_EXTERNAL_PROVIDER",
  "MEDIA_QUARANTINE_TO_CLEAN_STORAGE",
  "CANONICAL_SOURCES_TO_AI_CONTEXT",
  "OPERATOR_TO_CRITICAL_WRITE"
] as const;

export type StrideCategory = "SPOOFING" | "TAMPERING" | "REPUDIATION" | "INFORMATION_DISCLOSURE" | "DENIAL_OF_SERVICE" | "ELEVATION_OF_PRIVILEGE";

export type MessagingThreat = {
  id: string;
  category: StrideCategory;
  asset: (typeof MESSAGING_SECURITY_ASSETS)[number];
  boundary: (typeof MESSAGING_TRUST_BOUNDARIES)[number];
  scenario: string;
  control: string;
  residualRisk: "LOW" | "MEDIUM" | "HIGH";
};

export const MESSAGING_STRIDE_THREATS: readonly MessagingThreat[] = [
  { id: "S-01", category: "SPOOFING", asset: "SIGNING_SECRETS", boundary: "APP_TO_GATEWAY", scenario: "Comando interno forjado", control: "HMAC, timestamp, nonce e replay guard", residualRisk: "LOW" },
  { id: "T-01", category: "TAMPERING", asset: "MESSAGE_CONTENT", boundary: "GATEWAY_TO_PROVIDER_ADAPTER", scenario: "Payload alterado após validação", control: "Envelope versionado, hash e persist-before-dispatch", residualRisk: "MEDIUM" },
  { id: "R-01", category: "REPUDIATION", asset: "AUDIT_EVENTS", boundary: "OPERATOR_TO_CRITICAL_WRITE", scenario: "Operador nega aprovação", control: "Aprovação imutável com ator, motivo e timestamp", residualRisk: "LOW" },
  { id: "I-01", category: "INFORMATION_DISCLOSURE", asset: "SESSION_CREDENTIALS", boundary: "APP_TO_SUPABASE", scenario: "Credenciais aparecem em logs ou banco em claro", control: "Envelope encryption, redaction e acesso auditado", residualRisk: "MEDIUM" },
  { id: "D-01", category: "DENIAL_OF_SERVICE", asset: "MESSAGE_CONTENT", boundary: "PUBLIC_CLIENT_TO_APP", scenario: "Flood de eventos, mídia ou gerações", control: "Limites, backpressure, circuit breaker, quotas e anti-spam", residualRisk: "MEDIUM" },
  { id: "E-01", category: "ELEVATION_OF_PRIVILEGE", asset: "CANONICAL_DOCUMENTS", boundary: "CANONICAL_SOURCES_TO_AI_CONTEXT", scenario: "Documento tenta instruir IA a executar ferramenta", control: "Prompt injection filter, tool allowlist e aprovação crítica", residualRisk: "MEDIUM" }
];

const SENSITIVE_KEY = /(secret|token|credential|password|cookie|authorization|session|private[_-]?key|api[_-]?key)/i;
const SECRET_VALUE_PATTERNS = [
  /\bsk-[a-z0-9_-]{16,}\b/gi,
  /\b(?:eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\.[a-z0-9_-]{10,})\b/gi,
  /\b(?:bearer\s+)[a-z0-9._~+\/-]{16,}\b/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
];

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function redactString(value: string) {
  let output = value;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    output = output.replace(pattern, match => `[REDACTED:${fingerprint(match)}]`);
  }
  return output.slice(0, 4000);
}

export function sanitizeSecurityLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]";
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitizeSecurityLog(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).slice(0, 100).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? `[REDACTED_FIELD:${fingerprint(String(item))}]` : sanitizeSecurityLog(item, depth + 1)
      ])
    );
  }
  return String(value).slice(0, 1000);
}

export const MESSAGING_TOOL_ALLOWLIST = [
  "SEARCH_CANONICAL",
  "READ_PROJECT_STATUS",
  "RESOLVE_DOCUMENT_REFERENCE",
  "CREATE_HANDOFF_DRAFT",
  "CREATE_SAC_DRAFT"
] as const;

export type MessagingTool = (typeof MESSAGING_TOOL_ALLOWLIST)[number];

export class MessagingSecurityError extends Error {
  constructor(
    public readonly code:
      | "TOOL_NOT_ALLOWED"
      | "CRITICAL_APPROVAL_REQUIRED"
      | "TENANT_SCOPE_MISMATCH"
      | "RETENTION_POLICY_REQUIRED",
    message: string
  ) {
    super(message);
    this.name = "MessagingSecurityError";
  }
}

export function assertToolAllowed(tool: string): asserts tool is MessagingTool {
  if (!(MESSAGING_TOOL_ALLOWLIST as readonly string[]).includes(tool)) {
    throw new MessagingSecurityError("TOOL_NOT_ALLOWED", `Ferramenta não autorizada: ${tool}.`);
  }
}

export const CRITICAL_WRITES = [
  "SEND_MESSAGE",
  "DELETE_SESSION",
  "ROTATE_MASTER_KEY",
  "MERGE_CONTACT_IDENTITIES",
  "CHANGE_RETENTION_POLICY",
  "ENABLE_AUTOMATION",
  "REGISTER_REAL_NUMBER"
] as const;

export type CriticalWrite = (typeof CRITICAL_WRITES)[number];

export type CriticalApproval = {
  action: CriticalWrite;
  approvedBy: string;
  approvedAt: string;
  reason: string;
  expiresAt: string;
  scopeHash: string;
};

export function assertCriticalApproval(input: {
  action: CriticalWrite;
  approval: CriticalApproval | null;
  scope: Record<string, string>;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const expectedHash = createHash("sha256")
    .update(JSON.stringify(Object.entries(input.scope).sort(([a], [b]) => a.localeCompare(b))))
    .digest("hex");
  if (
    !input.approval ||
    input.approval.action !== input.action ||
    input.approval.scopeHash !== expectedHash ||
    new Date(input.approval.expiresAt).getTime() <= now.getTime() ||
    !input.approval.reason.trim()
  ) {
    throw new MessagingSecurityError("CRITICAL_APPROVAL_REQUIRED", `Ação crítica requer aprovação válida: ${input.action}.`);
  }
}

export type RetentionClass = "EPHEMERAL" | "OPERATIONAL" | "AUDIT" | "LEGAL_HOLD";

export function retentionDeadline(input: {
  retentionClass: RetentionClass;
  createdAt: Date;
  policyDays: Partial<Record<RetentionClass, number>>;
}) {
  if (input.retentionClass === "LEGAL_HOLD") return null;
  const days = input.policyDays[input.retentionClass];
  if (!Number.isInteger(days) || Number(days) < 1 || Number(days) > 3650) {
    throw new MessagingSecurityError("RETENTION_POLICY_REQUIRED", `Política inválida para ${input.retentionClass}.`);
  }
  return new Date(input.createdAt.getTime() + Number(days) * 86_400_000);
}

export function assertTenantScope(input: { authenticatedOrganizationId: string; resourceOrganizationId: string }) {
  if (input.authenticatedOrganizationId !== input.resourceOrganizationId) {
    throw new MessagingSecurityError("TENANT_SCOPE_MISMATCH", "Acesso cross-tenant bloqueado.");
  }
}

export type SessionCompromiseStep = {
  order: number;
  action: string;
  destructive: boolean;
  requiresApproval: boolean;
};

export function buildSessionCompromisePlan(): readonly SessionCompromiseStep[] {
  return [
    { order: 1, action: "ACTIVATE_GLOBAL_AND_SESSION_KILL_SWITCH", destructive: false, requiresApproval: false },
    { order: 2, action: "REVOKE_GATEWAY_COMMAND_SIGNING_KEYS", destructive: false, requiresApproval: false },
    { order: 3, action: "PRESERVE_IMMUTABLE_AUDIT_EVIDENCE", destructive: false, requiresApproval: false },
    { order: 4, action: "CRYPTOGRAPHIC_DELETE_SESSION_CREDENTIALS", destructive: true, requiresApproval: true },
    { order: 5, action: "ROTATE_MASTER_AND_DATA_KEYS", destructive: true, requiresApproval: true },
    { order: 6, action: "RECONCILE_OUTBOX_AND_PROVIDER_RECEIPTS", destructive: false, requiresApproval: false },
    { order: 7, action: "REAUTHORIZE_ONLY_AFTER_SECURITY_REVIEW", destructive: false, requiresApproval: true }
  ];
}
