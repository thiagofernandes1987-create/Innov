import { describe, expect, it } from "vitest";
import {
  abaDoRelatorio,
  cabecalhoDeComposicoes,
  cabecalhoDeInsumos,
  codigoDaCelula,
  lerAnalitico,
  lerComposicoes,
  lerInsumos,
  naturezaDaClassificacao,
  precoDaCelula
} from "../lib/sinapi/relatorio-oficial";

// As linhas abaixo são recortes **do arquivo oficial** de 06/2026, lidos do
// ZIP publicado pela CAIXA (SHA-256 83a133d7…). Inventar um exemplo mais
// simples aqui seria repetir o erro que criou esta tarefa: o leitor anterior
// passava nos próprios testes e não lia o arquivo de verdade.

const UFS_ISD = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const ISD: string[][] = [
  ["SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil"],
  ["RELATÓRIO DE PREÇOS DE INSUMOS - ENCARGOS SOCIAIS SEM DESONERAÇÃO"],
  ["Mês de Referência:", "06/2026", "", "", "Encargos sociais sobre a mão de obra:"],
  ["Data de emissão:", "10/07/2026", "", "", "(SEM DESONERAÇÃO)", ...UFS_ISD],
  ["", "", "", "", "Localidade", "RIO BRANCO", "MACEIO"],
  ["Classificação", "Código do\r\nInsumo", "Descrição do Insumo", "Unidade", "Origem de\r\nPreço", ...UFS_ISD],
  ["SERVIÇOS", "45333", "ABERTURA PARA ENCAIXE DE CUBA", "UN", "CR",
    "302.08", "195.46", "207.9", "195.46", "122.61", "142.15", "", "72.85", "173.84", "258.65",
    "129.59", "190.13", "166.14", "177.69", "170.59", "195.46", "187.64", "151.04", "161.7",
    "231", "", "159.92", "217.5", "222.12", "116.49", "201.57", ""],
  ["MATERIAL", "11270", "ABRACADEIRA DE LATAO", "UN", "CR",
    "2.3", "", "2.4", "3.48", "2.91", "3.6", "2.4", "", "2.4", "3", "", "2.7", "2.64", "3.48",
    "3.76", "", "2.16", "", "3", "2.8", "2.42", "3.14", "", "", "2.4", "8.75", "2.52"]
];

// No arquivo real **só "AC" aparece** nesta linha: os outros vinte e seis
// estados não têm rótulo e não há `mergeCells` para expandir. A fixture
// reproduz isso — inventar os 27 rótulos aqui faria o teste aprovar um leitor
// que não lê o arquivo publicado, que é a VACINA-058 outra vez.
const LINHA_DE_UF = ["", "", "", "", "AC"];

const CSD: string[][] = [
  ["SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil"],
  ["RELATÓRIO DE CUSTOS DE COMPOSIÇÕES - ENCARGOS SOCIAIS SEM DESONERAÇÃO"],
  LINHA_DE_UF,
  ["Grupo", "Código da\r\nComposição", "Descrição", "Unidade",
    "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS",
    "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS",
    "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS",
    "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS",
    "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS",
    "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS",
    "Custo (R$)", "%AS", "Custo (R$)", "%AS", "Custo (R$)", "%AS"],
  ["Acessibilidade", "0", "PISO PODOTÁTIL DE ALERTA", "M2",
    "280.99", "0", "164.11", "0", "226.09", "0", "199.5", "0", "171.7", "0", "180.31", "0",
    "182.56", "0", "187.77", "0", "186.19", "0", "164.43", "0", "166.04", "0", "176.54", "0",
    "218.93", "0", "189.66", "0", "150.47", "0", "165.63", "0", "170", "0", "171", "0",
    "172", "0", "173", "0", "174", "0", "175", "0", "176", "0", "177", "0", "178", "0",
    "199.99", "0", "179", "0"]
];

const ANALITICO: string[][] = [
  ["SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil"],
  ["RELATÓRIO ANALÍTICO DE COMPOSIÇÕES"],
  ["Grupo", "Código da\r\nComposição", "Tipo Item", "Código do\r\nItem", "Descrição", "Unidade", "Coeficiente", "Situação"],
  ["Acessibilidade", "104658", "5045", "", "", "M2", "88"],
  ["Acessibilidade", "104658", "COMPOSICAO", "88316", "SERVENTE COM ENCARGOS COMPLEMENTARES", "H", "1.279", "COM CUSTO"],
  ["Acessibilidade", "104658", "INSUMO", "36178", "PISO TATIL / PODOTATIL", "UN", "6.4375", "COM PREÇO"]
];

describe("qual aba responde por cada relatório", () => {
  it("regime é aba, não arquivo", () => {
    expect(abaDoRelatorio("INSUMOS", "SEM_DESONERACAO")).toBe("ISD");
    expect(abaDoRelatorio("INSUMOS", "COM_DESONERACAO")).toBe("ICD");
    expect(abaDoRelatorio("COMPOSICOES", "SEM_DESONERACAO")).toBe("CSD");
    expect(abaDoRelatorio("COMPOSICOES", "COM_DESONERACAO")).toBe("CCD");
  });
});

describe("o código da composição está dentro da fórmula", () => {
  it("HYPERLINK com MATCH devolve o código, não o zero em cache", () => {
    const formula =
      'HYPERLINK("#"&CELL("address",OFFSET(Analítico!$B$1,MATCH(104658,Analítico!$B:$B,0)-1,3)),104658)';
    expect(codigoDaCelula("0", formula)).toBe("104658");
  });

  it("sem fórmula, o valor vale — e zero cru não é código", () => {
    expect(codigoDaCelula("88316")).toBe("88316");
    expect(codigoDaCelula("0")).toBe("");
  });
});

