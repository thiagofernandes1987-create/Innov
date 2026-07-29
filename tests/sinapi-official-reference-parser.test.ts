import { describe, expect, it } from "vitest";
import { parseSinapiOfficialReferencePackage } from "@/lib/sinapi/official-reference-parser";

type Entry = { name: string; data: Buffer };

type ReportKind = "INPUT" | "COMPOSITION";

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

function storedZip(entries: Entry[]) {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(0), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0),
      name, entry.data
    ]);
    locals.push(local);
    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(0), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), name
    ]));
    offset += local.length;
  }
  const directory = Buffer.concat(central);
  return Buffer.concat([
    ...locals,
    directory,
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(directory.length), u32(offset), u16(0)
  ]);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textCell(reference: string, value: string) {
  return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function numberCell(reference: string, value: number) {
  return `<c r="${reference}"><v>${value}</v></c>`;
}

function worksheet(kind: ReportKind, count = 500) {
  const title = kind === "INPUT" ? "PREÇOS DE INSUMOS" : "CUSTOS DE COMPOSIÇÕES";
  const header = kind === "INPUT"
    ? ["Origem de Preço", "Código do Insumo", "Descrição do Insumo", "Unidade", "Preço Mediano"]
    : ["Classe", "Código da Composição", "Descrição da Composição", "Unidade", "Custo Total"];
  const rows = [
    `<row r="1">${textCell("A1", "SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil")}</row>`,
    `<row r="2">${textCell("A2", title)}</row>`,
    `<row r="3">${textCell("A3", "São Paulo - Junho/2026")}</row>`,
    `<row r="4">${header.map((value, index) => textCell(`${String.fromCharCode(65 + index)}4`, value)).join("")}</row>`
  ];
  for (let index = 0; index < count; index += 1) {
    const row = index + 5;
    const code = String((kind === "INPUT" ? 10_000 : 100_000) + index);
    rows.push(`<row r="${row}">${[
      textCell(`A${row}`, kind === "INPUT" ? (index % 2 ? "Material" : "Mão de Obra") : "SINAPI"),
      textCell(`B${row}`, code),
      textCell(`C${row}`, `${kind === "INPUT" ? "Insumo" : "Composição"} ${index + 1}`),
      textCell(`D${row}`, kind === "INPUT" ? "UN" : "M2"),
      numberCell(`E${row}`, kind === "INPUT" ? 10 + index / 100 : 100 + index / 10)
    ].join("")}</row>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

function xlsx(kind: ReportKind, count = 500) {
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatório" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  return storedZip([
    { name: "xl/workbook.xml", data: Buffer.from(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(relationships) },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(worksheet(kind, count)) }
  ]);
}

function officialPackage(regime: "Desonerado" | "NaoDesonerado", count = 500) {
  return storedZip([
    { name: `SINAPI_Preço_Ref_Insumos_SP_202606_${regime}.xlsx`, data: xlsx("INPUT", count) },
    { name: `SINAPI_Custo_Ref_Composições_SP_202606_${regime}.xlsx`, data: xlsx("COMPOSITION", count) },
    { name: `SINAPI_Preço_Ref_Insumos_RJ_202606_${regime}.xlsx`, data: xlsx("INPUT", count) },
    { name: "SINAPI_Referência_202606_NaoDesonerado.xlsx", data: xlsx("INPUT", count) }
  ]);
}

describe("parser dos relatórios oficiais SINAPI por UF", () => {
  it("seleciona somente SP sem desoneração e ignora matriz nacional", () => {
    const result = parseSinapiOfficialReferencePackage(officialPackage("NaoDesonerado"), {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip",
      region: "SP",
      taxRelief: false
    });
    expect(result.baseDate).toBe("2026-06-01");
    expect(result.inputs).toHaveLength(500);
    expect(result.compositions).toHaveLength(500);
    expect(result.xlsxFiles).toHaveLength(2);
    expect(result.inputs[0]).toMatchObject({ code: "10000", unit: "UN", unitCost: 10 });
    expect(result.compositions[0]).toMatchObject({ code: "100000", unit: "M2", unitCost: 100 });
    expect(result.inputs.every(row => row.sourceFile.includes("_SP_"))).toBe(true);
  });

  it("distingue Desonerado de NaoDesonerado em nomes sem espaço", () => {
    expect(() => parseSinapiOfficialReferencePackage(officialPackage("NaoDesonerado"), {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip",
      region: "SP",
      taxRelief: true
    })).toThrow(/desonerado não encontrado/i);
  });

  it("falha fechado quando o relatório possui volume insuficiente", () => {
    expect(() => parseSinapiOfficialReferencePackage(officialPackage("NaoDesonerado", 20), {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip",
      region: "SP",
      taxRelief: false
    })).toThrow(/mínimo esperado: 500/i);
  });

  it("recusa path traversal no pacote externo", () => {
    const archive = storedZip([{ name: "../SINAPI_Preço_Ref_Insumos_SP_202606_NaoDesonerado.xlsx", data: xlsx("INPUT") }]);
    expect(() => parseSinapiOfficialReferencePackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip",
      region: "SP",
      taxRelief: false
    })).toThrow(/path traversal/i);
  });
});
