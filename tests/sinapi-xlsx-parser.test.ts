import { describe, expect, it } from "vitest";
import { parseSinapiZipPackage } from "@/lib/sinapi/xlsx-parser";

type StoredEntry = { name: string; data: Buffer };
type SheetFixture = { name: string; xml: string };

function u16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function storedZip(entries: StoredEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const flags = 0x0800;
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(flags), u16(0), u16(0), u16(0),
      u32(0), u32(entry.data.length), u32(entry.data.length),
      u16(name.length), u16(0), name, entry.data
    ]);
    localParts.push(local);

    centralParts.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(0), u16(0), u16(0),
      u32(0), u32(entry.data.length), u32(entry.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name
    ]));
    offset += local.length;
  }

  const central = Buffer.concat(centralParts);
  return Buffer.concat([
    ...localParts,
    central,
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0)
  ]);
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineCell(reference: string, value: string) {
  return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function numberCell(reference: string, value: number) {
  return `<c r="${reference}"><v>${value}</v></c>`;
}

function wideWorksheet(
  kind: "INPUT" | "COMPOSITION",
  regime: "DESONERADO" | "NAO_DESONERADO",
  count = 500
) {
  const input = kind === "INPUT";
  const header = `<row r="1">${[
    inlineCell("A1", input ? "Origem de Preço" : "Classe"),
    inlineCell("B1", input ? "Código Insumo" : "Código Composição"),
    inlineCell("C1", input ? "Descrição Insumo" : "Descrição Composição"),
    inlineCell("D1", "Unidade"),
    inlineCell("E1", "AC"),
    inlineCell("F1", "RJ"),
    inlineCell("G1", "SP")
  ].join("")}</row>`;

  const regimeOffset = regime === "DESONERADO" ? 5_000 : 0;
  const rows = Array.from({ length: count }, (_, index) => {
    const row = index + 2;
    const code = String((input ? 10_000 : 100_000) + index);
    const spCost = (input ? 10 + index / 100 : 100 + index / 10) + regimeOffset;
    return `<row r="${row}">${[
      inlineCell(`A${row}`, input ? (index % 2 ? "Material" : "Mão de obra") : "SINAPI"),
      inlineCell(`B${row}`, code),
      inlineCell(`C${row}`, `${input ? "Insumo" : "Composição"} técnico ${index + 1}`),
      inlineCell(`D${row}`, input ? "UN" : "M2"),
      numberCell(`E${row}`, spCost + 100),
      numberCell(`F${row}`, spCost + 50),
      numberCell(`G${row}`, spCost)
    ].join("")}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <sheetData>${header}${rows}</sheetData>
    </worksheet>`;
}

function workbook(sheets: SheetFixture[]) {
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets>
    </workbook>`;
  const relationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${sheets.map((_sheet, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
    </Relationships>`;

  return storedZip([
    { name: "xl/workbook.xml", data: Buffer.from(workbookXml, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(relationshipsXml, "utf8") },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: Buffer.from(sheet.xml, "utf8")
    }))
  ]);
}

function officialReferenceWorkbook(inputCount = 500, compositionCount = 500) {
  return workbook([
    { name: "Insumos Não Desonerado", xml: wideWorksheet("INPUT", "NAO_DESONERADO", inputCount) },
    { name: "Composições Não Desonerado", xml: wideWorksheet("COMPOSITION", "NAO_DESONERADO", compositionCount) },
    { name: "Insumos Desonerado", xml: wideWorksheet("INPUT", "DESONERADO", inputCount) },
    { name: "Composições Desonerado", xml: wideWorksheet("COMPOSITION", "DESONERADO", compositionCount) }
  ]);
}

describe("parser automático do pacote SINAPI", () => {
  it("lê a matriz oficial de 27 UFs e seleciona SP sem desoneração", () => {
    const archive = storedZip([{
      name: "SINAPIReferencia202606.xlsx",
      data: officialReferenceWorkbook()
    }]);

    const result = parseSinapiZipPackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/SINAPI202606formatoxlsx.zip",
      region: "SP",
      taxRelief: false
    });

    expect(result.baseDate).toBe("2026-06-01");
    expect(result.inputs).toHaveLength(500);
    expect(result.compositions).toHaveLength(500);
    expect(result.xlsxFiles).toEqual(["SINAPIReferencia202606.xlsx"]);
    expect(result.worksheets).toBe(4);
    expect(result.inputs[0]).toMatchObject({ code: "10000", unit: "UN", unitCost: 10 });
    expect(result.compositions[0]).toMatchObject({ code: "100000", unit: "M2", unitCost: 100 });
    expect(result.inputs.every(row => row.sourceSheet === "Insumos Não Desonerado")).toBe(true);
    expect(result.compositions.every(row => row.sourceSheet === "Composições Não Desonerado")).toBe(true);
  });

  it("seleciona a coluna da UF e o regime desonerado sem misturar valores", () => {
    const archive = storedZip([{
      name: "SINAPIReferencia202606.xlsx",
      data: officialReferenceWorkbook()
    }]);

    const result = parseSinapiZipPackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/SINAPI202606formatoxlsx.zip",
      region: "RJ",
      taxRelief: true
    });

    expect(result.inputs[0].unitCost).toBe(5_060);
    expect(result.compositions[0].unitCost).toBe(5_150);
    expect(result.inputs.every(row => row.sourceSheet === "Insumos Desonerado")).toBe(true);
  });

  it("recusa path traversal antes de extrair o pacote", () => {
    const archive = storedZip([{
      name: "../SINAPIReferencia202606.xlsx",
      data: officialReferenceWorkbook()
    }]);
    expect(() => parseSinapiZipPackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/SINAPI202606formatoxlsx.zip",
      region: "SP",
      taxRelief: false
    })).toThrow(/path traversal/i);
  });

  it("falha fechado quando o volume técnico é insuficiente", () => {
    const archive = storedZip([{
      name: "SINAPIReferencia202606.xlsx",
      data: officialReferenceWorkbook(10, 10)
    }]);

    expect(() => parseSinapiZipPackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/SINAPI202606formatoxlsx.zip",
      region: "SP",
      taxRelief: false
    })).toThrow(/mínimo esperado: 500/i);
  });
});
