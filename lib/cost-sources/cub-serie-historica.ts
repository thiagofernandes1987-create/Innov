// A série histórica do CUB paulista, que é onde as dezenove tipologias vivem.
//
// T-37.4. O leitor anterior (`sinduscon.ts`) lê a **notícia** mensal, e a
// notícia traz só o CUB representativo — o R8-N. Era por isso que o banco tinha
// uma tipologia só e a tela oferecia um item: não faltava esquema, faltava
// fonte.
//
// A fonte existe e é oficial: o botão "Download da série histórica" da página
// `sindusconsp.com.br/servicos/cub/` publica um `.xlsx` com quatro blocos —
// GLOBAL, MDO, MATERIAL e DESPESAS ADMINISTRATIVAS —, cada um uma matriz de mês
// por tipologia, cobrindo as dezenove da NBR 12721.
//
// Três armadilhas, todas medidas no arquivo de julho/2026 (481.518 bytes,
// SHA-256 671aff24…):
//
//  1. **O bloco GLOBAL não tem cabeçalho.** Os outros três nomeiam as colunas;
//     o primeiro começa direto nos números. A ordem é a mesma, mas "é a mesma"
//     é suposição — e supor aqui importaria a mão de obra de uma tipologia
//     debaixo do nome de outra. Por isso o mapeamento é **conferido** pela
//     reconciliação, e a leitura é recusada quando não fecha.
//  2. **Os blocos não cobrem os mesmos meses.** Medido no arquivo de
//     julho/2026: GLOBAL tem 234 meses e os outros três têm 222 — **2024
//     inteiro só existe no GLOBAL**. Casar um mês de um bloco com o mês vizinho
//     de outro produziria decomposição que não fecha, então o mês lido é o
//     último que existe **nos quatro**.
//  3. **A data é serial do Excel**, não texto.
//
// **A série é sem desoneração.** O valor desonerado só é publicado para o R8-N,
// na notícia — comparado e conferido: junho/2026 fecha em 2.221,44 aqui e na
// publicação.
//
// Módulo puro: recebe linhas já lidas da planilha e devolve registros.

export type FamiliaDeCub = "RESIDENCIAL" | "COMERCIAL" | "ESPECIAL";
export type PadraoDeAcabamento = "BAIXO" | "NORMAL" | "ALTO";

export type TipologiaDeCub = {
  codigo: string;
  descricao: string;
};

/**
 * As dezenove tipologias, **na ordem em que a planilha as coloca**.
 *
 * A ordem importa porque o bloco GLOBAL não tem cabeçalho: é esta lista que dá
 * nome àquelas colunas. Mudá-la sem conferir contra o arquivo renomearia
 * dinheiro.
 */
export const TIPOLOGIAS_CUB: readonly TipologiaDeCub[] = [
  { codigo: "R1-B", descricao: "Residência unifamiliar, 1 pavimento, padrão baixo" },
  { codigo: "PP-4B", descricao: "Prédio popular, 4 pavimentos, padrão baixo" },
  { codigo: "R8-B", descricao: "Residência multifamiliar, 8 pavimentos, padrão baixo" },
  { codigo: "PIS", descricao: "Projeto de interesse social" },
  { codigo: "R1-N", descricao: "Residência unifamiliar, 1 pavimento, padrão normal" },
  { codigo: "PP-4N", descricao: "Prédio popular, 4 pavimentos, padrão normal" },
  { codigo: "R8-N", descricao: "Residência multifamiliar, 8 pavimentos, padrão normal" },
  { codigo: "R16-N", descricao: "Residência multifamiliar, 16 pavimentos, padrão normal" },
  { codigo: "R1-A", descricao: "Residência unifamiliar, 1 pavimento, padrão alto" },
  { codigo: "R8-A", descricao: "Residência multifamiliar, 8 pavimentos, padrão alto" },
  { codigo: "R16-A", descricao: "Residência multifamiliar, 16 pavimentos, padrão alto" },
  { codigo: "CAL-8N", descricao: "Comercial andares livres, 8 pavimentos, padrão normal" },
  { codigo: "CSL-8N", descricao: "Comercial salas e lojas, 8 pavimentos, padrão normal" },
  { codigo: "CSL-16N", descricao: "Comercial salas e lojas, 16 pavimentos, padrão normal" },
  { codigo: "CAL-8A", descricao: "Comercial andares livres, 8 pavimentos, padrão alto" },
  { codigo: "CSL-8A", descricao: "Comercial salas e lojas, 8 pavimentos, padrão alto" },
  { codigo: "CSL-16A", descricao: "Comercial salas e lojas, 16 pavimentos, padrão alto" },
  { codigo: "RP1Q", descricao: "Residência popular, 1 quarto" },
  { codigo: "GI", descricao: "Galpão industrial" }
] as const;

const BLOCOS = ["GLOBAL", "MDO", "MATERIAL", "DESPESAS ADMINISTRATIVAS"] as const;
type NomeDeBloco = (typeof BLOCOS)[number];

