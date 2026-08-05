// Importação de arquivo para Markdown.
//
// Pedido do responsável em 3 de agosto: "mando um arquivo em doc, ou docx e
// converto o arquivo em Markdown… o mesmo para xls, csv, PDF". Esta é a parte
// que dá para fazer **sem dependência**, e o que não dá é recusado com o motivo
// escrito, não com um resultado ruim.
//
//   .docx  ZIP + XML. Convertido aqui.
//   .xlsx  ZIP + XML. Convertido aqui, uma tabela por planilha.
//   .csv   texto. Convertido aqui, com aspas e separador detectado.
//   .md    passa direto.
//   .txt   passa direto, com parágrafos preservados.
//   .doc   formato binário de 1997, sem relação com o .docx. Recusado.
//   .xls   idem.
//   .pdf   recusado: extrair texto de PDF exige interpretar fluxo de conteúdo,
//          fontes e codificação — é o único da lista que pediria biblioteca.
//
// Recusar dizendo o quê e o porquê é melhor do que aceitar e entregar um texto
// embaralhado: quem recebe "converta para .docx e tente de novo" resolve em um
// minuto; quem recebe salada de caracteres não sabe nem que houve perda.

import { docxParaMarkdown } from "./docx";
import { lerZip, lerZipComoTexto, ZipInvalido } from "./zip";
import { analisarXML, primeiro, todos } from "./xml";

export type ResultadoDaImportacao =
  | { ok: true; markdown: string; aviso?: string }
  | { ok: false; motivo: string };

const EXTENSAO = /\.([a-z0-9]+)$/i;

export function extensaoDe(nome: string): string {
  return (EXTENSAO.exec(nome)?.[1] ?? "").toLowerCase();
}

/** Divide uma linha de CSV respeitando aspas. */
export function celulasDaLinha(linha: string, separador: string): string[] {
  const celulas: string[] = [];
  let atual = "";
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else dentroDeAspas = false;
      } else atual += c;
      continue;
    }
    if (c === '"') dentroDeAspas = true;
    else if (c === separador) {
      celulas.push(atual);
      atual = "";
    } else atual += c;
  }
  celulas.push(atual);
  return celulas.map(c => c.trim());
}

/**
 * Separador detectado, não presumido.
 *
 * Planilha exportada no Brasil quase sempre sai com ponto e vírgula, porque a
 * vírgula é o separador decimal. Presumir vírgula transforma "1.234,56" em duas
 * colunas — e a tabela inteira sai torta sem ninguém entender por quê.
 */
export function separadorDoCsv(texto: string): string {
  const amostra = texto.split(/\r?\n/).slice(0, 10).join("\n");
  const candidatos = [";", ",", "\t", "|"];
  let melhor = ",";
  let maior = 0;
  for (const c of candidatos) {
    const fora = amostra.split('"').filter((_, i) => i % 2 === 0).join("");
    const quantas = fora.split(c).length - 1;
    if (quantas > maior) {
      maior = quantas;
      melhor = c;
    }
  }
  return melhor;
}

export function csvParaMarkdown(texto: string): string {
  const limpo = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (!limpo) return "";
  const separador = separadorDoCsv(limpo);
  const linhas = limpo.split("\n").filter(l => l.trim() !== "");
  const grade = linhas.map(l => celulasDaLinha(l, separador).map(c => c.replace(/\|/g, "\\|")));
  const colunas = Math.max(...grade.map(l => l.length));
  const completar = (l: string[]) => [...l, ...Array(colunas - l.length).fill("")];
  const [cabecalho, ...resto] = grade;
  return [
    `| ${completar(cabecalho).join(" | ")} |`,
    `|${Array(colunas).fill("---").join("|")}|`,
    ...resto.map(l => `| ${completar(l).join(" | ")} |`)
  ].join("\n");
}

/** Referência de célula (`B12`) para índice de coluna, base zero. */
export function colunaDaReferencia(referencia: string): number {
  const letras = /^([A-Z]+)/.exec(referencia.toUpperCase())?.[1] ?? "A";
  let n = 0;
  for (const letra of letras) n = n * 26 + (letra.charCodeAt(0) - 64);
  return n - 1;
}

/** Uma planilha do XLSX vira uma tabela de Markdown. */
export function planilhaParaMarkdown(sheetXml: string, textosCompartilhados: string[]): string {
  const grade: string[][] = [];
  for (const linha of todos(analisarXML(sheetXml), "row")) {
    const celulas: string[] = [];
    for (const c of linha.filhos.filter(f => f.nome === "c")) {
      const indice = colunaDaReferencia(c.atributos.r ?? "A");
      const valor = primeiro(c, "v")?.texto ?? "";
      // `t="s"` é índice na tabela de textos compartilhados; `t="inlineStr"`
      // guarda o texto no próprio nó.
      const texto =
        c.atributos.t === "s"
          ? textosCompartilhados[Number(valor)] ?? ""
          : c.atributos.t === "inlineStr"
            ? primeiro(c, "t")?.texto ?? ""
            : valor;
      while (celulas.length < indice) celulas.push("");
      celulas[indice] = texto.replace(/\|/g, "\\|").trim();
    }
    if (celulas.some(c => c !== "")) grade.push(celulas);
  }
  if (grade.length === 0) return "";
  const colunas = Math.max(...grade.map(l => l.length));
  const completar = (l: string[]) => [...l, ...Array(colunas - l.length).fill("")].map(c => c ?? "");
  const [cabecalho, ...resto] = grade;
  return [
    `| ${completar(cabecalho).join(" | ")} |`,
    `|${Array(colunas).fill("---").join("|")}|`,
    ...resto.map(l => `| ${completar(l).join(" | ")} |`)
  ].join("\n");
}

