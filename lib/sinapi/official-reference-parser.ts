import { posix as pathPosix } from "node:path";
import {
  ABA_ANALITICA,
  abaDoRelatorio,
  cabecalhoDeComposicoes,
  cabecalhoDeInsumos,
  lerAnalitico,
  lerComposicoes,
  lerInsumos,
  naturezaDaClassificacao,
  type RegimeSinapi
} from "./relatorio-oficial";
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
    const lido = parseWorksheetRows(extractZipEntry(buffer, entry).toString("utf8"), sharedStrings);
    return { name: sheet.name, rows: lido.rows, formulas: lido.formulas };
  });
}

function baseDate(value: string) {
  const match = normalizeText(value).match(/(?:SINAPI\s*)?(20\d{2})\s*(0[1-9]|1[0-2])/);
  return match ? `${match[1]}-${match[2]}-01` : null;
}

export function parseSinapiOfficialReferencePackage(
  archiveInput: Buffer | Uint8Array,
  options: { sourceUrl: string; region: string; taxRelief: boolean }
): ParsedSinapiPackage {
  const region = options.region.trim().toUpperCase();
  if (!UFS.has(region)) fail("UF solicitada é inválida.");
  const archive = Buffer.isBuffer(archiveInput) ? archiveInput : Buffer.from(archiveInput);
  const entries = listZipEntries(archive, OUTER_LIMITS);

  // O pacote de hoje tem um arquivo só que importa — o de Referência —, com o
  // regime em aba e a UF em coluna. A seleção por nome de arquivo, que lia UF e
  // regime do nome, era do formato anterior. Ver `relatorio-oficial.ts`.
  const referencia = entries.find(entry =>
    entry.name.toLowerCase().endsWith(".xlsx") && normalizeText(entry.name).includes("REFERENCIA")
  );
  if (!referencia) {
    fail(
      `o pacote não traz o relatório de referência. Arquivos encontrados: ${entries
        .filter(entry => entry.name.toLowerCase().endsWith(".xlsx"))
        .map(entry => entry.name)
        .join(", ") || "nenhum .xlsx"}.`
    );
  }

  const regime: RegimeSinapi = options.taxRelief ? "COM_DESONERACAO" : "SEM_DESONERACAO";
  const abas = parseWorkbook(extractZipEntry(archive, referencia));
  const porNome = new Map(abas.map(aba => [normalizeText(aba.name), aba]));
  const aba = (nome: string) => porNome.get(normalizeText(nome));

  const abaDeInsumos = aba(abaDoRelatorio("INSUMOS", regime));
  const abaDeComposicoes = aba(abaDoRelatorio("COMPOSICOES", regime));
  if (!abaDeInsumos || !abaDeComposicoes) {
    fail(
      `o relatório não traz as abas ${abaDoRelatorio("INSUMOS", regime)} e ${abaDoRelatorio(
        "COMPOSICOES",
        regime
      )}. Abas presentes: ${abas.map(item => item.name).join(", ")}.`
    );
  }

  const cabecalhoInsumos = cabecalhoDeInsumos(abaDeInsumos.rows);
  if (!cabecalhoInsumos) fail(`não encontrei o cabeçalho da aba ${abaDeInsumos.name}.`);
  const cabecalhoComposicoes = cabecalhoDeComposicoes(abaDeComposicoes.rows);
  if (!cabecalhoComposicoes) fail(`não encontrei o cabeçalho da aba ${abaDeComposicoes.name}.`);

  const insumos = lerInsumos(abaDeInsumos.rows, cabecalhoInsumos, region);
  const composicoes = lerComposicoes(
    abaDeComposicoes.rows,
    cabecalhoComposicoes,
    region,
    abaDeComposicoes.formulas
  );

  // Os itens de cada composição vêm da aba Analítica — é ela que torna o
  // orçamento analítico, e é a única que traz o coeficiente.
  const abaAnalitica = aba(ABA_ANALITICA);
  const itensPorComposicao = new Map<string, ReturnType<typeof lerAnalitico>>();
  if (abaAnalitica) {
    for (const item of lerAnalitico(abaAnalitica.rows)) {
      const lista = itensPorComposicao.get(item.composicao) ?? [];
      lista.push(item);
      itensPorComposicao.set(item.composicao, lista);
    }
  }

  const precoPorCodigo = new Map(insumos.map(item => [item.codigo, item.precoUnitario]));

  // **Sub-composição tem custo, e ele está na mesma aba.** Dois terços dos itens
  // analíticos não são insumo: são outra composição. Medido no arquivo oficial
  // de 06/2026, em SP, sem desoneração — 26.773 dos 43.923 itens —, e 26.771
  // deles têm custo publicado na aba CSD. Ignorar essa aba gravava zero em
  // sessenta por cento da composição analítica: a tela mostraria o serviço
  // desmontado, com quase tudo custando nada.
  //
  // Com o custo resolvido, a conta fecha: das 5.544 composições cujos itens têm
  // todos custo conhecido, 5.433 — 98% — batem com o custo oficial dentro de 1%,
  // desvio mediano de 0,02%. É essa reconciliação que o teste ao vivo cobra.
  const custoPorComposicao = new Map(composicoes.map(item => [item.codigo, item.custoUnitario]));

  const inputRows: SinapiInputImportRow[] = insumos.map((item, indice) => ({
    code: item.codigo,
    description: item.descricao,
    unit: item.unidade,
    itemType: naturezaDaClassificacao(item.classificacao),
    unitCost: item.precoUnitario,
    sourceFile: referencia.name,
    sourceSheet: abaDeInsumos.name,
    sourceRow: cabecalhoInsumos.linha + 1 + indice
  }));

  const compositionRows: SinapiCompositionImportRow[] = composicoes.map((item, indice) => ({
    code: item.codigo,
    description: item.descricao,
    unit: item.unidade,
    unitCost: item.custoUnitario,
    items: (itensPorComposicao.get(item.codigo) ?? []).map(filho => {
      // Insumo sem preço na UF continua caindo em zero — a planilha não publica
      // preço para ele naquele estado, e são 4.677 itens em SP. Não é o mesmo
      // problema: ali o número não existe. Está registrado como tarefa própria.
      const custoUnitario =
        filho.tipo === "INSUMO"
          ? precoPorCodigo.get(filho.codigo) ?? 0
          : custoPorComposicao.get(filho.codigo) ?? 0;
      return {
        code: filho.codigo,
        description: filho.descricao,
        unit: filho.unidade,
        itemType: filho.tipo === "INSUMO" ? ("INPUT" as const) : ("COMPOSITION" as const),
        coefficient: filho.coeficiente,
        unitCost: custoUnitario,
        totalCost: Number((custoUnitario * filho.coeficiente).toFixed(6))
      };
    }),
    sourceFile: referencia.name,
    sourceSheet: abaDeComposicoes.name,
    sourceRow: cabecalhoComposicoes.linha + 1 + indice
  }));

  if (inputRows.length < 500) fail(`somente ${inputRows.length} insumos válidos foram encontrados; mínimo esperado: 500.`);
  if (compositionRows.length < 500) {
    fail(`somente ${compositionRows.length} composições válidas foram encontradas; mínimo esperado: 500.`);
  }
  if (inputRows.length > 100_000 || compositionRows.length > 100_000) fail("volume de registros excede o limite técnico.");

  const dataBase = baseDate(referencia.name) ?? baseDate(options.sourceUrl);
  if (!dataBase) fail("não consegui identificar a data-base da publicação.");

  return {
    baseDate: dataBase,
    inputs: inputRows,
    compositions: compositionRows,
    xlsxFiles: [referencia.name],
    worksheets: abas.length
  };
}