/** Diferença aceita entre o global e a soma dos componentes, por m². */
export const TOLERANCIA_DA_SERIE = 0.01;

export function familiaDaTipologia(codigo: string): FamiliaDeCub {
  if (/^(R1|R8|R16|PP-?4|RP1Q)/i.test(codigo)) return "RESIDENCIAL";
  if (/^(CAL|CSL)/i.test(codigo)) return "COMERCIAL";
  return "ESPECIAL";
}

export function padraoDeAcabamento(codigo: string): PadraoDeAcabamento | null {
  if (/-?B$/i.test(codigo)) return "BAIXO";
  if (/-?N$/i.test(codigo)) return "NORMAL";
  if (/-?A$/i.test(codigo)) return "ALTO";
  return null;
}

/**
 * O serial do Excel virado data ISO do primeiro dia do mês.
 *
 * A época é 30/12/1899 — o dia a mais é o bug do ano bissexto de 1900, que a
 * Lotus criou e a Microsoft manteve por compatibilidade. A faixa é conferida
 * porque a mesma coluna guarda `CUB-2`, `55` e vazio: sem faixa, `55` viraria
 * fevereiro de 1900 e entraria como mês válido.
 */
export function dataDoSerial(valor: string): string | null {
  const numero = Number(String(valor ?? "").trim());
  if (!Number.isFinite(numero) || numero < 20_000 || numero > 60_000) return null;
  const data = new Date(Date.UTC(1899, 11, 30) + Math.trunc(numero) * 86_400_000);
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${data.getUTCFullYear()}-${mes}-01`;
}

export type RegistroDeCub = {
  codigo: string;
  descricao: string;
  familia: FamiliaDeCub;
  padrao: PadraoDeAcabamento | null;
  global: number;
  maoDeObra: number;
  material: number;
  administrativo: number;
};

export type SerieHistoricaLida = {
  /** O último mês em que **todos** os blocos têm valor. */
  dataBase: string;
  registros: RegistroDeCub[];
  /** Meses que algum bloco já publicou e outro ainda não. */
  mesesIncompletos: string[];
};

function falhar(mensagem: string): never {
  throw new Error(`CUB_SERIE: ${mensagem}`);
}

function numero(valor: string): number | null {
  const cru = String(valor ?? "").trim();
  if (cru === "" || cru === "-") return null;
  const convertido = Number(cru.includes(",") ? cru.replace(/\./g, "").replace(",", ".") : cru);
  return Number.isFinite(convertido) ? convertido : null;
}

/**
 * Onde termina um bloco: no começo da **próxima seção rotulada**, qualquer que
 * seja ela.
 *
 * Não basta parar no próximo bloco lido. Depois de DESPESAS ADMINISTRATIVAS vem
 * ÍNDICES DESPESAS ADMINISTRATIVAS, que traz os mesmos meses com número-índice:
 * estendendo o bloco até o fim do arquivo, o índice sobrescreve o valor em
 * reais do mesmo mês, e a decomposição passa a somar 100 onde deveria somar
 * 61,78. Medido — foi assim que o leitor errou antes desta guarda.
 */
function fimDaSecao(linhas: readonly (readonly string[])[], inicio: number): number {
  for (let i = inicio + 1; i < linhas.length; i += 1) {
    const primeira = String(linhas[i]?.[0] ?? "").trim();
    if (!primeira) continue;
    if (dataDoSerial(primeira) !== null) continue;
    if (/^(mes\/ano|cub-\d+)$/i.test(primeira)) continue;
    // Sobrou texto que não é data, cabeçalho nem marca de bloco: é rótulo de
    // seção nova.
    if (!/^-?[\d.,]+$/.test(primeira)) return i;
  }
  return linhas.length;
}

/** Onde cada bloco começa, pelo rótulo que o antecede. */
function inicioDosBlocos(linhas: readonly (readonly string[])[]) {
  const inicio = new Map<NomeDeBloco, number>();
  linhas.forEach((linha, indice) => {
    const rotulo = String(linha[0] ?? "").trim().toUpperCase();
    const bloco = BLOCOS.find(nome => nome === rotulo);
    // Só o primeiro: "ÍNDICES MDO" e "ÍNDICES MATERIAL" existem depois e são
    // outra coisa — número-índice, não reais por metro quadrado.
    if (bloco && !inicio.has(bloco)) inicio.set(bloco, indice);
  });
  for (const nome of BLOCOS) {
    if (!inicio.has(nome)) falhar(`o arquivo não traz o bloco ${nome}.`);
  }
  return inicio;
}

/** As linhas de mês de um bloco, até o rótulo do bloco seguinte. */
function mesesDoBloco(
  linhas: readonly (readonly string[])[],
  inicio: number,
  fim: number
): Map<string, readonly string[]> {
  const meses = new Map<string, readonly string[]>();
  for (let i = inicio + 1; i < fim; i += 1) {
    const linha = linhas[i] ?? [];
    const data = dataDoSerial(String(linha[0] ?? ""));
    if (!data) continue;
    const valores = linha.slice(1, 1 + TIPOLOGIAS_CUB.length);
    if (valores.some(valor => numero(valor) !== null)) meses.set(data, valores);
  }
  return meses;
}

/**
 * As dezenove tipologias do último mês completo.
 *
 * "Completo" é literal: o mês precisa existir nos quatro blocos. No arquivo de
 * julho/2026, 2024 inteiro só existe no GLOBAL — doze meses em que o total é
 * publicado e a decomposição não. Casar competências diferentes ali produziria
 * um CUB decomposto que não fecha com o próprio total.
 */
export function lerSerieHistoricaDoCub(
  linhas: readonly (readonly string[])[]
): SerieHistoricaLida {
  const inicio = inicioDosBlocos(linhas);
  const ordenados = [...inicio.entries()].sort((a, b) => a[1] - b[1]);

  // O cabeçalho existe em três dos quatro blocos e serve de conferência de
  // largura. O GLOBAL não tem — é a armadilha 1 — e herda a ordem desta lista.
  //
  // A conferência olha **só os blocos lidos**. O arquivo tem outros cabeçalhos
  // `mes/ano`, nos blocos de número-índice, e alguns vêm malformados: medido em
  // julho/2026, o da linha 751 traz `36` no lugar de uma tipologia e três
  // células vazias adiante. Conferir todos reprovaria por causa de um bloco que
  // este leitor nem usa — validador que reprova o certo ensina a ignorar o
  // vermelho.
  for (const nome of BLOCOS) {
    if (nome === "GLOBAL") continue;
    const comeco = inicio.get(nome)!;
    // O cabeçalho é reconhecido pela **primeira tipologia**, não pela primeira
    // célula: medido, uns blocos abrem a linha com `mes/ano` e outros com
    // `CUB-2`. Procurar pela célula errada reprovaria o arquivo publicado.
    const cabecalho = linhas
      .slice(comeco + 1, comeco + 5)
      .find(linha => String(linha[1] ?? "").trim() === TIPOLOGIAS_CUB[0].codigo);
    if (!cabecalho) falhar(`o bloco ${nome} não traz a linha de cabeçalho das tipologias.`);
    const codigos = cabecalho.slice(1).filter(valor => String(valor ?? "").trim() !== "");
    if (codigos.length !== TIPOLOGIAS_CUB.length) {
      falhar(
        `o cabeçalho de ${nome} traz ${codigos.length} coluna(s) de tipologia; ` +
          `esperadas ${TIPOLOGIAS_CUB.length}.`
      );
    }
  }

  const porBloco = new Map<NomeDeBloco, Map<string, readonly string[]>>();
  for (const [nome, comeco] of ordenados) {
    porBloco.set(nome, mesesDoBloco(linhas, comeco, fimDaSecao(linhas, comeco)));
  }

  const todosOsMeses = new Set<string>();
  for (const meses of porBloco.values()) for (const mes of meses.keys()) todosOsMeses.add(mes);
  const completos = [...todosOsMeses]
    .filter(mes => BLOCOS.every(nome => porBloco.get(nome)?.has(mes)))
    .sort();
  const incompletos = [...todosOsMeses].filter(mes => !completos.includes(mes)).sort();

  const dataBase = completos.at(-1);
  if (!dataBase) falhar("nenhum mês aparece nos quatro blocos ao mesmo tempo.");

  const valores = (nome: NomeDeBloco) => porBloco.get(nome)!.get(dataBase)!;
  const global = valores("GLOBAL");
  const mdo = valores("MDO");
  const material = valores("MATERIAL");
  const administrativo = valores("DESPESAS ADMINISTRATIVAS");

  const registros: RegistroDeCub[] = [];
  for (const [coluna, tipologia] of TIPOLOGIAS_CUB.entries()) {
    const totais = {
      global: numero(global[coluna]),
      maoDeObra: numero(mdo[coluna]),
      material: numero(material[coluna]),
      administrativo: numero(administrativo[coluna])
    };
    if (totais.global === null) continue;

    const soma = (totais.maoDeObra ?? 0) + (totais.material ?? 0) + (totais.administrativo ?? 0);
    if (Math.abs(soma - totais.global) > TOLERANCIA_DA_SERIE) {
      falhar(
        `a decomposição de ${tipologia.codigo} em ${dataBase} não fecha: ` +
          `${soma.toFixed(2)} contra ${totais.global.toFixed(2)} publicados.`
      );
    }

    registros.push({
      codigo: tipologia.codigo,
      descricao: tipologia.descricao,
      familia: familiaDaTipologia(tipologia.codigo),
      padrao: padraoDeAcabamento(tipologia.codigo),
      global: totais.global,
      maoDeObra: totais.maoDeObra ?? 0,
      material: totais.material ?? 0,
      administrativo: totais.administrativo ?? 0
    });
  }

  if (registros.length !== TIPOLOGIAS_CUB.length) {
    falhar(`somente ${registros.length} tipologia(s) tinham valor em ${dataBase}.`);
  }

  return { dataBase, registros, mesesIncompletos: incompletos };
}
