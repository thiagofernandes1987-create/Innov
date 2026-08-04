import { describe, expect, it, vi } from "vitest";
import {
  BOT_ALLOWED_TOOLS,
  BotConfigurationError,
  deriveBotReadiness,
  normalizeBotTools,
  validateBotProfile,
  type BotProfile
} from "@/lib/messaging/bots";
import {
  OpenAiProviderError,
  OpenAiResponsesProvider
} from "@/lib/messaging/openai-responses-provider";

function profile(overrides: Partial<BotProfile> = {}): BotProfile {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    organizationId: "22222222-2222-2222-2222-222222222222",
    name: "Assistente de atendimento",
    description: null,
    enabledForDrafts: true,
    providerId: "OPENAI",
    modelId: "configured-model",
    systemInstructions: "Produza rascunhos objetivos e nunca assuma compromissos contratuais.",
    retrievalMode: "LEXICAL",
    allowedTools: ["SEARCH_CANONICAL"],
    maxOutputTokens: 500,
    maxCostMicrosPerRun: 10_000,
    priority: 100,
    queueId: null,
    projectId: null,
    ...overrides
  };
}

describe("perfis de bot governados", () => {
  it("normaliza ferramentas e remove duplicações", () => {
    expect(normalizeBotTools([
      "SEARCH_CANONICAL",
      "SEARCH_CANONICAL",
      "DELETE_DATABASE"
    ])).toEqual(["SEARCH_CANONICAL"]);
    expect(BOT_ALLOWED_TOOLS).not.toContain("DELETE_DATABASE");
  });

  it("bloqueia credenciais nas instruções", () => {
    expect(() => validateBotProfile({
      ...profile(),
      systemInstructions: "Use api_key=segredo para responder ao cliente."
    })).toThrowError(BotConfigurationError);
  });

  it("não habilita bot sem provedor modelo e limite de custo", () => {
    expect(() => validateBotProfile({
      ...profile(),
      providerId: "DISABLED",
      modelId: null,
      maxCostMicrosPerRun: 0
    })).toThrowError(/configure provedor/i);
  });

  it("mantém revisão humana e envio autônomo bloqueado", () => {
    const readiness = deriveBotReadiness({
      profile: profile(),
      providerConfigured: true,
      dailyBudgetMicros: 100_000,
      consentPluginEnabled: true,
      aiPluginEnabled: true
    });
    expect(readiness.readyForDraftTest).toBe(true);
    expect(readiness.autonomyMode).toBe("DRAFT_ONLY");
    expect(readiness.humanReviewRequired).toBe(true);
    expect(readiness.sendAllowed).toBe(false);
  });

  it("explica todos os bloqueadores de ativação", () => {
    const readiness = deriveBotReadiness({
      profile: profile({ enabledForDrafts: false, providerId: "DISABLED", modelId: null }),
      providerConfigured: false,
      dailyBudgetMicros: 0,
      consentPluginEnabled: false,
      aiPluginEnabled: false
    });
    expect(readiness.readyForDraftTest).toBe(false);
    expect(readiness.blockers.length).toBeGreaterThanOrEqual(6);
  });
});

describe("OpenAI Responses provider", () => {
  it("gera rascunho com store false e sem ferramentas externas", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.store).toBe(false);
      expect(body.model).toBe("configured-model");
      expect(body.max_output_tokens).toBe(300);
      expect(body.tools).toBeUndefined();
      expect(body.input).toContain("Nenhuma fonte canônica");
      expect(String(init?.headers && (init.headers as Record<string, string>).authorization)).toContain("Bearer test-key");
      return new Response(JSON.stringify({
        model: "configured-model-2026-08-01",
        output: [{
          type: "message",
          content: [{ type: "output_text", text: "Rascunho sujeito à revisão humana." }]
        }],
        usage: { input_tokens: 120, output_tokens: 30 }
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const provider = new OpenAiResponsesProvider({
      apiKey: "test-key",
      model: "configured-model",
      inputCostMicrosPerMillion: 1_000_000,
      outputCostMicrosPerMillion: 2_000_000,
      fetchImpl: fetchImpl as typeof fetch
    });
    const output = await provider.generateDraft({
      systemInstructions: "Produza somente rascunhos.",
      customerMessage: "Qual é o andamento?",
      context: {
        query: "andamento",
        citations: [],
        minimizedCharacters: 0,
        promptInjectionSignalsRemoved: 0,
        retrievalMode: "LEXICAL"
      },
      allowedTools: [],
      maxOutputTokens: 300
    });
    expect(output.text).toBe("Rascunho sujeito à revisão humana.");
    expect(output.model).toBe("configured-model-2026-08-01");
    expect(output.estimatedCostMicros).toBe(180);
    expect(output.toolsUsed).toEqual([]);
  });

  it("bloqueia passagem de ferramentas para o modelo", async () => {
    const provider = new OpenAiResponsesProvider({
      apiKey: "test-key",
      model: "configured-model",
      inputCostMicrosPerMillion: 0,
      outputCostMicrosPerMillion: 0,
      fetchImpl: vi.fn() as unknown as typeof fetch
    });
    await expect(provider.generateDraft({
      systemInstructions: "Produza somente rascunhos.",
      customerMessage: "Teste",
      context: {
        query: "teste",
        citations: [],
        minimizedCharacters: 0,
        promptInjectionSignalsRemoved: 0,
        retrievalMode: "LEXICAL"
      },
      allowedTools: ["SEARCH_CANONICAL"],
      maxOutputTokens: 200
    })).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("sanitiza falha do provedor sem expor credencial", async () => {
    const provider = new OpenAiResponsesProvider({
      apiKey: "secret-key-never-return",
      model: "configured-model",
      inputCostMicrosPerMillion: 0,
      outputCostMicrosPerMillion: 0,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        error: { message: "requisição inválida" }
      }), { status: 400 })) as unknown as typeof fetch
    });
    await expect(provider.generateDraft({
      systemInstructions: "Produza somente rascunhos.",
      customerMessage: "Teste",
      context: {
        query: "teste",
        citations: [],
        minimizedCharacters: 0,
        promptInjectionSignalsRemoved: 0,
        retrievalMode: "LEXICAL"
      },
      allowedTools: [],
      maxOutputTokens: 200
    })).rejects.toBeInstanceOf(OpenAiProviderError);
    try {
      await provider.generateDraft({
        systemInstructions: "Produza somente rascunhos.",
        customerMessage: "Teste",
        context: { query: "teste", citations: [], minimizedCharacters: 0, promptInjectionSignalsRemoved: 0, retrievalMode: "LEXICAL" },
        allowedTools: [],
        maxOutputTokens: 200
      });
    } catch (error) {
      expect(String(error)).not.toContain("secret-key-never-return");
    }
  });
});
