import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { discoverLatestSinapiXlsxSource } from "@/lib/sinapi/automatic-update";
import { parseSinapiOfficialReferencePackage } from "@/lib/sinapi/official-reference-parser";
import type { ParsedSinapiPackage } from "@/lib/sinapi/xlsx-parser";

// **A conferência que faltava.** Os demais testes do leitor rodam sobre exemplo
// congelado: provam que o leitor entende o formato de 06/2026, e continuarão
// verdes no dia em que a CAIXA publicar outro. Foi assim que a falha da T-37.1
// passou quarenta dias invisível — a tela dizia "0 insumos válidos" e a suíte
// inteira passava.
//
// Este arquivo baixa o pacote **publicado hoje** e cobra o contrato de layout.
// Não roda na suíte comum, porque depende de rede e do site da CAIXA estar de
// pé; roda por `pnpm sinapi:layout`, e é ele que deve reprovar quando o formato
// mudar de novo.
//
// Os números abaixo são piso, não igualdade: o SINAPI cresce todo mês, e um
// teste que exigisse contagem exata reprovaria por motivo errado. O que não
// pode cair é a ordem de grandeza — se vierem 50 insumos em vez de 2.880, o
// leitor deixou de entender o arquivo.

const AO_VIVO = process.env.SINAPI_LAYOUT_AO_VIVO === "1";
const CACHE = join(tmpdir(), "innovar-sinapi-layout");

async function pacoteOficial() {
  mkdirSync(CACHE, { recursive: true });
  const fonte = await discoverLatestSinapiXlsxSource();
  const arquivo = join(CACHE, `${fonte.baseDate}-${fonte.fileName}`);
  if (existsSync(arquivo)) return { fonte, bytes: readFileSync(arquivo) };
  const resposta = await fetch(fonte.url);
  if (!resposta.ok) throw new Error(`A CAIXA respondeu ${resposta.status} ao download do pacote.`);
  const bytes = Buffer.from(await resposta.arrayBuffer());
  writeFileSync(arquivo, bytes);
  return { fonte, bytes };
}

describe.skipIf(!AO_VIVO)("layout publicado do SINAPI", () => {
  let semDesoneracao: ParsedSinapiPackage;
  let comDesoneracao: ParsedSinapiPackage;
  let pacote: Buffer;
  let origem = "";

  beforeAll(async () => {
    const { fonte, bytes } = await pacoteOficial();
    origem = fonte.url;
    pacote = bytes;
    semDesoneracao = parseSinapiOfficialReferencePackage(bytes, {
      sourceUrl: fonte.url,
      region: "SP",
      taxRelief: false
    });
    comDesoneracao = parseSinapiOfficialReferencePackage(bytes, {
      sourceUrl: fonte.url,
      region: "SP",
      taxRelief: true
    });
  }, 300_000);

  it("traz o relatório de referência, com data-base do mês publicado", () => {
    expect(origem).toMatch(/^https:\/\//);
    expect(semDesoneracao.xlsxFiles).toHaveLength(1);
    expect(semDesoneracao.xlsxFiles[0]).toMatch(/Refer/i);
    expect(semDesoneracao.baseDate).toMatch(/^20\d{2}-(0[1-9]|1[0-2])-01$/);
  });

  it("lê insumos e composições em ordem de grandeza compatível com o publicado", () => {
    expect(semDesoneracao.inputs.length).toBeGreaterThan(2_000);
    expect(semDesoneracao.compositions.length).toBeGreaterThan(6_000);
  });

  it("nenhuma composição entra com código zerado — a armadilha do HYPERLINK", () => {
    const zeradas = semDesoneracao.compositions.filter(item => !item.code || item.code === "0");
    expect(zeradas).toHaveLength(0);
  });

  it("as composições vêm com itens: é o que torna o orçamento analítico", () => {
    const comItens = semDesoneracao.compositions.filter(item => item.items.length > 0).length;
    const proporcao = comItens / semDesoneracao.compositions.length;
    expect(proporcao).toBeGreaterThan(0.9);
  });

  it("os insumos chegam classificados por natureza, não todos como OUTROS", () => {
    const contagem = new Map<string, number>();
    for (const insumo of semDesoneracao.inputs) {
      contagem.set(insumo.itemType, (contagem.get(insumo.itemType) ?? 0) + 1);
    }
    expect(contagem.get("MATERIAL") ?? 0).toBeGreaterThan(1_000);
    expect(contagem.get("LABOR") ?? 0).toBeGreaterThan(50);
    expect(contagem.get("EQUIPMENT") ?? 0).toBeGreaterThan(10);
    expect(contagem.get("OTHER") ?? 0).toBeLessThan(semDesoneracao.inputs.length * 0.05);
  });

  it("nenhum preço zerado: célula vazia é ausência de coleta e fica de fora", () => {
    expect(semDesoneracao.inputs.every(item => item.unitCost > 0)).toBe(true);
    expect(semDesoneracao.compositions.every(item => item.unitCost > 0)).toBe(true);
  });

  it("o somatório dos itens fecha com o custo oficial da composição", () => {
    // A conferência que pega o erro mais difícil de ver: a UF das composições é
    // **posicional** — vinte e sete colunas "Custo (R$)", só a primeira
    // rotulada. Se a CAIXA inserir uma coluna, o custo de um estado entra
    // debaixo do nome de outro, e nada na tela denuncia. O somatório dos itens
    // não fecharia mais.
    const preco = new Map(semDesoneracao.inputs.map(item => [item.code, item.unitCost]));
    const custo = new Map(semDesoneracao.compositions.map(item => [item.code, item.unitCost]));
    const desvios: number[] = [];
    for (const composicao of semDesoneracao.compositions) {
      if (composicao.items.length === 0 || composicao.unitCost === 0) continue;
      const completa = composicao.items.every(item =>
        item.itemType === "INPUT" ? preco.has(item.code) : custo.has(item.code)
      );
      if (!completa) continue;
      const soma = composicao.items.reduce((total, item) => total + item.unitCost * item.coefficient, 0);
      desvios.push(Math.abs(soma - composicao.unitCost) / composicao.unitCost);
    }
    expect(desvios.length).toBeGreaterThan(1_000);
    const fecham = desvios.filter(valor => valor <= 0.01).length;
    expect(fecham / desvios.length).toBeGreaterThan(0.95);
  }, 120_000);

  it("os dois regimes existem e dão custos diferentes na mesma composição", () => {
    const sem = new Map(semDesoneracao.compositions.map(item => [item.code, item.unitCost]));
    const divergentes = comDesoneracao.compositions.filter(item => {
      const outro = sem.get(item.code);
      return outro !== undefined && outro !== item.unitCost;
    });
    expect(divergentes.length).toBeGreaterThan(100);
  });

  it("a UF é coluna: mudar de estado muda o preço", () => {
    const acre = parseSinapiOfficialReferencePackage(pacote, {
      sourceUrl: origem,
      region: "AC",
      taxRelief: false
    });
    const emSp = new Map(semDesoneracao.inputs.map(item => [item.code, item.unitCost]));
    const diferentes = acre.inputs.filter(item => {
      const outro = emSp.get(item.code);
      return outro !== undefined && outro !== item.unitCost;
    });
    expect(diferentes.length).toBeGreaterThan(100);
  }, 120_000);
});
