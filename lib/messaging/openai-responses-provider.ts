import type { AiProvider, AiProviderInput, AiProviderOutput } from "./ai";

export class OpenAiProviderError extends Error {
  constructor(
    public readonly code: "NOT_CONFIGURED" | "TIMEOUT" | "UPSTREAM_ERROR" | "INVALID_RESPONSE",
    message: string
  ) {
    super(message);
    this.name = "OpenAiProviderError";
  }
}

type ResponsesPayload = {
  output_text?: unknown;
  output?: Array<{
    type?: unknown;
    content?: Array<{ type?: unknown; text?: unknown }>;
  }>;
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
  } | null;
  model?: unknown;
  error?: { message?: unknown } | null;
};

function finiteInteger(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function extractOutputText(payload: ResponsesPayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const parts = (payload.output ?? []).flatMap(item =>
    (item.content ?? [])
      .filter(content => content.type === "output_text" && typeof content.text === "string")
      .map(content => String(content.text).trim())
      .filter(Boolean)
  );
  return parts.join("\n").trim();
}

function buildInput(input: AiProviderInput) {
  const citations = input.context.citations.map((citation, index) => [
    `Fonte ${index + 1}: ${citation.title} v${citation.version}`,
    `SHA-256: ${citation.sha256}`,
    `Confiança: ${citation.trust}`,
    citation.excerpt
  ].join("\n"));
  return [
    "MENSAGEM DO CLIENTE:",
    input.customerMessage,
    "",
    "CONTEXTO INTERNO MINIMIZADO:",
    citations.length ? citations.join("\n\n---\n\n") : "Nenhuma fonte canônica foi recuperada.",
    "",
    "REGRAS DE SAÍDA:",
    "- Gere somente um rascunho em português do Brasil.",
    "- Não invente valores, datas, condições contratuais ou andamento de obra.",
    "- Quando faltarem dados, peça revisão humana no próprio rascunho.",
    "- Não diga que a mensagem foi enviada."
  ].join("\n");
}

export class OpenAiResponsesProvider implements AiProvider {
  readonly providerId = "OPENAI_RESPONSES";

  constructor(private readonly options: {
    apiKey: string;
    model: string;
    inputCostMicrosPerMillion: number;
    outputCostMicrosPerMillion: number;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }) {
    if (!options.apiKey.trim() || !options.model.trim()) {
      throw new OpenAiProviderError("NOT_CONFIGURED", "OpenAI não configurada para o módulo de mensagens.");
    }
    if (
      !Number.isFinite(options.inputCostMicrosPerMillion) || options.inputCostMicrosPerMillion < 0 ||
      !Number.isFinite(options.outputCostMicrosPerMillion) || options.outputCostMicrosPerMillion < 0
    ) {
      throw new OpenAiProviderError("NOT_CONFIGURED", "Custos do modelo não foram configurados.");
    }
  }

  async generateDraft(input: AiProviderInput): Promise<AiProviderOutput> {
    if (input.allowedTools.length > 0) {
      throw new OpenAiProviderError(
        "NOT_CONFIGURED",
        "Ferramentas internas devem ser executadas antes da chamada ao provedor; chamadas de ferramenta do modelo estão desabilitadas."
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000);
    try {
      const response = await (this.options.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.options.model,
          instructions: input.systemInstructions,
          input: buildInput(input),
          max_output_tokens: Math.max(64, Math.min(1200, input.maxOutputTokens)),
          store: false
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({})) as ResponsesPayload;
      if (!response.ok) {
        throw new OpenAiProviderError(
          "UPSTREAM_ERROR",
          typeof payload.error?.message === "string"
            ? `O provedor recusou a geração: ${payload.error.message.slice(0, 240)}`
            : `O provedor recusou a geração com status ${response.status}.`
        );
      }
      const text = extractOutputText(payload);
      if (!text) throw new OpenAiProviderError("INVALID_RESPONSE", "O provedor retornou uma resposta sem texto.");
      const inputTokens = finiteInteger(payload.usage?.input_tokens);
      const outputTokens = finiteInteger(payload.usage?.output_tokens);
      const estimatedCostMicros = Math.ceil(
        inputTokens * this.options.inputCostMicrosPerMillion / 1_000_000 +
        outputTokens * this.options.outputCostMicrosPerMillion / 1_000_000
      );
      return {
        text,
        model: typeof payload.model === "string" ? payload.model : this.options.model,
        inputTokens,
        outputTokens,
        estimatedCostMicros,
        toolsUsed: []
      };
    } catch (error) {
      if (error instanceof OpenAiProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenAiProviderError("TIMEOUT", "A geração excedeu o tempo limite.");
      }
      throw new OpenAiProviderError("UPSTREAM_ERROR", "Não foi possível consultar o provedor de IA.");
    } finally {
      clearTimeout(timeout);
    }
  }
}

function environmentNumber(name: string) {
  const raw = process.env[name];
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function openAiMessagingEnvironmentStatus() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MESSAGING_MODEL?.trim() ?? "";
  const inputCost = environmentNumber("OPENAI_MESSAGING_INPUT_COST_MICROS_PER_MILLION");
  const outputCost = environmentNumber("OPENAI_MESSAGING_OUTPUT_COST_MICROS_PER_MILLION");
  const blockers = [
    !apiKey ? "OPENAI_API_KEY" : null,
    !model ? "OPENAI_MESSAGING_MODEL" : null,
    inputCost === null ? "OPENAI_MESSAGING_INPUT_COST_MICROS_PER_MILLION" : null,
    outputCost === null ? "OPENAI_MESSAGING_OUTPUT_COST_MICROS_PER_MILLION" : null
  ].filter(Boolean) as string[];
  return {
    configured: blockers.length === 0,
    model: model || null,
    missingVariables: blockers,
    createProvider() {
      if (blockers.length) {
        throw new OpenAiProviderError("NOT_CONFIGURED", `Configuração ausente: ${blockers.join(", ")}.`);
      }
      return new OpenAiResponsesProvider({
        apiKey,
        model,
        inputCostMicrosPerMillion: inputCost ?? 0,
        outputCostMicrosPerMillion: outputCost ?? 0
      });
    }
  };
}
