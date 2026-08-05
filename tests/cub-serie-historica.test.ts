import { describe, expect, it } from "vitest";
import {
  TIPOLOGIAS_CUB,
  dataDoSerial,
  familiaDaTipologia,
  lerSerieHistoricaDoCub,
  padraoDeAcabamento
} from "@/lib/cost-sources/cub-serie-historica";

// Recortes **do arquivo oficial** `Cub-Serie-Historica-Julho-26.xlsx`
// (481.518 bytes, SHA-256 671aff24…), baixado de sindusconsp.com.br. Os números
// de junho/2026 são os publicados; inventar um exemplo mais simples aqui
// repetiria o erro que originou a VACINA-060.

const CODIGOS = [
  "R1-B", "PP-4B", "R8-B", "PIS", "R1-N", "PP-4N", "R8-N", "R16-N", "R1-A",
  "R8-A", "R16-A", "CAL-8N", "CSL-8N", "CSL-16N", "CAL-8A", "CSL-8A", "CSL-16A", "RP1Q", "GI"
];

/** 46174 é 1º de junho de 2026; 46204, 1º de julho. */
const JUNHO = "46174";
const JULHO = "46204";

const GLOBAL_JUNHO = ["2175.81", "2032.84", "1935.81", "1513.31", "2670.26", "2486.71", "2221.44",
  "2158.46", "3227.44", "2605.71", "2822.68", "2575.71", "2220.56", "2962.88", "2725.56",
  "2390.12", "3124.94", "2375.84", "1258.66"];
const MDO_JUNHO = ["1128.92", "951.51", "894.06", "768.7", "1592.94", "1408.18", "1267.37",
  "1219.9", "1728.75", "1336.15", "1501.72", "1416.66", "1274.25", "1695.82", "1430.06",
  "1308.28", "1741.83", "1534.62", "708.58"];
const MATERIAL_JUNHO = ["927.96", "1049.71", "1013.3", "715.12", "965.65", "944.63", "892.29",
  "887.44", "1393.12", "1196.72", "1257.77", "1076.28", "880.97", "1193.76", "1212.73",
  "1016.5", "1309.82", "841.22", "550.08"];
const ADM_JUNHO = ["118.93", "31.62", "28.45", "29.49", "111.67", "133.9", "61.78", "51.12",
  "105.57", "72.84", "63.19", "82.77", "65.34", "73.3", "82.77", "65.34", "73.29", "0", "0"];

const GLOBAL_JULHO = ["2186.73", "2042.62", "1945.55", "1519.47", "2681.61", "2498.31", "2231.37",
  "2168.48", "3242.79", "2618.33", "2835.37", "2587.16", "2230.85", "2976.33", "2737.41",
  "2401.3", "3139.51", "2382.75", "1263.81"];
const MDO_JULHO = ["1133.81", "955.56", "897.88", "772.04", "1599.07", "1413.62", "1272.21",
  "1224.54", "1735.39", "1341.34", "1507.54", "1422.01", "1279.14", "1702.35", "1435.46",
  "1313.33", "1748.58", "1540.24", "711.3"];
const ADM_JULHO = ["119.66", "31.82", "28.63", "29.67", "112.35", "134.72", "62.15", "51.44",
  "106.21", "73.29", "63.57", "83.27", "65.74", "73.74", "83.28", "65.74", "73.74", "0", "0"];

// Julho ainda não tinha MATERIAL publicado quando o arquivo foi baixado. Para
// exercitar "todos os blocos alcançaram o mês", o material de julho é
// **derivado** aqui — global menos mão de obra menos administrativo —, e é
// fixture, não número publicado.
const MATERIAL_JULHO = GLOBAL_JULHO.map((valor, indice) =>
  (Number(valor) - Number(MDO_JULHO[indice]) - Number(ADM_JULHO[indice])).toFixed(2)
);

const vazia = () => Array<string>(20).fill("");
const rotulo = (texto: string) => [texto, ...Array<string>(19).fill("")];
// Medido no arquivo: uns blocos abrem a linha de cabeçalho com `mes/ano` e
// outros com `CUB-2`. A fixture usa os dois, para o leitor não poder depender
// de um só.
const cabecalho = (marca = "mes/ano") => [marca, ...CODIGOS];
const linha = (serial: string, valores: string[]) => [serial, ...valores];

/**
 * A planilha real, em miniatura. **O bloco GLOBAL não tem cabeçalho** — é assim
 * no arquivo publicado, e é a armadilha que o leitor precisa tratar.
 */
function planilha(opcoes: { materialAte?: "junho" | "julho" } = {}) {
  const materialAte = opcoes.materialAte ?? "junho";
  return [
    vazia(),
    rotulo("GLOBAL"),
    vazia(),
    linha(JUNHO, GLOBAL_JUNHO),
    linha(JULHO, GLOBAL_JULHO),
    vazia(),
    rotulo("MDO"),
    cabecalho("CUB-2"),
    linha(JUNHO, MDO_JUNHO),
    linha(JULHO, MDO_JULHO),
    vazia(),
    rotulo("MATERIAL"),
    cabecalho(),
    linha(JUNHO, MATERIAL_JUNHO),
    ...(materialAte === "julho" ? [linha(JULHO, MATERIAL_JULHO)] : []),
    vazia(),
    rotulo("DESPESAS ADMINISTRATIVAS"),
    cabecalho(),
    linha(JUNHO, ADM_JUNHO),
    linha(JULHO, ADM_JULHO)
  ];
}

