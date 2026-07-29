import { posix as pathPosix } from "node:path";
import { inflateRawSync } from "node:zlib";
import type {
  ParsedSinapiPackage,
  SinapiCompositionImportRow,
  SinapiInputImportRow
} from "./xlsx-parser";

type ZipEntry = {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

type ZipLimits = {
  maxArchiveBytes: number;
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
  maxCompressionRatio: number;
};

type WorkbookSheet = {
  name: string;
  path: string;
};

type HeaderMap = {
  rowIndex: number;
  code: number;
  description: number;
  unit: number;
  cost: number;
  itemType: number | null;
};

type TargetFile = {
  entry: ZipEntry;
  kind: "INPUT" | "COMPOSITION";
  baseDate: string;
};

const UFS = new Set([
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
]);

const OUTER_LIMITS: ZipLimits = {
  maxArchiveBytes: 180 * 1024 * 1024,
  maxEntries: 800,
  maxEntryBytes: 100 * 1024 * 1024,
  maxTotalBytes: 1_200 * 1024 * 1024,
  maxCompressionRatio: 800
};

const XLSX_LIMITS: ZipLimits = {
  maxArchiveBytes: 100 * 1024 * 1024,
  maxEntries: 4_000,
  maxEntryBytes: 150 * 1024 * 1024,
  maxTotalBytes: 400 * 1024 * 1024,
  maxCompressionRatio: 1_000
};

function fail(message: string): never {
  throw new Error(`SINAPI_XLSX: ${message}`);
}

function readUInt16(buffer: Buffer, offset: number) {
  if (offset < 0 || offset + 2 > buffer.length) fail("estrutura ZIP truncada.");
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number) {
  if (offset < 0 || offset + 4 > buffer.length) fail("estrutura ZIP truncada.");
  return buffer.readUInt32LE(offset);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function compactText(value: unknown) {
  return normalizeText(value).replace(/\s+/g, "");
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeArchivePath(value: string) {
  const normalized = value.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    fail("caminho absoluto dentro do ZIP.");
  }
  if (normalized.split("/").some(part => part === ".." || part.includes("\u0000"))) {
    fail("tentativa de path traversal dentro do ZIP.");
  }
  return normalized;
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) return offset;
  }
  fail("assinatura final do ZIP não encontrada.");
}

function listZipEntries(buffer: Buffer, limits: ZipLimits) {
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    fail("arquivo não possui assinatura ZIP.");
  }
  if (buffer.length > limits.maxArchiveBytes) fail("arquivo compactado excede o limite permitido.");

  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, endOffset + 10);
  const centralSize = readUInt32(buffer, endOffset + 12);
  const centralOffset = readUInt32(buffer, endOffset + 16);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    fail("ZIP64 não é aceito pelo importador.");
  }
  if (entryCount < 1 || entryCount > limits.maxEntries) fail("quantidade de entradas ZIP fora do limite.");
  if (centralOffset + centralSize > buffer.length) fail("diretório central ZIP inválido.");

  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  let totalBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, cursor) !== 0x02014b50) fail("entrada do diretório central inválida.");
    const flags = readUInt16(buffer, cursor + 8);
    const method = readUInt16(buffer, cursor + 10);
    const compressedSize = readUInt32(buffer, cursor + 20);
    const uncompressedSize = readUInt32(buffer, cursor + 24);
    const nameLength = readUInt16(buffer, cursor + 28);
    const extraLength = readUInt16(buffer, cursor + 30);
    const commentLength = readUInt16(buffer, cursor + 32);
    const localHeaderOffset = readUInt32(buffer, cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) fail("nome de entrada ZIP truncado.");
    const encoding: BufferEncoding = flags & 0x0800 ? "utf8" : "latin1";
    const name = safeArchivePath(buffer.subarray(nameStart, nameEnd).toString(encoding));

    if (flags & 0x0001) fail("arquivo ZIP criptografado não é aceito.");
    if (![0, 8].includes(method)) fail(`método de compressão não aceito em ${name}.`);
    if (uncompressedSize > limits.maxEntryBytes) fail(`entrada ${name} excede o limite descompactado.`);
    if (compressedSize === 0 && uncompressedSize > 0) fail(`entrada ${name} possui tamanho compactado inválido.`);
    if (compressedSize > 0 && uncompressedSize / compressedSize > limits.maxCompressionRatio) {
      fail(`taxa de compressão suspeita em ${name}.`);
    }
    totalBytes += uncompressedSize;
    if (totalBytes > limits.maxTotalBytes) fail("volume descompactado total excede o limite permitido.");

    entries.push({ name, flags, method, compressedSize, uncompressedSize, localHeaderOffset });
    cursor = nameEnd + extraLength + commentLength;
  }
  return entries;
}

