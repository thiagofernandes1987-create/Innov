"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import {
  MessagePluginPolicyError,
  normalizeMessagePluginPolicyRequest
} from "@/lib/messaging/plugin-policy";

const path = "/app/whatsapp/bots";

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function isRedirectError(error: unknown) {
  return Boolean(
    error && typeof error === "object" && "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function publicMessage(error: unknown) {
  if (error instanceof MessagePluginPolicyError) return error.message;
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("MANDATORY_PLUGIN_REQUIRED")) return "Este plugin é obrigatório e não pode ser desabilitado.";
  if (message.includes("PLUGIN_FORBIDDEN")) return "Você não possui permissão para alterar os plugins.";
  if (message.includes("PLUGIN_CONFIGURATION_SECRET_DETECTED")) return "A configuração contém dado sensível não permitido.";
  return "A política do plugin não pôde ser atualizada.";
}

export async function setCanonicalMessagingPluginPolicy(data: FormData) {
  const context = await requireCapability("whatsapp", "manage");
  try {
    const normalized = normalizeMessagePluginPolicyRequest({
      pluginId: text(data, "pluginId"),
      enabled: data.get("enabled") !== null
    });
    const { error } = await context.supabase.rpc("set_channel_message_plugin_policy", {
      p_organization_id: context.organizationId,
      p_plugin_id: normalized.pluginId,
      p_enabled: normalized.enabled,
      p_priority: normalized.priority,
      p_required_permission: normalized.requiredPermission,
      p_feature_flag: normalized.featureFlag,
      p_configuration: {}
    });
    if (error) throw new Error(`${error.code ?? "PLUGIN_POLICY_FAILED"}:${error.message}`);
    revalidatePath(path);
    redirect(`${path}?success=${encodeURIComponent(`Política ${normalized.pluginId} atualizada.`)}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(`${path}?error=${encodeURIComponent(publicMessage(error))}`);
  }
}
