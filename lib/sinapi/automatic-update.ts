import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseSinapiZipPackage, type SinapiCompositionImportRow, type SinapiInputImportRow } from "./xlsx-parser";

const OFFICIAL_DOWNLOAD_FOLDER = "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/";
const DISCOVERY_PAGES = [
  "https://www.caixa.gov.br/site/Paginas/downloads.aspx#categoria_888",
  OFFICIAL_DOWNLOAD_FOLDER,
  "https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx"
] as const;
const MAX_DOWNLOAD_BYTES = 180 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 150_000;

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
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("A URL encontrada para o SINAPI é inválida.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || (hostname !== "caixa.gov.br" && !hostname.endsWith(".caixa.gov.br"))) {
    throw new Error("A atualização SINAPI aceita somente HTTPS no domínio oficial da CAIXA.");
  }
  parsed.hash = "";
  return parsed;
}

async function fetchOfficial(
  input: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  let current = officialUrl(input);
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, {
        ...init,
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "Innovar-SINAPI-Updater/1.0 (+https://github.com/thiagofernandes1987-create/Innov)",
          Accept: "text/html,application/zip,application/octet-stream;q=0.9,*/*;q=0.5",
          ...(init.headers ?? {})
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("A CAIXA respondeu com redirecionamento sem destino.");
      current = officialUrl(new URL(location, current).toString());
      continue;
    }
    return response;
  }
  throw new Error("A CAIXA excedeu o limite de redirecionamentos permitido.");
}

function htmlDecode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isSinapiXlsxCandidate(url: URL, label = "") {
  const combined = `${decodeURIComponent(url.pathname)} ${label}`.toLowerCase();
  return combined.includes("sinapi")
    && combined.includes("xlsx")
    && (combined.includes("relatorios-mensais") || combined.includes("formato-xlsx"))
    && (url.pathname.toLowerCase().endsWith(".zip") || combined.includes("formato-xlsx"));
}

function extractCandidates(html: string, baseUrl: string) {
  const candidates = new Set<string>();
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i)?.slice(1).find(Boolean);
    if (!href) continue;
    const label = htmlDecode(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    try {
      const url = officialUrl(new URL(htmlDecode(href), baseUrl).toString());
      if (isSinapiXlsxCandidate(url, label)) candidates.add(url.toString());
    } catch {
      // Links externos e inválidos são deliberadamente ignorados.
    }
  }

  for (const match of html.matchAll(/(?:https:\/\/[^"'\s<>]+|\/Downloads\/[^"'\s<>]+)/gi)) {
    try {
      const url = officialUrl(new URL(htmlDecode(match[0]), baseUrl).toString());
      if (isSinapiXlsxCandidate(url)) candidates.add(url.toString());
    } catch {
      // Mantém descoberta fail-closed no domínio CAIXA.
    }
  }
  return [...candidates];
}

function candidateBaseDate(value: string) {
  const decoded = (() => {
    try { return decodeURIComponent(value); } catch { return value; }
  })();
  const match = decoded.match(/SINAPI[^0-9]{0,20}(20\d{2})[-_ ](0[1-9]|1[0-2])/i)
    ?? decoded.match(/(20\d{2})[-_ ](0[1-9]|1[0-2])/);
  return match ? `${match[1]}-${match[2]}-01` : "0000-00-01";
}

function generatedMonthlyCandidates() {
  const candidates: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  for (let offset = 0; offset < 20; offset += 1) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const stem = `SINAPI-${year}-${month}-formato-xlsx`;
    candidates.push(new URL(`${stem}.zip`, OFFICIAL_DOWNLOAD_FOLDER).toString());
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return candidates;
}

async function probeZip(url: string) {
  try {
    const response = await fetchOfficial(url, {
      method: "GET",
      headers: { Range: "bytes=0-7" }
    }, 20_000);
    if (!response.ok && response.status !== 206) return false;
    const reader = response.body?.getReader();
    if (!reader) return false;
    const { value } = await reader.read();
    await reader.cancel().catch(() => undefined);
    return Boolean(value && value.length >= 4 && value[0] === 0x50 && value[1] === 0x4b && value[2] === 0x03 && value[3] === 0x04);
  } catch {
    return false;
  }
}

export async function discoverLatestSinapiXlsxUrl() {
  const configured = process.env.SINAPI_XLSX_URL?.trim();
  if (configured) {
    const url = officialUrl(configured);
    if (!isSinapiXlsxCandidate(url)) throw new Error("SINAPI_XLSX_URL não identifica um pacote ZIP/XLSX do SINAPI.");
    if (!await probeZip(url.toString())) throw new Error("SINAPI_XLSX_URL não respondeu com um ZIP válido.");
    return url.toString();
  }

  const discovered = new Set<string>();
  for (const pageUrl of DISCOVERY_PAGES) {
    try {
      const response = await fetchOfficial(pageUrl);
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("html") && !contentType.includes("text")) continue;
      const html = await response.text();
      for (const candidate of extractCandidates(html, response.url || pageUrl)) discovered.add(candidate);
    } catch {
      // A próxima fonte oficial ou os candidatos mensais serão tentados.
    }
  }

  const candidates = [...discovered, ...generatedMonthlyCandidates()]
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort((left, right) => candidateBaseDate(right).localeCompare(candidateBaseDate(left)));

  for (const candidate of candidates) {
    if (await probeZip(candidate)) return candidate;
  }
  throw new Error("Nenhum pacote ZIP/XLSX mensal acessível foi encontrado nas fontes oficiais da CAIXA.");
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

async function downloadOfficialPackage(url: string) {
  const response = await fetchOfficial(url, { method: "GET" }, DOWNLOAD_TIMEOUT_MS);
  if (!response.ok) throw new Error(`Falha ao baixar o SINAPI na CAIXA: HTTP ${response.status}.`);
  const finalUrl = officialUrl(response.url || url).toString();
  const buffer = await readLimitedBody(response, MAX_DOWNLOAD_BYTES);
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("O conteúdo baixado da CAIXA não possui assinatura ZIP.");
  }
  return { buffer, finalUrl };
}

function chunksOf<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
}