function extractZipEntry(buffer: Buffer, entry: ZipEntry) {
  const offset = entry.localHeaderOffset;
  if (readUInt32(buffer, offset) !== 0x04034b50) fail(`cabeçalho local inválido em ${entry.name}.`);
  const nameLength = readUInt16(buffer, offset + 26);
  const extraLength = readUInt16(buffer, offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (start < 0 || end > buffer.length) fail(`dados compactados truncados em ${entry.name}.`);
  const compressed = buffer.subarray(start, end);
  const extracted = entry.method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);
  if (extracted.length !== entry.uncompressedSize) fail(`tamanho descompactado divergente em ${entry.name}.`);
  return extracted;
}

function xmlDecode(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttributes(fragment: string) {
  const result = new Map<string, string>();
  for (const match of fragment.matchAll(/([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result.set(match[1], xmlDecode(match[2] ?? match[3] ?? ""));
  }
  return result;
}

function columnIndex(reference: string) {
  let result = 0;
  for (const character of reference.toUpperCase()) {
    if (character < "A" || character > "Z") break;
    result = result * 26 + character.charCodeAt(0) - 64;
  }
  return Math.max(0, result - 1);
}

function parseSharedStrings(xml: string) {
  const result: string[] = [];
  for (const item of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    result.push([...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(match => xmlDecode(match[1])).join(""));
  }
  return result;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];
  let parsedRows = 0;
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    parsedRows += 1;
    if (parsedRows > 300_000) fail("planilha excede 300.000 linhas.");
    const row: string[] = [];
    let sequentialColumn = 0;
    const cells = rowMatch[1].match(/<c\b[\s\S]*?<\/c>|<c\b[^>]*\/>/g) ?? [];
    for (const cellXml of cells) {
      const openTag = cellXml.match(/^<c\b([^>]*)\/?\s*>/);
      if (!openTag) continue;
      const attributes = parseAttributes(openTag[1]);
      const reference = attributes.get("r")?.match(/^([A-Z]+)\d+$/i)?.[1];
      const index = reference ? columnIndex(reference) : sequentialColumn;
      sequentialColumn = index + 1;
      if (index > 250) fail("planilha excede 251 colunas úteis.");
      const type = attributes.get("t") ?? "";
      let value = "";
      if (type === "inlineStr") {
        value = [...cellXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(match => xmlDecode(match[1])).join("");
      } else {
        const raw = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
        value = type === "s" ? sharedStrings[Number.parseInt(raw, 10)] ?? "" : xmlDecode(raw);
      }
      row[index] = value;
    }
    rows.push(row);
  }
  return rows;
}

function resolveWorkbookTarget(target: string) {
  const decoded = xmlDecode(target).replace(/\\/g, "/");
  if (decoded.startsWith("/")) return safeArchivePath(decoded.slice(1));
  if (decoded.startsWith("xl/")) return safeArchivePath(decoded);
  return safeArchivePath(pathPosix.normalize(pathPosix.join("xl", decoded)));
}

function workbookSheets(entries: ZipEntry[], workbook: Buffer) {
  const byName = new Map(entries.map(entry => [entry.name.toLowerCase(), entry]));
  const workbookEntry = byName.get("xl/workbook.xml");
  const relationshipsEntry = byName.get("xl/_rels/workbook.xml.rels");
  if (!workbookEntry || !relationshipsEntry) {
    return entries
      .filter(entry => /^xl\/worksheets\/[^/]+\.xml$/i.test(entry.name))
      .map(entry => ({ name: pathPosix.basename(entry.name, ".xml"), path: entry.name }));
  }

  const workbookXml = extractZipEntry(workbook, workbookEntry).toString("utf8");
  const relationshipsXml = extractZipEntry(workbook, relationshipsEntry).toString("utf8");
  const relationships = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const attributes = parseAttributes(match[1]);
    const id = attributes.get("Id");
    const target = attributes.get("Target");
    if (id && target) relationships.set(id, resolveWorkbookTarget(target));
  }

  const result: WorkbookSheet[] = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const attributes = parseAttributes(match[1]);
    const target = relationships.get(attributes.get("r:id") ?? "");
    if (target && byName.has(target.toLowerCase())) {
      result.push({ name: attributes.get("name") ?? pathPosix.basename(target, ".xml"), path: target });
    }
  }
  return result;
}

function parseWorkbook(buffer: Buffer) {
  const entries = listZipEntries(buffer, XLSX_LIMITS);
  const byName = new Map(entries.map(entry => [entry.name.toLowerCase(), entry]));
  const sharedEntry = byName.get("xl/sharedstrings.xml");
  const sharedStrings = sharedEntry
    ? parseSharedStrings(extractZipEntry(buffer, sharedEntry).toString("utf8"))
    : [];
  return workbookSheets(entries, buffer).map(sheet => {
    const entry = byName.get(sheet.path.toLowerCase());
    if (!entry) fail(`worksheet ${sheet.path} não encontrada.`);
    return {
      name: sheet.name,
      rows: parseWorksheetRows(extractZipEntry(buffer, entry).toString("utf8"), sharedStrings)
    };
  });
}

function fileRegion(value: string) {
  const tokens = normalizeText(value).split(" ");
  return tokens.find(token => UFS.has(token)) ?? null;
}

function fileRegime(value: string) {
  const compact = compactText(value);
  if (compact.includes("NAODESONERADO") || compact.includes("SEMDESONERACAO")) return false;
  if (compact.includes("DESONERADO")) return true;
  return null;
}

function fileKind(value: string): TargetFile["kind"] | null {
  const normalized = normalizeText(value);
  if (normalized.includes("PRECO REF INSUMOS") || normalized.includes("INSUMOS")) return "INPUT";
  if (normalized.includes("CUSTO REF COMPOSICOES") || normalized.includes("COMPOSICOES")) return "COMPOSITION";
  return null;
}

function baseDate(value: string) {
  const match = normalizeText(value).match(/(?:SINAPI\s*)?(20\d{2})\s*(0[1-9]|1[0-2])/);
  return match ? `${match[1]}-${match[2]}-01` : null;
}

function selectTargetFiles(entries: ZipEntry[], region: string, taxRelief: boolean) {
  const targets: TargetFile[] = [];
  for (const entry of entries) {
    if (!entry.name.toLowerCase().endsWith(".xlsx")) continue;
    if (fileRegion(entry.name) !== region) continue;
    if (fileRegime(entry.name) !== taxRelief) continue;
    const kind = fileKind(entry.name);
    const date = baseDate(entry.name);
    if (kind && date) targets.push({ entry, kind, baseDate: date });
  }
  const inputFiles = targets.filter(target => target.kind === "INPUT");
  const compositionFiles = targets.filter(target => target.kind === "COMPOSITION");
  if (!inputFiles.length) fail(`relatório de insumos ${region} ${taxRelief ? "desonerado" : "não desonerado"} não encontrado.`);
  if (!compositionFiles.length) fail(`relatório de composições ${region} ${taxRelief ? "desonerado" : "não desonerado"} não encontrado.`);
  const dates = new Set(targets.map(target => target.baseDate));
  if (dates.size !== 1) fail("os relatórios selecionados possuem datas-base divergentes.");
  return targets;
}

function findColumn(headers: string[], predicates: Array<(header: string) => boolean>, excluded: Set<number>) {
  for (const predicate of predicates) {
    const index = headers.findIndex((header, column) => !excluded.has(column) && predicate(header));
    if (index >= 0) return index;
  }
  return -1;
}

function detectHeader(rows: string[][], kind: TargetFile["kind"]) {
  const maximum = Math.min(rows.length, 120);
  for (let rowIndex = 0; rowIndex < maximum; rowIndex += 1) {
    const headers = rows[rowIndex].map(normalizeText);
    const used = new Set<number>();
    const code = findColumn(headers, [
      header => header.includes("CODIGO") && (kind === "INPUT" ? header.includes("INSUMO") : header.includes("COMPOSICAO")),
      header => header === "CODIGO",
      header => header.startsWith("CODIGO ")
    ], used);
    if (code >= 0) used.add(code);
    const description = findColumn(headers, [
      header => header.includes("DESCRICAO") && (kind === "INPUT" ? header.includes("INSUMO") : header.includes("COMPOSICAO")),
      header => header === "DESCRICAO",
      header => header.startsWith("DESCRICAO ")
    ], used);
    if (description >= 0) used.add(description);
    const unit = findColumn(headers, [
      header => header === "UNIDADE",
      header => header === "UNID",
      header => header.startsWith("UNIDADE ")
    ], used);
    if (unit >= 0) used.add(unit);
    const cost = findColumn(headers, kind === "INPUT" ? [
      header => header.includes("PRECO MEDIANO"),
      header => header.includes("PRECO UNITARIO"),
      header => header === "PRECO",
      header => header.includes("PRECO") && !header.includes("ORIGEM")
    ] : [
      header => header.includes("CUSTO TOTAL"),
      header => header.includes("CUSTO UNITARIO"),
      header => header === "CUSTO",
      header => header.includes("CUSTO")
    ], used);
    if ([code, description, unit, cost].some(index => index < 0)) continue;
    const itemType = findColumn(headers, [
      header => header.includes("ORIGEM") && header.includes("PRECO"),
      header => header.includes("TIPO") && header.includes("INSUMO"),
      header => header === "TIPO"
    ], used);
    return { rowIndex, code, description, unit, cost, itemType: itemType >= 0 ? itemType : null } satisfies HeaderMap;
  }
  return null;
}

function parseNumber(value: unknown) {
  const raw = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .trim();
  if (!raw || raw === "-" || raw.toUpperCase() === "N/D") return null;
  let normalized = raw;
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) return null;
  return parsed;
}

function cleanCode(value: unknown) {
  return cleanText(value, 80).replace(/\.0+$/, "");
}

function classifyInput(value: string, description: string): SinapiInputImportRow["itemType"] {
  const normalized = `${normalizeText(value)} ${normalizeText(description)}`;
  if (normalized.includes("MAO DE OBRA") || normalized.includes("HORISTA") || normalized.includes("MENSALISTA")) return "LABOR";
  if (normalized.includes("EQUIPAMENTO") || normalized.includes("MAQUINA")) return "EQUIPMENT";
  if (normalized.includes("SERVICO")) return "SERVICE";
  if (normalized.includes("MATERIAL")) return "MATERIAL";
  return "OTHER";
}

function mapInputRows(rows: string[][], header: HeaderMap, fileName: string, sheetName: string) {
  const result: SinapiInputImportRow[] = [];
  for (let index = header.rowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const code = cleanCode(row[header.code]);
    const description = cleanText(row[header.description], 1_000);
    const unit = cleanText(row[header.unit], 30).toUpperCase();
    const unitCost = parseNumber(row[header.cost]);
    if (!code || !description || !unit || unitCost === null) continue;
    result.push({
      code,
      description,
      unit,
      itemType: classifyInput(header.itemType === null ? "" : row[header.itemType] ?? "", description),
      unitCost,
      sourceFile: fileName,
      sourceSheet: sheetName,
      sourceRow: index + 1
    });
  }
  return result;
}

function mapCompositionRows(rows: string[][], header: HeaderMap, fileName: string, sheetName: string) {
  const result: SinapiCompositionImportRow[] = [];
  for (let index = header.rowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const code = cleanCode(row[header.code]);
    const description = cleanText(row[header.description], 1_000);
    const unit = cleanText(row[header.unit], 30).toUpperCase();
    const unitCost = parseNumber(row[header.cost]);
    if (!code || !description || !unit || unitCost === null) continue;
    result.push({
      code,
      description,
      unit,
      unitCost,
      items: [],
      sourceFile: fileName,
      sourceSheet: sheetName,
      sourceRow: index + 1
    });
  }
  return result;
}

function bestRowsForWorkbook(
  workbook: Buffer,
  target: TargetFile
): { rows: SinapiInputImportRow[] | SinapiCompositionImportRow[]; worksheetCount: number } {
  const sheets = parseWorkbook(workbook);
  let best: SinapiInputImportRow[] | SinapiCompositionImportRow[] = [];
  for (const sheet of sheets) {
    const header = detectHeader(sheet.rows, target.kind);
    if (!header) continue;
    const mapped = target.kind === "INPUT"
      ? mapInputRows(sheet.rows, header, target.entry.name, sheet.name)
      : mapCompositionRows(sheet.rows, header, target.entry.name, sheet.name);
    if (mapped.length > best.length) best = mapped;
  }
  return { rows: best, worksheetCount: sheets.length };
}

export function parseSinapiOfficialReferencePackage(
  archiveInput: Buffer | Uint8Array,
  options: { sourceUrl: string; region: string; taxRelief: boolean }
): ParsedSinapiPackage {
  const region = options.region.trim().toUpperCase();
  if (!UFS.has(region)) fail("UF solicitada é inválida.");
  const archive = Buffer.isBuffer(archiveInput) ? archiveInput : Buffer.from(archiveInput);
  const entries = listZipEntries(archive, OUTER_LIMITS);
  const targets = selectTargetFiles(entries, region, options.taxRelief);
  const inputs = new Map<string, SinapiInputImportRow>();
  const compositions = new Map<string, SinapiCompositionImportRow>();
  let worksheets = 0;

  for (const target of targets) {
    const parsed = bestRowsForWorkbook(extractZipEntry(archive, target.entry), target);
    worksheets += parsed.worksheetCount;
    if (target.kind === "INPUT") {
      for (const row of parsed.rows as SinapiInputImportRow[]) inputs.set(row.code, row);
    } else {
      for (const row of parsed.rows as SinapiCompositionImportRow[]) compositions.set(row.code, row);
    }
  }

  const inputRows = [...inputs.values()];
  const compositionRows = [...compositions.values()];
  if (inputRows.length < 500) fail(`somente ${inputRows.length} insumos válidos foram encontrados; mínimo esperado: 500.`);
  if (compositionRows.length < 500) fail(`somente ${compositionRows.length} composições válidas foram encontradas; mínimo esperado: 500.`);
  if (inputRows.length > 100_000 || compositionRows.length > 100_000) fail("volume de registros excede o limite técnico.");

  const dates = new Set(targets.map(target => target.baseDate));
  const selectedDate = [...dates][0];
  return {
    baseDate: selectedDate,
    inputs: inputRows,
    compositions: compositionRows,
    xlsxFiles: targets.map(target => target.entry.name),
    worksheets
  };
}
