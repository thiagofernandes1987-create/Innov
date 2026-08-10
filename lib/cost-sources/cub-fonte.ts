import "server-only";

// De onde a série histórica do CUB vem, e como ela chega até o leitor.
//
// T-37.14. A T-37.4 semeou as dezenove tipologias à mão, a partir do arquivo
// oficial. Sem este módulo, o mês seguinte deixaria **dezoito paradas e uma
// avançando**: o caminho agendado lê a notícia mensal, e a notícia publica só o
// R8-N. Catálogo em que uma linha anda e as outras não é pior que catálogo
// velho — a comparação entre tipologias passa a misturar competências, e nada
// na tela diz isso.
//
// O endereço do arquivo **muda todo mês** (`/2026/08/Cub-Serie-Historica-
// Julho-26.xlsx`), então ele é descoberto na página oficial em vez de fixado.
// Fixar significaria buscar o arquivo do mês passado para sempre, com a
// aparência de estar funcionando.

import { lerSerieHistoricaDoCub, type SerieHistoricaLida } from "./cub-serie-historica";
import { parseWorkbook } from "../planilhas/xlsx";

export const PAGINA_DO_CUB = "https://sindusconsp.com.br/servicos/cub/";
const MAX_BYTES = 40 * 1024 * 1024;
const TEMPO_LIMITE_MS = 60_000;

function falhar(mensagem: string): never {
  throw new Error(`CUB_FONTE: ${mensagem}`);
}

/**
 * O link da série histórica dentro da página do CUB.
 *
 * Aceita **apenas** `.xlsx` no domínio oficial. Um link para outro domínio, ou
 * para outro tipo de arquivo, é recusado em vez de baixado: a página é HTML de
 * terceiro, e seguir o que ela mandar sem conferir é seguir quem editar a
 * página.
 */
export function encontrarLinkDaSerie(html: string): string | null {
  for (const achado of html.matchAll(/href="([^"]+\.xlsx)"/gi)) {
    const bruto = achado[1];
    const url = bruto.startsWith("http") ? bruto : `https://sindusconsp.com.br${bruto}`;
    let alvo: URL;
    try {
      alvo = new URL(url);
    } catch {
      continue;
    }
    if (alvo.protocol !== "https:") continue;
    const dominio = alvo.hostname.toLowerCase();
    if (dominio !== "sindusconsp.com.br" && !dominio.endsWith(".sindusconsp.com.br")) continue;
    // O nome do arquivo carrega "serie" e "historica" — em qualquer acentuação,
    // porque a página já escreveu das duas formas.
    const nome = decodeURIComponent(alvo.pathname)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    if (!nome.includes("serie") || !nome.includes("historica")) continue;
    return alvo.toString();
  }
  return null;
}

async function baixar(url: string, aceita: "text" | "binary") {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(url, { signal: controle.signal, redirect: "follow" });
    if (!resposta.ok) falhar(`${url} respondeu ${resposta.status}.`);
    const destino = new URL(resposta.url);
    if (!destino.hostname.toLowerCase().endsWith("sindusconsp.com.br")) {
      falhar("o download saiu do domínio oficial depois de redirecionar.");
    }
    const tamanho = Number(resposta.headers.get("content-length") ?? 0);
    if (tamanho > MAX_BYTES) falhar(`o arquivo declara ${tamanho} bytes, acima do limite.`);
    if (aceita === "text") return await resposta.text();
    const bytes = Buffer.from(await resposta.arrayBuffer());
    if (bytes.length > MAX_BYTES) falhar(`o arquivo tem ${bytes.length} bytes, acima do limite.`);
    return bytes;
  } finally {
    clearTimeout(relogio);
  }
}

export type SerieBaixada = SerieHistoricaLida & {
  sourceUrl: string;
  /** SHA-256 do arquivo, para o instantâneo poder citar o que foi lido. */
  arquivoSha256: string;
  bytes: number;
};

/** Baixa e lê a série histórica publicada hoje. */
export async function buscarSerieHistoricaDoCub(): Promise<SerieBaixada> {
  const html = (await baixar(PAGINA_DO_CUB, "text")) as string;
  const link = encontrarLinkDaSerie(html);
  if (!link) falhar("a página do CUB não expõe o link da série histórica.");

  const arquivo = (await baixar(link, "binary")) as Buffer;
  const { createHash } = await import("node:crypto");
  const arquivoSha256 = createHash("sha256").update(arquivo).digest("hex");

  const abas = parseWorkbook(arquivo);
  // A planilha tem uma aba só. Procurar pelo nome seria frágil — ele já foi
  // "CUB" e pode virar outra coisa —, e a estrutura é conferida logo abaixo,
  // pelo leitor, que recusa o que não reconhece.
  const aba = abas.find(item => item.rows.length > 100) ?? abas[0];
  if (!aba) falhar("a planilha não tem aba legível.");

  const lida = lerSerieHistoricaDoCub(aba.rows);
  return { ...lida, sourceUrl: link, arquivoSha256, bytes: arquivo.length };
}
