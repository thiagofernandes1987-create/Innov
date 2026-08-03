import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, verifyMetaWebhookSignature } from "@/lib/whatsapp/domain";

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type MetaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  document?: { caption?: string; filename?: string; mime_type?: string; id?: string };
  image?: { caption?: string; mime_type?: string; id?: string };
  audio?: { mime_type?: string; id?: string };
  interactive?: { type?: string };
};

type MetaValue = {
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    wa_id?: string;
    profile?: { name?: string };
  }>;
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
};

type MetaPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: MetaValue;
    }>;
  }>;
};

function occurredAt(timestamp?: string) {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

function inboundBody(message: MetaMessage) {
  if (message.type === "text") return message.text?.body ?? null;
  if (message.type === "document") return message.document?.caption ?? null;
  if (message.type === "image") return message.image?.caption ?? null;
  return null;
}

function messageType(value?: string) {
  const normalized = String(value ?? "UNKNOWN").toUpperCase();
  return ["TEXT", "DOCUMENT", "IMAGE", "AUDIO", "INTERACTIVE"].includes(normalized)
    ? normalized
    : "UNKNOWN";
}

function statusName(value?: string) {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "SENT") return "SENT";
  if (normalized === "DELIVERED") return "DELIVERED";
  if (normalized === "READ") return "READ";
  if (normalized === "FAILED") return "FAILED";
  return null;
}

