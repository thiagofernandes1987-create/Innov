// O relatório oficial do SINAPI, no formato que a CAIXA publica hoje.
//
// T-37.1. O leitor anterior procurava **um arquivo por UF e por regime** dentro
// do pacote — `SINAPI_Preço_Ref_Insumos_SP_202606_NaoDesonerado.xlsx` e
// parentes —, e lia UF, regime e tipo do **nome do arquivo**. O pacote de
// 06/2026 não tem nada disso. Medido, baixando o ZIP oficial:
//
//   SINAPI-2026-06-formato-xlsx.zip  (15.715.816 bytes)
//   ├── SINAPI_familias_e_coeficientes_2026_06.xlsx
//   ├── SINAPI_Manutenções_2026_06.xlsx
//   ├── SINAPI_mao_de_obra_2026_06.xlsx
//   └── SINAPI_Referência_2026_06.xlsx   ← tudo o que interessa, em 10 abas
//
// A UF virou **coluna**, e o regime virou **aba**:
//
//   ISD / ICD  insumos sem e com desoneração
//   CSD / CCD  composições sem e com desoneração
//   Analítico  os itens de cada composição, com coeficiente
//
// Três armadilhas do arquivo, todas medidas e todas capazes de importar dado
// errado em silêncio:
//
//  1. **O código da composição está dentro de uma fórmula.** A célula é
//     `HYPERLINK(...MATCH(104658;...);104658)` com valor em cache `0`. Quem lê
//     o valor importa cem mil composições com o código zero.
//  2. **Cada UF ocupa duas colunas** na aba de composições — `Custo (R$)` e
//     `%AS` —, e o rótulo da UF fica numa linha acima do cabeçalho.
//  3. **Preço em branco não é zero.** A própria planilha avisa: célula vazia
//     significa que não houve coleta mínima naquele estado. Gravar zero
//     transformaria ausência de pesquisa em insumo de graça.
//
// Módulo puro: recebe linhas já lidas da planilha e devolve registros. Quem lê
// o ZIP e a planilha é `official-reference-parser.ts`.

export type RegimeSinapi = "SEM_DESONERACAO" | "COM_DESONERACAO";

/** As unidades da federação, como a planilha as escreve. */
export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
] as const;

export type Uf = (typeof UFS)[number];

const UF_VALIDA = new Set<string>(UFS);

/** Qual aba responde por cada relatório, em cada regime. */
export function abaDoRelatorio(tipo: "INSUMOS" | "COMPOSICOES", regime: RegimeSinapi): string {
  if (tipo === "INSUMOS") return regime === "COM_DESONERACAO" ? "ICD" : "ISD";
  return regime === "COM_DESONERACAO" ? "CCD" : "CSD";
}

/** A aba com os itens de cada composição — a que torna o orçamento analítico. */
export const ABA_ANALITICA = "Analítico";

export function normalizar(valor: string): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * O código de uma célula que pode ser fórmula.
 *
 * `HYPERLINK("#"&CELL("address";OFFSET(Analítico!$B$1;MATCH(104658;Analítico!$B:$B;0)-1;3));104658)`
 * tem valor em cache `0`. O número que interessa é o argumento do `MATCH` — e
 * ele aparece duas vezes na fórmula, sempre igual.
 */
