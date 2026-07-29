import { posix as pathPosix } from "node:path";
import { inflateRawSync } from "node:zlib";

export type SinapiInputImportRow = {
  code: string;
  description: string;
  unit: string;
  itemType: "MATERIAL" | "LABOR" | "EQUIPMENT" | "SERVICE" | "OTHER";
  unitCost: number;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
};

export type SinapiCompositionImportRow = {
  code: string;
  description: string;
  unit: string;
  unitCost: number;
  items: Array<{
    code: string;
    description: string;
    unit: string;
    itemType: "INPUT" | "COMPOSITION" | "OTHER";
    coefficient: number;
    unitCost: number;
    totalCost: number;
  }>;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
};

export type ParsedSinapiPackage = {
  baseDate: string;
  inputs: SinapiInputImportRow[];
  compositions: SinapiCompositionImportRow[];
  xlsxFiles: string[];
  worksheets: number;
};

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
  maxTotalUncompressedBytes: number;
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
  region: number | null;
  regime: number | null;
  itemType: number | null;
  score: number;
};

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
] as const;

const OUTER_ZIP_LIMITS: ZipLimits = {
  maxArchiveBytes: 180 * 1024 * 1024,
  maxEntries: 500,
  maxEntryBytes: 90 * 1024 * 1024,
  maxTotalUncompressedBytes: 900 * 1024 * 1024,
  maxCompressionRatio: 600
};

const XLSX_ZIP_LIMITS: ZipLimits = {
  maxArchiveBytes: 90 * 1024 * 1024,
  maxEntries: 3_000,
  maxEntryBytes: 120 * 1024 * 1024,
  maxTotalUncompressedBytes: 300 * 1024 * 1024,
  maxCompressionRatio: 800
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

function safeArchivePath(value: string) {
  const normalized = value.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    fail("caminho absoluto dentro do ZIP.");
  }
  const parts = normalized.split("/");
  if (parts.some(part => part === ".." || part.includes("\u0000"))) {
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
  let offset = centralOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) fail("entrada do diretório central inválida.");
    const flags = readUInt16(buffer, offset + 8);
    const method = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const fileNameStart = offset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length) fail("nome de entrada ZIP truncado.");

    const encoding: BufferEncoding = flags & 0x0800 ? "utf8" : "latin1";
    const name = safeArchivePath(buffer.subarray(fileNameStart, fileNameEnd).toString(encoding));

    if (flags & 0x0001) fail("arquivo ZIP criptografado não é aceito.");
    if (![0, 8].includes(method)) fail(`método de compressão não aceito na entrada ${name}.`);
    if (uncompressedSize > limits.maxEntryBytes) fail(`entrada ${name} excede o limite descompactado.`);
    if (compressedSize === 0 && uncompressedSize > 0) fail(`entrada ${name} possui tamanho compactado inválido.`);
    if (compressedSize > 0 && uncompressedSize / compressedSize > limits.maxCompressionRatio) {
      fail(`taxa de compressão suspeita na entrada ${name}.`);
    }

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > limits.maxTotalUncompressedBytes) {
      fail("volume descompactado total excede o limite permitido.");
    }

    entries.push({ name, flags, method, compressedSize, uncompressedSize, localHeaderOffset });
    offset = fileNameEnd + extraLength + commentLength;
  }

  return entries;
}

