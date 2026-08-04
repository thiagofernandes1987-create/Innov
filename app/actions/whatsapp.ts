"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { UnsupportedCapabilityError } from "@/lib/messaging/capabilities";
import {
  MESSAGING_CONTRACT_VERSION,
  createCanonicalPhoneIdentity
} from "@/lib/messaging/domain";
import {
  MessagingEngineError,
  capabilityForSendCommand,
  type EngineSendCommand
} from "@/lib/messaging/engine";
import { createMetaCloudMessagingEngine } from "@/lib/messaging/engines/meta-cloud.server";
import { requireMetaCloudCapability } from "@/lib/messaging/policy.server";
import {
  isSupportWindowOpen,
  normalizePhone,
  orderedTemplateParameters,
  parseSourceToken,
  parseVariables,
  WhatsAppDomainError
} from "@/lib/whatsapp/domain";
import {
  loadWhatsAppBinding,
  resolveWhatsAppBinding
} from "@/lib/whatsapp/source-resolver";

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function optional(data: FormData, key: string) {
  return text(data, key) || null;
}

function resultRow<T extends Record<string, unknown>>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function returnPath(conversationId?: string | null) {
  return conversationId ? `/app/whatsapp?conversation=${conversationId}` : "/app/whatsapp";
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

function firstRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return firstRelation(value[0]);
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function errorCode(error: unknown, fallback: string) {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? fallback)
    : fallback;
}

function safeActionMessage(error: unknown) {
  if (
    error instanceof WhatsAppDomainError ||
    error instanceof MessagingEngineError ||
    error instanceof UnsupportedCapabilityError
  ) {
    return error.message;
  }
  return "A operação não pôde ser concluída. Tente novamente.";
}

function recordFailure(operation: string, error: unknown) {
  const correlationId = randomUUID();
  console.error(
    JSON.stringify({
      event: "whatsapp.action_failed",
      operation,
      correlationId,
      errorCode: errorCode(
        error,
        error instanceof Error ? error.name : "UNKNOWN"
      )
    })
  );
  return correlationId;
}

export async function saveWhatsAppAccount(data: FormData) {
  const context = await requireCapability("whatsapp", "manage");
  const path = "/app/whatsapp";
  const phoneNumberId = text(data, "phoneNumberId");
  const wabaId = text(data, "wabaId");

  if (!/^\d{5,30}$/.test(phoneNumberId) || !/^\d{5,30}$/.test(wabaId)) {
    fail(path, "Informe IDs válidos da conta e do número do WhatsApp Business.");
  }

  const isDefault = data.get("isDefault") !== null;
  if (isDefault) {
    await context.supabase
      .from("whatsapp_accounts")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("organization_id", context.organizationId);
  }

  const { error } = await context.supabase.from("whatsapp_accounts").upsert(
    {
      organization_id: context.organizationId,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      display_phone_number: optional(data, "displayPhoneNumber"),
      business_name: optional(data, "businessName"),
      active: true,
      is_default: isDefault,
      created_by: context.userId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "organization_id,phone_number_id" }
  );

  if (error) {
    recordFailure("save_account", error);
    fail(path, "A conta do WhatsApp não pôde ser salva.");
  }
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Conta do WhatsApp salva.")}`);
}

export async function startWhatsAppConversation(data: FormData) {
  const context = await requireCapability("whatsapp", "create", optional(data, "projectId"));
  const path = "/app/whatsapp";

  try {
    requireMetaCloudCapability(context.organizationId, "CONVERSATION_START");
    const accountId = text(data, "accountId");
    const phone = normalizePhone(text(data, "phone"));
    const clientId = optional(data, "clientId");
    const projectId = optional(data, "projectId");

    const { data: account, error: accountError } = await context.supabase
      .from("whatsapp_accounts")
      .select("id")
      .eq("id", accountId)
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .maybeSingle();
    if (accountError || !account) {
      throw new WhatsAppDomainError("INVALID_SOURCE", "Conta do WhatsApp não encontrada.");
    }

    const { data: contact, error: contactError } = await context.supabase
      .from("whatsapp_contacts")
      .upsert(
        {
          organization_id: context.organizationId,
          account_id: account.id,
          client_id: clientId,
          wa_id: phone,
          phone_e164: phone,
          display_name: optional(data, "displayName"),
          updated_at: new Date().toISOString()
        },
        { onConflict: "organization_id,account_id,wa_id" }
      )
      .select("id,client_id")
      .single();
    if (contactError || !contact) throw contactError ?? new Error("contact_not_created");

    const { data: existing } = await context.supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("account_id", account.id)
      .eq("contact_id", contact.id)
      .in("status", ["OPEN", "PENDING"])
      .maybeSingle();

    if (existing) redirect(returnPath(existing.id));

    const { data: conversation, error: conversationError } = await context.supabase
      .from("whatsapp_conversations")
      .insert({
        organization_id: context.organizationId,
        account_id: account.id,
        contact_id: contact.id,
        client_id: clientId ?? contact.client_id,
        project_id: projectId,
        contract_id: optional(data, "contractId"),
        opportunity_id: optional(data, "opportunityId"),
        sac_ticket_id: optional(data, "sacTicketId"),
        status: "OPEN",
        assigned_to: context.userId,
        created_by: context.userId
      })
      .select("id")
      .single();
    if (conversationError || !conversation) {
      throw conversationError ?? new Error("conversation_not_created");
    }
    revalidatePath(path);
    redirect(returnPath(conversation.id));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    recordFailure("start_conversation", error);
    fail(path, safeActionMessage(error));
  }
}

