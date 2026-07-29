import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { discoverLatestSinapiXlsxSource } from "./automatic-update";
import { parseSinapiOfficialReferencePackage } from "./official-reference-parser";
import type { SinapiOfficialSource } from "./source-catalog";
import type {
  ParsedSinapiPackage,
  SinapiCompositionImportRow,
  SinapiInputImportRow
} from "./xlsx-parser";

const MAX_DOWNLOAD_BYTES = 180 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 180_000;
const DOWNLOADS_PAGE = "https://www.caixa.gov.br/site/Paginas/downloads.aspx";

export type SinapiAutomaticUpdateResult = {
  status: "updated" | "already_current" | "newer_local_base";
  batchId: string;
  sourceUrl: string;
  sourceSha256: string;
  baseDate: string;
  region: string;
  taxRelief: boolean;
  inputs: number;
  compositions: number;
  rejected: number;
  xlsxFiles: number;
  worksheets: number;
};

export type SinapiOfficialPackageInspection = {
  source: SinapiOfficialSource;
  finalUrl: string;
  sourceSha256: string;
  downloadedBytes: number;
  baseDate: string;
  inputs: number;
  compositions: number;
  xlsxFiles: string[];
  worksheets: number;
};

type PreviousBatch = {
  id: string;
  base_date: string;
  source_sha256: string;
  imported_inputs: number | string;
  imported_compositions: number | string;
  rejected_records: number | string;
};

type LoadedPackage = {
  source: SinapiOfficialSource;
  finalUrl: string;
  buffer: Buffer;
  sourceSha256: string;
  parsed: ParsedSinapiPackage;
};

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

function officialUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A URL oficial do SINAPI é inválida.");
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "caixa.gov.br" && !hostname.endsWith(".caixa.gov.br")) {
    throw new Error("O download SINAPI aceita somente o domínio oficial da CAIXA.");
  }
  url.protocol = "https:";
  url.hash = "";
  return url;
}

async function fetchOfficialFile(input: string) {
  let current = officialUrl(input);
  for (let redirects = 0; redirects <= 6; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Cookie: "security=true",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36 Innovar-SINAPI-Updater/2.0",
          Accept: "application/zip,application/octet-stream;q=0.9,*/*;q=0.5",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
          Referer: DOWNLOADS_PAGE
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("A CAIXA redirecionou sem informar o destino.");
      await response.body?.cancel().catch(() => undefined);
      current = officialUrl(new URL(location, current).toString());
      continue;
    }
    return response;
  }
  throw new Error("A CAIXA excedeu o limite de redirecionamentos permitido.");
}

async function readLimitedBody(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_DOWNLOAD_BYTES) throw new Error("O pacote SINAPI excede o limite de download permitido.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("A CAIXA respondeu sem o corpo do arquivo.");

  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("O pacote SINAPI excede o limite de download permitido.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function downloadOfficialPackage(source: SinapiOfficialSource) {
  if (source.declaredSize > MAX_DOWNLOAD_BYTES) {
    throw new Error("O tamanho publicado pela CAIXA excede o limite permitido.");
  }
  const response = await fetchOfficialFile(source.url);
  if (!response.ok) throw new Error(`Falha ao baixar o SINAPI na CAIXA: HTTP ${response.status}.`);
  const finalUrl = officialUrl(response.url || source.url).toString();
  const buffer = await readLimitedBody(response);
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("O arquivo baixado da CAIXA não possui assinatura ZIP.");
  }
  if (source.declaredSize > 0 && source.declaredSize !== buffer.length) {
    throw new Error(`O tamanho baixado (${buffer.length}) diverge do catálogo oficial (${source.declaredSize}).`);
  }
  return { finalUrl, buffer };
}