function extractZipEntry(buffer: Buffer, entry: ZipEntry) {
  const offset = entry.localHeaderOffset;
  if (readUInt32(buffer, offset) !== 0x04034b50) fail(`cabeçalho local inválido em ${entry.name}.`);
  const fileNameLength = readUInt16(buffer, offset + 26);
  const extraLength = readUInt16(buffer, offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataStart < 0 || dataEnd > buffer.length) fail(`dados compactados truncados em ${entry.name}.`);

  const compressed = buffer.subarray(dataStart, dataEnd);
  const extracted = entry.method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);
  if (extracted.length !== entry.uncompressedSize) {
    fail(`tamanho descompactado divergente em ${entry.name}.`);
  }
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
  const attributes = new Map<string, string>();
  const expression = /([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of fragment.matchAll(expression)) {
    attributes.set(match[1], xmlDecode(match[2] ?? match[3] ?? ""));
  }
  return attributes;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function normalizeSpaces(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
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
  const strings: string[] = [];
  for (const sharedItem of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [...sharedItem[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(match => xmlDecode(match[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

export function parseWorksheetXml(xml: string, sharedStrings: string[] = []) {
  const rows: string[][] = [];
  let parsedRows = 0;

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    parsedRows += 1;
    if (parsedRows > 250_000) fail("planilha excede 250.000 linhas.");

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
      if (index > 200) fail("planilha excede 201 colunas úteis.");

      const type = attributes.get("t") ?? "";
      let value = "";
      if (type === "inlineStr") {
        value = [...cellXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(match => xmlDecode(match[1])).join("");
      } else {
        const rawValue = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
        if (type === "s") value = sharedStrings[Number.parseInt(rawValue, 10)] ?? "";
        else value = xmlDecode(rawValue);
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

function parseWorkbookSheets(entries: ZipEntry[], archive: Buffer) {
  const byLowerName = new Map(entries.map(entry => [entry.name.toLowerCase(), entry]));
  const workbookEntry = byLowerName.get("xl/workbook.xml");
  const relationshipsEntry = byLowerName.get("xl/_rels/workbook.xml.rels");

  if (!workbookEntry || !relationshipsEntry) {
    return entries
      .filter(entry => /^xl\/worksheets\/[^/]+\.xml$/i.test(entry.name))
      .map(entry => ({ name: pathPosix.basename(entry.name, ".xml"), path: entry.name }));
  }

  const workbookXml = extractZipEntry(archive, workbookEntry).toString("utf8");
  const relationshipsXml = extractZipEntry(archive, relationshipsEntry).toString("utf8");
  const relationships = new Map<string, string>();

  for (const relationMatch of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const attributes = parseAttributes(relationMatch[1]);
    const id = attributes.get("Id");
    const target = attributes.get("Target");
    if (id && target) relationships.set(id, resolveWorkbookTarget(target));
  }

  const sheets: WorkbookSheet[] = [];
  for (const sheetMatch of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const attributes = parseAttributes(sheetMatch[1]);
    const id = attributes.get("r:id");
    const target = id ? relationships.get(id) : null;
    if (target && byLowerName.has(target.toLowerCase())) {
      sheets.push({ name: attributes.get("name") ?? pathPosix.basename(target, ".xml"), path: target });
    }
  }
  return sheets;
}

function parseWorkbook(buffer: Buffer) {
  const entries = listZipEntries(buffer, XLSX_ZIP_LIMITS);
  const byLowerName = new Map(entries.map(entry => [entry.name.toLowerCase(), entry]));
  const sharedEntry = byLowerName.get("xl/sharedstrings.xml");
  const sharedStrings = sharedEntry
    ? parseSharedStrings(extractZipEntry(buffer, sharedEntry).toString("utf8"))
    : [];
  const sheets = parseWorkbookSheets(entries, buffer);

  return sheets.map(sheet => {
    const entry = byLowerName.get(sheet.path.toLowerCase());
    if (!entry) fail(`worksheet ${sheet.path} não encontrada.`);
    const xml = extractZipEntry(buffer, entry).toString("utf8");
    return { name: sheet.name, rows: parseWorksheetXml(xml, sharedStrings) };
  });
}

function inferRegion(value: string) {
  const normalized = ` ${normalizeText(value)} `;
  return UFS.find(uf => normalized.includes(` ${uf} `)) ?? null;
}

function inferRegime(value: string) {
  const normalized = ` ${normalizeText(value)} `;
  if (/\b(NAO DESONERAD[OA]?|SEM DESONERACAO|NAO DESONERACAO|SD)\b/.test(normalized)) return false;
  if (/\b(COM DESONERACAO|DESONERAD[OA]?|CD)\b/.test(normalized)) return true;
  return null;
}

function contextKind(value: string): "INPUT" | "COMPOSITION" | null {
  const normalized = normalizeText(value);
  if (normalized.includes("INSUMO")) return "INPUT";
  if (normalized.includes("COMPOSICAO") || normalized.includes("COMPOSICOES")) return "COMPOSITION";
  return null;
}

function headerContains(header: string, words: string[]) {
  return words.every(word => header.includes(word));
}

function pickHeaderIndex(headers: string[], groups: string[][], excluded = new Set<number>()) {
  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    if (!header || excluded.has(index)) continue;
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      if (!headerContains(header, group)) continue;
      const score = 100 - groupIndex * 5 - Math.max(0, header.split(" ").length - group.length);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    }
  }
  return bestIndex;
}

function pickCostIndex(headers: string[], taxRelief: boolean, excluded: Set<number>) {
  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    if (!header || excluded.has(index) || !/(PRECO|CUSTO|VALOR)/.test(header)) continue;
    if (/(COEFICIENTE|PERCENTUAL|MAO DE OBRA|ENCARGO)/.test(header) && !header.includes("TOTAL")) continue;

    let score = 10;
    if (header.includes("TOTAL")) score += 8;
    if (header.includes("MEDIANO")) score += 6;
    if (header.includes("UNITARIO")) score += 4;
    const headerRegime = inferRegime(header);
    if (headerRegime === taxRelief) score += 20;
    else if (headerRegime !== null) score -= 30;
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return bestIndex;
}

function detectHeaders(rows: string[][], kind: "INPUT" | "COMPOSITION", taxRelief: boolean) {
  let best: HeaderMap | null = null;
  const maximum = Math.min(rows.length, 45);

  for (let rowIndex = 0; rowIndex < maximum; rowIndex += 1) {
    const headers = rows[rowIndex].map(normalizeText);
    const specificCode = kind === "INPUT"
      ? [["CODIGO", "INSUMO"], ["COD", "INSUMO"], ["CODIGO"]]
      : [["CODIGO", "COMPOSICAO"], ["COD", "COMPOSICAO"], ["CODIGO"]];
    const specificDescription = kind === "INPUT"
      ? [["DESCRICAO", "INSUMO"], ["DESCRICAO"]]
      : [["DESCRICAO", "COMPOSICAO"], ["DESCRICAO"]];

    const used = new Set<number>();
    const code = pickHeaderIndex(headers, specificCode, used);
    if (code >= 0) used.add(code);
    const description = pickHeaderIndex(headers, specificDescription, used);
    if (description >= 0) used.add(description);
    const unit = pickHeaderIndex(headers, [["UNIDADE"], ["UNID"], ["UN"]], used);
    if (unit >= 0) used.add(unit);
    const cost = pickCostIndex(headers, taxRelief, used);
    if (cost >= 0) used.add(cost);
    const region = pickHeaderIndex(headers, [["UF"], ["ESTADO"]], used);
    const regime = pickHeaderIndex(headers, [["REGIME"], ["DESONERACAO"]], used);
    const itemType = pickHeaderIndex(headers, [["TIPO", "INSUMO"], ["TIPO"], ["ORIGEM", "PRECO"], ["CATEGORIA"]], used);

    if ([code, description, unit, cost].some(index => index < 0)) continue;
    const joined = headers.join(" ");
    let score = 20;
    if (kind === "INPUT" && joined.includes("INSUMO")) score += 12;
    if (kind === "COMPOSITION" && joined.includes("COMPOSICAO")) score += 12;
    if (kind === "INPUT" && joined.includes("PRECO MEDIANO")) score += 8;
    if (kind === "COMPOSITION" && joined.includes("CUSTO TOTAL")) score += 8;
    if (region >= 0) score += 2;
    if (regime >= 0) score += 2;

    const candidate: HeaderMap = {
      rowIndex, code, description, unit, cost,
      region: region >= 0 ? region : null,
      regime: regime >= 0 ? regime : null,
      itemType: itemType >= 0 ? itemType : null,
      score
    };
    if (!best || candidate.score > best.score) best = candidate;
  }

  return best;
}

function parseNumber(value: unknown) {
  const raw = String(value ?? "").replace(/\u00a0/g, " ").replace(/R\$/gi, "").replace(/\s+/g, "").trim();
  if (!raw || raw === "-" || raw.toUpperCase() === "N/D") return null;
  let normalized = raw;
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  else normalized = normalized.replace(/,(?=\d{3}(?:\D|$))/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) return null;
  return parsed;
}

function cleanCode(value: unknown) {
  const raw = normalizeSpaces(value, 80);
  if (!raw) return "";
  return raw.replace(/\.0+$/, "");
}

function matchesContext(
  row: string[],
  header: HeaderMap,
  region: string,
  taxRelief: boolean,
  contextRegion: string | null,
  contextRegime: boolean | null
) {
  if (header.region !== null) {
    const rowRegion = inferRegion(row[header.region] ?? "");
    if (rowRegion && rowRegion !== region) return false;
  } else if (contextRegion && contextRegion !== region) return false;
  else if (!contextRegion) return false;

  if (header.regime !== null) {
    const rowRegime = inferRegime(row[header.regime] ?? "");
    if (rowRegime !== null && rowRegime !== taxRelief) return false;
  } else if (contextRegime !== null && contextRegime !== taxRelief) return false;
  return true;
}

function classifyInput(value: string, description: string): SinapiInputImportRow["itemType"] {
  const normalized = `${normalizeText(value)} ${normalizeText(description)}`;
  if (normalized.includes("MAO DE OBRA") || normalized.includes("HORISTA") || normalized.includes("MENSALISTA")) return "LABOR";
  if (normalized.includes("EQUIPAMENTO") || normalized.includes("MAQUINA")) return "EQUIPMENT";
  if (normalized.includes("SERVICO")) return "SERVICE";
  if (normalized.includes("MATERIAL")) return "MATERIAL";
  return "OTHER";
}

function mapInputRows(
  rows: string[][],
  header: HeaderMap,
  sourceFile: string,
  sourceSheet: string,
  region: string,
  taxRelief: boolean,
  contextRegion: string | null,
  contextRegime: boolean | null
) {
  const result: SinapiInputImportRow[] = [];
  for (let index = header.rowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!matchesContext(row, header, region, taxRelief, contextRegion, contextRegime)) continue;
    const code = cleanCode(row[header.code]);
    const description = normalizeSpaces(row[header.description], 1_000);
    const unit = normalizeSpaces(row[header.unit], 30).toUpperCase();
    const unitCost = parseNumber(row[header.cost]);
    if (!code || !description || !unit || unitCost === null) continue;
    result.push({
      code,
      description,
      unit,
      itemType: classifyInput(header.itemType === null ? "" : row[header.itemType] ?? "", description),
      unitCost,
      sourceFile,
      sourceSheet,
      sourceRow: index + 1
    });
  }
  return result;
}

function mapCompositionRows(
  rows: string[][],
  header: HeaderMap,
  sourceFile: string,
  sourceSheet: string,
  region: string,
  taxRelief: boolean,
  contextRegion: string | null,
  contextRegime: boolean | null
) {
  const result: SinapiCompositionImportRow[] = [];
  for (let index = header.rowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!matchesContext(row, header, region, taxRelief, contextRegion, contextRegime)) continue;
    const code = cleanCode(row[header.code]);
    const description = normalizeSpaces(row[header.description], 1_000);
    const unit = normalizeSpaces(row[header.unit], 30).toUpperCase();
    const unitCost = parseNumber(row[header.cost]);
    if (!code || !description || !unit || unitCost === null) continue;
    result.push({
      code,
      description,
      unit,
      unitCost,
      items: [],
      sourceFile,
      sourceSheet,
      sourceRow: index + 1
    });
  }
  return result;
}

function extractBaseDate(values: string[]) {
  const candidates: string[] = [];
  for (const value of values) {
    const decoded = (() => {
      try { return decodeURIComponent(value); } catch { return value; }
    })();
    for (const match of decoded.matchAll(/(?:SINAPI[^0-9]{0,20})?(20\d{2})[-_ ](0[1-9]|1[0-2])/gi)) {
      candidates.push(`${match[1]}-${match[2]}-01`);
    }
  }
  candidates.sort().reverse();
  return candidates[0] ?? null;
}

function selectXlsxEntries(entries: ZipEntry[], region: string, taxRelief: boolean) {
  const xlsx = entries.filter(entry => !entry.name.endsWith("/") && entry.name.toLowerCase().endsWith(".xlsx"));
  if (!xlsx.length) fail("o pacote não contém arquivos XLSX.");
  if (xlsx.length > 180) fail("quantidade anormal de arquivos XLSX no pacote.");

  const selected = xlsx.filter(entry => {
    const foundRegion = inferRegion(entry.name);
    const foundRegime = inferRegime(entry.name);
    if (foundRegion && foundRegion !== region) return false;
    if (foundRegime !== null && foundRegime !== taxRelief) return false;
    const kind = contextKind(entry.name);
    return Boolean(kind) || foundRegion === region || !foundRegion;
  });
  return selected.length ? selected : xlsx;
}

export function parseSinapiZipPackage(
  archiveInput: Buffer | Uint8Array,
  options: { sourceUrl: string; region: string; taxRelief: boolean }
): ParsedSinapiPackage {
  const region = options.region.toUpperCase();
  if (!UFS.includes(region as typeof UFS[number])) fail("UF solicitada é inválida.");

  const archive = Buffer.isBuffer(archiveInput) ? archiveInput : Buffer.from(archiveInput);
  const entries = listZipEntries(archive, OUTER_ZIP_LIMITS);
  const xlsxEntries = selectXlsxEntries(entries, region, options.taxRelief);
  const inputs = new Map<string, SinapiInputImportRow>();
  const compositions = new Map<string, SinapiCompositionImportRow>();
  let worksheets = 0;

  for (const xlsxEntry of xlsxEntries) {
    const contextRegion = inferRegion(xlsxEntry.name);
    const contextRegime = inferRegime(xlsxEntry.name);
    if (contextRegion && contextRegion !== region) continue;
    if (contextRegime !== null && contextRegime !== options.taxRelief) continue;

    const workbook = parseWorkbook(extractZipEntry(archive, xlsxEntry));
    for (const sheet of workbook) {
      worksheets += 1;
      if (worksheets > 500) fail("quantidade anormal de worksheets no pacote.");
      const context = `${xlsxEntry.name} ${sheet.name}`;
      const hintedKind = contextKind(context);
      const sheetRegion = inferRegion(sheet.name) ?? contextRegion;
      const sheetRegime = inferRegime(sheet.name) ?? contextRegime;

      if (hintedKind !== "COMPOSITION") {
        const inputHeader = detectHeaders(sheet.rows, "INPUT", options.taxRelief);
        if (inputHeader && (hintedKind === "INPUT" || inputHeader.score >= 30)) {
          for (const row of mapInputRows(
            sheet.rows, inputHeader, xlsxEntry.name, sheet.name,
            region, options.taxRelief, sheetRegion, sheetRegime
          )) inputs.set(row.code, row);
        }
      }

      if (hintedKind !== "INPUT") {
        const compositionHeader = detectHeaders(sheet.rows, "COMPOSITION", options.taxRelief);
        if (compositionHeader && (hintedKind === "COMPOSITION" || compositionHeader.score >= 30)) {
          for (const row of mapCompositionRows(
            sheet.rows, compositionHeader, xlsxEntry.name, sheet.name,
            region, options.taxRelief, sheetRegion, sheetRegime
          )) compositions.set(row.code, row);
        }
      }
    }
  }

  const inputRows = [...inputs.values()];
  const compositionRows = [...compositions.values()];
  if (inputRows.length < 500) fail(`somente ${inputRows.length} insumos válidos foram encontrados; mínimo esperado: 500.`);
  if (compositionRows.length < 500) fail(`somente ${compositionRows.length} composições válidas foram encontrados; mínimo esperado: 500.`);
  if (inputRows.length > 100_000 || compositionRows.length > 100_000) fail("volume de registros excede o limite técnico.");

  const baseDate = extractBaseDate([options.sourceUrl, ...xlsxEntries.map(entry => entry.name)]);
  if (!baseDate) fail("não foi possível identificar a data-base mensal no pacote oficial.");

  return {
    baseDate,
    inputs: inputRows,
    compositions: compositionRows,
    xlsxFiles: xlsxEntries.map(entry => entry.name),
    worksheets
  };
}