const RECUSAS: Record<string, string> = {
  doc: "O `.doc` é o formato binário do Word até 2003 e não tem relação com o `.docx`. Abra no Word e salve como `.docx`.",
  xls: "O `.xls` é o formato binário do Excel até 2003. Abra no Excel e salve como `.xlsx` ou exporte em CSV.",
  pdf: "Extrair texto de PDF exige interpretar fluxo de conteúdo, fonte e codificação — é o único formato desta lista que pediria uma biblioteca. Se o PDF veio de um Word, importe o `.docx` de origem.",
  rtf: "O `.rtf` não é convertido. Abra no editor de texto e salve como `.docx`.",
  odt: "O `.odt` é do LibreOffice. Salve como `.docx` para importar."
};

/**
 * Converte o arquivo para Markdown.
 *
 * Devolve resultado, nunca lança: o chamador é um editor, e um erro não
 * tratado no meio de uma importação apagaria o que estava escrito.
 */
export async function importarParaMarkdown(
  nome: string,
  bytes: ArrayBuffer | Uint8Array
): Promise<ResultadoDaImportacao> {
  const extensao = extensaoDe(nome);
  const recusa = RECUSAS[extensao];
  if (recusa) return { ok: false, motivo: recusa };

  const dados = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  try {
    if (extensao === "docx") {
      const partes = await lerZipComoTexto(dados, [
        "word/document.xml",
        "word/styles.xml",
        "word/numbering.xml",
        "word/_rels/document.xml.rels"
      ]);
      const documento = partes["word/document.xml"];
      if (!documento) return { ok: false, motivo: "Este `.docx` não tem corpo de documento legível." };
      const markdown = docxParaMarkdown({
        documento,
        estilos: partes["word/styles.xml"],
        numeracao: partes["word/numbering.xml"],
        relacoes: partes["word/_rels/document.xml.rels"]
      });
      const imagens = (markdown.match(/\\\[imagem não convertida\\\]/g) ?? []).length;
      return {
        ok: true,
        markdown,
        aviso: imagens
          ? `${imagens} imagem(ns) do documento não vieram: o modelo guarda texto e variáveis. Cada uma virou uma marca visível no corpo, para você decidir o que fazer.`
          : undefined
      };
    }

    if (extensao === "xlsx") {
      const arquivos = await lerZip(dados, n => n === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
      const decodificador = new TextDecoder("utf-8");
      const compartilhadosXml = arquivos.get("xl/sharedStrings.xml");
      const compartilhados = compartilhadosXml
        ? todos(analisarXML(decodificador.decode(compartilhadosXml)), "si").map(si =>
            todos(si, "t")
              .map(t => t.texto)
              .join("")
          )
        : [];
      const planilhas = [...arquivos.keys()]
        .filter(n => n.startsWith("xl/worksheets/"))
        .sort();
      if (planilhas.length === 0) return { ok: false, motivo: "Esta planilha não tem abas legíveis." };
      const blocos = planilhas
        .map(n => planilhaParaMarkdown(decodificador.decode(arquivos.get(n)!), compartilhados))
        .filter(Boolean);
      return {
        ok: true,
        markdown: blocos.join("\n\n"),
        aviso:
          blocos.length > 1
            ? `A planilha tem ${blocos.length} abas, e cada uma virou uma tabela.`
            : "Fórmulas viraram o último valor calculado, que é o que o Excel gravou no arquivo."
      };
    }

    const texto = new TextDecoder("utf-8").decode(dados);
    if (extensao === "csv" || extensao === "tsv") return { ok: true, markdown: csvParaMarkdown(texto) };
    if (extensao === "md" || extensao === "markdown") return { ok: true, markdown: texto.replace(/\r\n/g, "\n") };
    if (extensao === "txt") {
      return { ok: true, markdown: texto.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() };
    }
    return { ok: false, motivo: `Não sei converter arquivos \`.${extensao || "sem extensão"}\`. Use DOCX, XLSX, CSV, TXT ou Markdown.` };
  } catch (erro) {
    if (erro instanceof ZipInvalido) return { ok: false, motivo: erro.message };
    return { ok: false, motivo: "Não foi possível ler este arquivo. Ele pode estar corrompido." };
  }
}
