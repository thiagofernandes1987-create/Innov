import {
  ABA_ANALITICA,
  abaDoRelatorio,
  cabecalhoDeComposicoes,
  cabecalhoDeInsumos,
  codigosDaAba,
  lerAnalitico,
  lerComposicoes,
  lerInsumos,
  naturezaDaClassificacao,
  type RegimeSinapi
} from "./relatorio-oficial";
import {
  extractZipEntry,
  listZipEntries,
  parseWorkbook,
  type ZipLimits
} from "../planilhas/xlsx";
import type {
  ParsedSinapiPackage,
  SinapiCompositionImportRow,
  SinapiInputImportRow,
  SinapiItemPriceStatus
} from "./xlsx-parser";

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


function fail(message: string): never {
  throw new Error(`SINAPI_XLSX: ${message}`);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
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

  // Quem **está** no relatório, com preço ou sem. É o que separa "não houve
  // coleta neste estado" de "não está no relatório" — dois motivos diferentes
  // para o mesmo campo vazio, e só o primeiro é normal.
  const codigosDeInsumo = codigosDaAba(abaDeInsumos.rows, cabecalhoInsumos);
  const codigosDeComposicao = codigosDaAba(
    abaDeComposicoes.rows,
    cabecalhoComposicoes,
    abaDeComposicoes.formulas
  );

  const compositionRows: SinapiCompositionImportRow[] = composicoes.map((item, indice) => {
    const filhos = (itensPorComposicao.get(item.codigo) ?? []).map(filho => {
      const ehInsumo = filho.tipo === "INSUMO";
      const custoUnitario = ehInsumo
        ? precoPorCodigo.get(filho.codigo) ?? null
        : custoPorComposicao.get(filho.codigo) ?? null;
      const conhecido = (ehInsumo ? codigosDeInsumo : codigosDeComposicao).has(filho.codigo);

      // **Ausência não é zero.** O custo pode faltar por dois motivos, e o
      // orçamento precisa dos dois: sem preço no estado é rotina do SINAPI —
      // 4.677 dos 43.923 itens de SP —, e fora do relatório costuma ser insumo
      // em estudo. Escrever zero nos dois casos fecharia a composição mais
      // barata sem nada na tela denunciar.
      const priceStatus: SinapiItemPriceStatus =
        custoUnitario !== null ? "COM_CUSTO" : conhecido ? "SEM_PRECO_NA_UF" : "FORA_DO_RELATORIO";

      return {
        code: filho.codigo,
        description: filho.descricao,
        unit: filho.unidade,
        itemType: ehInsumo ? ("INPUT" as const) : ("COMPOSITION" as const),
        coefficient: filho.coeficiente,
        unitCost: custoUnitario,
        totalCost: custoUnitario === null ? null : Number((custoUnitario * filho.coeficiente).toFixed(6)),
        priceStatus,
        sinapiSituation: filho.situacao
      };
    });

    return {
      code: item.codigo,
      description: item.descricao,
      unit: item.unidade,
      unitCost: item.custoUnitario,
      items: filhos,
      itemsWithoutCost: filhos.filter(filho => filho.unitCost === null).length,
      sourceFile: referencia.name,
      sourceSheet: abaDeComposicoes.name,
      sourceRow: cabecalhoComposicoes.linha + 1 + indice
    };
  });

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
