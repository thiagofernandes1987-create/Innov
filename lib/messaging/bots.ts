import { BOT_TEST_IMPLEMENTED_TOOLS } from "./canonical-retrieval";

export const BOT_ALLOWED_TOOLS = [
  "SEARCH_CANONICAL",
  "READ_PROJECT_STATUS",
  "READ_CANONICAL_DOCUMENT",
  "CREATE_HANDOFF"
] as const;
export type BotAllowedTool = (typeof BOT_ALLOWED_TOOLS)[number];
export type BotProviderId = "DISABLED" | "OPENAI";
export type BotRetrievalMode = "LEXICAL" | "HYBRID";

export type BotProfile = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  enabledForDrafts: boolean;
  providerId: BotProviderId;
  modelId: string | null;
  systemInstructions: string;
  retrievalMode: BotRetrievalMode;
  allowedTools: readonly BotAllowedTool[];
  maxOutputTokens: number;
  maxCostMicrosPerRun: number;
  priority: number;
  queueId: string | null;
  projectId: string | null;
};

export class BotConfigurationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "BotConfigurationError";
  }
}

export function normalizeBotTools(values: readonly string[]): BotAllowedTool[] {
  const allowed = new Set<string>(BOT_ALLOWED_TOOLS);
  return [...new Set(values.map(value => value.trim()).filter(value => allowed.has(value)))] as BotAllowedTool[];
}

export function validateBotProfile(input: Omit<BotProfile, "id" | "organizationId">) {
  if (input.name.trim().length < 3 || input.name.trim().length > 100) {
    throw new BotConfigurationError("BOT_NAME_INVALID", "O nome do bot deve ter entre 3 e 100 caracteres.");
  }
  if (input.systemInstructions.trim().length < 20 || input.systemInstructions.trim().length > 4000) {
    throw new BotConfigurationError("BOT_INSTRUCTIONS_INVALID", "As instruções devem ter entre 20 e 4000 caracteres.");
  }
  if (/(api[_ -]?key|secret|token|credential|password|cookie)\s*[:=]/i.test(input.systemInstructions)) {
    throw new BotConfigurationError("BOT_SECRET_DETECTED", "Não inclua credenciais nas instruções do bot.");
  }
  if (!Number.isInteger(input.maxOutputTokens) || input.maxOutputTokens < 64 || input.maxOutputTokens > 1200) {
    throw new BotConfigurationError("BOT_TOKEN_LIMIT_INVALID", "O limite de saída deve estar entre 64 e 1200 tokens.");
  }
  if (!Number.isSafeInteger(input.maxCostMicrosPerRun) || input.maxCostMicrosPerRun < 0) {
    throw new BotConfigurationError("BOT_COST_INVALID", "O custo máximo por execução é inválido.");
  }
  if (input.enabledForDrafts && (
    input.providerId === "DISABLED" || !input.modelId?.trim() || input.maxCostMicrosPerRun <= 0
  )) {
    throw new BotConfigurationError("BOT_NOT_READY", "Para habilitar rascunhos, configure provedor, modelo e custo máximo.");
  }
  const tools = normalizeBotTools(input.allowedTools);
  if (tools.length !== input.allowedTools.length) {
    throw new BotConfigurationError("BOT_TOOL_NOT_ALLOWED", "Uma ou mais ferramentas não são permitidas.");
  }
  return {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    modelId: input.modelId?.trim() || null,
    systemInstructions: input.systemInstructions.replace(/[\u0000-\u001f]/g, " ").trim(),
    allowedTools: tools
  };
}

export function deriveBotReadiness(input: {
  profile: BotProfile;
  providerConfigured: boolean;
  dailyBudgetMicros: number;
  consentPluginEnabled: boolean;
  aiPluginEnabled: boolean;
}) {
  const blockers: string[] = [];
  if (!input.profile.enabledForDrafts) blockers.push("Perfil desabilitado para rascunhos");
  if (input.profile.providerId === "DISABLED") blockers.push("Provedor não selecionado");
  if (!input.profile.modelId) blockers.push("Modelo não configurado");
  if (!input.providerConfigured) blockers.push("Credencial ou preço do provedor ausente no ambiente");
  if (input.dailyBudgetMicros <= 0) blockers.push("Orçamento diário de IA não configurado");
  if (!input.consentPluginEnabled) blockers.push("Plugin obrigatório de consentimento desabilitado");
  if (!input.aiPluginEnabled) blockers.push("Plugin AI_FALLBACK desabilitado");
  const implementedTools = new Set<string>(BOT_TEST_IMPLEMENTED_TOOLS);
  const unavailableTools = input.profile.allowedTools.filter(tool => !implementedTools.has(tool));
  if (unavailableTools.length) {
    blockers.push(`Ferramentas ainda não implementadas no teste: ${unavailableTools.join(", ")}`);
  }
  return {
    readyForDraftTest: blockers.length === 0,
    blockers,
    autonomyMode: "DRAFT_ONLY" as const,
    sendAllowed: false,
    humanReviewRequired: true,
    implementedTools: [...BOT_TEST_IMPLEMENTED_TOOLS]
  };
}
