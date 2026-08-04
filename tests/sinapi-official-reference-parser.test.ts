import { describe, expect, it } from "vitest";
import { parseSinapiOfficialReferencePackage } from "@/lib/sinapi/official-reference-parser";
import { UFS } from "@/lib/sinapi/relatorio-oficial";

// O pacote sintético abaixo tem a forma do que a CAIXA publica **hoje**, medida
// no arquivo de 06/2026: um relatório de referência com o regime em aba, a UF
// em coluna, o código da composição escondido numa fórmula `HYPERLINK` e a aba
// analítica com os itens.
//
// O teste anterior montava o formato antigo — um arquivo por UF e por regime —
// e passava verde enquanto a importação real trazia zero insumos. Teste que
// descreve um formato que ninguém publica mais não é rede de proteção: é
// carimbo.

type Entry = { name: string; data: Buffer };

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

function coluna(indice: number) {
  let resto = indice + 1;
  let nome = "";
  while (resto > 0) {
    const digito = (resto - 1) % 26;
    nome = String.fromCharCode(65 + digito) + nome;
    resto = Math.floor((resto - digito) / 26);
  }
  return nome;
}

function texto(linha: number, indice: number, valor: string) {
  return `<c r="${coluna(indice)}${linha}" t="inlineStr"><is><t>${escapeXml(valor)}</t></is></c>`;
}

function numero(linha: number, indice: number, valor: number) {
  return `<c r="${coluna(indice)}${linha}"><v>${valor}</v></c>`;
}

function formulaDeCodigo(linha: number, indice: number, codigo: number) {
  const f = `HYPERLINK("#"&amp;CELL("address",OFFSET(Analítico!$B$1,MATCH(${codigo},Analítico!$B:$B,0)-1,3)),${codigo})`;
  return `<c r="${coluna(indice)}${linha}"><f>${f}</f><v>0</v></c>`;
}

