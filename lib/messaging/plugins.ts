export type MessagePluginDecision =
  | { kind: "CONTINUE"; pluginId: string; reason: string }
  | { kind: "RESPOND"; pluginId: string; text: string; reason: string; requiresHumanReview: boolean }
  | { kind: "BLOCK"; pluginId: string; reason: string }
  | { kind: "HANDOFF"; pluginId: string; reason: string; queue: string }
  | { kind: "DRAFT"; pluginId: string; text: string; reason: string; requiresHumanReview: true };

export type MessagePluginContext = {
  organizationId: string;
  conversationId: string;
  messageId: string;
  messageText: string;
  senderIdentity: string;
  receivedAt: string;
  consentStatus: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  recentInboundCount: number;
  humanAssigned: boolean;
  projectId: string | null;
  projectStatus: string | null;
  documentReference: string | null;
  permissions: ReadonlySet<string>;
  featureFlags: ReadonlySet<string>;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
};

export interface MessagePlugin {
  readonly id: string;
  readonly priority: number;
  readonly requiredPermission: string | null;
  readonly featureFlag: string | null;
  readonly category:
    | "CONSENT"
    | "SAFETY"
    | "WORKFLOW"
    | "DOCUMENT"
    | "SAC"
    | "HANDOFF"
    | "AI";
  evaluate(context: MessagePluginContext): Promise<MessagePluginDecision>;
}

export type MessagePluginTrace = {
  pluginId: string;
  priority: number;
  executed: boolean;
  skippedReason: string | null;
  decision: MessagePluginDecision["kind"] | null;
};

export type MessagePluginPipelineResult = {
  decision: MessagePluginDecision;
  trace: readonly MessagePluginTrace[];
};

export class MessagePluginConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessagePluginConfigurationError";
  }
}

function assertConfiguration(plugins: readonly MessagePlugin[]) {
  const ids = new Set<string>();
  const priorities = new Map<number, string>();
  for (const plugin of plugins) {
    if (ids.has(plugin.id)) throw new MessagePluginConfigurationError(`Plugin duplicado: ${plugin.id}.`);
    ids.add(plugin.id);
    const conflict = priorities.get(plugin.priority);
    if (conflict) {
      throw new MessagePluginConfigurationError(
        `Prioridade conflitante ${plugin.priority}: ${conflict} e ${plugin.id}.`
      );
    }
    priorities.set(plugin.priority, plugin.id);
  }
  const aiPlugins = plugins.filter(plugin => plugin.category === "AI");
  if (aiPlugins.length > 1) throw new MessagePluginConfigurationError("Apenas um plugin de IA é permitido.");
  if (aiPlugins.length === 1) {
    const maximum = Math.max(...plugins.map(plugin => plugin.priority));
    if (aiPlugins[0].priority !== maximum) {
      throw new MessagePluginConfigurationError("O plugin de IA deve ser obrigatoriamente o último.");
    }
  }
}

export class MessagePluginPipeline {
  private readonly plugins: readonly MessagePlugin[];

  constructor(plugins: readonly MessagePlugin[]) {
    assertConfiguration(plugins);
    this.plugins = [...plugins].sort((left, right) => left.priority - right.priority);
  }

  async execute(context: MessagePluginContext): Promise<MessagePluginPipelineResult> {
    const trace: MessagePluginTrace[] = [];
    for (const plugin of this.plugins) {
      if (plugin.requiredPermission && !context.permissions.has(plugin.requiredPermission)) {
        trace.push({
          pluginId: plugin.id,
          priority: plugin.priority,
          executed: false,
          skippedReason: "PERMISSION_DENIED",
          decision: null
        });
        continue;
      }
      if (plugin.featureFlag && !context.featureFlags.has(plugin.featureFlag)) {
        trace.push({
          pluginId: plugin.id,
          priority: plugin.priority,
          executed: false,
          skippedReason: "FEATURE_DISABLED",
          decision: null
        });
        continue;
      }
      const decision = await plugin.evaluate(context);
      trace.push({
        pluginId: plugin.id,
        priority: plugin.priority,
        executed: true,
        skippedReason: null,
        decision: decision.kind
      });
      if (decision.kind !== "CONTINUE") return { decision, trace };
    }
    return {
      decision: { kind: "CONTINUE", pluginId: "PIPELINE", reason: "NO_PLUGIN_MATCHED" },
      trace
    };
  }
}

function continueDecision(pluginId: string, reason = "NOT_APPLICABLE"): MessagePluginDecision {
  return { kind: "CONTINUE", pluginId, reason };
}

