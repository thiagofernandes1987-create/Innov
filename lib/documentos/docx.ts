// DOCX → Markdown.
//
// O responsável pediu importação de documento em 3 de agosto e mandou dois
// arquivos reais para o teste: um modelo de proposta que ele usa e um
// procedimento operacional. Os dois trouxeram o que documento de verdade tem e
// exemplo de manual não tem — tabela dentro de tabela, título de nível 9 usado
// como corpo, campo de formulário, numeração vinda de outro arquivo do pacote.
//
// **Sem dependência.** Um `.docx` é um ZIP com XML dentro; o navegador
// descomprime sozinho com `DecompressionStream("deflate-raw")` e o XML é lido
// pelo analisador de `xml.ts`. Trazer uma biblioteca de conversão para isto
// custaria mais em superfície do que o conversor inteiro.
//
// O que **não** é convertido, e por que isso é decisão e não esquecimento:
// imagem, caixa de texto, objeto incorporado e equação viram uma marca visível
// no texto. Modelo de documento é texto com variável; um logotipo colado no
// meio do Markdown não sobreviveria à conversão de volta para PDF, e sumir com
// ele em silêncio faria o autor descobrir a perda só na frente do cliente.

import { analisarXML, filhos, primeiro, todos, type NoXML } from "./xml";

export type PacoteDocx = {
  /** `word/document.xml`. */
  documento: string;
  /** `word/styles.xml`, se houver: é dele que sai o nível do título. */
  estilos?: string;
  /** `word/numbering.xml`, se houver: diz se a lista é numerada ou com marcador. */
  numeracao?: string;
  /** `word/_rels/document.xml.rels`, se houver: destino dos links. */
  relacoes?: string;
};

/**
 * Mapa de estilo → nível de título.
 *
 * A chave é o `w:name` do estilo, **não** o `w:styleId`: o id vem no idioma em
 * que o Word foi instalado — nos arquivos recebidos, "Ttulo1" — enquanto o nome
 * é sempre "heading 1". Casar pelo id funcionaria só em português.
 */
export function niveisDeTitulo(estilosXml?: string): Map<string, number> {
  const mapa = new Map<string, number>();
  if (!estilosXml) return mapa;
  for (const estilo of todos(analisarXML(estilosXml), "w:style")) {
    const id = estilo.atributos["w:styleId"];
    const nome = primeiro(estilo, "w:name")?.atributos["w:val"] ?? "";
    if (!id) continue;
    const m = /^heading\s*(\d+)$/i.exec(nome.trim());
    if (m) mapa.set(id, Math.min(6, Math.max(1, Number(m[1]))));
  }
  return mapa;
}

/** `numId` → é numerada? Vem de `numbering.xml`; sem ele, tudo vira marcador. */
export function listasNumeradas(numeracaoXml?: string): Map<string, boolean> {
  const mapa = new Map<string, boolean>();
  if (!numeracaoXml) return mapa;
  const raiz = analisarXML(numeracaoXml);
  const formatoDoAbstrato = new Map<string, boolean>();
  for (const abstrato of todos(raiz, "w:abstractNum")) {
    const id = abstrato.atributos["w:abstractNumId"];
    const primeiroNivel = filhos(abstrato, "w:lvl")[0];
    const formato = primeiroNivel ? primeiro(primeiroNivel, "w:numFmt")?.atributos["w:val"] : undefined;
    if (id) formatoDoAbstrato.set(id, Boolean(formato) && formato !== "bullet" && formato !== "none");
  }
  for (const num of todos(raiz, "w:num")) {
    const id = num.atributos["w:numId"];
    const abstrato = primeiro(num, "w:abstractNumId")?.atributos["w:val"];
    if (id) mapa.set(id, abstrato ? (formatoDoAbstrato.get(abstrato) ?? false) : false);
  }
  return mapa;
}

/** `rId` → destino externo, de `document.xml.rels`. */
export function destinosDeLink(relacoesXml?: string): Map<string, string> {
  const mapa = new Map<string, string>();
  if (!relacoesXml) return mapa;
  for (const rel of todos(analisarXML(relacoesXml), "Relationship")) {
    const id = rel.atributos.Id;
    const alvo = rel.atributos.Target;
    if (id && alvo && /^(https?:|mailto:)/i.test(alvo)) mapa.set(id, alvo);
  }
  return mapa;
}