function folha(conteudo: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${conteudo.join(
    ""
  )}</sheetData></worksheet>`;
}

/** Aba de insumos: UF é coluna, e cada estado tem preço próprio. */
function abaDeInsumos(quantidade: number, base: number) {
  const linhas = [
    `<row r="1">${texto(1, 0, "SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil")}</row>`,
    `<row r="2">${texto(2, 0, "RELATÓRIO DE PREÇOS DE INSUMOS")}</row>`,
    `<row r="3">${[
      texto(3, 0, "Classificação"),
      texto(3, 1, "Código do\r\nInsumo"),
      texto(3, 2, "Descrição do Insumo"),
      texto(3, 3, "Unidade"),
      texto(3, 4, "Origem de\r\nPreço"),
      ...UFS.map((uf, i) => texto(3, 5 + i, uf))
    ].join("")}</row>`
  ];
  for (let i = 0; i < quantidade; i += 1) {
    const linha = i + 4;
    linhas.push(
      `<row r="${linha}">${[
        texto(linha, 0, i % 3 === 0 ? "MAO DE OBRA" : "MATERIAL"),
        texto(linha, 1, String(10_000 + i)),
        texto(linha, 2, `Insumo ${i + 1}`),
        texto(linha, 3, "UN"),
        texto(linha, 4, "C"),
        ...UFS.map((_, u) => numero(linha, 5 + u, base + i / 100 + u))
      ].join("")}</row>`
    );
  }
  return folha(linhas);
}

/** Aba de composições: duas colunas por UF, e só "AC" rotulado acima. */
function abaDeComposicoes(quantidade: number, base: number) {
  const cabecalho = [
    texto(3, 0, "Grupo"),
    texto(3, 1, "Código da\r\nComposição"),
    texto(3, 2, "Descrição"),
    texto(3, 3, "Unidade")
  ];
  UFS.forEach((_, i) => {
    cabecalho.push(texto(3, 4 + i * 2, "Custo (R$)"), texto(3, 5 + i * 2, "%AS"));
  });

  const linhas = [
    `<row r="1">${texto(1, 0, "SINAPI")}</row>`,
    `<row r="2">${texto(2, 4, "AC")}</row>`,
    `<row r="3">${cabecalho.join("")}</row>`
  ];
  for (let i = 0; i < quantidade; i += 1) {
    const linha = i + 4;
    const celulas = [
      texto(linha, 0, "Grupo A"),
      formulaDeCodigo(linha, 1, 100_000 + i),
      texto(linha, 2, `Composição ${i + 1}`),
      texto(linha, 3, "M2")
    ];
    UFS.forEach((_, u) => {
      celulas.push(numero(linha, 4 + u * 2, base + i / 10 + u), numero(linha, 5 + u * 2, 0));
    });
    linhas.push(`<row r="${linha}">${celulas.join("")}</row>`);
  }
  return folha(linhas);
}

function abaAnalitica(quantidade: number) {
  const linhas = [
    `<row r="1">${texto(1, 0, "SINAPI")}</row>`,
    `<row r="2">${[
      texto(2, 0, "Grupo"),
      texto(2, 1, "Código da\r\nComposição"),
      texto(2, 2, "Tipo Item"),
      texto(2, 3, "Código do\r\nItem"),
      texto(2, 4, "Descrição"),
      texto(2, 5, "Unidade"),
      texto(2, 6, "Coeficiente"),
      texto(2, 7, "Situação")
    ].join("")}</row>`
  ];
  for (let i = 0; i < quantidade; i += 1) {
    // Cada composição tem dois itens: um insumo e **uma sub-composição**. É o
    // caso majoritário do arquivo real — 26.773 dos 43.923 itens de SP são
    // sub-composições —, e era exatamente o que o leitor gravava com custo
    // zero.
    const doInsumo = i * 2 + 3;
    const daSubComposicao = i * 2 + 4;
    linhas.push(
      `<row r="${doInsumo}">${[
        texto(doInsumo, 0, "Grupo A"),
        texto(doInsumo, 1, String(100_000 + i)),
        texto(doInsumo, 2, "INSUMO"),
        texto(doInsumo, 3, String(10_000 + i)),
        texto(doInsumo, 4, `Insumo ${i + 1}`),
        texto(doInsumo, 5, "UN"),
        numero(doInsumo, 6, 2),
        texto(doInsumo, 7, "COM PREÇO")
      ].join("")}</row>`,
      `<row r="${daSubComposicao}">${[
        texto(daSubComposicao, 0, "Grupo A"),
        texto(daSubComposicao, 1, String(100_000 + i)),
        texto(daSubComposicao, 2, "COMPOSICAO"),
        texto(daSubComposicao, 3, String(100_000 + ((i + 1) % quantidade))),
        texto(daSubComposicao, 4, `Composição ${((i + 1) % quantidade) + 1}`),
        texto(daSubComposicao, 5, "M2"),
        numero(daSubComposicao, 6, 3),
        texto(daSubComposicao, 7, "COM CUSTO")
      ].join("")}</row>`
    );
  }
  return folha(linhas);
}

function relatorioDeReferencia(quantidade: number) {
  const abas = [
    { nome: "ISD", dados: abaDeInsumos(quantidade, 10) },
    { nome: "ICD", dados: abaDeInsumos(quantidade, 12) },
    { nome: "CSD", dados: abaDeComposicoes(quantidade, 100) },
    { nome: "CCD", dados: abaDeComposicoes(quantidade, 110) },
    { nome: "Analítico", dados: abaAnalitica(quantidade) }
  ];
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas
    .map((aba, i) => `<sheet name="${aba.nome}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("")}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("")}</Relationships>`;
  return storedZip([
    { name: "xl/workbook.xml", data: Buffer.from(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(rels) },
    ...abas.map((aba, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: Buffer.from(aba.dados)
    }))
  ]);
}

function pacoteOficial(quantidade = 500) {
  return storedZip([
    { name: "SINAPI_familias_e_coeficientes_2026_06.xlsx", data: Buffer.from("nao importa") },
    { name: "SINAPI_mao_de_obra_2026_06.xlsx", data: Buffer.from("nao importa") },
    { name: "SINAPI_Referência_2026_06.xlsx", data: relatorioDeReferencia(quantidade) }
  ]);
}

const FONTE = "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip";