export async function createWhatsAppContentBinding(data: FormData) {
  const context = await requireCapability("whatsapp", "manage");
  const path = "/app/whatsapp";

  try {
    const source = parseSourceToken(text(data, "sourceToken"));
    const parameterOrder = text(data, "parameterOrder")
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
    const variablesSchema = parseVariables(optional(data, "variablesSchema"));

    const { error } = await context.supabase.from("whatsapp_content_bindings").insert({
      organization_id: context.organizationId,
      name: text(data, "name"),
      source_type: source.sourceType,
      source_id: source.sourceId,
      source_field: source.sourceField,
      meta_template_name: optional(data, "metaTemplateName"),
      language_code: text(data, "languageCode") || "pt_BR",
      parameter_order: parameterOrder,
      variables_schema: variablesSchema,
      active: true,
      created_by: context.userId
    });
    if (error) throw error;

    revalidatePath(path);
    redirect(`${path}?success=${encodeURIComponent("Mensagem padrão vinculada à fonte canônica.")}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    recordFailure("create_binding", error);
    fail(path, safeActionMessage(error));
  }
}

export async function sendWhatsAppMessage(data: FormData) {
  const conversationId = text(data, "conversationId");
  const projectId = optional(data, "projectId");
  const path = returnPath(conversationId);
  const context = await requireCapability("whatsapp", "update", projectId);

  let queuedMessageId: string | null = null;

  try {
    const { data: conversation, error: conversationError } = await context.supabase
      .from("whatsapp_conversations")
      .select(
        "id,account_id,organization_id,project_id,last_customer_message_at,whatsapp_accounts!inner(phone_number_id),whatsapp_contacts!inner(wa_id,phone_e164)"
      )
      .eq("id", conversationId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (conversationError || !conversation) {
      throw new WhatsAppDomainError("INVALID_SOURCE", "Conversa não encontrada.");
    }

    const account = firstRelation(conversation.whatsapp_accounts);
    const contact = firstRelation(conversation.whatsapp_contacts);
    const phoneNumberId = String(account?.phone_number_id ?? "");
    const to = normalizePhone(String(contact?.wa_id ?? contact?.phone_e164 ?? ""));
    const supportWindowOpen = isSupportWindowOpen(conversation.last_customer_message_at);
    const variables = parseVariables(optional(data, "variables"));
    const bindingId = optional(data, "bindingId");

    let body = text(data, "body");
    let caption: string | null = null;
    let sourceBindingId: string | null = null;
    let sourceSnapshot: Record<string, unknown> = {};
    let binding:
      | Awaited<ReturnType<typeof loadWhatsAppBinding>>
      | null = null;
    let resolved:
      | Awaited<ReturnType<typeof resolveWhatsAppBinding>>
      | null = null;

    if (bindingId) {
      binding = await loadWhatsAppBinding(context, bindingId);
      resolved = await resolveWhatsAppBinding(context, binding, variables);
      sourceBindingId = binding.id;
      sourceSnapshot = resolved.snapshot;
      if (resolved.kind === "TEXT") body = resolved.body;
      else caption = resolved.caption;
    }

    if (!resolved && !body) {
      throw new WhatsAppDomainError("INVALID_SOURCE", "Digite uma mensagem ou selecione uma fonte.");
    }

    if (resolved?.kind === "DOCUMENT" && !supportWindowOpen) {
      throw new WhatsAppDomainError(
        "OUTSIDE_SUPPORT_WINDOW",
        "Documentos só podem ser enviados nesta versão durante a janela de atendimento."
      );
    }

    const useTemplate = !supportWindowOpen;
    if (useTemplate && !binding?.meta_template_name) {
      throw new WhatsAppDomainError(
        "OUTSIDE_SUPPORT_WINDOW",
        "Fora da janela de atendimento, selecione uma mensagem vinculada a um template aprovado."
      );
    }

    const messageType = resolved?.kind === "DOCUMENT"
      ? "DOCUMENT"
      : useTemplate
        ? "TEMPLATE"
        : "TEXT";
    const idempotencyKey = text(data, "idempotencyKey") || randomUUID();
    const recipient = createCanonicalPhoneIdentity({
      organizationId: context.organizationId,
      providerType: "META_CLOUD",
      channelAccountId: String(conversation.account_id),
      providerAccountId: phoneNumberId,
      externalId: to,
      phone: to,
      observedAt: new Date().toISOString()
    });

    const commandBase = {
      idempotencyKey,
      organizationId: context.organizationId,
      conversationId: conversation.id,
      channelAccountId: String(conversation.account_id),
      providerAccountId: phoneNumberId,
      to: recipient,
      messageType
    } satisfies Omit<EngineSendCommand, "content">;
    requireMetaCloudCapability(
      context.organizationId,
      capabilityForSendCommand(commandBase)
    );

    const { data: queued, error: queueError } = await context.supabase.rpc(
      "queue_whatsapp_outbound_message",
      {
        p_conversation_id: conversation.id,
        p_message_type: messageType,
        p_body: body || null,
        p_caption: caption,
        p_source_binding_id: sourceBindingId,
        p_source_snapshot: sourceSnapshot,
        p_idempotency_key: idempotencyKey
      }
    );
    if (queueError) throw queueError;
    const queuedRow = resultRow(
      queued as Record<string, unknown> | Record<string, unknown>[] | null
    );
    queuedMessageId = String(queuedRow?.id ?? "");
    if (!queuedMessageId) throw new Error("queued_message_missing");

    let content: EngineSendCommand["content"];
    if (resolved?.kind === "DOCUMENT") {
      const admin = createSupabaseAdminClient();
      const { data: signed, error: signedError } = await admin.storage
        .from(resolved.bucket)
        .createSignedUrl(resolved.storagePath, 300);
      if (signedError || !signed?.signedUrl) {
        throw new WhatsAppDomainError(
          "INVALID_SOURCE",
          "O documento não pôde ser preparado para envio."
        );
      }
      content = {
        caption: resolved.caption,
        media: [
          {
            schemaVersion: MESSAGING_CONTRACT_VERSION,
            mediaType: "DOCUMENT",
            referenceType: "SIGNED_URL",
            reference: signed.signedUrl,
            fileName: resolved.fileName,
            declaredMimeType: resolved.mimeType,
            caption: resolved.caption,
            quarantineStatus: "APPROVED",
            expiresAt: new Date(Date.now() + 300_000).toISOString()
          }
        ]
      };
    } else if (useTemplate && binding?.meta_template_name) {
      content = {
        template: {
          name: binding.meta_template_name,
          languageCode: binding.language_code,
          parameters: orderedTemplateParameters(binding.parameter_order, variables)
        }
      };
    } else {
      content = { text: body };
    }

    const engine = createMetaCloudMessagingEngine();
    const sendResult = await engine.send({ ...commandBase, content });
    const providerMessageId = sendResult.providerMessageId;

    const admin = createSupabaseAdminClient();
    const { error: completionError } = await admin.rpc(
      "complete_whatsapp_outbound_message",
      {
        p_message_id: queuedMessageId,
        p_provider_message_id: providerMessageId,
        p_status: "SENT",
        p_error_code: null,
        p_error_message: null
      }
    );
    if (completionError) throw completionError;

    await admin.from("audit_events").insert({
      organization_id: context.organizationId,
      project_id: conversation.project_id,
      actor_user_id: context.userId,
      event_type: "whatsapp.message.sent",
      resource_type: "WHATSAPP_MESSAGE",
      resource_id: queuedMessageId,
      action: messageType,
      result: "SUCCESS",
      after_data: {
        conversation_id: conversation.id,
        source_binding_id: sourceBindingId,
        source_sha256: sourceSnapshot.sha256 ?? null,
        provider_type: sendResult.providerType,
        provider_message_id: providerMessageId,
        engine_schema: sendResult.providerMetadata.schemaVersion
      }
    });

    revalidatePath(path);
    redirect(`${path}&success=${encodeURIComponent("Mensagem enviada.")}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    const correlationId = recordFailure("send_message", error);
    if (queuedMessageId) {
      const admin = createSupabaseAdminClient();
      await admin.rpc("complete_whatsapp_outbound_message", {
        p_message_id: queuedMessageId,
        p_provider_message_id: null,
        p_status: "FAILED",
        p_error_code: errorCode(error, "SEND_FAILED"),
        p_error_message: `Falha de envio. Referência: ${correlationId}`
      });
    }
    fail(path, safeActionMessage(error));
  }
}
