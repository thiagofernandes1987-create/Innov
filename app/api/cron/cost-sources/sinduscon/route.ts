import "server-only";
import { createClient } from "@supabase/supabase-js";
import { fetchLatestSindusconCub, SINDUSCON_CUB_SOURCE_KEY } from "@/lib/cost-sources/sinduscon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configuração obrigatória ausente: ${name}.`);
  return value;
}

function serviceClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  );
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 32) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function response(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" }
  });
}

export async function GET(request: Request) {
  if (!authorized(request)) return response(401, { status: "unauthorized" });

  const supabase = serviceClient();
  const { data: run, error: runError } = await supabase
    .from("cost_source_sync_runs")
    .insert({
      source_key: SINDUSCON_CUB_SOURCE_KEY,
      status: "RUNNING",
      source_url: process.env.SINDUSCON_CUB_FEED_URL?.trim() || null,
      metadata: { trigger: "vercel-cron" }
    })
    .select("id")
    .single();

  if (runError || !run) {
    return response(500, { status: "failed", code: "SYNC_RUN_CREATE" });
  }

  try {
    const publication = await fetchLatestSindusconCub();
    const { data: latest } = await supabase
      .from("cost_reference_snapshots")
      .select("base_date")
      .eq("source_key", SINDUSCON_CUB_SOURCE_KEY)
      .eq("region", "SP")
      .eq("reference_code", "R8-N")
      .order("base_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.base_date && publication.baseDate < latest.base_date) {
      throw new Error("A fonte retornou data-base anterior ao último snapshot armazenado.");
    }

    const rows = publication.records.map(record => ({
      source_key: record.sourceKey,
      source_name: record.sourceName,
      region: record.region,
      reference_code: record.referenceCode,
      base_date: record.baseDate,
      publication_date: record.publicationDate,
      tax_relief: record.taxRelief,
      unit: record.unit,
      total_cost: record.totalCost,
      materials_cost: record.materialsCost,
      labor_cost: record.laborCost,
      administrative_cost: record.administrativeCost,
      equipment_cost: record.equipmentCost,
      monthly_change_rate: record.monthlyChangeRate,
      year_change_rate: record.yearChangeRate,
      twelve_month_change_rate: record.twelveMonthChangeRate,
      source_url: record.sourceUrl,
      source_sha256: record.sourceSha256,
      raw_payload: {
        ...record.rawPayload,
        synchronizedAt: new Date().toISOString(),
        publicationTitle: publication.title
      },
      retrieved_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabase
      .from("cost_reference_snapshots")
      .upsert(rows, {
        onConflict: "source_key,region,reference_code,base_date,tax_relief",
        ignoreDuplicates: false
      });
    if (upsertError) throw new Error(`Falha ao persistir snapshots: ${upsertError.message}`);

    const unchanged = latest?.base_date === publication.baseDate;
    await supabase
      .from("cost_source_sync_runs")
      .update({
        status: unchanged ? "UNCHANGED" : "COMPLETED",
        source_url: publication.sourceUrl,
        finished_at: new Date().toISOString(),
        imported_records: unchanged ? 0 : rows.length,
        unchanged_records: unchanged ? rows.length : 0,
        metadata: {
          trigger: "vercel-cron",
          baseDate: publication.baseDate,
          publicationDate: publication.publicationDate,
          title: publication.title
        }
      })
      .eq("id", run.id);

    return response(200, {
      status: unchanged ? "unchanged" : "completed",
      source: SINDUSCON_CUB_SOURCE_KEY,
      baseDate: publication.baseDate,
      records: rows.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("cost_source_sync_runs")
      .update({
        status: "FAILED",
        finished_at: new Date().toISOString(),
        rejected_records: 2,
        error_code: "SOURCE_VALIDATION",
        error_message: message.slice(0, 500)
      })
      .eq("id", run.id);

    console.error(JSON.stringify({ event: "cost_source_sync_failed", source: SINDUSCON_CUB_SOURCE_KEY, code: "SOURCE_VALIDATION" }));
    return response(503, { status: "failed", code: "SOURCE_VALIDATION" });
  }
}