describe("leitor do relatório oficial, no formato publicado hoje", () => {
  it("lê o relatório de referência, com a UF em coluna", () => {
    const lido = parseSinapiOfficialReferencePackage(pacoteOficial(), {
      sourceUrl: FONTE,
      region: "SP",
      taxRelief: false
    });
    expect(lido.baseDate).toBe("2026-06-01");
    expect(lido.xlsxFiles).toEqual(["SINAPI_Referência_2026_06.xlsx"]);
    expect(lido.inputs).toHaveLength(500);
    expect(lido.compositions).toHaveLength(500);
    // SP é a 26ª UF na ordem alfabética: preço-base 10 mais 25 de deslocamento.
    expect(lido.inputs[0]).toMatchObject({ code: "10000", unit: "UN", unitCost: 35 });
  });

  it("a UF pedida muda o preço lido", () => {
    const emAc = parseSinapiOfficialReferencePackage(pacoteOficial(), {
      sourceUrl: FONTE,
      region: "AC",
      taxRelief: false
    });
    expect(emAc.inputs[0].unitCost).toBe(10);
  });

  it("o regime é aba, e as duas dão custos diferentes", () => {
    const sem = parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "AC", taxRelief: false });
    const com = parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "AC", taxRelief: true });
    expect(sem.compositions[0].unitCost).toBe(100);
    expect(com.compositions[0].unitCost).toBe(110);
  });

  it("o código da composição vem da fórmula, não do zero em cache", () => {
    const lido = parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "SP", taxRelief: false });
    expect(lido.compositions[0].code).toBe("100000");
    expect(lido.compositions.every(item => item.code !== "0")).toBe(true);
  });

  it("a classificação da CAIXA vira a natureza do item", () => {
    const lido = parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "SP", taxRelief: false });
    expect(new Set(lido.inputs.map(item => item.itemType))).toEqual(new Set(["MATERIAL", "LABOR"]));
  });

  it("a composição carrega os itens da aba analítica, com coeficiente", () => {
    const lido = parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "SP", taxRelief: false });
    const primeira = lido.compositions[0];
    expect(primeira.items).toHaveLength(2);
    expect(primeira.items[0]).toMatchObject({ code: "10000", itemType: "INPUT", coefficient: 2, unitCost: 35 });
    expect(primeira.items[0].totalCost).toBe(70);
  });

  it("sub-composição entra com o custo da aba de composições, não com zero", () => {
    const lido = parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "SP", taxRelief: false });
    const filho = lido.compositions[0].items[1];
    // A composição 100001 é a segunda da aba CSD: base 100, mais 0,1 pelo
    // índice, mais 25 porque SP é a 26ª UF.
    expect(filho).toMatchObject({ code: "100001", itemType: "COMPOSITION", coefficient: 3 });
    expect(filho.unitCost).toBeCloseTo(125.1, 6);
    expect(filho.totalCost).toBeCloseTo(375.3, 6);
  });

  it("nenhum item de composição entra com custo zero quando o custo existe", () => {
    const lido = parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "SP", taxRelief: false });
    const zerados = lido.compositions.flatMap(item => item.items).filter(item => item.unitCost === 0);
    expect(zerados).toHaveLength(0);
  });

  it("falha fechado quando o volume é insuficiente", () => {
    expect(() =>
      parseSinapiOfficialReferencePackage(pacoteOficial(20), { sourceUrl: FONTE, region: "SP", taxRelief: false })
    ).toThrow(/mínimo esperado: 500/i);
  });

  it("pacote sem o relatório de referência diz o que encontrou", () => {
    const semReferencia = storedZip([{ name: "SINAPI_mao_de_obra_2026_06.xlsx", data: Buffer.from("x") }]);
    expect(() =>
      parseSinapiOfficialReferencePackage(semReferencia, { sourceUrl: FONTE, region: "SP", taxRelief: false })
    ).toThrow(/não traz o relatório de referência[\s\S]*mao_de_obra/i);
  });

  it("UF inválida é recusada antes de abrir o arquivo", () => {
    expect(() =>
      parseSinapiOfficialReferencePackage(pacoteOficial(), { sourceUrl: FONTE, region: "XX", taxRelief: false })
    ).toThrow(/UF solicitada é inválida/i);
  });

  it("recusa path traversal no pacote externo", () => {
    const archive = storedZip([{ name: "../SINAPI_Referência_2026_06.xlsx", data: Buffer.from("x") }]);
    expect(() =>
      parseSinapiOfficialReferencePackage(archive, { sourceUrl: FONTE, region: "SP", taxRelief: false })
    ).toThrow(/path traversal/i);
  });
});
