// Catálogo de valores usados — a regra, sem banco e sem tela.
//
// O princípio, da diretriz de reúso: **todo campo cujo valor se repete entre
// registros é um campo com vocabulário próprio da organização.** "Fundação",
// "alvenaria", "instalações" não são texto livre — são o vocabulário daquela
// construtora, e digitar de novo a cada obra é onde nasce "Fundação",
// "fundacao" e "Fundação " com espaço no fim.
//
// A sugestão **nunca é lista fechada**. É campo de texto com apoio; valor novo
// sempre passa. Uma lista fechada resolveria a grafia e criaria um problema
// pior: a pessoa que precisa de um valor inédito passa a escolher o mais
// parecido, e o dado fica errado com aparência de arrumado.

export type ValorDoCatalogo = {
  /** Como o valor é exibido — a grafia que a organização usa. */
  rotulo: string;
  /** Forma canônica, para comparar. */
  chave: string;
  usos: number;
  /** ISO. Nulo em catálogo importado sem histórico. */
  ultimoUso: string | null;
};

/** Quantos aparecem de uma vez. Lista longa não é ajuda, é ruído. */
export const LIMITE_DE_SUGESTOES = 8;

/** Meia-vida da pontuação, em dias. */
const MEIA_VIDA = 90;

/** Um uso isolado mais antigo que isto some — é a idade típica de um engano. */
const IDADE_DO_ENGANO_EM_DIAS = 182;

/**
 * Forma canônica de um valor.
 *
 * Sem acento, minúsculo, sem espaço nas pontas e com espaço interno colapsado.
 * É o que faz três grafias contarem como um valor só, em vez de virarem três
 * entradas concorrendo pela mesma vaga na lista.
 *
 * O **rótulo continua sendo o que foi digitado** — a chave serve para comparar,
 * não para exibir. Mostrar "fundacao" a quem escreveu "Fundação" seria corrigir
 * a pessoa em vez de ajudá-la.
 */
export function chaveNormalizada(valor: string): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Dois textos são o mesmo valor do catálogo? */
export function mesmoValor(a: string, b: string): boolean {
  const ca = chaveNormalizada(a);
  return ca !== "" && ca === chaveNormalizada(b);
}

function diasDesde(iso: string | null, agora: Date): number {
  if (!iso) return IDADE_DO_ENGANO_EM_DIAS;
  const quando = new Date(iso).getTime();
  if (Number.isNaN(quando)) return IDADE_DO_ENGANO_EM_DIAS;
  return Math.max(0, (agora.getTime() - quando) / 86_400_000);
}

/**
 * Frequência **recente**, não frequência.
 *
 * `usos × 0,5^(dias/90)`: o peso de um valor cai pela metade a cada trimestre
 * sem uso. Ordenar só por contagem congelaria a lista no vocabulário de um ano
 * atrás — a etapa que a empresa usou quarenta vezes em 2025 e abandonou
 * continuaria à frente da que ela usa toda semana agora.
 */
export function pontuacao(valor: ValorDoCatalogo, agora: Date): number {
  const dias = diasDesde(valor.ultimoUso, agora);
  return Math.max(0, valor.usos) * Math.pow(0.5, dias / MEIA_VIDA);
}

/**
 * Um uso isolado e antigo é engano, não vocabulário.
 *
 * Quem digitou "Fundacao" uma vez em janeiro não quer isso sugerido em agosto.
 * Dois usos já indicam intenção, e um uso recente pode ser vocabulário novo —
 * por isso o corte exige as duas coisas ao mesmo tempo.
 */
function ehEngano(valor: ValorDoCatalogo, agora: Date): boolean {
  return valor.usos <= 1 && diasDesde(valor.ultimoUso, agora) > IDADE_DO_ENGANO_EM_DIAS;
}

/**
 * A lista que a tela mostra: filtrada pelo que se digitou, sem enganos antigos,
 * ordenada por frequência recente e cortada em oito.
 */
export function ordenarSugestoes(
  catalogo: readonly ValorDoCatalogo[],
  opcoes: { agora?: Date; filtro?: string; limite?: number } = {}
): ValorDoCatalogo[] {
  const agora = opcoes.agora ?? new Date();
  const limite = opcoes.limite ?? LIMITE_DE_SUGESTOES;
  const filtro = chaveNormalizada(opcoes.filtro ?? "");

  return catalogo
    .filter(v => v.chave !== "")
    .filter(v => !ehEngano(v, agora))
    // Filtro por trecho, não por começo: quem digita "estrut" quer encontrar
    // "Alvenaria estrutural", e exigir o início da palavra esconderia
    // justamente o valor composto que mais se repete.
    .filter(v => (filtro === "" ? true : v.chave.includes(filtro)))
    // O que já está escrito por extenso não é sugerido de volta: ocuparia uma
    // linha da lista para não oferecer nada.
    .filter(v => v.chave !== filtro)
    .sort((a, b) => pontuacao(b, agora) - pontuacao(a, agora) || a.rotulo.localeCompare(b.rotulo, "pt-BR"))
    .slice(0, limite);
}
