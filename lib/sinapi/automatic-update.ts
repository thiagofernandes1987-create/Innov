import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  selectLatestSinapiXlsxFile,
  parseSinapiBaseDate,
  type CaixaSinapiFile,
  type SinapiOfficialSource
} from "./source-catalog";
import {
  parseSinapiZipPackage,
  type ParsedSinapiPackage,
  type SinapiCompositionImportRow,
  type SinapiInputImportRow
} from "./xlsx-parser";

const CAIXA_BASE_URL = "https://www.caixa.gov.br";
const DOWNLOADS_PAGE = `${CAIXA_BASE_URL}/site/Paginas/downloads.aspx`;
const CATEGORY_TITLE = "SINAPI - Relatórios mensais - a partir de 2025";
const MAX_DOWNLOAD_BYTES = 180 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 180_000;

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

type CaixaCategory = { ID?: number; Id?: number; Title?: string };
type ODataResults<T> = { d?: { results?: T[] } };
type PreviousBatch = {
  id: string;
  base_date: string;
  source_sha256: string;
  status: string;
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

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function officialUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("A URL encontrada para o SINAPI é inválida.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "caixa.gov.br" && !hostname.endsWith(".caixa.gov.br")) {
    throw new Error("A atualização SINAPI aceita somente o domínio oficial da CAIXA.");
  }
  parsed.protocol = "https:";
  parsed.hash = "";
  return parsed;
}

function absorbResponseCookies(headers: Headers, jar: Map<string, string>) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getSetCookie === "function"
    ? getSetCookie.call(headers)
    : headers.get("set-cookie")
      ? [headers.get("set-cookie") as string]
      : [];

  for (const setCookie of setCookies) {
    const pair = setCookie.split(";", 1)[0]?.trim();
    const separator = pair?.indexOf("=") ?? -1;
    if (!pair || separator <= 0) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (!name) continue;
    if (!value) jar.delete(name);
    else jar.set(name, value);
  }
}

async function fetchOfficial(
  input: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  let current = officialUrl(input);
  const cookies = new Map<string, string>([["security", "true"]]);

  for (let redirects = 0; redirects <= 7; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(init.headers);
    if (!headers.has("User-Agent")) {
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36 Innovar-SINAPI-Updater/1.0"
      );
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "text/html,application/json,application/zip,application/octet-stream;q=0.9,*/*;q=0.5");
    }
    if (!headers.has("Accept-Language")) headers.set("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.6");
    if (!headers.has("Referer")) headers.set("Referer", DOWNLOADS_PAGE);
    headers.set("Cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));

    let response: Response;
    try {
      response = await fetch(current, {
        ...init,
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers
      });
    } finally {
      clearTimeout(timer);
    }

    absorbResponseCookies(response.headers, cookies);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("A CAIXA respondeu com redirecionamento sem destino.");
      await response.body?.cancel().catch(() => undefined);
      current = officialUrl(new URL(location, current).toString());
      continue;
    }
    return response;
  }
  throw new Error("A CAIXA excedeu o limite de redirecionamentos permitido.");
}

