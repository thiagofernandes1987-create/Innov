"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";

const path = "/app/whatsapp/inbox";

function required(data: FormData, key: string): string {
  const value = String(data.get(key) ?? "").trim();
  if (!value) throw new Error(`Campo obrigatório ausente: ${key}`);
  return value;
}

function optional(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}

function returnTo(conversationId?: string | null, message?: string) {
  const params = new URLSearchParams();
  if (conversationId) params.set("conversation", conversationId);
  if (message) params.set("success", message);
  return params.size ? `${path}?${params.toString()}` : path;
}

export async function assignMessagingConversation(data: FormData) {
  const context = await requireCapability("whatsapp", "update");
  const conversationId = required(data, "conversationId");
  const expectedVersion = Number(required(data, "ownershipVersion"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new Error("Versão de ownership inválida.");
  }
  const { error } = await context.supabase.rpc("assign_channel_conversation", {
    p_conversation_id: conversationId,
    p_new_assignee_id: optional(data, "assigneeId"),
    p_new_queue_id: optional(data, "queueId"),
    p_expected_version: expectedVersion,
    p_reason: required(data, "reason")
  });
  if (error) throw new Error(`ASSIGNMENT_FAILED:${error.code ?? "UNKNOWN"}`);
  revalidatePath(path);
  redirect(returnTo(conversationId, "Atendimento atualizado."));
}

export async function addMessagingConversationNote(data: FormData) {
  const context = await requireCapability("whatsapp", "update");
  const conversationId = required(data, "conversationId");
  const { error } = await context.supabase.rpc("add_channel_conversation_note", {
    p_conversation_id: conversationId,
    p_body: required(data, "body")
  });
  if (error) throw new Error(`NOTE_FAILED:${error.code ?? "UNKNOWN"}`);
  revalidatePath(path);
  redirect(returnTo(conversationId, "Nota interna registrada."));
}

export async function updateMessagingOperatorPresence(data: FormData) {
  const context = await requireCapability("whatsapp", "read");
  const conversationId = optional(data, "conversationId");
  const { error } = await context.supabase.rpc("set_channel_operator_presence", {
    p_presence: required(data, "presence"),
    p_active_conversation_id: conversationId,
    p_ttl_seconds: 90
  });
  if (error) throw new Error(`PRESENCE_FAILED:${error.code ?? "UNKNOWN"}`);
  revalidatePath(path);
  redirect(returnTo(conversationId));
}

export async function assumeMessagingConversation(data: FormData) {
  const context = await requireCapability("whatsapp", "update");
  data.set("assigneeId", context.userId);
  return assignMessagingConversation(data);
}
