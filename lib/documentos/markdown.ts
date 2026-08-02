// Markdown para HTML — subconjunto deliberado, para pré-visualização.
//
// Por que escrever em vez de instalar uma biblioteca:
//
//   - o repositório tem nove dependências de runtime, e cada uma nova é
//     superfície de ataque num produto que gera **contrato**;
//   - biblioteca de Markdown aceita HTML embutido por padrão, e desligar isso
//     depende de configuração que alguém desfaz sem perceber. Aqui não existe
//     caminho para HTML: tudo é escapado antes de qualquer marcação;
//   - o subconjunto que documento comercial usa é pequeno e conhecido.
//
// O que é suportado, e nada além disso: título de 1 a 4, parágrafo, negrito,
// itálico, código em linha, lista com marcador, lista numerada, citação, linha
// horizontal, tabela e link com destino `http`, `https` ou `mailto`.
//
// O que **não** é suportado, de propósito: HTML embutido, imagem por URL
// arbitrária, script, iframe, estilo. Documento não precisa e o risco não
// compensa.

/** Escapa tudo o que o navegador leria como marcação. */
export function escaparHTML(texto: string): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Só três esquemas passam. `javascript:` e `data:` ficam de fora — são os dois
 * caminhos clássicos para transformar link em execução.
 */
function destinoSeguro(url: string): string | null {
  const limpo = String(url ?? "").trim();
  if (!/^(https?:\/\/|mailto:)/i.test(limpo)) return null;
  if (/[\s<>"']/.test(limpo)) return null;
  return limpo;
}

/**
 * Marcação de trecho: negrito, itálico, código e link. Já sobre texto escapado.
 *
 * A ordem tem uma razão que um teste provou: **o caractere escapado com barra
 * invertida sai de cena antes de qualquer marcação e volta no fim**. A primeira
 * versão desfazia o escape depois, e um nome de cliente como `Obras ** Ltda` —
 * escapado corretamente por `escaparValor` — virava `<em></em>`, porque o par
 * de asteriscos escapados ainda casava com a regra de itálico. O teste "dado do
 * banco vira texto, nunca marcação" reprovou exatamente nisso.
 */
function inline(textoEscapado: string): string {
  let saida = textoEscapado;

  const escapados: string[] = [];
  saida = saida.replace(/\\([\\`*_{}[\]()#+\-.!<>|])/g, (_, caractere: string) => {
    escapados.push(caractere);
    return `\u0001E${escapados.length - 1}\u0001`;
  });

  // Código: dentro dele não se aplica negrito nem itálico.
  const codigos: string[] = [];
  saida = saida.replace(/`([^`]+)`/g, (_, conteudo: string) => {
    codigos.push(conteudo);
    return `\u0001C${codigos.length - 1}\u0001`;
  });

  saida = saida.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, rotulo: string, url: string) => {
    const destino = destinoSeguro(url);
    if (!destino) return rotulo; // link recusado vira texto, nunca some
    return `<a href="${destino}" rel="noopener noreferrer nofollow" target="_blank">${rotulo}</a>`;
  });

  saida = saida.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  saida = saida.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  saida = saida.replace(/\u0001C(\d+)\u0001/g, (_, i: string) => `<code>${codigos[Number(i)]}</code>`);
  // O caractere escapado volta como TEXTO, depois de toda a marcação aplicada:
  // é isso que faz o "**" do dado continuar sendo "**" na tela.
  saida = saida.replace(/\u0001E(\d+)\u0001/g, (_, i: string) => escapados[Number(i)]);
  return saida;
}

function linhaDeTabela(linha: string): string[] {
  return linha
    .replace(/^\||\|$/g, "")
    .split("|")
    .map(celula => celula.trim());
}

/**
 * Converte o corpo em HTML seguro.
 *
 * A ordem importa: **escapa primeiro, marca depois**. Fazer o contrário deixa
 * `<script>` do dado virar tag antes de ser escapado, que é como quase toda
 * falha desse tipo acontece.
 */
export function markdownParaHTML(corpo: string): string {
  const linhas = String(corpo ?? "").replace(/\r\n/g, "\n").split("\n");
  const saida: string[] = [];
  let paragrafo: string[] = [];
  let lista: { tipo: "ul" | "ol"; itens: string[] } | null = null;
  let citacao: string[] = [];

  function fecharParagrafo() {
    if (paragrafo.length === 0) return;
    saida.push(`<p>${inline(escaparHTML(paragrafo.join(" ")))}</p>`);
    paragrafo = [];
  }
  function fecharLista() {
    if (!lista) return;
    const itens = lista.itens.map(item => `<li>${inline(escaparHTML(item))}</li>`).join("");
    saida.push(`<${lista.tipo}>${itens}</${lista.tipo}>`);
    lista = null;
  }
  function fecharCitacao() {
    if (citacao.length === 0) return;
    saida.push(`<blockquote>${inline(escaparHTML(citacao.join(" ")))}</blockquote>`);
    citacao = [];
  }
  function fecharTudo() {
    fecharParagrafo();
    fecharLista();
    fecharCitacao();
  }

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const cru = linha.trim();

    if (cru === "") { fecharTudo(); continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(cru)) { fecharTudo(); saida.push("<hr />"); continue; }

    const titulo = /^(#{1,4})\s+(.*)$/.exec(cru);
    if (titulo) {
      fecharTudo();
      const nivel = titulo[1].length;
      saida.push(`<h${nivel}>${inline(escaparHTML(titulo[2]))}</h${nivel}>`);
      continue;
    }

    // Tabela: cabeçalho, separador e corpo. Só entra se a linha seguinte for o
    // separador — assim um texto com barra vertical não vira tabela por engano.
    if (cru.includes("|") && /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(linhas[i + 1] ?? "")) {
      fecharTudo();
      const cabecalho = linhaDeTabela(cru);
      const corpoLinhas: string[][] = [];
      i += 2;
      while (i < linhas.length && linhas[i].trim().includes("|")) {
        corpoLinhas.push(linhaDeTabela(linhas[i].trim()));
        i++;
      }
      i--;
      const th = cabecalho.map(c => `<th>${inline(escaparHTML(c))}</th>`).join("");
      const tr = corpoLinhas
        .map(celulas => `<tr>${celulas.map(c => `<td>${inline(escaparHTML(c))}</td>`).join("")}</tr>`)
        .join("");
      saida.push(`<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`);
      continue;
    }

    const citado = /^>\s?(.*)$/.exec(cru);
    if (citado) { fecharParagrafo(); fecharLista(); citacao.push(citado[1]); continue; }

    const marcador = /^[-*+]\s+(.*)$/.exec(cru);
    if (marcador) {
      fecharParagrafo(); fecharCitacao();
      if (!lista || lista.tipo !== "ul") { fecharLista(); lista = { tipo: "ul", itens: [] }; }
      lista.itens.push(marcador[1]);
      continue;
    }

    const numerado = /^\d+[.)]\s+(.*)$/.exec(cru);
    if (numerado) {
      fecharParagrafo(); fecharCitacao();
      if (!lista || lista.tipo !== "ol") { fecharLista(); lista = { tipo: "ol", itens: [] }; }
      lista.itens.push(numerado[1]);
      continue;
    }

    fecharLista(); fecharCitacao();
    paragrafo.push(cru);
  }

  fecharTudo();
  return saida.join("\n");
}
