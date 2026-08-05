import { describe, expect, it, vi } from "vitest";
import {
  MessagePluginConfigurationError,
  MessagePluginPipeline,
  createAiFallbackPlugin,
  createAntiSpamPlugin,
  createConsentPlugin,
  createDefaultMessagePlugins,
  createDocumentPlugin,
  createHandoffPlugin,
  createProjectStatusPlugin,
  createQualificationPlugin,
  createSacPlugin,
  type MessagePlugin,
  type MessagePluginContext
} from "@/lib/messaging/plugins";

function context(overrides: Partial<MessagePluginContext> = {}): MessagePluginContext {
  return {
    organizationId: "11111111-1111-1111-1111-111111111111",
    conversationId: "22222222-2222-2222-2222-222222222222",
    messageId: "33333333-3333-3333-3333-333333333333",
    messageText: "Olá",
    senderIdentity: "PHONE:+5511999990001",
    receivedAt: "2026-08-04T18:00:00.000Z",
    consentStatus: "OPTED_IN",
    recentInboundCount: 1,
    humanAssigned: false,
    projectId: "44444444-4444-4444-4444-444444444444",
    projectStatus: "FUNDAÇÃO CONCLUÍDA",
    documentReference: "PROPOSTA-V3-SHA256",
    permissions: new Set([
      "messaging.qualification",
      "projects.read",
      "documents.read",
      "sac.create",
      "messaging.ai.draft"
    ]),
    featureFlags: new Set([
      "MESSAGING_ANTI_SPAM",
      "MESSAGING_QUALIFICATION",
      "MESSAGING_PROJECT_STATUS",
      "MESSAGING_DOCUMENTS",
      "MESSAGING_SAC",
      "MESSAGING_AI_DRAFT"
    ]),
    metadata: {},
    ...overrides
  };
}

