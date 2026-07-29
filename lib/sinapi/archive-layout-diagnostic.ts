import { inflateRawSync } from "node:zlib";
import { posix as pathPosix } from "node:path";

type Entry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  offset: number;
};

function u16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function u32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function entries(buffer: Buffer) {
  let end = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (u32(buffer, offset) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("EOCD não encontrado");
  const count = u16(buffer, end + 10);
  let cursor = u32(buffer, end + 16);
  const result: Entry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (u32(buffer, cursor) !== 0x02014b50) throw new Error("Central directory inválido");
    const method = u16(buffer, cursor + 10);
    const compressedSize = u32(buffer, cursor + 20);
    const uncompressedSize = u32(buffer, cursor + 24);
    const nameLength = u16(buffer, cursor + 28);
    const extraLength = u16(buffer, cursor + 30);
    const commentLength = u16(buffer, cursor + 32);
    const offset = u32(buffer, cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    result.push({ name, method, compressedSize, uncompressedSize, offset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

function extract(buffer: Buffer, entry: Entry) {
  const nameLength = u16(buffer, entry.offset + 26);
  const extraLength = u16(buffer, entry.offset + 28);
  const start = entry.offset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(compressed);
  if (entry.method === 8) return inflateRawSync(compressed);
  throw new Error(`Método ${entry.method} não suportado em ${entry.name}`);
}

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attributes(fragment: string) {
  const result = new Map<string, string>();
  for (const match of fragment.matchAll(/([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result.set(match[1], decodeXml(match[2] ?? match[3] ?? ""));
  }
  return result;
}

function sharedStrings(xml: string) {
  const result: string[] = [];
  for (const item of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    result.push([...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(match => decodeXml(match[1])).join(""));
  }
  return result;
}

function column(reference: string) {
  let result = 0;
  for (const character of reference.toUpperCase()) {
    if (character < "A" || character > "Z") break;
    result = result * 26 + character.charCodeAt(0) - 64;
  }
  return Math.max(0, result - 1);
}

function previewRows(xml: string, strings: string[]) {
  const result: string[][] = [];
  const rowMatches = xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g);
  for (const rowMatch of rowMatches) {
    const row: string[] = [];
    const cells = rowMatch[1].match(/<c\b[\s\S]*?<\/c>|<c\b[^>]*\/>/g) ?? [];
    let sequential = 0;
    for (const cellXml of cells) {
      const open = cellXml.match(/^<c\b([^>]*)\/?\s*>/);
      if (!open) continue;
      const attrs = attributes(open[1]);
      const ref = attrs.get("r")?.match(/^([A-Z]+)\d+$/i)?.[1];
      const index = ref ? column(ref) : sequential;
      sequential = index + 1;
      if (index > 60) continue;
      const type = attrs.get("t") ?? "";
      let value = "";
      if (type === "inlineStr") {
        value = [...cellXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(match => decodeXml(match[1])).join("");
      } else {
        const raw = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
        value = type === "s" ? strings[Number.parseInt(raw, 10)] ?? "" : decodeXml(raw);
      }
      row[index] = value.replace(/\s+/g, " ").trim().slice(0, 220);
    }
    if (row.some(Boolean)) result.push(row);
    if (result.length >= 18) break;
  }
  return result;
}

function workbookSheets(workbookXml: string, relsXml: string) {
  const rels = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const attrs = attributes(match[1]);
    const id = attrs.get("Id");
    const target = attrs.get("Target");
    if (!id || !target) continue;
    const normalized = target.startsWith("/")
      ? target.slice(1)
      : target.startsWith("xl/")
        ? target
        : pathPosix.normalize(pathPosix.join("xl", target));
    rels.set(id, normalized);
  }
  const result: Array<{ name: string; path: string }> = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const attrs = attributes(match[1]);
    const target = rels.get(attrs.get("r:id") ?? "");
    if (target) result.push({ name: attrs.get("name") ?? target, path: target });
  }
  return result;
}

export function inspectSinapiArchiveLayout(archive: Buffer) {
  const outer = entries(archive);
  const xlsxEntries = outer.filter(entry => entry.name.toLowerCase().endsWith(".xlsx")).slice(0, 30);
  return {
    archiveEntries: outer.map(entry => ({ name: entry.name, bytes: entry.uncompressedSize })).slice(0, 200),
    xlsx: xlsxEntries.map(outerEntry => {
      const workbook = extract(archive, outerEntry);
      const inner = entries(workbook);
      const byName = new Map(inner.map(entry => [entry.name.toLowerCase(), entry]));
      const stringsEntry = byName.get("xl/sharedstrings.xml");
      const strings = stringsEntry ? sharedStrings(extract(workbook, stringsEntry).toString("utf8")) : [];
      const workbookEntry = byName.get("xl/workbook.xml");
      const relsEntry = byName.get("xl/_rels/workbook.xml.rels");
      const sheets = workbookEntry && relsEntry
        ? workbookSheets(
            extract(workbook, workbookEntry).toString("utf8"),
            extract(workbook, relsEntry).toString("utf8")
          )
        : inner
            .filter(entry => /^xl\/worksheets\/[^/]+\.xml$/i.test(entry.name))
            .map(entry => ({ name: pathPosix.basename(entry.name), path: entry.name }));
      return {
        name: outerEntry.name,
        bytes: outerEntry.uncompressedSize,
        sharedStrings: strings.length,
        sheetCount: sheets.length,
        sheets: sheets.slice(0, 20).map(sheet => {
          const entry = byName.get(sheet.path.toLowerCase());
          return {
            name: sheet.name,
            path: sheet.path,
            preview: entry ? previewRows(extract(workbook, entry).toString("utf8"), strings) : []
          };
        })
      };
    })
  };
}