async function fetchOfficialJson<T>(url: string) {
  const response = await fetchOfficial(url, {
    method: "GET",
    headers: { Accept: "application/json;odata=verbose" }
  });
  if (!response.ok) throw new Error(`A API de downloads da CAIXA respondeu HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("json")) throw new Error("A API de downloads da CAIXA não retornou JSON.");
  try {
    return await response.json() as T;
  } catch {
    throw new Error("A API de downloads da CAIXA retornou JSON inválido.");
  }
}

function categoryApiUrl() {
  return `${CAIXA_BASE_URL}/_api/web/lists/getbytitle('LT_T077_Downloads_Categorias')/Items?$select=ID,Title&$top=5000&$orderby=Title`;
}

function filesApiUrl(categoryId: number) {
  const select = "Title,Modified,File_x0020_Type,FileLeafRef,EncodedAbsUrl,Descricao,FileSizeDisplay,Categoria/ID";
  const filter = `Categoria/ID%20eq%20${categoryId}%20and%20FSObjType%20eq%200%20and%20OData__ModerationStatus%20eq%200`;
  return `${CAIXA_BASE_URL}/_api/web/lists/getbytitle('Downloads')/Items?$select=${select}&$expand=Categoria&$filter=${filter}&$top=5000&$orderby=Modified%20desc`;
}

async function discoverSourceFromCaixaApi() {
  const categoriesPayload = await fetchOfficialJson<ODataResults<CaixaCategory>>(categoryApiUrl());
  const categories = categoriesPayload.d?.results ?? [];
  const category = categories.find(item => normalize(item.Title) === normalize(CATEGORY_TITLE));
  const categoryId = Number(category?.ID ?? category?.Id);
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    throw new Error(`A categoria oficial “${CATEGORY_TITLE}” não foi encontrada na CAIXA.`);
  }

  const filesPayload = await fetchOfficialJson<ODataResults<CaixaSinapiFile>>(filesApiUrl(categoryId));
  const files = filesPayload.d?.results ?? [];
  const source = selectLatestSinapiXlsxFile(files);
  if (!source) throw new Error("A categoria oficial da CAIXA não contém um ZIP XLSX SINAPI válido.");
  return source;
}

async function probeZip(url: string) {
  const response = await fetchOfficial(url, {
    method: "GET",
    headers: { Range: "bytes=0-7" }
  }, 30_000);
  if (!response.ok && response.status !== 206) return false;
  const reader = response.body?.getReader();
  if (!reader) return false;
  const { value } = await reader.read();
  await reader.cancel().catch(() => undefined);
  return Boolean(value && value.length >= 4 && value[0] === 0x50 && value[1] === 0x4b && value[2] === 0x03 && value[3] === 0x04);
}

function configuredSource(value: string): SinapiOfficialSource {
  const url = officialUrl(value);
  const baseDate = parseSinapiBaseDate(url.pathname);
  if (!baseDate || !/sinapi/i.test(url.pathname) || !/xlsx/i.test(url.pathname) || !/\.zip$/i.test(url.pathname)) {
    throw new Error("SINAPI_XLSX_URL não identifica um pacote ZIP/XLSX mensal do SINAPI.");
  }
  return {
    url: url.toString(),
    baseDate,
    modifiedAt: "1970-01-01T00:00:00.000Z",
    fileName: url.pathname.split("/").pop() ?? "SINAPI-formato-xlsx.zip",
    title: "SINAPI XLSX configurado",
    description: "Fonte definida por SINAPI_XLSX_URL",
    declaredSize: 0,
    isRectification: /retifica/i.test(url.pathname)
  };
}

export async function discoverLatestSinapiXlsxSource() {
  const configured = process.env.SINAPI_XLSX_URL?.trim();
  const source = configured ? configuredSource(configured) : await discoverSourceFromCaixaApi();
  if (!await probeZip(source.url)) {
    throw new Error(`A publicação ${source.fileName} não respondeu com um ZIP válido.`);
  }
  return source;
}

export async function discoverLatestSinapiXlsxUrl() {
  return (await discoverLatestSinapiXlsxSource()).url;
}

async function readLimitedBody(response: Response, limit: number) {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > limit) throw new Error("O pacote SINAPI excede o limite de download permitido.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("A CAIXA respondeu sem corpo de arquivo.");

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      throw new Error("O pacote SINAPI excede o limite de download permitido.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), size);
}

async function downloadOfficialPackage(source: SinapiOfficialSource) {
  if (source.declaredSize > MAX_DOWNLOAD_BYTES) {
    throw new Error("O tamanho publicado pela CAIXA excede o limite permitido.");
  }
  const response = await fetchOfficial(source.url, { method: "GET" }, DOWNLOAD_TIMEOUT_MS);
  if (!response.ok) throw new Error(`Falha ao baixar o SINAPI na CAIXA: HTTP ${response.status}.`);
  const finalUrl = officialUrl(response.url || source.url).toString();
  const buffer = await readLimitedBody(response, MAX_DOWNLOAD_BYTES);
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("O conteúdo baixado da CAIXA não possui assinatura ZIP.");
  }
  if (source.declaredSize > 0 && buffer.length !== source.declaredSize) {
    throw new Error(`O tamanho baixado (${buffer.length}) diverge do catálogo oficial (${source.declaredSize}).`);
  }
  return { buffer, finalUrl };
}

function validateBaseDate(baseDate: string, sourceBaseDate: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(baseDate)) {
    throw new Error("Data-base identificada no pacote SINAPI é inválida.");
  }
  if (baseDate !== sourceBaseDate) {
    throw new Error(`A data-base interna ${baseDate} diverge da publicação ${sourceBaseDate}.`);
  }
  const current = new Date();
  const currentMonth = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}-01`;
  if (baseDate > currentMonth) throw new Error("O pacote SINAPI informa uma data-base futura.");
  const minimum = new Date();
  minimum.setUTCDate(1);
  minimum.setUTCMonth(minimum.getUTCMonth() - 24);
  const minimumMonth = `${minimum.getUTCFullYear()}-${String(minimum.getUTCMonth() + 1).padStart(2, "0")}-01`;
  if (baseDate < minimumMonth) throw new Error("O pacote SINAPI encontrado é antigo demais para atualização automática.");
}

async function loadOfficialPackage(region: string, taxRelief: boolean): Promise<LoadedPackage> {
  const source = await discoverLatestSinapiXlsxSource();
  const { buffer, finalUrl } = await downloadOfficialPackage(source);
  const sourceSha256 = createHash("sha256").update(buffer).digest("hex");
  const parsed = parseSinapiZipPackage(buffer, { sourceUrl: finalUrl, region, taxRelief });
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
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
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
    .select("id, base_date, source_sha256, status, imported_inputs, imported_compositions, rejected_records")
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
        parserVersion: "5",
        sourceFileName: source.fileName,
        sourceModifiedAt: source.modifiedAt,
        sourceDescription: source.description,
        sourceDeclaredBytes: source.declaredSize,
        sourceRectification: source.isRectification,
        downloadedBytes: buffer.length,
        xlsxFiles: parsed.xlsxFiles,
        worksheets: parsed.worksheets
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
        // O erro original permanece a evidência principal da execução.
      }
    }
    throw error;
  }
}