/** Escapa o que o Markdown leria como marcação — o texto do Word é literal. */
function escapar(texto: string): string {
  return texto.replace(/([\\`*_[\]<>|])/g, "\\$1");
}

type Contexto = {
  titulos: Map<string, number>;
  numeradas: Map<string, boolean>;
  links: Map<string, string>;
};

type Trecho = { texto: string; negrito: boolean; italico: boolean; tachado: boolean; pronto?: string };

/**
 * Quebra os `w:r` em trechos com a formatação de cada um.
 *
 * O Word parte um mesmo trecho em vários runs por motivos que não são de
 * formatação — revisão, verificação ortográfica, id de sessão. "Descrição do
 * reforma", todo em negrito, chega em dois runs.
 */
function trechosDosRuns(pai: NoXML, ctx: Contexto): Trecho[] {
  const saida: Trecho[] = [];
  for (const no of pai.filhos) {
    if (no.nome === "w:hyperlink") {
      const dentro = emMarkdown(trechosDosRuns(no, ctx)).trim();
      const destino = ctx.links.get(no.atributos["r:id"] ?? "");
      if (dentro) {
        saida.push({
          texto: dentro,
          negrito: false,
          italico: false,
          tachado: false,
          pronto: destino ? `[${dentro}](${destino})` : dentro
        });
      }
      continue;
    }
    if (no.nome !== "w:r") {
      // `w:ins` (inserção controlada) e `w:sdt` (controle de conteúdo) envolvem
      // runs de verdade. Descer neles é o que faz texto revisado e campo de
      // formulário chegarem ao Markdown em vez de sumirem.
      if (no.nome === "w:ins" || no.nome === "w:sdt" || no.nome === "w:sdtContent" || no.nome === "w:smartTag") {
        saida.push(...trechosDosRuns(no, ctx));
      }
      continue;
    }

    const propriedades = filhos(no, "w:rPr")[0];
    const marcado = (nome: string) => {
      const marca = propriedades ? filhos(propriedades, nome)[0] : undefined;
      if (!marca) return false;
      const valor = marca.atributos["w:val"];
      return valor !== "0" && valor !== "false" && valor !== "none";
    };

    let bruto = "";
    for (const parte of no.filhos) {
      if (parte.nome === "w:t") bruto += parte.texto;
      else if (parte.nome === "w:tab") bruto += " ";
      else if (parte.nome === "w:br" || parte.nome === "w:cr") bruto += "\n";
      else if (parte.nome === "w:noBreakHyphen") bruto += "-";
      else if (parte.nome === "w:drawing" || parte.nome === "w:pict" || parte.nome === "w:object") {
        // Marca visível, nunca silêncio: quem importa precisa saber que havia
        // uma imagem ali para decidir o que fazer com ela.
        bruto += "[imagem não convertida]";
      }
    }
    if (!bruto) continue;
    saida.push({ texto: bruto, negrito: marcado("w:b"), italico: marcado("w:i"), tachado: marcado("w:strike") });
  }
  return saida;
}

/** Junta trechos vizinhos de mesma formatação e aplica a marcação uma vez só. */
function emMarkdown(trechos: Trecho[]): string {
  const juntos: Trecho[] = [];
  for (const t of trechos) {
    const ultimo = juntos[juntos.length - 1];
    if (
      ultimo &&
      !ultimo.pronto &&
      !t.pronto &&
      ultimo.negrito === t.negrito &&
      ultimo.italico === t.italico &&
      ultimo.tachado === t.tachado
    ) {
      ultimo.texto += t.texto;
      continue;
    }
    juntos.push({ ...t });
  }

  let saida = "";
  for (const t of juntos) {
    if (t.pronto) {
      saida += t.pronto;
      continue;
    }
    const texto = escapar(t.texto);
    const nucleo = texto.trim();
    if (!nucleo) {
      saida += texto;
      continue;
    }
    // O marcador tem de encostar no texto: `** x **` não vira negrito em
    // Markdown nenhum. O espaço das pontas fica de fora dele.
    const inicio = /^\s/.test(texto) ? " " : "";
    const fim = /\s$/.test(texto) ? " " : "";
    let marcado = nucleo;
    if (t.negrito) marcado = `**${marcado}**`;
    if (t.italico) marcado = `*${marcado}*`;
    if (t.tachado) marcado = `~~${marcado}~~`;
    saida += inicio + marcado + fim;
  }
  return saida;
}

/** Texto de uma sequência de `w:r`, com negrito e itálico aplicados. */
function corpoDosRuns(pai: NoXML, ctx: Contexto): string {
  return emMarkdown(trechosDosRuns(pai, ctx));
}

/** Um `w:p` vira uma linha de Markdown — ou string vazia, que vira parágrafo. */
function paragrafo(p: NoXML, ctx: Contexto): string {
  const pPr = filhos(p, "w:pPr")[0];
  const conteudo = corpoDosRuns(p, ctx).replace(/[ \t]+/g, " ").trim();
  if (!conteudo) return "";

  const estilo = pPr ? primeiro(pPr, "w:pStyle")?.atributos["w:val"] : undefined;
  const nivel = estilo ? ctx.titulos.get(estilo) : undefined;
  const numPr = pPr ? filhos(pPr, "w:numPr")[0] : undefined;

  if (numPr) {
    const recuo = Number(primeiro(numPr, "w:ilvl")?.atributos["w:val"] ?? 0);
    const numId = primeiro(numPr, "w:numId")?.atributos["w:val"] ?? "";
    const marcador = ctx.numeradas.get(numId) ? "1." : "-";
    return `${"  ".repeat(Math.min(4, recuo))}${marcador} ${conteudo}`;
  }

  if (nivel) return `${"#".repeat(nivel)} ${conteudo}`;
  return conteudo;
}

/** Uma tabela do Word vira tabela de Markdown, com a primeira linha de cabeçalho. */
function tabela(tbl: NoXML, ctx: Contexto): string {
  const linhas = filhos(tbl, "w:tr").map(tr =>
    filhos(tr, "w:tc").map(tc =>
      filhos(tc, "w:p")
        .map(p => corpoDosRuns(p, ctx).replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ")
      // A barra vertical já saiu escapada de `escapar`, que é onde todo o texto
      // do Word passa. Escapar de novo aqui produziria `\\|`, que aparece como
      // uma contrabarra na tela.
    )
  );
  if (linhas.length === 0) return "";

  const colunas = Math.max(...linhas.map(l => l.length));
  if (colunas === 0) return "";
  const completar = (l: string[]) => [...l, ...Array(colunas - l.length).fill("")];
  const [cabecalho, ...resto] = linhas;
  return [
    `| ${completar(cabecalho).join(" | ")} |`,
    `|${Array(colunas).fill("---").join("|")}|`,
    ...resto.map(l => `| ${completar(l).join(" | ")} |`)
  ].join("\n");
}

/**
 * Converte o pacote em Markdown.
 *
 * O `w:body` é percorrido em ordem: parágrafo, tabela e nada mais. Cabeçalho e
 * rodapé ficam de fora de propósito — no `.docx` de procedimento recebido, o
 * cabeçalho é o logotipo e o código do documento repetidos em toda página, e
 * trazê-los produziria a mesma linha dezenas de vezes no meio do texto.
 */
export function docxParaMarkdown(pacote: PacoteDocx): string {
  const ctx: Contexto = {
    titulos: niveisDeTitulo(pacote.estilos),
    numeradas: listasNumeradas(pacote.numeracao),
    links: destinosDeLink(pacote.relacoes)
  };

  const corpo = primeiro(analisarXML(pacote.documento), "w:body");
  if (!corpo) return "";

  const blocos: string[] = [];
  for (const no of corpo.filhos) {
    if (no.nome === "w:p") blocos.push(paragrafo(no, ctx));
    else if (no.nome === "w:tbl") blocos.push(tabela(no, ctx));
  }

  return blocos
    .join("\n\n")
    // Parágrafo vazio no Word é espaçamento, não estrutura: três linhas em
    // branco seguidas viram uma só.
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}
