// Leitor de XML mínimo, suficiente para OOXML.
//
// Por que não `DOMParser`: ele só existe no navegador, e a conversão precisa ter
// teste. Um analisador próprio de trinta linhas roda nos dois lados e é
// verificável — e o XML de um `.docx` é gerado por máquina, sem as construções
// que tornam XML difícil: não há CDATA, não há entidade declarada pelo
// documento, não há namespace redefinido no meio.
//
// Isto **não é** um analisador de XML de propósito geral e não deve virar um.
// Se um dia precisar ler XML de origem arbitrária, use um analisador de
// verdade: tolerância a entrada malformada é onde este tipo de código vira
// problema de segurança.

export type NoXML = {
  nome: string;
  atributos: Record<string, string>;
  filhos: NoXML[];
  texto: string;
};

const ENTIDADES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'"
};

export function desescapar(texto: string): string {
  return texto
    .replace(/&(lt|gt|amp|quot|apos);/g, m => ENTIDADES[m])
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function atributosDe(bruto: string): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const m of bruto.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) saida[m[1]] = desescapar(m[2]);
  return saida;
}

/** Analisa o documento e devolve a raiz. Conteúdo fora de elemento é ignorado. */
export function analisarXML(xml: string): NoXML {
  const raiz: NoXML = { nome: "#raiz", atributos: {}, filhos: [], texto: "" };
  const pilha: NoXML[] = [raiz];
  // Declaração, comentário e instrução de processamento saem antes de tudo.
  const limpo = xml
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  const marca = /<\s*(\/?)\s*([\w:.-]+)((?:[^>"]|"[^"]*")*?)(\/?)\s*>/g;
  let posicao = 0;
  let m: RegExpExecArray | null;
  while ((m = marca.exec(limpo)) !== null) {
    const atual = pilha[pilha.length - 1];
    const solto = limpo.slice(posicao, m.index);
    if (solto) atual.texto += desescapar(solto);
    posicao = marca.lastIndex;

    const [, fecha, nome, atributos, vazio] = m;
    if (fecha) {
      // Fechamento sem abertura correspondente é descartado em vez de
      // desmontar a pilha: documento de terceiro nem sempre é impecável.
      for (let i = pilha.length - 1; i > 0; i--) {
        if (pilha[i].nome === nome) {
          pilha.length = i;
          break;
        }
      }
      continue;
    }
    const no: NoXML = { nome, atributos: atributosDe(atributos), filhos: [], texto: "" };
    atual.filhos.push(no);
    if (!vazio) pilha.push(no);
  }
  return raiz;
}

/** Primeiro descendente com este nome, em profundidade. */
export function primeiro(no: NoXML, nome: string): NoXML | null {
  for (const filho of no.filhos) {
    if (filho.nome === nome) return filho;
    const achado = primeiro(filho, nome);
    if (achado) return achado;
  }
  return null;
}

/** Filhos diretos com este nome. */
export function filhos(no: NoXML, nome: string): NoXML[] {
  return no.filhos.filter(f => f.nome === nome);
}

/** Todos os descendentes com este nome, em ordem de documento. */
export function todos(no: NoXML, nome: string): NoXML[] {
  const saida: NoXML[] = [];
  for (const filho of no.filhos) {
    if (filho.nome === nome) saida.push(filho);
    saida.push(...todos(filho, nome));
  }
  return saida;
}
