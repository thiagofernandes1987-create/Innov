// Texto de dentro de um PDF, sem dependência nova e sem binário externo.
//
// T-37.13c. O CUB de Minas — e o de vários outros estados — é publicado em PDF
// mensal, não em planilha. O contêiner de desenvolvimento tem `pdftotext`; a
// Vercel **não tem**, e um leitor que só funciona na máquina de quem escreveu
// é um leitor que falha na primeira execução agendada. Por isso a extração é
// feita aqui, em Node puro, com `zlib` da biblioteca padrão.
//
// Medido no `composicao_cub_julho_26.pdf` do Sinduscon-MG (97.894 bytes,
// SHA-256 `9ae6efe8…` no arquivo irmão da tabela): fontes **Type1** com
// **WinAnsiEncoding** e **nenhum `/ToUnicode`**. É o caso simples do formato —
// sem CID, sem CMap embutido —, e é o que torna este módulo pequeno o
// suficiente para existir. Um PDF com fonte Type0/Identity-H **não** é lido
// aqui: a função devolve o que conseguiu e quem chama confere o que esperava
// encontrar. Devolver texto parcial em silêncio seria pior que falhar.
//
// O que este módulo **não** é: um renderizador. Ele não reconstrói colunas nem
// posição na página — devolve os pedaços de texto na ordem em que aparecem no
// fluxo de conteúdo. Para uma tabela cujo layout importa, quem chama precisa
// ancorar em rótulos, não em coordenadas.

import zlib from "node:zlib";

export type LimitesDePdf = {
  /** Tamanho máximo do arquivo aceito, em bytes. */
  bytesDoArquivo: number;
  /** Tamanho máximo de um fluxo depois de descomprimido, em bytes. */
  bytesPorFluxo: number;
  /** Quantos fluxos abrir, no máximo. */
  fluxos: number;
};

/**
 * Folgado para um PDF de tabela mensal e apertado para um zip bomb.
 *
 * O CUB de Minas tem 98 KB e um fluxo de texto. Vinte megabytes de arquivo e
 * quarenta de expansão por fluxo cobrem publicações muito maiores sem deixar
 * um arquivo malicioso consumir a memória do processo — é a mesma preocupação
 * de `lib/planilhas/xlsx.ts`, com outro formato.
 */
export const LIMITES_PDF: LimitesDePdf = {
  bytesDoArquivo: 20 * 1024 * 1024,
  bytesPorFluxo: 40 * 1024 * 1024,
  fluxos: 512
};

export class PdfIlegivelError extends Error {
  constructor(
    public readonly codigo:
      | "NAO_E_PDF"
      | "ARQUIVO_GRANDE_DEMAIS"
      | "FLUXO_GRANDE_DEMAIS"
      | "SEM_TEXTO",
    mensagem: string
  ) {
    super(mensagem);
    this.name = "PdfIlegivelError";
  }
}

/**
 * ASCII85 do PDF, que difere do padrão em dois pontos que importam.
 *
 * `z` abrevia quatro zeros e só vale fora de um grupo; e o grupo final,
 * incompleto, é preenchido com `u` (84) e devolve um byte a menos que o número
 * de dígitos. Errar o preenchimento corrompe os últimos caracteres de cada
 * fluxo — que num PDF de tabela é justamente onde costuma estar o rodapé com a
 * data de emissão.
 */
export function decodificarAscii85(texto: string): Buffer {
  const limpo = texto.replace(/\s/g, "").replace(/^<~/, "");
  const fim = limpo.indexOf("~>");
  const corpo = fim >= 0 ? limpo.slice(0, fim) : limpo;

  const saida: number[] = [];
  let grupo: number[] = [];
  for (const caractere of corpo) {
    if (caractere === "z" && grupo.length === 0) {
      saida.push(0, 0, 0, 0);
      continue;
    }
    const digito = caractere.charCodeAt(0) - 33;
    if (digito < 0 || digito > 84) continue;
    grupo.push(digito);
    if (grupo.length === 5) {
      let valor = 0;
      for (const parte of grupo) valor = valor * 85 + parte;
      saida.push((valor >>> 24) & 255, (valor >>> 16) & 255, (valor >>> 8) & 255, valor & 255);
      grupo = [];
    }
  }
  if (grupo.length > 1) {
    const digitos = grupo.length;
    while (grupo.length < 5) grupo.push(84);
    let valor = 0;
    for (const parte of grupo) valor = valor * 85 + parte;
    const bytes = [(valor >>> 24) & 255, (valor >>> 16) & 255, (valor >>> 8) & 255, valor & 255];
    saida.push(...bytes.slice(0, digitos - 1));
  }
  return Buffer.from(saida);
}

