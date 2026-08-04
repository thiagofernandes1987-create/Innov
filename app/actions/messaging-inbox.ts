"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import type { OperatorPresence } from "@/lib/messaging/inbox";

const path = "/app/whatsapp/inbox";
const allowedReturnKeys = new Set([
  "provider",
  "account",
  "queue",
  "assignee",
  "project",
  "state",
  "unread",
  "q"
]);

function required(data: FormData, key: string): string {
  const value = String(data.get(key) ?? "").trim();
  if (!value) throw new Error(`REQUIRED_FIELD:${key}`);
  return value;
}

function optional(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}

function isRedirectError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function returnParams(data: FormData) {
  const params = new URLSearchParams();
  const query = String(data.get("returnQuery") ?? "");
  for (const [key, value] of new URLSearchParams(query)) {
    if (allowedReturnKeys.has(key) && value) params.set(key, value.slice(0, 200));
  }
  return params;
}

function returnTo(
  data: FormData,
  conversationId?: string | null,
  result?: { success?: string; error?: string }
) {
  const params = returnParams(data);
  if (conversationId) params.set("conversation", conversationId);
  if (result?.success) params.set("success", result.success);
  if (result?.error) params.set("error", result.error);
  return params.size ? `${path}?${params.toString()}` : path;
}

function publicError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (raw.includes("OWNERSHIP_VERSION_CONFLICT")) {
    return "Este atendimento foi alterado por outro usuário. Recarregue a conversa e tente novamente.";
  }
  if (raw.includes("ASSIGNEE_NOT_FOUND")) return "O responsável selecionado não está mais disponível.";
  if (raw.includes("QUEUE_SCOPE_MISMATCH")) return "A fila selecionada não pertence a esta organização.";
  if (raw.includes("ASSIGNMENT_REASON_REQUIRED") || raw.includes("REQUIRED_FIELD:reason")) {
    return "Informe um motivo com pelo menos três caracteres.";
  }
  if (raw.includes("INVALID_PRESENCE")) return "Selecione um estado de presença válido.";
  if (raw.includes("ACCESS_DENIED") || raw.includes("FORBIDDEN")) {
    return "Você não possui permissão para executar esta ação.";
  }
  if (raw.includes("CONVERSATION_NOT_FOUND")) return "A conversa não foi encontrada ou foi arquivada.";
  if (raw.includes("REQUIRED_FIELD:body")) return "Digite o conteúdo da nota interna.";
  return "A operação não pôde ser concluída. Recarregue a página e tente novamente.";
}

function validPresence(value: string): OperatorPresence {
  if (["ONLINE", "AWAY", "BUSY", "OFFLINE"].includes(value)) return value as OperatorPresence;
  throw new Error("INVALID_PRESENCE");
}

export async function assignMessagingConversation(data: FormData) {
  let conversationId = optional(data, "conversationId");
  try {
    const context = await requireCapability("whatsapp", "update");
    conversationId = required(data, "conversationId");
    const expectedVersion = Number(required(data, "ownershipVersion"));
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("OWNERSHIP_VERSION_INVALID");
    }
    const { error } = await context.supabase.rpc("assign_channel_conversation", {
      p_conversation_id: conversationId,
      p_new_assignee_id: optional(data, "assigneeId"),
      p_new_queue_id: optional(data, "queueId"),
      p_expected_version: expectedVersion,
      p_reason: required(data, "reason")
    });
    if (error) throw new Error(`ASSIGNMENT_FAILED:${error.code ?? "UNKNOWN"}:${error.message}`);
    revalidatePath(path);
    redirect(returnTo(data, conversationId, { success: "Atendimento atualizado." }));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(returnTo(data, conversationId, { error: publicError(error) }));
  }
}

export async function addMessagingConversationNote(data: FormData) {
  let conversationId = optional(data, "conversationId");
  try {
    const context = await requireCapability("whatsapp", "update");
    conversationId = required(data, "conversationId");
    const body = required(data, "body");
    if (body.length > 4000) throw new Error("NOTE_TOO_LONG");
    const { error } = await context.supabase.rpc("add_channel_conversation_note", {
      p_conversation_id: conversationId,
      p_body: body
    });
    if (error) throw new Error(`NOTE_FAILED:${error.code ?? "UNKNOWN"}:${error.message}`);
    revalidatePath(path);
    redirect(returnTo(data, conversationId, { success: "Nota interna registrada." }));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(returnTo(data, conversationId, { error: publicError(error) }));
  }
}

export async function updateMessagingOperatorPresence(data: FormData) {
  const conversationId = optional(data, "conversationId");
  try {
    const context = await requireCapability("whatsapp", "read");
    const presence = validPresence(required(data, "presence"));
    const { error } = await context.supabase.rpc("set_channel_operator_presence", {
      p_presence: presence,
      p_active_conversation_id: conversationId,
      p_ttl_seconds: 300
    });
    if (error) throw new Error(`PRESENCE_FAILED:${error.code ?? "UNKNOWN"}:${error.message}`);
    revalidatePath(path);
    redirect(returnTo(data, conversationId, { success: "Presença atualizada." }));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(returnTo(data, conversationId, { error: publicError(error) }));
  }
}

export async function refreshMessagingOperatorPresence(data: FormData) {
  try {
    const context = await requireCapability("whatsapp", "read");
    const presence = validPresence(required(data, "presence"));
    if (presence === "OFFLINE") return { ok: true } as const;
    const { error } = await context.supabase.rpc("set_channel_operator_presence", {
      p_presence: presence,
      p_active_conversation_id: optional(data, "conversationId"),
      p_ttl_seconds: 300
    });
    if (error) throw new Error(`PRESENCE_FAILED:${error.code ?? "UNKNOWN"}:${error.message}`);
    return { ok: true } as const;
  } catch {
    return { ok: false } as const;
  }
}

export async function assumeMessagingConversation(data: FormData) {
  const context = await requireCapability("whatsapp", "update");
  data.set("assigneeId", context.userId);
  return assignMessagingConversation(data);
}