describe("MessagePluginPipeline W-16", () => {
  it("executa em prioridade determinística e aplica short-circuit", async () => {
    const ai = vi.fn(async () => "rascunho IA");
    const pipeline = new MessagePluginPipeline(createDefaultMessagePlugins(ai));
    const result = await pipeline.execute(context({ messageText: "Quero um orçamento para reforma" }));
    expect(result.decision).toMatchObject({ kind: "RESPOND", pluginId: "QUALIFICATION" });
    expect(result.trace.map(item => item.pluginId)).toEqual(["CONSENT", "ANTI_SPAM", "QUALIFICATION"]);
    expect(ai).not.toHaveBeenCalled();
  });

  it("consentimento bloqueia antes de qualquer automação", async () => {
    const ai = vi.fn(async () => "não deve executar");
    const pipeline = new MessagePluginPipeline(createDefaultMessagePlugins(ai));
    const result = await pipeline.execute(context({ messageText: "não quero mais, cancelar", consentStatus: "OPTED_OUT" }));
    expect(result.decision).toEqual({ kind: "BLOCK", pluginId: "CONSENT", reason: "OPT_OUT" });
    expect(result.trace).toHaveLength(1);
    expect(ai).not.toHaveBeenCalled();
  });

  it("anti-spam bloqueia volume excessivo", async () => {
    const pipeline = new MessagePluginPipeline([createConsentPlugin(), createAntiSpamPlugin({ maximumRecentInbound: 3 })]);
    const result = await pipeline.execute(context({ recentInboundCount: 4 }));
    expect(result.decision).toMatchObject({ kind: "BLOCK", pluginId: "ANTI_SPAM" });
  });

  it("plugin de qualificação exige permissão e flag", async () => {
    const pipeline = new MessagePluginPipeline([createQualificationPlugin()]);
    const result = await pipeline.execute(
      context({ messageText: "Preciso de orçamento", permissions: new Set(), featureFlags: new Set() })
    );
    expect(result.decision.kind).toBe("CONTINUE");
    expect(result.trace[0]).toMatchObject({ executed: false, skippedReason: "PERMISSION_DENIED" });
  });

  it("plugin de status usa dado canônico e faz handoff sem contexto", async () => {
    const pipeline = new MessagePluginPipeline([createProjectStatusPlugin()]);
    const found = await pipeline.execute(context({ messageText: "Qual o andamento da obra?" }));
    expect(found.decision).toMatchObject({ kind: "RESPOND", pluginId: "PROJECT_STATUS" });
    const missing = await pipeline.execute(context({ messageText: "Qual o status?", projectStatus: null }));
    expect(missing.decision).toMatchObject({ kind: "HANDOFF", queue: "PROJECTS" });
  });

  it("plugin de documento resolve referência canônica ou encaminha", async () => {
    const pipeline = new MessagePluginPipeline([createDocumentPlugin()]);
    const found = await pipeline.execute(context({ messageText: "Envie o PDF da proposta" }));
    expect(found.decision).toMatchObject({ kind: "RESPOND", pluginId: "DOCUMENT" });
    const missing = await pipeline.execute(context({ messageText: "Quero o contrato", documentReference: null }));
    expect(missing.decision).toMatchObject({ kind: "HANDOFF", queue: "DOCUMENTS" });
  });

  it("plugin de SAC encaminha reclamação", async () => {
    const pipeline = new MessagePluginPipeline([createSacPlugin()]);
    const result = await pipeline.execute(context({ messageText: "Estou insatisfeito com o atraso" }));
    expect(result.decision).toMatchObject({ kind: "HANDOFF", pluginId: "SAC", queue: "SAC" });
  });

  it("plugin de handoff respeita operador já atribuído", async () => {
    const pipeline = new MessagePluginPipeline([createHandoffPlugin()]);
    const result = await pipeline.execute(context({ humanAssigned: true }));
    expect(result.decision).toMatchObject({ kind: "HANDOFF", reason: "HUMAN_REQUESTED" });
  });

  it("IA é último recurso, draft_only e nunca responde diretamente", async () => {
    const ai = vi.fn(async () => "rascunho revisável");
    const pipeline = new MessagePluginPipeline(createDefaultMessagePlugins(ai));
    const result = await pipeline.execute(context({ messageText: "Pergunta não coberta" }));
    expect(result.decision).toEqual({
      kind: "DRAFT",
      pluginId: "AI_FALLBACK",
      text: "rascunho revisável",
      reason: "LAST_RESORT",
      requiresHumanReview: true
    });
    expect(result.trace.at(-1)?.pluginId).toBe("AI_FALLBACK");
  });

  it("rejeita prioridade conflitante", () => {
    const first = createConsentPlugin(10);
    const second = createAntiSpamPlugin({ priority: 10 });
    expect(() => new MessagePluginPipeline([first, second])).toThrow(MessagePluginConfigurationError);
  });

  it("rejeita IA fora da última posição", () => {
    const ai = createAiFallbackPlugin(async () => "draft", 5);
    expect(() => new MessagePluginPipeline([ai, createConsentPlugin(10)])).toThrow(
      "plugin de IA deve ser obrigatoriamente o último"
    );
  });

  it("rejeita mais de um plugin de IA", () => {
    expect(() =>
      new MessagePluginPipeline([
        createAiFallbackPlugin(async () => "a", 900),
        { ...createAiFallbackPlugin(async () => "b", 1000), id: "AI_FALLBACK_2" }
      ])
    ).toThrow("Apenas um plugin de IA");
  });

  it("preserva CONTINUE quando nenhum plugin está habilitado", async () => {
    const plugin: MessagePlugin = {
      id: "FLAGGED",
      priority: 10,
      requiredPermission: null,
      featureFlag: "OFF",
      category: "WORKFLOW",
      async evaluate() {
        return { kind: "BLOCK", pluginId: "FLAGGED", reason: "SHOULD_NOT_RUN" };
      }
    };
    const result = await new MessagePluginPipeline([plugin]).execute(context({ featureFlags: new Set() }));
    expect(result.decision).toEqual({ kind: "CONTINUE", pluginId: "PIPELINE", reason: "NO_PLUGIN_MATCHED" });
  });
});
