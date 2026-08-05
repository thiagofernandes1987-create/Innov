// Leitura de planilha `.xlsx`, com o ZIP endurecido.
//
// Extraído de `lib/sinapi/official-reference-parser.ts` na T-37.14, quando o
// CUB passou a precisar do mesmo trabalho. **Uma implementação só, de
// propósito:** duas cópias do mesmo leitor divergindo em silêncio foi o defeito
// que a T-37.7 corrigiu, e o jeito de não repeti-lo é não criar a segunda.
//
// O que este módulo faz, e o que deliberadamente não faz: ele abre o pacote e
// devolve **linhas de célula como texto**. Entender o que as linhas significam
// — qual coluna é UF, qual bloco é mão de obra — é de quem chamou. Misturar as
// duas coisas foi o que tornou o leitor anterior do SINAPI impossível de
// adaptar quando o formato mudou.
//
// O endurecimento do ZIP não é enfeite: o arquivo vem de fora, por HTTP, e
// `.xlsx` é ZIP. Entrada com caminho absoluto, `..`, criptografia, taxa de
// compressão suspeita ou volume descompactado além do limite é recusada — cada
// uma dessas é um jeito conhecido de transformar um download em escrita fora do
// lugar ou em consumo de memória sem fim.

import { posix as pathPosix } from "node:path";
import { inflateRawSync } from "node:zlib";

export type ZipEntry = {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

export type ZipLimits = {
  maxArchiveBytes: number;
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
  maxCompressionRatio: number;
};

export type AbaLida = {
  name: string;
  rows: string[][];
  /** Fórmula por célula, na chave `linha:coluna`. Ver `codigoDaCelula`. */
  formulas: Map<string, string>;
};


/** Limites do `.xlsx` em si. Quem abre um ZIP externo passa os seus. */
export const LIMITES_XLSX: ZipLimits = {
  maxArchiveBytes: 100 * 1024 * 1024,
  maxEntries: 4_000,
  maxEntryBytes: 150 * 1024 * 1024,
  maxTotalBytes: 400 * 1024 * 1024,
  maxCompressionRatio: 1_000
};

type FolhaDoWorkbook = {
  name: string;
  path: string;
};

function fail(message: string): never {
  throw new Error(`PLANILHA: ${message}`);
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

export function listZipEntries(buffer: Buffer, limits: ZipLimits) {
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

export function extractZipEntry(buffer: Buffer, entry: ZipEntry) {
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
  // O código da composição vive **dentro** de uma fórmula `HYPERLINK(...)`,
  // com valor em cache `0`. Sem guardar a fórmula, a importação grava dez mil
  // composições com o código zero — e nada na tela denuncia.
  const formulas = new Map<string, string>();
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
      const formula = cellXml.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)?.[1];
      if (formula) formulas.set(`${rows.length}:${index}`, xmlDecode(formula));
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
  return { rows, formulas };
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

  const result: FolhaDoWorkbook[] = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const attributes = parseAttributes(match[1]);
    const target = relationships.get(attributes.get("r:id") ?? "");
    if (target && byName.has(target.toLowerCase())) {
      result.push({ name: attributes.get("name") ?? pathPosix.basename(target, ".xml"), path: target });
    }
  }
  return result;
}

export function parseWorkbook(buffer: Buffer, limites: ZipLimits = LIMITES_XLSX): AbaLida[] {
  const entries = listZipEntries(buffer, limites);
  const byName = new Map(entries.map(entry => [entry.name.toLowerCase(), entry]));
  const sharedEntry = byName.get("xl/sharedstrings.xml");
  const sharedStrings = sharedEntry
    ? parseSharedStrings(extractZipEntry(buffer, sharedEntry).toString("utf8"))
    : [];
  return workbookSheets(entries, buffer).map(sheet => {
    const entry = byName.get(sheet.path.toLowerCase());
    if (!entry) fail(`worksheet ${sheet.path} não encontrada.`);
    const lido = parseWorksheetRows(extractZipEntry(buffer, entry).toString("utf8"), sharedStrings);
    return { name: sheet.name, rows: lido.rows, formulas: lido.formulas };
  });
}