export function codigoDaCelula(valor: string, formula?: string | null): string {
  const daFormula = formula ? /MATCH\(\s*(\d+)/i.exec(formula)?.[1] : null;
  if (daFormula) return daFormula;
  const cru = String(valor ?? "").trim();
  return cru === "0" ? "" : cru;
}

/**
 * Preço vazio é ausência de coleta, não preço zero.
 *
 * A própria planilha diz: "preço em branco para determinado estado significa
 * que não houve coleta mínima de preços no mês de referência". Gravar zero
 * transformaria isso em insumo de graça, e o orçamento sairia barato pelo
 * motivo errado.
 */
export function precoDaCelula(valor: string): number | null {
  const cru = String(valor ?? "").trim();
  if (cru === "" || cru === "-") return null;

  // A planilha guarda número cru, com ponto decimal: `302.08` são trezentos e
  // dois reais. Só quando há vírgula é que o ponto vira separador de milhar —
  // caso de célula de texto formatada. Tratar sempre o ponto como milhar
  // multiplicaria todo preço por cem, e o orçamento sairia cem vezes maior sem
  // nenhum erro aparecer.
  const normalizado = cru.includes(",") ? cru.replace(/\./g, "").replace(",", ".") : cru;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

export type CabecalhoDeInsumos = {
  linha: number;
  classificacao: number;
  codigo: number;
  descricao: number;
  unidade: number;
  ufs: Record<string, number>;
};

function indiceDe(linha: readonly string[], combina: (celula: string) => boolean): number {
  return linha.findIndex(celula => combina(normalizar(celula)));
}

function ufsNaLinha(linha: readonly string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  linha.forEach((celula, coluna) => {
    const texto = normalizar(celula);
    if (UF_VALIDA.has(texto) && mapa[texto] === undefined) mapa[texto] = coluna;
  });
  return mapa;
}

/**
 * Onde começa a tabela de insumos.
 *
 * Procurado, não fixado: o cabeçalho fica na linha 9 do arquivo de junho de
 * 2026, e o bloco de legendas acima dele muda de tamanho entre publicações.
 */
export function cabecalhoDeInsumos(linhas: readonly (readonly string[])[]): CabecalhoDeInsumos | null {
  const limite = Math.min(linhas.length, 60);
  for (let i = 0; i < limite; i += 1) {
    const linha = linhas[i];
    const codigo = indiceDe(linha, c => c.includes("CODIGO") && c.includes("INSUMO"));
    const descricao = indiceDe(linha, c => c.includes("DESCRICAO") && c.includes("INSUMO"));
    const unidade = indiceDe(linha, c => c === "UNIDADE");
    if (codigo < 0 || descricao < 0 || unidade < 0) continue;
    const ufs = ufsNaLinha(linha);
    if (Object.keys(ufs).length < 20) continue;
    return {
      linha: i,
      classificacao: indiceDe(linha, c => c.startsWith("CLASSIFICACAO")),
      codigo,
      descricao,
      unidade,
      ufs
    };
  }
  return null;
}

export type CabecalhoDeComposicoes = {
  linha: number;
  grupo: number;
  codigo: number;
  descricao: number;
  unidade: number;
  /** UF → coluna do "Custo (R$)". O "%AS" ao lado não é importado. */
  ufs: Record<string, number>;
};

/**
 * Onde começa a tabela de composições.
 *
 * Aqui a UF **não** está escrita coluna a coluna. Medido no arquivo oficial de
 * 06/2026: a linha acima do cabeçalho traz `AC` na primeira coluna de custo e
 * mais nada — os outros vinte e seis estados simplesmente não têm rótulo, e não
 * há `mergeCells` para expandir. O que existe, e é confiável, é a estrutura: o
 * cabeçalho tem **vinte e sete colunas `Custo (R$)`**, uma por estado, cada uma
 * seguida de um `%AS`, na ordem alfabética das UFs.
 *
 * Por isso o mapeamento é posicional — e **conferido**: se a contagem de
 * colunas de custo não for exatamente o número de UFs, a leitura é recusada em
 * vez de adivinhada. Errar aqui importaria o custo de São Paulo debaixo do
 * nome de Tocantins, e nada na tela denunciaria.
 */
export function cabecalhoDeComposicoes(
  linhas: readonly (readonly string[])[]
): CabecalhoDeComposicoes | null {
  const limite = Math.min(linhas.length, 60);
  for (let i = 0; i < limite; i += 1) {
    const linha = linhas[i];
    const codigo = indiceDe(linha, c => c.includes("CODIGO") && c.includes("COMPOSICAO"));
    const descricao = indiceDe(linha, c => c === "DESCRICAO");
    const unidade = indiceDe(linha, c => c === "UNIDADE");
    if (codigo < 0 || descricao < 0 || unidade < 0) continue;

    const colunasDeCusto: number[] = [];
    linha.forEach((celula, coluna) => {
      if (normalizar(celula).startsWith("CUSTO")) colunasDeCusto.push(coluna);
    });
    if (colunasDeCusto.length !== UFS.length) continue;

    const ufs: Record<string, number> = {};
    UFS.forEach((uf, indice) => {
      ufs[uf] = colunasDeCusto[indice];
    });

    return {
      linha: i,
      grupo: indiceDe(linha, c => c === "GRUPO"),
      codigo,
      descricao,
      unidade,
      ufs
    };
  }
  return null;
}

export type InsumoOficial = {
  codigo: string;
  descricao: string;
  unidade: string;
  /** MATERIAL, SERVIÇOS, EQUIPAMENTO… como a CAIXA classifica. */
  classificacao: string;
  precoUnitario: number;
};

/**
 * Os insumos com preço na UF pedida.
 *
 * Insumo sem preço naquele estado **não entra**: a planilha deixa a célula
 * vazia quando não houve coleta mínima, e um catálogo com preço zero é pior
 * que um catálogo sem o item — o orçamento fecharia mais barato sem ninguém
 * ver o buraco.
 */
export function lerInsumos(
  linhas: readonly (readonly string[])[],
  cabecalho: CabecalhoDeInsumos,
  uf: string
): InsumoOficial[] {
  const coluna = cabecalho.ufs[normalizar(uf)];
  if (coluna === undefined) return [];

  const itens: InsumoOficial[] = [];
  for (let i = cabecalho.linha + 1; i < linhas.length; i += 1) {
    const linha = linhas[i];
    const codigo = String(linha[cabecalho.codigo] ?? "").trim();
    const descricao = String(linha[cabecalho.descricao] ?? "").trim();
    if (!codigo || !descricao) continue;
    const preco = precoDaCelula(String(linha[coluna] ?? ""));
    if (preco === null) continue;
    itens.push({
      codigo,
      descricao,
      unidade: String(linha[cabecalho.unidade] ?? "").trim(),
      classificacao:
        cabecalho.classificacao >= 0 ? String(linha[cabecalho.classificacao] ?? "").trim() : "",
      precoUnitario: preco
    });
  }
  return itens;
}

export type ComposicaoOficial = {
  codigo: string;
  descricao: string;
  unidade: string;
  grupo: string;
  custoUnitario: number;
};

export function lerComposicoes(
  linhas: readonly (readonly string[])[],
  cabecalho: CabecalhoDeComposicoes,
  uf: string,
  formulas?: ReadonlyMap<string, string>
): ComposicaoOficial[] {
  const coluna = cabecalho.ufs[normalizar(uf)];
  if (coluna === undefined) return [];

  const itens: ComposicaoOficial[] = [];
  for (let i = cabecalho.linha + 1; i < linhas.length; i += 1) {
    const linha = linhas[i];
    const codigo = codigoDaCelula(
      String(linha[cabecalho.codigo] ?? ""),
      formulas?.get(`${i}:${cabecalho.codigo}`)
    );
    const descricao = String(linha[cabecalho.descricao] ?? "").trim();
    if (!codigo || !descricao) continue;
    const custo = precoDaCelula(String(linha[coluna] ?? ""));
    if (custo === null) continue;
    itens.push({
      codigo,
      descricao,
      unidade: String(linha[cabecalho.unidade] ?? "").trim(),
      grupo: cabecalho.grupo >= 0 ? String(linha[cabecalho.grupo] ?? "").trim() : "",
      custoUnitario: custo
    });
  }
  return itens;
}

export type ItemAnalitico = {
  composicao: string;
  tipo: "COMPOSICAO" | "INSUMO";
  codigo: string;
  descricao: string;
  unidade: string;
  coeficiente: number;
};

/**
 * Os itens de cada composição — o que torna o orçamento **analítico**.
 *
 * A aba traz uma linha por item, com o código da composição repetido. Linha de
 * item sem tipo reconhecido é cabeçalho ou resumo da própria composição, e é
 * descartada: só COMPOSICAO e INSUMO são itens de verdade.
 */
export function lerAnalitico(linhas: readonly (readonly string[])[]): ItemAnalitico[] {
  const cabecalho = (() => {
    const limite = Math.min(linhas.length, 60);
    for (let i = 0; i < limite; i += 1) {
      const linha = linhas[i];
      const composicao = indiceDe(linha, c => c.includes("CODIGO") && c.includes("COMPOSICAO"));
      const tipo = indiceDe(linha, c => c.includes("TIPO") && c.includes("ITEM"));
      const item = indiceDe(linha, c => c.includes("CODIGO") && c.includes("ITEM"));
      const coeficiente = indiceDe(linha, c => c.startsWith("COEFICIENTE"));
      if (composicao >= 0 && tipo >= 0 && item >= 0 && coeficiente >= 0) {
        return {
          linha: i,
          composicao,
          tipo,
          item,
          descricao: indiceDe(linha, c => c === "DESCRICAO"),
          unidade: indiceDe(linha, c => c === "UNIDADE"),
          coeficiente
        };
      }
    }
    return null;
  })();
  if (!cabecalho) return [];

  const itens: ItemAnalitico[] = [];
  for (let i = cabecalho.linha + 1; i < linhas.length; i += 1) {
    const linha = linhas[i];
    const tipo = normalizar(String(linha[cabecalho.tipo] ?? ""));
    if (tipo !== "COMPOSICAO" && tipo !== "INSUMO") continue;
    const coeficiente = precoDaCelula(String(linha[cabecalho.coeficiente] ?? ""));
    const composicao = String(linha[cabecalho.composicao] ?? "").trim();
    const codigo = String(linha[cabecalho.item] ?? "").trim();
    if (!composicao || !codigo || coeficiente === null) continue;
    itens.push({
      composicao,
      tipo,
      codigo,
      descricao: cabecalho.descricao >= 0 ? String(linha[cabecalho.descricao] ?? "").trim() : "",
      unidade: cabecalho.unidade >= 0 ? String(linha[cabecalho.unidade] ?? "").trim() : "",
      coeficiente
    });
  }
  return itens;
}

/**
 * A classificação da CAIXA traduzida para a natureza do orçamento.
 *
 * É esta linha que liga o SINAPI ao corte material × mão de obra: o relatório
 * já classifica cada insumo, e o orçamento já tem a coluna. Sem a tradução, o
 * catálogo importado entraria todo como "OUTROS" e o total por natureza — que
 * é o que decide equipe própria contra empreitada — mostraria uma barra só.
 *
 * Medido no arquivo de 06/2026, em SP: MATERIAL 2.557, MÃO DE OBRA 184,
 * EQUIPAMENTO (AQUISIÇÃO) 62, ENCARGOS COMPLEMENTARES 56, EQUIPAMENTO
 * (LOCAÇÃO) 10, SERVIÇOS 8, ESPECIAIS 3.
 *
 * Encargos complementares acompanham a mão de obra porque é disso que eles
 * são: o custo do encargo sobre a hora trabalhada, e não um insumo à parte.
 */
export function naturezaDaClassificacao(
  classificacao: string
): "MATERIAL" | "LABOR" | "EQUIPMENT" | "SERVICE" | "OTHER" {
  const texto = normalizar(classificacao);
  if (texto.startsWith("MATERIAL")) return "MATERIAL";
  if (texto.startsWith("MAO DE OBRA") || texto.startsWith("ENCARGOS")) return "LABOR";
  if (texto.startsWith("EQUIPAMENTO")) return "EQUIPMENT";
  if (texto.startsWith("SERVICO")) return "SERVICE";
  return "OTHER";
}