function normalized(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function createConsentPlugin(priority = 10): MessagePlugin {
  const optOut = /\b(sair|parar|cancelar|nao quero|remover|descadastrar)\b/i;
  return {
    id: "CONSENT",
    priority,
    requiredPermission: null,
    featureFlag: null,
    category: "CONSENT",
    async evaluate(context) {
      const text = normalized(context.messageText);
      if (context.consentStatus === "OPTED_OUT" || optOut.test(text)) {
        return { kind: "BLOCK", pluginId: "CONSENT", reason: "OPT_OUT" };
      }
      return continueDecision("CONSENT", context.consentStatus === "OPTED_IN" ? "CONSENT_OK" : "CONSENT_UNKNOWN");
    }
  };
}

export function createAntiSpamPlugin(options: { priority?: number; maximumRecentInbound?: number } = {}): MessagePlugin {
  const maximum = options.maximumRecentInbound ?? 12;
  return {
    id: "ANTI_SPAM",
    priority: options.priority ?? 20,
    requiredPermission: null,
    featureFlag: null,
    category: "SAFETY",
    async evaluate(context) {
      if (context.recentInboundCount > maximum) {
        return { kind: "BLOCK", pluginId: "ANTI_SPAM", reason: "RATE_LIMIT_EXCEEDED" };
      }
      return continueDecision("ANTI_SPAM", "RATE_OK");
    }
  };
}

export function createQualificationPlugin(priority = 30): MessagePlugin {
  const qualification = /\b(orcamento|cotacao|construir|reforma|proposta)\b/i;
  return {
    id: "QUALIFICATION",
    priority,
    requiredPermission: "messaging.qualification",
    featureFlag: "MESSAGING_QUALIFICATION",
    category: "WORKFLOW",
    async evaluate(context) {
      if (!qualification.test(normalized(context.messageText))) return continueDecision("QUALIFICATION");
      return {
        kind: "RESPOND",
        pluginId: "QUALIFICATION",
        text: "Rascunho de qualificação: registrar tipo de obra, local, área estimada e prazo desejado.",
        reason: "QUALIFICATION_INTENT",
        requiresHumanReview: true
      };
    }
  };
}

export function createProjectStatusPlugin(priority = 40): MessagePlugin {
  const statusIntent = /\b(status|andamento|cronograma|obra esta|obra está)\b/i;
  return {
    id: "PROJECT_STATUS",
    priority,
    requiredPermission: "projects.read",
    featureFlag: "MESSAGING_PROJECT_STATUS",
    category: "WORKFLOW",
    async evaluate(context) {
      if (!statusIntent.test(normalized(context.messageText))) return continueDecision("PROJECT_STATUS");
      if (!context.projectId || !context.projectStatus) {
        return { kind: "HANDOFF", pluginId: "PROJECT_STATUS", reason: "PROJECT_CONTEXT_MISSING", queue: "PROJECTS" };
      }
      return {
        kind: "RESPOND",
        pluginId: "PROJECT_STATUS",
        text: `Rascunho baseado no status canônico da obra: ${context.projectStatus}.`,
        reason: "PROJECT_STATUS_FOUND",
        requiresHumanReview: true
      };
    }
  };
}

export function createDocumentPlugin(priority = 50): MessagePlugin {
  const documentIntent = /\b(documento|contrato|proposta|pdf|arquivo)\b/i;
  return {
    id: "DOCUMENT",
    priority,
    requiredPermission: "documents.read",
    featureFlag: "MESSAGING_DOCUMENTS",
    category: "DOCUMENT",
    async evaluate(context) {
      if (!documentIntent.test(normalized(context.messageText))) return continueDecision("DOCUMENT");
      if (!context.documentReference) {
        return { kind: "HANDOFF", pluginId: "DOCUMENT", reason: "DOCUMENT_NOT_RESOLVED", queue: "DOCUMENTS" };
      }
      return {
        kind: "RESPOND",
        pluginId: "DOCUMENT",
        text: `Rascunho para envio do documento canônico ${context.documentReference}.`,
        reason: "CANONICAL_DOCUMENT_RESOLVED",
        requiresHumanReview: true
      };
    }
  };
}

export function createSacPlugin(priority = 60): MessagePlugin {
  const complaint = /\b(reclamacao|reclamação|problema|defeito|atraso|insatisfeito|sac)\b/i;
  return {
    id: "SAC",
    priority,
    requiredPermission: "sac.create",
    featureFlag: "MESSAGING_SAC",
    category: "SAC",
    async evaluate(context) {
      if (!complaint.test(normalized(context.messageText))) return continueDecision("SAC");
      return { kind: "HANDOFF", pluginId: "SAC", reason: "SAC_INTENT", queue: "SAC" };
    }
  };
}

export function createHandoffPlugin(priority = 70): MessagePlugin {
  const humanRequest = /\b(atendente|pessoa|humano|engenheiro|responsavel|responsável)\b/i;
  return {
    id: "HANDOFF",
    priority,
    requiredPermission: null,
    featureFlag: null,
    category: "HANDOFF",
    async evaluate(context) {
      if (context.humanAssigned || humanRequest.test(normalized(context.messageText))) {
        return { kind: "HANDOFF", pluginId: "HANDOFF", reason: "HUMAN_REQUESTED", queue: "GENERAL" };
      }
      return continueDecision("HANDOFF");
    }
  };
}

export function createAiFallbackPlugin(
  draft: (context: MessagePluginContext) => Promise<string>,
  priority = 1000
): MessagePlugin {
  return {
    id: "AI_FALLBACK",
    priority,
    requiredPermission: "messaging.ai.draft",
    featureFlag: "MESSAGING_AI_DRAFT",
    category: "AI",
    async evaluate(context) {
      const text = await draft(context);
      return { kind: "DRAFT", pluginId: "AI_FALLBACK", text, reason: "LAST_RESORT", requiresHumanReview: true };
    }
  };
}

export function createDefaultMessagePlugins(
  aiDraft: (context: MessagePluginContext) => Promise<string>
): readonly MessagePlugin[] {
  return [
    createConsentPlugin(),
    createAntiSpamPlugin(),
    createQualificationPlugin(),
    createProjectStatusPlugin(),
    createDocumentPlugin(),
    createSacPlugin(),
    createHandoffPlugin(),
    createAiFallbackPlugin(aiDraft)
  ];
}
