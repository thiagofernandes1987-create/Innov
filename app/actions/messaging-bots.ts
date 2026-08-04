"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { validateDraftClaims } from "@/lib/messaging/ai";
import {
  normalizeBotTools,
  validateBotProfile,
  type BotProfile,
  type BotProviderId,
  type BotRetrievalMode
} from "@/lib/messaging/bots";
import {
  OpenAiProviderError,
  openAiMessagingEnvironmentStatus
} from "@/lib/messaging/openai-responses-provider";

const path = "/app/whatsapp/bots";

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function optional(data: FormData, key: string) {
  return text(data, key) || null;
}

function integer(data: FormData, key: string, fallback = 0) {
  const parsed = Number(text(data, key));
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function isRedirectError(error: unknown) {
  return Boolean(
    error && typeof error === "object" && "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (error instanceof OpenAiProviderError) return error.message;
  if (message.includes("BOT_NAME_INVALID")) return "Informe um nome de bot válido.";
  if (message.includes("BOT_SECRET_DETECTED")) return "As instruções não podem conter credenciais ou segredos.";
  if (message.includes("BOT_TOOL_NOT_ALLOWED")) return "Uma ferramenta selecionada não é permitida.";
  if (message.includes("BOT_NOT_READY")) return "Configure provedor, modelo, orçamento e limite por execução antes de habilitar o bot.";
  if (message.includes("BOT_QUEUE_SCOPE_MISMATCH")) return "A fila selecionada não pertence à organização.";
  if (message.includes("BOT_PROJECT_SCOPE_MISMATCH")) return "A obra selecionada não pertence à organização.";
  if (message.includes("AI_BUDGET_BELOW_CURRENT_USAGE")) return "O novo orçamento é menor que o valor já reservado ou consumido hoje.";
  if (message.includes("HUMAN_ASSIGNED")) return "A conversa está sob controle humano; a IA foi bloqueada.";
  if (message.includes("BUDGET")) return "O orçamento de IA não permite esta execução.";
  if (message.includes("CONVERSATION_BUSY")) return "Já existe uma geração em andamento para esta conversa.";
  return "A operação não pôde ser concluída. Revise os dados e tente novamente.";
}

function fail(message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function saveMessagingBotProfile(data: FormData) {
  const context = await requireCapability("whatsapp", "manage", optional(data, "projectId"));
  try {
    const providerId = (text(data, "providerId") || "DISABLED") as BotProviderId;
    const retrievalMode = (text(data, "retrievalMode") || "LEXICAL") as BotRetrievalMode;
    const profile = validateBotProfile({
      name: text(data, "name"),
      description: optional(data, "description"),
      enabledForDrafts: data.get("enabledForDrafts") !== null,
      providerId,
      modelId: optional(data, "modelId"),
      systemInstructions: text(data, "systemInstructions"),
      retrievalMode,
      allowedTools: normalizeBotTools(data.getAll("allowedTools").map(String)),
      maxOutputTokens: integer(data, "maxOutputTokens", 500),
      maxCostMicrosPerRun: integer(data, "maxCostMicrosPerRun"),
      priority: integer(data, "priority", 100),
      queueId: optional(data, "queueId"),
      projectId: optional(data, "projectId")
    });
    const { error } = await context.supabase.rpc("upsert_channel_bot_profile", {
      p_organization_id: context.organizationId,
      p_name: profile.name,
      p_description: profile.description,
      p_enabled_for_drafts: profile.enabledForDrafts,
      p_provider_id: profile.providerId,
      p_model_id: profile.modelId,
      p_system_instructions: profile.systemInstructions,
      p_retrieval_mode: profile.retrievalMode,
      p_allowed_tools: profile.allowedTools,
      p_max_output_tokens: profile.maxOutputTokens,
      p_max_cost_micros_per_run: profile.maxCostMicrosPerRun,
      p_priority: profile.priority,
      p_queue_id: profile.queueId,
      p_project_id: profile.projectId,
      p_profile_id: optional(data, "profileId")
    });
    if (error) throw new Error(`${error.code ?? "BOT_SAVE_FAILED"}:${error.message}`);
    revalidatePath(path);
    redirect(`${path}?success=${encodeURIComponent("Perfil de bot salvo. Nenhum envio automático foi habilitado.")}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    fail(safeMessage(error));
  }
}

export async function setMessagingAiBudget(data: FormData) {
  const context = await requireCapability("whatsapp", "manage");
  try {
    const maximum = integer(data, "maximumCostMicros");
    if (maximum < 0) throw new Error("AI_BUDGET_LIMIT_INVALID");
    const { error } = await context.supabase.rpc("set_channel_ai_daily_budget", {
      p_organization_id: context.organizationId,
      p_maximum_cost_micros: maximum
    });
    if (error) throw new Error(`${error.code ?? "AI_BUDGET_FAILED"}:${error.message}`);
    revalidatePath(path);
    redirect(`${path}?success=${encodeURIComponent("Orçamento diário de IA atualizado.")}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    fail(safeMessage(error));
  }
}

export async function setMessagingPluginPolicy(data: FormData) {
  const context = await requireCapability("whatsapp", "manage");
  try {
    const pluginId = text(data, "pluginId");
    const enabled = data.get("enabled") !== null;
    const priority = integer(data, "priority");
    const { error } = await context.supabase.rpc("set_channel_message_plugin_policy", {
      p_organization_id: context.organizationId,
      p_plugin_id: pluginId,
      p_enabled: enabled,
      p_priority: priority,
      p_required_permission: optional(data, "requiredPermission"),
      p_feature_flag: optional(data, "featureFlag"),
      p_configuration: {}
    });
    if (error) throw new Error(`${error.code ?? "PLUGIN_POLICY_FAILED"}:${error.message}`);
    revalidatePath(path);
    redirect(`${path}?success=${encodeURIComponent(`Política ${pluginId} atualizada.`)}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    fail(safeMessage(error));
  }
}

export type BotDraftTestState =
  | { ok: false; error: string }
  | {
      ok: true;
      draft: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      estimatedCostMicros: number;
      requiresHumanReview: true;
      claimWarnings: string[];
      sourceWarning: string;
    };

export async function testMessagingBotDraft(data: FormData): Promise<BotDraftTestState> {
  const context = await requireCapability("whatsapp", "update");
  const botId = text(data, "botId");
  const conversationId = text(data, "conversationId");
  const sampleMessage = text(data, "sampleMessage").slice(0, 2000);
  if (!botId || !conversationId || !sampleMessage) {
    return { ok: false, error: "Selecione bot, conversa e informe uma mensagem de teste." };
  }

  let lockOwner: string | null = null;
  let fencingToken: number | null = null;
  let reserved = 0;
  try {
    const [{ data: profileRow, error: profileError }, { data: conversation, error: conversationError }] = await Promise.all([
      context.supabase
        .from("channel_bot_profiles")
        .select("id,organization_id,name,enabled_for_drafts,provider_id,model_id,system_instructions,retrieval_mode,allowed_tools,max_output_tokens,max_cost_micros_per_run,queue_id,project_id")
        .eq("id", botId)
        .eq("organization_id", context.organizationId)
        .maybeSingle(),
      context.supabase
        .from("whatsapp_conversations")
        .select("id,organization_id,project_id,assigned_to,status")
        .eq("id", conversationId)
        .eq("organization_id", context.organizationId)
        .maybeSingle()
    ]);
    if (profileError || !profileRow) throw new Error("BOT_PROFILE_NOT_FOUND");
    if (conversationError || !conversation) throw new Error("CONVERSATION_NOT_FOUND");
    if (conversation.assigned_to) throw new Error("HUMAN_ASSIGNED");

    const profile: BotProfile = {
      id: String(profileRow.id),
      organizationId: String(profileRow.organization_id),
      name: String(profileRow.name),
      description: null,
      enabledForDrafts: Boolean(profileRow.enabled_for_drafts),
      providerId: String(profileRow.provider_id) === "OPENAI" ? "OPENAI" : "DISABLED",
      modelId: profileRow.model_id ? String(profileRow.model_id) : null,
      systemInstructions: String(profileRow.system_instructions),
      retrievalMode: String(profileRow.retrieval_mode) === "HYBRID" ? "HYBRID" : "LEXICAL",
      allowedTools: normalizeBotTools(Array.isArray(profileRow.allowed_tools) ? profileRow.allowed_tools.map(String) : []),
      maxOutputTokens: Number(profileRow.max_output_tokens),
      maxCostMicrosPerRun: Number(profileRow.max_cost_micros_per_run),
      priority: 100,
      queueId: profileRow.queue_id ? String(profileRow.queue_id) : null,
      projectId: profileRow.project_id ? String(profileRow.project_id) : null
    };
    if (!profile.enabledForDrafts || profile.providerId !== "OPENAI") throw new Error("BOT_NOT_READY");
    if (profile.projectId && profile.projectId !== String(conversation.project_id ?? "")) {
      throw new Error("BOT_PROJECT_SCOPE_MISMATCH");
    }

    lockOwner = `ui-test:${context.userId}:${randomUUID()}`;
    const { data: lock, error: lockError } = await context.supabase.rpc("claim_channel_ai_conversation", {
      p_organization_id: context.organizationId,
      p_conversation_id: conversationId,
      p_owner_id: lockOwner,
      p_ttl_seconds: 30
    });
    if (lockError) throw new Error(`${lockError.code ?? "AI_LOCK_FAILED"}:${lockError.message}`);
    fencingToken = Number(lock);
    if (!Number.isSafeInteger(fencingToken) || fencingToken < 1) throw new Error("CONVERSATION_BUSY");

    reserved = profile.maxCostMicrosPerRun;
    const { data: budgetReserved, error: budgetError } = await context.supabase.rpc("reserve_channel_ai_budget", {
      p_organization_id: context.organizationId,
      p_amount_micros: reserved
    });
    if (budgetError || !budgetReserved) throw new Error("BUDGET_EXCEEDED");

    const environment = openAiMessagingEnvironmentStatus();
    const provider = environment.createProvider();
    const output = await provider.generateDraft({
      systemInstructions: profile.systemInstructions,
      customerMessage: sampleMessage,
      context: {
        query: sampleMessage,
        citations: [],
        minimizedCharacters: 0,
        promptInjectionSignalsRemoved: 0,
        retrievalMode: profile.retrievalMode
      },
      allowedTools: [],
      maxOutputTokens: profile.maxOutputTokens
    });
    if (output.estimatedCostMicros > reserved) throw new Error("BUDGET_ACTUAL_EXCEEDED");
    const claims = validateDraftClaims(output.text, []);
    const { data: committed, error: commitError } = await context.supabase.rpc("commit_channel_ai_budget", {
      p_organization_id: context.organizationId,
      p_reserved_micros: reserved,
      p_actual_micros: output.estimatedCostMicros
    });
    if (commitError || !committed) throw new Error("BUDGET_COMMIT_FAILED");
    reserved = 0;

    await context.supabase.rpc("record_channel_ai_invocation", {
      p_organization_id: context.organizationId,
      p_conversation_id: conversationId,
      p_provider_id: provider.providerId,
      p_model_id: output.model,
      p_status: "DRAFT_CREATED",
      p_source_citations: [],
      p_tools_used: [],
      p_input_tokens: output.inputTokens,
      p_output_tokens: output.outputTokens,
      p_estimated_cost_micros: output.estimatedCostMicros,
      p_claim_validation: claims,
      p_prompt_injection_signals_removed: 0
    });

    return {
      ok: true,
      draft: output.text,
      model: output.model,
      inputTokens: output.inputTokens,
      outputTokens: output.outputTokens,
      estimatedCostMicros: output.estimatedCostMicros,
      requiresHumanReview: true,
      claimWarnings: [
        ...claims.unsupportedNumbers.map(value => `Número sem fonte: ${value}`),
        ...claims.unsupportedDates.map(value => `Data sem fonte: ${value}`),
        ...claims.commitmentSignals.map(value => `Compromisso detectado: ${value}`)
      ],
      sourceWarning: "Este teste ainda não recupera fontes canônicas; revise integralmente o conteúdo."
    };
  } catch (error) {
    return { ok: false, error: safeMessage(error) };
  } finally {
    if (reserved > 0) {
      await context.supabase.rpc("release_channel_ai_budget", {
        p_organization_id: context.organizationId,
        p_reserved_micros: reserved
      });
    }
    if (lockOwner && fencingToken) {
      await context.supabase.rpc("release_channel_ai_conversation", {
        p_organization_id: context.organizationId,
        p_conversation_id: conversationId,
        p_owner_id: lockOwner,
        p_fencing_token: fencingToken
      });
    }
  }
}