function summary(payload: MetaPayload) {
  const changes = (payload.entry ?? []).flatMap(entry => entry.changes ?? []);
  return {
    object: payload.object ?? null,
    entries: payload.entry?.length ?? 0,
    messages: changes.reduce((total, change) => total + (change.value?.messages?.length ?? 0), 0),
    statuses: changes.reduce((total, change) => total + (change.value?.statuses?.length ?? 0), 0),
    phoneNumberIds: [
      ...new Set(
        changes
          .map(change => change.value?.metadata?.phone_number_id)
          .filter((item): item is string => Boolean(item))
      )
    ]
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
  return NextResponse.json({ error: "Verificação inválida." }, { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json(
      { error: "Webhook do WhatsApp não configurado." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  if (
    !verifyMetaWebhookSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      appSecret
    )
  ) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: MetaPayload;
  try {
    payload = JSON.parse(rawBody) as MetaPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ data: { ignored: true } });
  }

  const admin = createSupabaseAdminClient();
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const eventSummary = summary(payload);

  const { data: existingEvent } = await admin
    .from("whatsapp_webhook_events")
    .select("id,processed_at")
    .eq("payload_sha256", payloadHash)
    .maybeSingle();

  if (existingEvent?.processed_at) {
    return NextResponse.json({ data: { idempotent: true } });
  }

  let webhookEventId = existingEvent?.id ?? null;
  if (!webhookEventId) {
    const { data: created, error } = await admin
      .from("whatsapp_webhook_events")
      .insert({
        payload_sha256: payloadHash,
        object_type: payload.object,
        event_summary: eventSummary
      })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json(
        { error: "Evento não pôde ser registrado." },
        { status: 500 }
      );
    }
    webhookEventId = created.id;
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!value || !phoneNumberId) continue;

        const { data: account, error: accountError } = await admin
          .from("whatsapp_accounts")
          .select("id,organization_id")
          .eq("phone_number_id", phoneNumberId)
          .eq("active", true)
          .maybeSingle();
        if (accountError || !account) {
          console.error(
            JSON.stringify({
              event: "whatsapp.webhook.account_not_found",
              phoneNumberId
            })
          );
          continue;
        }

        await admin
          .from("whatsapp_webhook_events")
          .update({
            organization_id: account.organization_id,
            account_id: account.id
          })
          .eq("id", webhookEventId);

        for (const message of value.messages ?? []) {
          if (!message.id || !message.from) continue;
          const waId = normalizePhone(message.from);
          const profileName =
            value.contacts?.find(contact => contact.wa_id === message.from)?.profile?.name ??
            null;

          const { data: contact, error: contactError } = await admin
            .from("whatsapp_contacts")
            .upsert(
              {
                organization_id: account.organization_id,
                account_id: account.id,
                wa_id: waId,
                phone_e164: waId,
                profile_name: profileName,
                display_name: profileName,
                updated_at: new Date().toISOString()
              },
              { onConflict: "organization_id,account_id,wa_id" }
            )
            .select("id,client_id")
            .single();
          if (contactError || !contact) throw contactError ?? new Error("contact_failed");

          let { data: conversation } = await admin
            .from("whatsapp_conversations")
            .select("id,unread_count,client_id")
            .eq("account_id", account.id)
            .eq("contact_id", contact.id)
            .in("status", ["OPEN", "PENDING"])
            .maybeSingle();

          if (!conversation) {
            const { data: createdConversation, error: conversationError } = await admin
              .from("whatsapp_conversations")
              .insert({
                organization_id: account.organization_id,
                account_id: account.id,
                contact_id: contact.id,
                client_id: contact.client_id,
                status: "OPEN",
                last_customer_message_at: occurredAt(message.timestamp),
                last_message_at: occurredAt(message.timestamp),
                unread_count: 1
              })
              .select("id,unread_count,client_id")
              .single();
            if (conversationError || !createdConversation) {
              throw conversationError ?? new Error("conversation_failed");
            }
            conversation = createdConversation;
          } else {
            const receivedAt = occurredAt(message.timestamp);
            const { error: updateError } = await admin
              .from("whatsapp_conversations")
              .update({
                status: "OPEN",
                last_customer_message_at: receivedAt,
                last_message_at: receivedAt,
                unread_count: Number(conversation.unread_count ?? 0) + 1,
                updated_at: new Date().toISOString()
              })
              .eq("id", conversation.id);
            if (updateError) throw updateError;
          }

          const metadata = {
            mediaId:
              message.document?.id ?? message.image?.id ?? message.audio?.id ?? null,
            mimeType:
              message.document?.mime_type ??
              message.image?.mime_type ??
              message.audio?.mime_type ??
              null,
            fileName: message.document?.filename ?? null,
            interactiveType: message.interactive?.type ?? null
          };

          const { error: messageError } = await admin.from("whatsapp_messages").insert({
            organization_id: account.organization_id,
            conversation_id: conversation.id,
            direction: "INBOUND",
            message_type: messageType(message.type),
            status: "RECEIVED",
            provider_message_id: message.id,
            body: inboundBody(message),
            caption: message.document?.caption ?? message.image?.caption ?? null,
            provider_metadata: metadata,
            occurred_at: occurredAt(message.timestamp)
          });
          if (messageError?.code !== "23505" && messageError) throw messageError;
        }

        for (const status of value.statuses ?? []) {
          const nextStatus = statusName(status.status);
          if (!status.id || !nextStatus) continue;

          const { data: message, error: messageLookupError } = await admin
            .from("whatsapp_messages")
            .select("id,organization_id")
            .eq("provider_message_id", status.id)
            .maybeSingle();
          if (messageLookupError || !message) continue;

          const timestamp = occurredAt(status.timestamp);
          const firstError = status.errors?.[0];
          const patch: Record<string, unknown> = {
            status: nextStatus,
            error_code: firstError?.code ? String(firstError.code) : null,
            error_message: firstError?.title ?? firstError?.message ?? null
          };
          if (nextStatus === "SENT") patch.sent_at = timestamp;
          if (nextStatus === "DELIVERED") patch.delivered_at = timestamp;
          if (nextStatus === "READ") patch.read_at = timestamp;
          if (nextStatus === "FAILED") patch.failed_at = timestamp;

          const { error: statusUpdateError } = await admin
            .from("whatsapp_messages")
            .update(patch)
            .eq("id", message.id);
          if (statusUpdateError) throw statusUpdateError;

          const { error: statusEventError } = await admin
            .from("whatsapp_message_status_events")
            .insert({
              organization_id: message.organization_id,
              message_id: message.id,
              status: nextStatus,
              provider_timestamp: timestamp,
              error_code: firstError?.code ? String(firstError.code) : null,
              error_title: firstError?.title ?? null,
              metadata: { providerStatus: status.status ?? null }
            });
          if (statusEventError?.code !== "23505" && statusEventError) {
            throw statusEventError;
          }
        }
      }
    }

    await admin
      .from("whatsapp_webhook_events")
      .update({ processed_at: new Date().toISOString(), error_code: null })
      .eq("id", webhookEventId);

    return NextResponse.json({ data: { idempotent: false, processed: true } });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "PROCESSING_FAILED")
        : "PROCESSING_FAILED";
    await admin
      .from("whatsapp_webhook_events")
      .update({ error_code: code })
      .eq("id", webhookEventId);
    console.error(JSON.stringify({ event: "whatsapp.webhook.failed", code }));
    return NextResponse.json(
      { error: "O evento não pôde ser processado." },
      { status: 500 }
    );
  }
}