/**
 * As sequências de escape de uma string literal de PDF.
 *
 * `\347` é `ç` e `\262` é `²` em WinAnsiEncoding — sem isto, "Composição" vira
 * "Composi\347\343o" e nenhuma âncora de rótulo casa.
 */
function desescapar(bruto: string): string {
  return bruto.replace(/\\(\d{1,3}|n|r|t|b|f|\(|\)|\\)/g, (_, escape: string) => {
    if (/^\d+$/.test(escape)) return String.fromCharCode(parseInt(escape, 8));
    const tabela: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };
    return tabela[escape] ?? escape;
  });
}

/** As strings literais de um fluxo de conteúdo, na ordem do fluxo. */
function textoDoFluxo(conteudo: string): string[] {
  if (!/\bTj\b|\bTJ\b/.test(conteudo)) return [];
  const pedacos: string[] = [];
  // Literal de PDF: parênteses balanceados, com `\(` e `\)` escapados.
  const literais = conteudo.match(/\((?:\\.|[^()\\])*\)/g) ?? [];
  for (const literal of literais) {
    const texto = desescapar(literal.slice(1, -1));
    if (texto) pedacos.push(texto);
  }
  return pedacos;
}

function descomprimir(bruto: Buffer, limites: LimitesDePdf): Buffer | null {
  try {
    const saida = zlib.inflateSync(bruto, { maxOutputLength: limites.bytesPorFluxo });
    return Buffer.from(saida);
  } catch {
    return null;
  }
}

export type TextoDePdf = {
  /** Os pedaços de texto, na ordem do fluxo de conteúdo. */
  pedacos: string[];
  /** Tudo junto, separado por espaço — bom para procurar âncora. */
  texto: string;
  /** Quantos fluxos de conteúdo renderam texto. */
  fluxosLidos: number;
};

/**
 * O texto de um PDF.
 *
 * Aceita fluxo cru, só `FlateDecode`, só `ASCII85Decode` e os dois encadeados,
 * que é o que o Sinduscon-MG publica. Fluxo que não abre é **pulado**, não
 * fatal: um PDF costuma ter fluxos de imagem e de metadado que nada têm a ver
 * com o texto, e abortar por causa deles recusaria arquivos legítimos.
 *
 * Nenhum texto em arquivo nenhum, aí sim, é erro: significa que o PDF é
 * digitalizado, ou usa fonte que este módulo não lê, e seguir com string vazia
 * faria o leitor de cima concluir "a publicação não traz o R8-N" quando a
 * verdade é "não consegui ler a publicação".
 */
export function lerTextoDoPdf(arquivo: Buffer, limites: LimitesDePdf = LIMITES_PDF): TextoDePdf {
  if (arquivo.length > limites.bytesDoArquivo) {
    throw new PdfIlegivelError(
      "ARQUIVO_GRANDE_DEMAIS",
      `O PDF tem ${arquivo.length} bytes e o limite é ${limites.bytesDoArquivo}.`
    );
  }
  if (arquivo.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new PdfIlegivelError("NAO_E_PDF", "O arquivo baixado não é um PDF.");
  }

  const bruto = arquivo.toString("latin1");
  const pedacos: string[] = [];
  let fluxosLidos = 0;
  let fluxosAbertos = 0;

  const inicio = /stream\r?\n/g;
  let marca: RegExpExecArray | null;
  while ((marca = inicio.exec(bruto)) !== null) {
    if (fluxosAbertos >= limites.fluxos) break;
    fluxosAbertos += 1;

    const abre = marca.index + marca[0].length;
    const fecha = bruto.indexOf("endstream", abre);
    if (fecha < 0) break;

    const conteudoBruto = bruto.slice(abre, fecha);
    const candidatos: string[] = [];

    // 1. Cru. 2. Só Flate. 3. ASCII85 e depois Flate. 4. Só ASCII85.
    candidatos.push(conteudoBruto);
    const soFlate = descomprimir(Buffer.from(conteudoBruto, "latin1"), limites);
    if (soFlate) candidatos.push(soFlate.toString("latin1"));
    const ascii85 = decodificarAscii85(conteudoBruto);
    if (ascii85.length) {
      candidatos.push(ascii85.toString("latin1"));
      const encadeado = descomprimir(ascii85, limites);
      if (encadeado) candidatos.push(encadeado.toString("latin1"));
    }

    for (const candidato of candidatos) {
      const achados = textoDoFluxo(candidato);
      if (achados.length) {
        pedacos.push(...achados);
        fluxosLidos += 1;
        break;
      }
    }
  }

  if (!pedacos.length) {
    throw new PdfIlegivelError(
      "SEM_TEXTO",
      "O PDF não trouxe texto legível — pode ser digitalizado ou usar fonte não suportada."
    );
  }

  return { pedacos, texto: pedacos.join(" "), fluxosLidos };
}
