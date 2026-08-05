import { createHash } from "node:crypto";

export const PLAYBOOK_AUTONOMY_LEVELS = [
  "HUMAN_ONLY",
  "DRAFT_ASSIST",
  "AUTO_LOW_RISK"
] as const;
export type PlaybookAutonomy = typeof PLAYBOOK_AUTONOMY_LEVELS[number];

export const PLAYBOOK_SENSITIVITY_LEVELS = [
  "ROUTINE",
  "SENSITIVE",
  "CONTRACTUAL"
] as const;
export type PlaybookSensitivity = typeof PLAYBOOK_SENSITIVITY_LEVELS[number];

export type PlaybookVariableRule = {
  type: "string";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: readonly string[];
};

export type PlaybookVariableSchema = Readonly<Record<string, PlaybookVariableRule>>;

export type CommunicationPlaybookVersion = {
  id: string;
  playbookId: string;
  versionNumber: number;
  bindingId: string;
  variableSchema: PlaybookVariableSchema;
  autonomy: PlaybookAutonomy;
  sensitivity: PlaybookSensitivity;
  contentMode: "CANONICAL_ONLY";
  approvalRequired: boolean;
  approved: boolean;
};

export type CanonicalPlaybookSourceSnapshot = {
  sourceType: string;
  sourceId: string;
  sourceField: string;
  sourceVersion: number | null;
  sourceName: string;
  sha256: string;
  resolvedAt: string;
};

export type PlaybookExecutionSnapshot = {
  playbookVersionId: string;
  playbookVersionNumber: number;
  bindingId: string;
  variables: Readonly<Record<string, string>>;
  source: CanonicalPlaybookSourceSnapshot;
  resolved: Readonly<Record<string, unknown>>;
  contentSha256: string;
  capturedAt: string;
};

export class PlaybookPolicyError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PlaybookPolicyError";
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function validatePlaybookVariables(
  schema: PlaybookVariableSchema,
  input: Readonly<Record<string, unknown>>
): Readonly<Record<string, string>> {
  const allowed = new Set(Object.keys(schema));
  const unknown = Object.keys(input).filter(key => !allowed.has(key));
  if (unknown.length) {
    throw new PlaybookPolicyError("UNKNOWN_VARIABLE", `Variáveis não declaradas: ${unknown.join(", ")}.`);
  }

  const result: Record<string, string> = {};
  for (const [key, rule] of Object.entries(schema)) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") {
      if (rule.required) {
        throw new PlaybookPolicyError("REQUIRED_VARIABLE", `Variável obrigatória ausente: ${key}.`);
      }
      continue;
    }
    if (typeof raw !== "string") {
      throw new PlaybookPolicyError("INVALID_VARIABLE_TYPE", `A variável ${key} deve ser texto.`);
    }
    if (rule.minLength !== undefined && raw.length < rule.minLength) {
      throw new PlaybookPolicyError("VARIABLE_TOO_SHORT", `A variável ${key} é menor que o permitido.`);
    }
    if (rule.maxLength !== undefined && raw.length > rule.maxLength) {
      throw new PlaybookPolicyError("VARIABLE_TOO_LONG", `A variável ${key} excede o limite.`);
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(raw)) {
      throw new PlaybookPolicyError("VARIABLE_PATTERN_MISMATCH", `A variável ${key} não atende ao formato.`);
    }
    if (rule.enum && !rule.enum.includes(raw)) {
      throw new PlaybookPolicyError("VARIABLE_ENUM_MISMATCH", `A variável ${key} não possui valor permitido.`);
    }
    result[key] = raw;
  }
  return Object.freeze(result);
}

export function assertPlaybookPolicy(version: CommunicationPlaybookVersion): void {
  if (version.contentMode !== "CANONICAL_ONLY") {
    throw new PlaybookPolicyError("FREE_REWRITE_BLOCKED", "Playbooks vinculados usam somente conteúdo canônico.");
  }
  if (version.sensitivity === "CONTRACTUAL" && version.autonomy !== "HUMAN_ONLY") {
    throw new PlaybookPolicyError("CONTRACTUAL_AUTONOMY_BLOCKED", "Conteúdo contratual exige execução humana.");
  }
  if (version.sensitivity !== "ROUTINE" && !version.approvalRequired) {
    throw new PlaybookPolicyError("APPROVAL_REQUIRED", "Conteúdo sensível exige aprovação humana.");
  }
  if (version.approvalRequired && !version.approved) {
    throw new PlaybookPolicyError("VERSION_NOT_APPROVED", "A versão do playbook ainda não foi aprovada.");
  }
}

export function createPlaybookExecutionSnapshot(input: {
  version: CommunicationPlaybookVersion;
  variables: Readonly<Record<string, unknown>>;
  source: CanonicalPlaybookSourceSnapshot;
  resolved: Readonly<Record<string, unknown>>;
  capturedAt?: string;
  freeTextOverride?: string | null;
}): PlaybookExecutionSnapshot {
  assertPlaybookPolicy(input.version);
  if (input.freeTextOverride?.trim()) {
    throw new PlaybookPolicyError("FREE_REWRITE_BLOCKED", "Não é permitido substituir livremente a fonte canônica.");
  }
  if (!/^[0-9a-f]{64}$/.test(input.source.sha256)) {
    throw new PlaybookPolicyError("INVALID_SOURCE_SHA", "O snapshot da fonte não possui SHA-256 válido.");
  }
  const variables = validatePlaybookVariables(input.version.variableSchema, input.variables);
  const resolved = Object.freeze({ ...input.resolved });
  const contentSha256 = createHash("sha256")
    .update(stableJson({
      versionId: input.version.id,
      versionNumber: input.version.versionNumber,
      bindingId: input.version.bindingId,
      variables,
      source: input.source,
      resolved
    }))
    .digest("hex");
  return Object.freeze({
    playbookVersionId: input.version.id,
    playbookVersionNumber: input.version.versionNumber,
    bindingId: input.version.bindingId,
    variables,
    source: Object.freeze({ ...input.source }),
    resolved,
    contentSha256,
    capturedAt: input.capturedAt ?? new Date().toISOString()
  });
}

export function reproducePlaybookExecution(snapshot: PlaybookExecutionSnapshot): PlaybookExecutionSnapshot {
  return Object.freeze({
    ...snapshot,
    variables: Object.freeze({ ...snapshot.variables }),
    source: Object.freeze({ ...snapshot.source }),
    resolved: Object.freeze({ ...snapshot.resolved })
  });
}
