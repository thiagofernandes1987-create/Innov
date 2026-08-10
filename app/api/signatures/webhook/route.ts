import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SIGNATURE_STATUS_BY_EVENT, shouldApplySignatureStatus } from "@/lib/signatures/webhook-state";

const MAX_CLOCK_SKEW_SECONDS = 300;

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
  const nextStatus = SIGNATURE_STATUS_BY_EVENT[eventType];

  if (!envelopeId || !providerEventId || !nextStatus) {
    return NextResponse.json({ error: "Evento incompleto ou não suportado." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: envelope, error: envelopeError } = await admin
    .from("signature_envelopes")
    .select("id, organization_id, provider, status, contract_version_id, amendment_version_id")
    .eq("id", envelopeId)
    .maybeSingle();

  if (envelopeError) {
    reportDataAccessError("signature-webhook.load-envelope", envelopeError);
    return NextResponse.json({ error: "Não foi possível carregar o envelope." }, { status: 500 });
  }
  if (!envelope) {
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

  const duplicateEvent = eventError?.code === "23505";
  if (eventError && !duplicateEvent) {
    reportDataAccessError("signature-webhook.record-event", eventError);
    return NextResponse.json({ error: "O evento de assinatura não pôde ser registrado." }, { status: 500 });
  }

  const applyStatus = shouldApplySignatureStatus(envelope.status, nextStatus);
  // Uma retentativa do mesmo evento pode ter sido causada por falha após o
  // INSERT de signature_events. Quando o envelope já chegou ao mesmo status,
  // repetimos apenas os efeitos idempotentes pendentes em vez de retornar cedo.
  const replayCurrentStatus = duplicateEvent && envelope.status === nextStatus;
  const applyEffects = applyStatus || replayCurrentStatus;

  const envelopeUpdate: Record<string, unknown> = {
    external_id: payload.externalId ?? undefined
  };
  if (applyStatus) {
    envelopeUpdate.status = nextStatus;
    if (nextStatus === "SENT") envelopeUpdate.sent_at = new Date().toISOString();
    if (nextStatus === "COMPLETED") envelopeUpdate.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await admin
    .from("signature_envelopes")
    .update(envelopeUpdate)
    .eq("id", envelope.id);

  if (updateError) {
    reportDataAccessError("signature-webhook.update-envelope", updateError);
    return NextResponse.json({ error: "O envelope não pôde ser atualizado." }, { status: 500 });
  }

  if (applyEffects && payload.signerEmail) {
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
      reportDataAccessError("signature-webhook.update-signer", signerError);
      return NextResponse.json({ error: "O signatário não pôde ser atualizado." }, { status: 500 });
    }
  }

  if (applyEffects && nextStatus === "COMPLETED") {
    // A RPC é idempotente: contrato/versão podem ser reafirmados e
    // `apply_signed_amendment` não reaplica aditivo cujo `applied_at` já existe.
    const { error: completionError } = await admin.rpc("complete_signature_business_state", {
      p_envelope_id: envelope.id
    });

    if (completionError) {
      reportDataAccessError("signature-webhook.complete-business-state", completionError);
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
    after_data: {
      status: applyStatus ? nextStatus : envelope.status,
      event_status: nextStatus,
      applied: applyStatus,
      replayed: replayCurrentStatus,
      provider_event_id: providerEventId,
      payload_hash: payloadHash
    }
  });

  if (auditError) {
    reportDataAccessError("signature-webhook.audit", auditError);
    return NextResponse.json({ error: "O processamento foi concluído, mas a auditoria não pôde ser registrada." }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      idempotent: duplicateEvent,
      replayed: replayCurrentStatus,
      applied: applyStatus,
      status: applyStatus ? nextStatus : envelope.status
    }
  });
}