describe("preço em branco não é preço zero", () => {
  it("célula vazia e hífen são ausência de coleta", () => {
    expect(precoDaCelula("")).toBeNull();
    expect(precoDaCelula("   ")).toBeNull();
    expect(precoDaCelula("-")).toBeNull();
  });

  it("número passa, com ponto ou com vírgula", () => {
    expect(precoDaCelula("302.08")).toBe(302.08);
    expect(precoDaCelula("302,08")).toBe(302.08);
    expect(precoDaCelula("0")).toBe(0);
  });
});

describe("insumos: UF é coluna", () => {
  const cabecalho = cabecalhoDeInsumos(ISD);

  it("acha o cabeçalho no meio do bloco de legendas", () => {
    expect(cabecalho).not.toBeNull();
    expect(cabecalho?.linha).toBe(5);
    expect(Object.keys(cabecalho!.ufs)).toHaveLength(27);
  });

  it("lê o preço da UF pedida, e não o da coluna ao lado", () => {
    const itens = lerInsumos(ISD, cabecalho!, "SP");
    expect(itens).toHaveLength(2);
    expect(itens[0]).toMatchObject({ codigo: "45333", unidade: "UN", precoUnitario: 201.57 });
    expect(itens[1]).toMatchObject({ codigo: "11270", precoUnitario: 8.75 });
  });

  it("traz a classificação da CAIXA — é ela que separa material de serviço", () => {
    const itens = lerInsumos(ISD, cabecalho!, "SP");
    expect(itens.map(i => i.classificacao)).toEqual(["SERVIÇOS", "MATERIAL"]);
  });

  it("insumo sem coleta na UF não entra", () => {
    // Em TO o primeiro insumo está vazio: sem preço, sem item. Gravar zero
    // faria o orçamento fechar mais barato pelo motivo errado.
    const itens = lerInsumos(ISD, cabecalho!, "TO");
    expect(itens.map(i => i.codigo)).toEqual(["11270"]);
  });

  it("UF que não existe não devolve nada", () => {
    expect(lerInsumos(ISD, cabecalho!, "XX")).toEqual([]);
  });
});

describe("composições: cada UF ocupa duas colunas", () => {
  const cabecalho = cabecalhoDeComposicoes(CSD);

  it("acha o cabeçalho e casa a UF com a coluna de custo", () => {
    expect(cabecalho).not.toBeNull();
    expect(cabecalho?.linha).toBe(3);
    expect(cabecalho?.ufs.AC).toBe(4);
    // SP é a 26ª UF: 4 + 25×2.
    expect(cabecalho?.ufs.SP).toBe(54);
  });

  it("lê o custo, e não o %AS ao lado", () => {
    const itens = lerComposicoes(CSD, cabecalho!, "SP", new Map([["4:1", 'HYPERLINK("#"&CELL("address",OFFSET(Analítico!$B$1,MATCH(104658,Analítico!$B:$B,0)-1,3)),104658)']]));
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ codigo: "104658", unidade: "M2", custoUnitario: 199.99, grupo: "Acessibilidade" });
  });

  it("sem a fórmula, a composição de código zero é descartada em vez de importada errada", () => {
    expect(lerComposicoes(CSD, cabecalho!, "SP")).toEqual([]);
  });
});

describe("analítico: os itens de cada composição", () => {
  it("lê tipo, código, coeficiente e descarta a linha de resumo", () => {
    const itens = lerAnalitico(ANALITICO);
    expect(itens).toHaveLength(2);
    expect(itens[0]).toMatchObject({ composicao: "104658", tipo: "COMPOSICAO", codigo: "88316", coeficiente: 1.279 });
    expect(itens[1]).toMatchObject({ tipo: "INSUMO", codigo: "36178", coeficiente: 6.4375, unidade: "UN" });
  });

  it("planilha sem o cabeçalho esperado devolve vazio em vez de lixo", () => {
    expect(lerAnalitico([["qualquer", "coisa"]])).toEqual([]);
  });
});

describe("a classificação da CAIXA vira a natureza do orçamento", () => {
  it("as sete classificações que o arquivo de 06/2026 usa", () => {
    // Contadas no arquivo real, em SP: MATERIAL 2.557, MÃO DE OBRA 184,
    // EQUIPAMENTO (AQUISIÇÃO) 62, ENCARGOS COMPLEMENTARES 56, EQUIPAMENTO
    // (LOCAÇÃO) 10, SERVIÇOS 8, ESPECIAIS 3.
    expect(naturezaDaClassificacao("MATERIAL")).toBe("MATERIAL");
    expect(naturezaDaClassificacao("MAO DE OBRA")).toBe("LABOR");
    expect(naturezaDaClassificacao("ENCARGOS COMPLEMENTARES")).toBe("LABOR");
    expect(naturezaDaClassificacao("EQUIPAMENTO (AQUISIÇÃO)")).toBe("EQUIPMENT");
    expect(naturezaDaClassificacao("EQUIPAMENTO (LOCAÇÃO)")).toBe("EQUIPMENT");
    expect(naturezaDaClassificacao("SERVIÇOS")).toBe("SERVICE");
    expect(naturezaDaClassificacao("ESPECIAIS")).toBe("OTHER");
  });

  it("classificação inédita não vira material por engano", () => {
    // Cair no MATERIAL por omissão inflaria a natureza mais volumosa e
    // esconderia a novidade. "OUTROS" aparece na tela e pede tradução.
    expect(naturezaDaClassificacao("CLASSE QUE A CAIXA INVENTAR")).toBe("OTHER");
    expect(naturezaDaClassificacao("")).toBe("OTHER");
  });
});