describe("o serial do Excel vira data", () => {
  it("46174 é junho de 2026 e 46204 é julho", () => {
    expect(dataDoSerial("46174")).toBe("2026-06-01");
    expect(dataDoSerial("46204")).toBe("2026-07-01");
  });

  it("o que não é serial de data devolve nulo em vez de 1899", () => {
    expect(dataDoSerial("")).toBeNull();
    expect(dataDoSerial("CUB-2")).toBeNull();
    expect(dataDoSerial("55")).toBeNull();
  });
});

describe("as tipologias da NBR 12721", () => {
  it("as dezenove que o SindusCon-SP publica, na ordem das colunas", () => {
    expect(TIPOLOGIAS_CUB.map(item => item.codigo)).toEqual(CODIGOS);
  });

  it("família e padrão de acabamento saem do próprio código", () => {
    expect(familiaDaTipologia("R8-N")).toBe("RESIDENCIAL");
    expect(familiaDaTipologia("CAL-8N")).toBe("COMERCIAL");
    expect(familiaDaTipologia("GI")).toBe("ESPECIAL");
    expect(padraoDeAcabamento("R8-B")).toBe("BAIXO");
    expect(padraoDeAcabamento("R8-N")).toBe("NORMAL");
    expect(padraoDeAcabamento("CSL-16A")).toBe("ALTO");
    expect(padraoDeAcabamento("GI")).toBeNull();
  });
});

describe("leitura da série histórica", () => {
  it("lê as dezenove tipologias do último mês completo", () => {
    const lido = lerSerieHistoricaDoCub(planilha());
    expect(lido.dataBase).toBe("2026-06-01");
    expect(lido.registros).toHaveLength(19);
    expect(lido.registros.find(item => item.codigo === "R8-N")).toMatchObject({
      global: 2221.44,
      maoDeObra: 1267.37,
      material: 892.29,
      administrativo: 61.78
    });
  });

  it("a soma dos componentes fecha com o global em todas as dezenove", () => {
    // É esta conferência que prova o mapeamento de coluna do bloco GLOBAL, que
    // **não tem cabeçalho** no arquivo. Sem ela, a ordem seria adivinhada.
    const lido = lerSerieHistoricaDoCub(planilha());
    for (const registro of lido.registros) {
      const soma = registro.maoDeObra + registro.material + registro.administrativo;
      expect(Math.abs(soma - registro.global)).toBeLessThanOrEqual(0.01);
    }
  });

  it("mês que só um bloco tem não vira data-base", () => {
    // Medido no arquivo real: GLOBAL cobre 234 meses e os outros três, 222 —
    // 2024 inteiro só existe no GLOBAL. Casar o total de um mês com a
    // decomposição de outro produziria um CUB que não fecha consigo mesmo.
    const lido = lerSerieHistoricaDoCub(planilha());
    expect(lido.dataBase).toBe("2026-06-01");
    expect(lido.mesesIncompletos).toEqual(["2026-07-01"]);
  });

  it("quando todos os blocos alcançam o mês, ele passa a ser o lido", () => {
    const lido = lerSerieHistoricaDoCub(planilha({ materialAte: "julho" }));
    expect(lido.dataBase).toBe("2026-07-01");
    expect(lido.mesesIncompletos).toEqual([]);
  });

  it("recusa a planilha quando um bloco esperado não existe", () => {
    const semMaterial = planilha().filter(linhaAtual => linhaAtual[0] !== "MATERIAL");
    expect(() => lerSerieHistoricaDoCub(semMaterial)).toThrow(/MATERIAL/);
  });

  it("recusa quando os componentes não fecham com o global", () => {
    // Sabotagem que simula coluna deslocada: a decomposição deixaria de bater e
    // o CUB entraria no orçamento com mão de obra de outra tipologia.
    const adulterada = planilha().map(linhaAtual =>
      linhaAtual[0] === JUNHO && linhaAtual[1] === MDO_JUNHO[0]
        ? [linhaAtual[0], ...MDO_JUNHO.slice(1), MDO_JUNHO[0]]
        : linhaAtual
    );
    expect(() => lerSerieHistoricaDoCub(adulterada)).toThrow(/não fecha/i);
  });

  it("recusa quando a contagem de colunas de um bloco lido muda", () => {
    const curta = planilha().map(linhaAtual =>
      linhaAtual[1] === CODIGOS[0] ? linhaAtual.slice(0, 12) : linhaAtual
    );
    expect(() => lerSerieHistoricaDoCub(curta)).toThrow(/coluna/i);
  });

  it("cabeçalho malformado de bloco que não é lido não reprova", () => {
    // O arquivo real tem `mes/ano` também nos blocos de número-índice, e alguns
    // vêm quebrados. Reprovar por causa deles seria reprovar o arquivo certo.
    const comIndices = [
      ...planilha(),
      vazia(),
      rotulo("ÍNDICES GLOBAL"),
      ["mes/ano", "R1-B", "PP-4B", "36", "", "", "R16-A"],
      linha(JUNHO, ["100", "100", "100"])
    ];
    expect(lerSerieHistoricaDoCub(comIndices).registros).toHaveLength(19);
  });
});