function monthStart(value = new Date()) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function validateBaseDate(baseDate: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(baseDate)) throw new Error("Data-base identificada no pacote SINAPI é inválida.");
  if (baseDate > monthStart()) throw new Error("O pacote SINAPI informa uma data-base futura.");
  const minimum = new Date();
  minimum.setUTCDate(1);
  minimum.setUTCMonth(minimum.getUTCMonth() - 24);
  if (baseDate < monthStart(minimum)) throw new Error("O pacote SINAPI encontrado é antigo demais para atualização automática.");
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

export async function runSinapiAutomaticUpdate(input: {
  organizationId: string;
  region: string;
  taxRelief: boolean;
}): Promise<SinapiAutomaticUpdateResult> {
  const region = input.region.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) throw new Error("UF inválida para atualização SINAPI.");

  const sourceCandidate = await discoverLatestSinapiXlsxUrl();
  const { buffer, finalUrl } = await downloadOfficialPackage(sourceCandidate);
  const sourceSha256 = createHash("sha256").update(buffer).digest("hex");
  const parsed = parseSinapiZipPackage(buffer, { sourceUrl: finalUrl, region, taxRelief: input.taxRelief });
  validateBaseDate(parsed.baseDate);

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

  if (latest && latest.base_date > parsed.baseDate) {
    return {
      status: "newer_local_base",
      batchId: latest.id,
      sourceUrl: finalUrl,
      sourceSha256,
      baseDate: latest.base_date,
      region,
      taxRelief: input.taxRelief,
      inputs: Number(latest.imported_inputs),
      compositions: Number(latest.imported_compositions),
      rejected: Number(latest.rejected_records),
      xlsxFiles: parsed.xlsxFiles.length,
      worksheets: parsed.worksheets
    };
  }

  if (latest && latest.base_date === parsed.baseDate && latest.source_sha256 === sourceSha256) {
    return {
      status: "already_current",
      batchId: latest.id,
      sourceUrl: finalUrl,
      sourceSha256,
      baseDate: latest.base_date,
      region,
      taxRelief: input.taxRelief,
      inputs: Number(latest.imported_inputs),
      compositions: Number(latest.imported_compositions),
      rejected: Number(latest.rejected_records),
      xlsxFiles: parsed.xlsxFiles.length,
      worksheets: parsed.worksheets
    };
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
        parserVersion: "2",
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
      await supabase.rpc("finish_sinapi_import", {
        p_batch_id: batchId,
        p_error_message: error instanceof Error ? error.message : "Falha desconhecida na atualização automática."
      }).catch(() => undefined);
    }
    throw error;
  }
}
