export const CANONICAL_MESSAGE_PLUGIN_POLICIES = [
  { pluginId: "CONSENT", priority: 10, mandatory: true, requiredPermission: null, featureFlag: null },
  { pluginId: "ANTI_SPAM", priority: 20, mandatory: true, requiredPermission: null, featureFlag: null },
  { pluginId: "QUALIFICATION", priority: 30, mandatory: false, requiredPermission: "messaging.qualification", featureFlag: "MESSAGING_QUALIFICATION" },
  { pluginId: "PROJECT_STATUS", priority: 40, mandatory: false, requiredPermission: "projects.read", featureFlag: "MESSAGING_PROJECT_STATUS" },
  { pluginId: "DOCUMENT", priority: 50, mandatory: false, requiredPermission: "documents.read", featureFlag: "MESSAGING_DOCUMENTS" },
  { pluginId: "SAC", priority: 60, mandatory: false, requiredPermission: "sac.create", featureFlag: "MESSAGING_SAC" },
  { pluginId: "HANDOFF", priority: 70, mandatory: true, requiredPermission: null, featureFlag: null },
  { pluginId: "AI_FALLBACK", priority: 1000, mandatory: false, requiredPermission: "messaging.ai.draft", featureFlag: "MESSAGING_AI_DRAFT" }
] as const;

export type CanonicalMessagePluginId = (typeof CANONICAL_MESSAGE_PLUGIN_POLICIES)[number]["pluginId"];

const policyMap = new Map<string, (typeof CANONICAL_MESSAGE_PLUGIN_POLICIES)[number]>(
  CANONICAL_MESSAGE_PLUGIN_POLICIES.map(policy => [policy.pluginId, policy])
);

export class MessagePluginPolicyError extends Error {
  constructor(public readonly code: "INVALID_PLUGIN" | "MANDATORY_PLUGIN", message: string) {
    super(message);
    this.name = "MessagePluginPolicyError";
  }
}

export function canonicalMessagePluginPolicy(pluginId: string) {
  const policy = policyMap.get(pluginId);
  if (!policy) throw new MessagePluginPolicyError("INVALID_PLUGIN", "Plugin de mensagens inválido.");
  return policy;
}

export function normalizeMessagePluginPolicyRequest(input: {
  pluginId: string;
  enabled: boolean;
}) {
  const policy = canonicalMessagePluginPolicy(input.pluginId);
  if (policy.mandatory && !input.enabled) {
    throw new MessagePluginPolicyError(
      "MANDATORY_PLUGIN",
      `${policy.pluginId} é obrigatório e não pode ser desabilitado.`
    );
  }
  return {
    ...policy,
    enabled: policy.mandatory ? true : input.enabled
  };
}
