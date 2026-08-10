"use server";

import{mensagemDeFalha}from"@/lib/errors/data-access";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { parseEsocialIndividualResults } from "@/lib/rh/integrations/esocial-result-parser";
import { queryEsocialBatch, sha256, type EsocialEnvironment, type EsocialHttpResult } from "@/lib/rh/integrations/esocial-transport";

const BASE = "/app/rh/obrigacoes/esocial";
function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function fail(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }
function success(path: string, message: string): never { redirect(`${path}?success=${encodeURIComponent(message)}`); }
function environment(value: string): EsocialEnvironment { return value === "PRODUCTION" ? "PRODUCTION" : "RESTRICTED"; }

async function nextAttempt(
  context: Awaited<ReturnType<typeof requireCapability>>,
  batchId: string
) {
  const { data } = await context.supabase
    .from("rh_esocial_attempts")
    .select("attempt_number")
    .eq("batch_id", batchId)
    .eq("operation", "QUERY_BATCH")
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number(data?.attempt_number ?? 0) + 1;
}

export async function queryAndApplyEsocialBatch(data: FormData) {
  const context = await requireCapability("rh", "update");
  const batchId = text(data, "batchId");
  const path = `${BASE}/lotes/${batchId}`;

  const { data: batch, error: batchError } = await context.supabase
    .from("rh_esocial_batches")
    .select("id,environment,protocol_number,status,rh_esocial_batch_events(event_id,rh_esocial_events(id,event_key,status))")
    .eq("organization_id", context.organizationId)
    .eq("id", batchId)
    .maybeSingle();

  if (batchError) fail(path, mensagemDeFalha("rh-esocial-processing.queryAndApplyEsocialBatch", batchError));
  if (!batch?.protocol_number) fail(path, "O lote ainda não possui protocolo para consulta.");
  if (!["PROTOCOL_RECEIVED", "PROCESSING", "UNKNOWN"].includes(batch.status)) {
    fail(path, `O lote em estado ${batch.status} não permite nova consulta.`);
  }

  const attemptNumber = await nextAttempt(context, batchId);
  const { data: attempt, error: attemptError } = await context.supabase
    .from("rh_esocial_attempts")
    .insert({
      organization_id: context.organizationId,
      batch_id: batchId,
      operation: "QUERY_BATCH",
      attempt_number: attemptNumber,
      endpoint_url: "OFFICIAL_ESOCIAL_QUERY",
      soap_action: process.env.ESOCIAL_QUERY_SOAP_ACTION ?? "official-package-v1.6",
      request_sha256: sha256(batch.protocol_number),
      result: "STARTED",
      created_by: context.userId
    })
    .select("id")
    .single();
  if (attemptError) fail(path, mensagemDeFalha("rh-esocial-processing.queryAndApplyEsocialBatch", attemptError));

  let result: EsocialHttpResult;
  try {
    result = await queryEsocialBatch(environment(batch.environment), batch.protocol_number);
  } catch (error) {
    const message = error instanceof Error ? mensagemDeFalha("rh-esocial-processing.queryAndApplyEsocialBatch", error) : "Erro técnico ao consultar lote eSocial.";
    const unknown = /timeout|indetermin/i.test(message);
    await context.supabase.from("rh_esocial_attempts").update({
      result: unknown ? "UNKNOWN" : "TECHNICAL_ERROR",
      error_message: message,
      completed_at: new Date().toISOString()
    }).eq("id", attempt.id);
    await context.supabase.from("rh_esocial_batches").update({
      status: unknown ? "UNKNOWN" : "PROCESSING",
      updated_at: new Date().toISOString()
    }).eq("id", batchId).eq("organization_id", context.organizationId);
    fail(path, message);
  }

  const individual = parseEsocialIndividualResults(result.responseXml);
  await context.supabase.from("rh_esocial_attempts").update({
    endpoint_url: result.endpoint,
    soap_action: result.soapAction,
    http_status: result.httpStatus,
    result: result.httpStatus >= 200 && result.httpStatus < 300 ? "SUCCESS" : "TECHNICAL_ERROR",
    response_xml: result.responseXml,
    response_sha256: result.responseSha256,
    duration_ms: result.durationMs,
    completed_at: new Date().toISOString()
  }).eq("id", attempt.id);

  if (result.httpStatus < 200 || result.httpStatus >= 300) {
    fail(path, `Consulta do eSocial retornou HTTP ${result.httpStatus}.`);
  }

  const relations = Array.isArray(batch.rh_esocial_batch_events) ? batch.rh_esocial_batch_events : [];
  const knownKeys = new Set(relations.flatMap(relation => {
    const event = Array.isArray(relation.rh_esocial_events) ? relation.rh_esocial_events[0] : relation.rh_esocial_events;
    return event?.event_key ? [event.event_key] : [];
  }));

  let applied = 0;
  for (const item of individual) {
    if (!knownKeys.has(item.eventId)) continue;
    const { error } = await context.supabase.rpc("apply_rh_esocial_event_result", {
      p_batch_id: batchId,
      p_event_key: item.eventId,
      p_status: item.status,
      p_receipt_number: item.receiptNumber,
      p_response_code: item.responseCode,
      p_response_description: item.responseDescription,
      p_occurrences: item.occurrences
    });
    if (error) fail(path, `Falha ao persistir retorno de ${item.eventId}: ${mensagemDeFalha("rh-esocial-processing.queryAndApplyEsocialBatch", error)}`);
    applied += 1;
  }

  // Se o Ambiente Nacional ainda não devolveu o bloco individual, não
  // inventamos ACCEPTED/REJECTED a partir do status HTTP ou do lote.
  if (applied === 0) {
    await context.supabase.from("rh_esocial_batches").update({
      status: "PROCESSING",
      updated_at: new Date().toISOString()
    }).eq("id", batchId).eq("organization_id", context.organizationId);
    success(path, "Consulta recebida, mas ainda sem resultados individuais. O lote permanece em processamento.");
  }

  const { data: finalStatus, error: finalizeError } = await context.supabase.rpc(
    "finalize_rh_esocial_batch_from_events",
    { p_batch_id: batchId }
  );
  if (finalizeError) fail(path, mensagemDeFalha("rh-esocial-processing.queryAndApplyEsocialBatch", finalizeError));

  const accepted = individual.filter(item => knownKeys.has(item.eventId) && item.status === "ACCEPTED").length;
  const rejected = individual.filter(item => knownKeys.has(item.eventId) && item.status === "REJECTED").length;
  const processing = individual.filter(item => knownKeys.has(item.eventId) && item.status === "PROCESSING").length;

  success(
    path,
    `Retorno aplicado: ${accepted} aceito(s), ${rejected} rejeitado(s), ${processing} em processamento. Lote: ${finalStatus}.`
  );
}
