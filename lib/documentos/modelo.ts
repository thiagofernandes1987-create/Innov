// Motor de documento por modelo: corpo em Markdown + substituição de variáveis.
//
// Aprovado pelo responsável em 2 de agosto: "comece pelo corpo, variáveis e
// pré-visualização (…) Markdown e a substituição de variáveis; PDF, DOCX e HTML
// de e-mail são conversão a partir dele".
//
// É infraestrutura de sete módulos — propostas, orçamentos, contratos, aditivos,
// FVS e FVM da qualidade, mensagens padrão e resposta do SAC. O que se decide
// aqui é decidido para todos eles.
//
// Três garantias inegociáveis, e as três estão em teste:
//
//   1. **Substituição, nunca execução.** Sem expressão, sem laço, sem chamada.
//      Modelo é dado. Dado que executa é o caminho mais curto para alguém
//      extrair o que não pode ver.
//   2. **Variável não resolvida aparece.** Nunca vira string vazia silenciosa.
//      Contrato assinado com um buraco em branco onde deveria estar o valor é
//      pior que documento que não gerou.
//   3. **O que entra como dado nunca vira marcação.** Nome de cliente com `**`
//      ou `<script>` é texto, não negrito nem script.

export type Lacuna = {
  variavel: string;
  /** Onde aparece no corpo, para a tela apontar. */
  posicao: number;
  motivo: "desconhecida" | "vazia";
};

export type Resultado = {
  /** Markdown com as variáveis já resolvidas. */
  texto: string;
  lacunas: Lacuna[];
};

export type Dicionario = Record<string, string | number | null | undefined>;

// `{{ alguma.coisa }}` — espaço em volta é tolerado porque quem cola de um
// documento antigo cola com espaço.
const MARCADOR = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;

/**
 * Normaliza o nome da variável.
 *
 * O responsável escreveu `{{Cliente_Nome_Completo}}`; o vocabulário fixado é
 * `{{cliente.nome_completo}}`. As duas formas resolvem para a mesma chave, para
 * que documento já escrito continue funcionando — o primeiro sublinhado separa
 * escopo de campo, os demais fazem parte do nome do campo.
 */
export function normalizarNome(nome: string): string {
  const bruto = String(nome ?? "").trim().toLowerCase();
  if (!bruto) return "";
  if (bruto.includes(".")) return bruto;
  const corte = bruto.indexOf("_");
  if (corte <= 0) return bruto;
  return `${bruto.slice(0, corte)}.${bruto.slice(corte + 1)}`;
}

/** Todas as variáveis citadas no corpo, sem repetição e na ordem em que aparecem. */
export function extrairVariaveis(corpo: string): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const achado of String(corpo ?? "").matchAll(MARCADOR)) {
    const nome = normalizarNome(achado[1]);
    if (!nome || vistos.has(nome)) continue;
    vistos.add(nome);
    saida.push(nome);
  }
  return saida;
}

/**
 * Escapa o que é marcação de Markdown, para dado virar texto.
 *
 * Sem isto, um cliente chamado `Obras ** Ltda` quebraria o negrito do documento
 * inteiro, e um valor com `<script>` viraria script na pré-visualização. O dado
 * do banco não é confiável como marcação — nem por má-fé, apenas porque nome de
 * empresa tem asterisco e endereço tem colchete.
 */
export function escaparValor(valor: string): string {
  return String(valor ?? "").replace(/([\\`*_{}[\]()#+\-.!<>|])/g, "\\$1");
}

function textoDoValor(valor: string | number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = typeof valor === "number" ? String(valor) : valor;
  return texto.trim() === "" ? null : texto;
}

/**
 * Resolve o corpo contra o dicionário.
 *
 * Variável desconhecida ou vazia **permanece visível** no texto, marcada, e é
 * devolvida em `lacunas` para a tela contar e para o envio bloquear. É a
 * garantia 2, e é o que separa este motor de um `replace` ingênuo.
 */
export function renderizar(corpo: string, dicionario: Dicionario): Resultado {
  const lacunas: Lacuna[] = [];
  const normalizado: Dicionario = {};
  for (const [chave, valor] of Object.entries(dicionario ?? {})) {
    normalizado[normalizarNome(chave)] = valor;
  }

  const texto = String(corpo ?? "").replace(MARCADOR, (bruto, cru: string, posicao: number) => {
    const nome = normalizarNome(cru);
    if (!(nome in normalizado)) {
      lacunas.push({ variavel: nome, posicao, motivo: "desconhecida" });
      return `⟦${nome}: variável não existe⟧`;
    }
    const valor = textoDoValor(normalizado[nome]);
    if (valor === null) {
      lacunas.push({ variavel: nome, posicao, motivo: "vazia" });
      return `⟦${nome}: sem valor⟧`;
    }
    return escaparValor(valor);
  });

  return { texto, lacunas };
}

/**
 * Variáveis citadas no modelo que o dicionário do escopo não oferece.
 *
 * Roda **antes de publicar** o modelo, não na hora de gerar o documento: quem
 * escreveu `{{cliente.telfone}}` precisa descobrir na edição, não quando o
 * contrato estiver na frente do cliente.
 */
export function variaveisInexistentes(corpo: string, disponiveis: string[]): string[] {
  const conhecidas = new Set(disponiveis.map(normalizarNome));
  return extrairVariaveis(corpo).filter(nome => !conhecidas.has(nome));
}