function validateBaseDate(baseDate: string, sourceBaseDate: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(baseDate)) {
    throw new Error("A data-base identificada no pacote SINAPI é inválida.");
  }
  if (baseDate !== sourceBaseDate) {
    throw new Error(`A data-base interna ${baseDate} diverge da publicação ${sourceBaseDate}.`);
  }
  const current = new Date();
  const currentMonth = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}-01`;
  if (baseDate > currentMonth) throw new Error("O pacote SINAPI possui data-base futura.");
}

async function loadOfficialPackage(region: string, taxRelief: boolean): Promise<LoadedPackage> {
  const source = await discoverLatestSinapiXlsxSource();
  const { finalUrl, buffer } = await downloadOfficialPackage(source);
  const sourceSha256 = createHash("sha256").update(buffer).digest("hex");
  const parsed = parseSinapiOfficialReferencePackage(buffer, { sourceUrl: finalUrl, region, taxRelief });
  validateBaseDate(parsed.baseDate, source.baseDate);
  return { source, finalUrl, buffer, sourceSha256, parsed };
}

export async function inspectLatestSinapiOfficialPackage(input: { region: string; taxRelief: boolean }) {
  const region = input.region.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) throw new Error("UF inválida para inspeção SINAPI.");
  const loaded = await loadOfficialPackage(region, input.taxRelief);
  return {
    source: loaded.source,
    finalUrl: loaded.finalUrl,
    sourceSha256: loaded.sourceSha256,
    downloadedBytes: loaded.buffer.length,
    baseDate: loaded.parsed.baseDate,
    inputs: loaded.parsed.inputs.length,
    compositions: loaded.parsed.compositions.length,
    xlsxFiles: loaded.parsed.xlsxFiles,
    worksheets: loaded.parsed.worksheets
  } satisfies SinapiOfficialPackageInspection;
}

function chunksOf<T>(rows: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

async function importInputs(
  supabase: ReturnType<typeof serviceClient>,
  batchId: string,
  rows: SinapiInputImportRow[]
) {
  let imported = 0;
  for (const chunk of chunksOf(rows, 750)) {
    const { data, error } = await supabase.rpc("import_sinapi_inputs_chunk", {
      p_batch_id: batchId,
      p_rows: chunk
    });
    if (error) throw new Error(`Falha ao importar insumos SINAPI: ${error.message}`);
    imported += Number(data ?? 0);
  }
  return imported;
}

async function importCompositions(
  supabase: ReturnType<typeof serviceClient>,
  batchId: string,
  rows: SinapiCompositionImportRow[]
) {
  let imported = 0;
  for (const chunk of chunksOf(rows, 200)) {
    const { data, error } = await supabase.rpc("import_sinapi_compositions_chunk", {
      p_batch_id: batchId,
      p_rows: chunk
    });
    if (error) throw new Error(`Falha ao importar composições SINAPI: ${error.message}`);
    imported += Number(data ?? 0);
  }
  return imported;
}

function previousBatchResult(
  previous: PreviousBatch,
  status: "already_current" | "newer_local_base",
  context: {
    finalUrl: string;
    sourceSha256: string;
    region: string;
    taxRelief: boolean;
    xlsxFiles: number;
    worksheets: number;
  }
): SinapiAutomaticUpdateResult {
  return {
    status,
    batchId: previous.id,
    sourceUrl: context.finalUrl,
    sourceSha256: context.sourceSha256,
    baseDate: previous.base_date,
    region: context.region,
    taxRelief: context.taxRelief,
    inputs: Number(previous.imported_inputs),
    compositions: Number(previous.imported_compositions),
    rejected: Number(previous.rejected_records),
    xlsxFiles: context.xlsxFiles,
    worksheets: context.worksheets
  };
}

export async function runSinapiAutomaticUpdate(input: {
  organizationId: string;
  region: string;
  taxRelief: boolean;
}): Promise<SinapiAutomaticUpdateResult> {
  const region = input.region.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) throw new Error("UF inválida para atualização SINAPI.");

  const loaded = await loadOfficialPackage(region, input.taxRelief);
  const { source, finalUrl, buffer, sourceSha256, parsed } = loaded;
  const supabase = serviceClient();
  const { data: latest, error: latestError } = await supabase
    .from("sinapi_import_batches")
    .select("id, base_date, source_sha256, imported_inputs, imported_compositions, rejected_records")
    .eq("organization_id", input.organizationId)
    .eq("region", region)
    .eq("tax_relief", input.taxRelief)
    .eq("status", "COMPLETED")
    .order("base_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new Error(`Falha ao consultar o estado atual do SINAPI: ${latestError.message}`);

  const context = {
    finalUrl,
    sourceSha256,
    region,
    taxRelief: input.taxRelief,
    xlsxFiles: parsed.xlsxFiles.length,
    worksheets: parsed.worksheets
  };
  if (latest && latest.base_date > parsed.baseDate) {
    return previousBatchResult(latest as PreviousBatch, "newer_local_base", context);
  }
  if (latest && latest.base_date === parsed.baseDate && latest.source_sha256 === sourceSha256) {
    return previousBatchResult(latest as PreviousBatch, "already_current", context);
  }

  let batchId: string | null = null;
  try {
    const { data: startedBatchId, error: startError } = await supabase.rpc("start_sinapi_import", {
      p_organization_id: input.organizationId,
      p_region: region,
      p_base_date: parsed.baseDate,
      p_tax_relief: input.taxRelief,
      p_source_url: finalUrl,
      p_source_sha256: sourceSha256,
      p_metadata: {
        automatic: true,
        parserVersion: "6-official-reference",
        sourceFileName: source.fileName,
        sourceModifiedAt: source.modifiedAt,
        sourceDescription: source.description,
        sourceDeclaredBytes: source.declaredSize,
        sourceRectification: source.isRectification,
        downloadedBytes: buffer.length,
        xlsxFiles: parsed.xlsxFiles,
        worksheets: parsed.worksheets,
        analyticalComponentsImported: false
      }
    });
    if (startError || !startedBatchId) throw new Error(startError?.message ?? "O lote SINAPI não foi iniciado.");
    batchId = String(startedBatchId);

    const { data: claimedBatch, error: claimedError } = await supabase
      .from("sinapi_import_batches")
      .select("id, status, imported_inputs, imported_compositions, rejected_records")
      .eq("id", batchId)
      .single();
    if (claimedError) throw new Error(`Falha ao confirmar o lote SINAPI: ${claimedError.message}`);
    if (claimedBatch.status === "COMPLETED") {
      return {
        status: "already_current",
        batchId,
        sourceUrl: finalUrl,
        sourceSha256,
        baseDate: parsed.baseDate,
        region,
        taxRelief: input.taxRelief,
        inputs: Number(claimedBatch.imported_inputs),
        compositions: Number(claimedBatch.imported_compositions),
        rejected: Number(claimedBatch.rejected_records),
        xlsxFiles: parsed.xlsxFiles.length,
        worksheets: parsed.worksheets
      };
    }

    const importedInputs = await importInputs(supabase, batchId, parsed.inputs);
    const importedCompositions = await importCompositions(supabase, batchId, parsed.compositions);
    const { data: finished, error: finishError } = await supabase.rpc("finish_sinapi_import", {
      p_batch_id: batchId,
      p_error_message: null
    });
    if (finishError || !finished) throw new Error(finishError?.message ?? "O lote SINAPI não foi finalizado.");

    return {
      status: "updated",
      batchId,
      sourceUrl: finalUrl,
      sourceSha256,
      baseDate: parsed.baseDate,
      region,
      taxRelief: input.taxRelief,
      inputs: importedInputs,
      compositions: importedCompositions,
      rejected: Number(finished.rejected_records ?? 0),
      xlsxFiles: parsed.xlsxFiles.length,
      worksheets: parsed.worksheets
    };
  } catch (error) {
    if (batchId) {
      try {
        await supabase.rpc("finish_sinapi_import", {
          p_batch_id: batchId,
          p_error_message: error instanceof Error ? error.message : "Falha desconhecida na atualização automática."
        });
      } catch {
        // O erro original permanece como evidência principal.
      }
    }
    throw error;
  }
}
