// Operações de edição de Markdown — puras, para poderem ser testadas.
//
// A barra de ferramentas não manipula o textarea diretamente: ela pede a estas
// funções o novo texto e a nova seleção. Assim o comportamento de "negrito"
// tem teste, e não depende de abrir o navegador para saber se funciona.
//
// A regra que rege todas: **a ação é reversível pelo mesmo botão**. Selecionar
// um trecho já em negrito e clicar em negrito tira o negrito. É o que Word,
// Google Docs e todo editor de Markdown fazem, e o que o usuário espera sem
// precisar aprender.

export type Selecao = { inicio: number; fim: number };
export type Edicao = { texto: string; selecao: Selecao };

/**
 * Envolve a seleção com um marcador, ou remove se já estiver envolvida.
 *
 * Sem seleção, insere o par e deixa o cursor no meio — digitar em seguida já
 * escreve dentro do negrito, que é o que se espera ao clicar no botão sem ter
 * selecionado nada.
 */
export function envolver(texto: string, selecao: Selecao, marcador: string, marcadorFim = marcador): Edicao {
  const antes = texto.slice(0, selecao.inicio);
  const meio = texto.slice(selecao.inicio, selecao.fim);
  const depois = texto.slice(selecao.fim);

  const jaEnvolvidoPorFora =
    antes.endsWith(marcador) && depois.startsWith(marcadorFim);
  if (jaEnvolvidoPorFora) {
    const novo = antes.slice(0, -marcador.length) + meio + depois.slice(marcadorFim.length);
    return {
      texto: novo,
      selecao: { inicio: selecao.inicio - marcador.length, fim: selecao.fim - marcador.length }
    };
  }

  const jaEnvolvidoPorDentro =
    meio.length >= marcador.length + marcadorFim.length &&
    meio.startsWith(marcador) &&
    meio.endsWith(marcadorFim);
  if (jaEnvolvidoPorDentro) {
    const limpo = meio.slice(marcador.length, meio.length - marcadorFim.length);
    return {
      texto: antes + limpo + depois,
      selecao: { inicio: selecao.inicio, fim: selecao.inicio + limpo.length }
    };
  }

  const novo = `${antes}${marcador}${meio}${marcadorFim}${depois}`;
  return {
    texto: novo,
    selecao: meio
      ? { inicio: selecao.inicio + marcador.length, fim: selecao.fim + marcador.length }
      : { inicio: selecao.inicio + marcador.length, fim: selecao.inicio + marcador.length }
  };
}

/** Limites da linha que contém `posicao`. */
function limitesDaLinha(texto: string, posicao: number): Selecao {
  const inicio = texto.lastIndexOf("\n", Math.max(0, posicao - 1)) + 1;
  const fimBruto = texto.indexOf("\n", posicao);
  return { inicio, fim: fimBruto === -1 ? texto.length : fimBruto };
}

/**
 * Aplica prefixo às linhas da seleção, ou remove se todas já o tiverem.
 *
 * Serve para título, citação e lista. Trabalhar por linha e não por seleção é o
 * que faz "lista" transformar três linhas selecionadas em três itens em vez de
 * um item com quebras dentro.
 */
export function prefixarLinhas(texto: string, selecao: Selecao, prefixo: string): Edicao {
  const primeira = limitesDaLinha(texto, selecao.inicio);
  const ultima = limitesDaLinha(texto, selecao.fim);
  const bloco = texto.slice(primeira.inicio, ultima.fim);
  const linhas = bloco.split("\n");

  const todasTem = linhas.every(linha => linha.trimStart().startsWith(prefixo));
  const novas = linhas.map(linha => {
    if (todasTem) {
      const corte = linha.indexOf(prefixo);
      return linha.slice(0, corte) + linha.slice(corte + prefixo.length);
    }
    return prefixo + linha;
  });

  const novoBloco = novas.join("\n");
  const diferenca = novoBloco.length - bloco.length;
  return {
    texto: texto.slice(0, primeira.inicio) + novoBloco + texto.slice(ultima.fim),
    selecao: { inicio: primeira.inicio, fim: ultima.fim + diferenca }
  };
}

/** Lista numerada: o prefixo muda a cada linha, então tem regra própria. */
export function numerarLinhas(texto: string, selecao: Selecao): Edicao {
  const primeira = limitesDaLinha(texto, selecao.inicio);
  const ultima = limitesDaLinha(texto, selecao.fim);
  const linhas = texto.slice(primeira.inicio, ultima.fim).split("\n");
  const todasNumeradas = linhas.every(linha => /^\s*\d+[.)]\s/.test(linha));
  const novas = linhas.map((linha, indice) =>
    todasNumeradas ? linha.replace(/^(\s*)\d+[.)]\s/, "$1") : `${indice + 1}. ${linha}`
  );
  const novoBloco = novas.join("\n");
  const bloco = texto.slice(primeira.inicio, ultima.fim);
  return {
    texto: texto.slice(0, primeira.inicio) + novoBloco + texto.slice(ultima.fim),
    selecao: { inicio: primeira.inicio, fim: ultima.fim + (novoBloco.length - bloco.length) }
  };
}

/** Insere texto na posição, substituindo a seleção. */
export function inserir(texto: string, selecao: Selecao, conteudo: string): Edicao {
  const novo = texto.slice(0, selecao.inicio) + conteudo + texto.slice(selecao.fim);
  const ponto = selecao.inicio + conteudo.length;
  return { texto: novo, selecao: { inicio: ponto, fim: ponto } };
}

/** Link: usa a seleção como rótulo e deixa o cursor no destino. */
export function inserirLink(texto: string, selecao: Selecao, destino = "https://"): Edicao {
  const rotulo = texto.slice(selecao.inicio, selecao.fim) || "texto do link";
  const conteudo = `[${rotulo}](${destino})`;
  const novo = texto.slice(0, selecao.inicio) + conteudo + texto.slice(selecao.fim);
  const inicioDestino = selecao.inicio + rotulo.length + 3;
  return { texto: novo, selecao: { inicio: inicioDestino, fim: inicioDestino + destino.length } };
}

/** Tabela com cabeçalho, no formato que o renderizador reconhece. */
export function inserirTabela(texto: string, selecao: Selecao, colunas = 3, linhas = 2): Edicao {
  const cabecalho = `| ${Array.from({ length: colunas }, (_, i) => `Coluna ${i + 1}`).join(" | ")} |`;
  const separador = `|${Array.from({ length: colunas }, () => "---").join("|")}|`;
  const corpo = Array.from(
    { length: linhas },
    () => `| ${Array.from({ length: colunas }, () => " ").join("| ")}|`
  ).join("\n");
  const precisaQuebra = selecao.inicio > 0 && texto[selecao.inicio - 1] !== "\n";
  return inserir(texto, selecao, `${precisaQuebra ? "\n\n" : ""}${cabecalho}\n${separador}\n${corpo}\n`);
}

/** Contagem de palavras, no critério que barra de status usa. */
export function contarPalavras(texto: string): number {
  const limpo = String(texto ?? "").trim();
  if (!limpo) return 0;
  return limpo.split(/\s+/).length;
}

/** Linha e coluna de uma posição, ambas começando em 1, como todo editor. */
export function linhaEColuna(texto: string, posicao: number): { linha: number; coluna: number } {
  const ate = String(texto ?? "").slice(0, Math.max(0, posicao));
  const linhas = ate.split("\n");
  return { linha: linhas.length, coluna: linhas[linhas.length - 1].length + 1 };
}
