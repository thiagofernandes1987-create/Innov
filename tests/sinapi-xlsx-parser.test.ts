import { describe, expect, it } from "vitest";
import { parseSinapiZipPackage } from "@/lib/sinapi/xlsx-parser";

type StoredEntry = { name: string; data: Buffer };

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
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineCell(reference: string, value: string) {
  return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function numberCell(reference: string, value: number) {
  return `<c r="${reference}"><v>${value}</v></c>`;
}

function worksheet(kind: "INPUT" | "COMPOSITION", count = 500) {
  const input = kind === "INPUT";
  const header = `<row r="1">${[
    inlineCell("A1", input ? "Código Insumo" : "Código Composição"),
    inlineCell("B1", input ? "Descrição Insumo" : "Descrição Composição"),
    inlineCell("C1", "Unidade"),
    inlineCell("D1", input ? "Preço Mediano Não Desonerado" : "Custo Total Não Desonerado"),
    inlineCell("E1", "UF"),
    ...(input ? [inlineCell("F1", "Tipo Insumo")] : [])
  ].join("")}</row>`;

  const rows = Array.from({ length: count }, (_, index) => {
    const row = index + 2;
    const code = String((input ? 10_000 : 100_000) + index);
    return `<row r="${row}">${[
      inlineCell(`A${row}`, code),
      inlineCell(`B${row}`, `${input ? "Insumo" : "Composição"} técnico ${index + 1}`),
      inlineCell(`C${row}`, input ? "UN" : "M2"),
      numberCell(`D${row}`, input ? 10 + index / 100 : 100 + index / 10),
      inlineCell(`E${row}`, "SP"),
      ...(input ? [inlineCell(`F${row}`, index % 2 ? "Material" : "Mão de obra")] : [])
    ].join("")}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <sheetData>${header}${rows}</sheetData>
    </worksheet>`;
}

function xlsx(kind: "INPUT" | "COMPOSITION") {
  const sheetName = kind === "INPUT" ? "insumos.xml" : "composicoes.xml";
  return storedZip([{ name: `xl/worksheets/${sheetName}`, data: Buffer.from(worksheet(kind), "utf8") }]);
}

describe("parser automático do pacote SINAPI", () => {
  it("extrai e filtra o ZIP/XLSX da UF e regime solicitados", () => {
    const archive = storedZip([
      {
        name: "SINAPI_Preco_Ref_Insumos_SP_2026-06_Nao_Desonerado.xlsx",
        data: xlsx("INPUT")
      },
      {
        name: "SINAPI_Custo_Ref_Composicoes_SP_2026-06_Nao_Desonerado.xlsx",
        data: xlsx("COMPOSITION")
      },
      {
        name: "SINAPI_Preco_Ref_Insumos_RJ_2026-06_Nao_Desonerado.xlsx",
        data: xlsx("INPUT")
      }
    ]);

    const result = parseSinapiZipPackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/SINAPI-2026-06-formato-xlsx.zip",
      region: "SP",
      taxRelief: false
    });

    expect(result.baseDate).toBe("2026-06-01");
    expect(result.inputs).toHaveLength(500);
    expect(result.compositions).toHaveLength(500);
    expect(result.xlsxFiles).toHaveLength(2);
    expect(result.worksheets).toBe(2);
    expect(result.inputs[0]).toMatchObject({ code: "10000", unit: "UN", unitCost: 10 });
    expect(result.compositions[0]).toMatchObject({ code: "100000", unit: "M2", unitCost: 100 });
    expect(result.inputs.every(row => row.sourceFile.includes("_SP_"))).toBe(true);
  });

  it("recusa path traversal antes de extrair o pacote", () => {
    const archive = storedZip([{ name: "../SINAPI-2026-06-formato-xlsx.xlsx", data: xlsx("INPUT") }]);
    expect(() => parseSinapiZipPackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi/SINAPI-2026-06-formato-xlsx.zip",
      region: "SP",
      taxRelief: false
    })).toThrow(/path traversal/i);
  });

  it("falha fechado quando o volume técnico é insuficiente", () => {
    const smallXlsx = storedZip([{
      name: "xl/worksheets/insumos.xml",
      data: Buffer.from(worksheet("INPUT", 10), "utf8")
    }]);
    const archive = storedZip([{
      name: "SINAPI_Preco_Ref_Insumos_SP_2026-06_Nao_Desonerado.xlsx",
      data: smallXlsx
    }]);

    expect(() => parseSinapiZipPackage(archive, {
      sourceUrl: "https://www.caixa.gov.br/Downloads/sinapi/SINAPI-2026-06-formato-xlsx.zip",
      region: "SP",
      taxRelief: false
    })).toThrow(/mínimo esperado: 500/i);
  });
});
