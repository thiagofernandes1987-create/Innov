import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const startSchema = z.object({
  action: z.literal("start"),
  organizationId: z.string().uuid(),
  region: z.string().regex(/^[A-Z]{2}$/),
  baseDate: z.string().regex(/^\d{4}-\d{2}-01$/),
  taxRelief: z.boolean(),
  sourceUrl: z.string().url().refine(value => {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "caixa.gov.br" || hostname.endsWith(".caixa.gov.br");
  }, "A fonte precisa pertencer ao domínio oficial CAIXA."),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const chunkSchema = z.object({
  action: z.enum(["inputs", "compositions"]),
  batchId: z.string().uuid(),
  rows: z.array(z.record(z.string(), z.unknown())).max(1000)
});

const finishSchema = z.object({
  action: z.literal("finish"),
  batchId: z.string().uuid(),
  errorMessage: z.string().max(1000).nullable().optional()
});

const requestSchema = z.discriminatedUnion("action", [startSchema, chunkSchema, finishSchema]);

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configuração obrigatória ausente: ${name}.`);
  return value;
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 32) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function serviceClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  );
}

function response(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" }
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return response(401, { status: "unauthorized" });

  let payload: z.infer<typeof requestSchema>;
  try {
    payload = requestSchema.parse(await request.json());
  } catch (error) {
    return response(400, {
      status: "invalid_payload",
      issues: error instanceof z.ZodError ? error.issues.map(issue => issue.message) : ["JSON inválido."]
    });
  }

  const supabase = serviceClient();

  if (payload.action === "start") {
    const { data, error } = await supabase.rpc("start_sinapi_import", {
      p_organization_id: payload.organizationId,
      p_region: payload.region,
      p_base_date: payload.baseDate,
      p_tax_relief: payload.taxRelief,
      p_source_url: payload.sourceUrl,
      p_source_sha256: payload.sourceSha256.toLowerCase(),
      p_metadata: payload.metadata ?? {}
    });
    if (error) return response(422, { status: "failed", code: "START_IMPORT", message: error.message });
    return response(201, { status: "running", batchId: data });
  }

  if (payload.action === "inputs" || payload.action === "compositions") {
    const rpc = payload.action === "inputs"
      ? "import_sinapi_inputs_chunk"
      : "import_sinapi_compositions_chunk";
    const limit = payload.action === "inputs" ? 1000 : 250;
    if (payload.rows.length > limit) {
      return response(400, { status: "invalid_payload", message: `Chunk limitado a ${limit} registros.` });
    }
    const { data, error } = await supabase.rpc(rpc, {
      p_batch_id: payload.batchId,
      p_rows: payload.rows
    });
    if (error) return response(422, { status: "failed", code: rpc.toUpperCase(), message: error.message });
    return response(200, { status: "imported", kind: payload.action, records: data });
  }

  const { data, error } = await supabase.rpc("finish_sinapi_import", {
    p_batch_id: payload.batchId,
    p_error_message: payload.errorMessage ?? null
  });
  if (error) return response(422, { status: "failed", code: "FINISH_IMPORT", message: error.message });
  return response(200, {
    status: data.status?.toLowerCase() ?? "completed",
    batchId: data.id,
    inputs: data.imported_inputs,
    compositions: data.imported_compositions,
    rejected: data.rejected_records
  });
}
