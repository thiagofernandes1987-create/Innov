import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_CLOCK_SKEW_SECONDS = 300;

const statusByEvent: Record<string, string> = {
  SENT: "SENT",
  VIEWED: "VIEWED",
  SIGNED: "PARTIALLY_SIGNED",
  COMPLETED: "COMPLETED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  CANCELED: "CANCELED",
  ERROR: "ERROR"
};

function verifySignature(body: string, timestamp: string, receivedSignature: string, secret: string) {
  const normalized = receivedSignature.replace(/^sha256=/i, "").trim().toLowerCase();
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
  return timingSafeEqual(Buffer.from(normalized, "hex"), Buffer.from(expected, "hex"));
}

export async function POST(request: Request) {
  const secret = process.env.SIGNATURE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook de assinatura não configurado." }, { status: 503 });
  }

  const timestamp = request.headers.get("x-signature-timestamp");
  const signature = request.headers.get("x-signature-signature");
  const body = await request.text();

  if (!timestamp || !signature || !verifySignature(body, timestamp, signature, secret)) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  const timestampNumber = Number(timestamp);
  const timestampSeconds = timestampNumber > 1_000_000_000_000 ? timestampNumber / 1000 : timestampNumber;
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    return NextResponse.json({ error: "Timestamp fora da janela permitida." }, { status: 401 });
  }

  let payload: {
    envelopeId?: string;
    eventId?: string;
    eventType?: string;
    signerEmail?: string;
    externalId?: string;
  };

  try {
    payload = JSON.parse(body) as typeof payload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const envelopeId = payload.envelopeId;
  const providerEventId = payload.eventId;
  const eventType = String(payload.eventType ?? "").toUpperCase();
  const nextStatus = statusByEvent[eventType];

  if (!envelopeId || !providerEventId || !nextStatus) {
    return NextResponse.json({ error: "Evento incompleto ou não suportado." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: envelope, error: envelopeError } = await admin
    .from("signature_envelopes")
    .select("id, organization_id, provider, status, contract_version_id, amendment_version_id")
    .eq("id", envelopeId)
    .maybeSingle();

  if (envelopeError || !envelope) {
    return NextResponse.json({ error: "Envelope não encontrado." }, { status: 404 });
  }

  const payloadHash = createHash("sha256").update(body).digest("hex");
  const { error: eventError } = await admin.from("signature_events").insert({
    organization_id: envelope.organization_id,
    envelope_id: envelope.id,
    provider_event_id: providerEventId,
    event_type: eventType,
    payload_hash: payloadHash,
    payload: {
      externalId: payload.externalId ?? null,
      signerEmail: payload.signerEmail ?? null,
      receivedAt: new Date().toISOString()
    }
  });

  if (eventError?.code === "23505") {
    return NextResponse.json({ data: { idempotent: true } });
  }
  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const envelopeUpdate: Record<string, unknown> = {
    status: nextStatus,
    external_id: payload.externalId ?? undefined
  };
  if (nextStatus === "SENT") envelopeUpdate.sent_at = new Date().toISOString();
  if (nextStatus === "COMPLETED") envelopeUpdate.completed_at = new Date().toISOString();

  const { error: updateError } = await admin
    .from("signature_envelopes")
    .update(envelopeUpdate)
    .eq("id", envelope.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (payload.signerEmail) {
    const { error: signerError } = await admin
      .from("signature_signers")
      .update({
        status: nextStatus === "COMPLETED" ? "COMPLETED" : nextStatus,
        viewed_at: eventType === "VIEWED" ? new Date().toISOString() : undefined,
        signed_at: ["SIGNED", "COMPLETED"].includes(eventType) ? new Date().toISOString() : undefined
      })
      .eq("envelope_id", envelope.id)
      .eq("email", payload.signerEmail);

    if (signerError) {
      return NextResponse.json({ error: signerError.message }, { status: 500 });
    }
  }

  if (nextStatus === "COMPLETED") {
    const { error: completionError } = await admin.rpc("complete_signature_business_state", {
      p_envelope_id: envelope.id
    });

    if (completionError) {
      return NextResponse.json(
        { error: "A assinatura foi recebida, mas o estado do contrato não pôde ser concluído." },
        { status: 500 }
      );
    }
  }

  const { error: auditError } = await admin.from("audit_events").insert({
    organization_id: envelope.organization_id,
    event_type: "signature.webhook.processed",
    resource_type: "SIGNATURE_ENVELOPE",
    resource_id: envelope.id,
    action: eventType,
    result: "SUCCESS",
    after_data: { status: nextStatus, provider_event_id: providerEventId, payload_hash: payloadHash }
  });

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { idempotent: false, status: nextStatus } });
}
