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
  /**
   * Sugestão que a plataforma oferece antes de existir uso.
   *
   * Existe para o dia zero: catálogo de uma empresa nova está vazio, e um campo
   * de disciplina sem nenhuma sugestão é pior que a lista fechada que ele
   * substituiu. O padrão **nunca é filtrado como engano** — ele não tem
   * histórico para envelhecer — e a tela diz que é padrão, não que foi usado.
   */
  padrao?: boolean;
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


/**
 * Escopos de sugestão em uso.
 *
 * Vale escrever a lista: escopo digitado à mão em cada tela vira "eap_etapa" num
 * lugar e "etapa_eap" noutro, e os dois catálogos ficam pela metade sem ninguém
 * perceber — o campo continua sugerindo alguma coisa.
 *
 * Fica neste módulo, e não no de servidor, porque é dado puro e a regra de
 * chave por escopo precisa dele.
 */
export const ESCOPOS = {
  etapaDaEap: "eap.etapa",
  atividadeDaEap: "eap.atividade",
  etapaDoFunil: "funil.etapa",
  marcador: "cartao.marcador",
  disciplina: "documento.disciplina",
  unidade: "medida.unidade",
  motivoDePerda: "negocio.motivo_perda",
  motivoDeParada: "obra.motivo_parada"
} as const;

export type EscopoDeSugestao = (typeof ESCOPOS)[keyof typeof ESCOPOS];

/**
 * Forma canônica de uma **unidade de medida**.
 *
 * `m²` e `m2` são a mesma unidade escrita de dois jeitos, e as duas vão ser
 * digitadas: uma sai do teclado do telefone, a outra de quem sabe o atalho.
 * Sem fundir, a mesma unidade ocupa duas linhas da sugestão e as contagens de
 * área ficam divididas em duas.
 *
 * A fusão é feita com NFKD, a forma de **compatibilidade**: é ela que sabe que
 * `²` é um `2` e que `₂` também. Escrever a tabela à mão daria o mesmo
 * resultado para dois casos e erraria no terceiro.
 */
export function chaveDeUnidade(valor: string): string {
  return chaveNormalizada(String(valor ?? "").normalize("NFKD"));
}

/**
 * A chave que vale naquele escopo.
 *
 * **Por escopo, e não globalmente**: fundir expoente ajuda a unidade de medida
 * e atrapalharia o resto. "H²" no nome de uma etapa é o nome da etapa, não uma
 * unidade escrita torto — e trocar a regra global re-escreveria o sentido de
 * toda chave já gravada. Escopo que não pediu nada continua com a regra de
 * sempre, inclusive escopo desconhecido.
 */
export function chaveDoEscopo(escopo: string, valor: string): string {
  return escopo === ESCOPOS.unidade ? chaveDeUnidade(valor) : chaveNormalizada(valor);
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
  if (valor.padrao) return false;
  return valor.usos <= 1 && diasDesde(valor.ultimoUso, agora) > IDADE_DO_ENGANO_EM_DIAS;
}

/**
 * Junta o vocabulário da organização com as sugestões padrão da plataforma.
 *
 * O que a empresa usa vem primeiro, sempre: padrão é ponto de partida, não
 * preferência. E padrão que a empresa já usou não entra duas vezes — a entrada
 * do catálogo vence, porque carrega a grafia que a empresa escolheu.
 */
export function comPadroes(
  doCatalogo: readonly ValorDoCatalogo[],
  padroes: readonly string[],
  escopo = ""
): ValorDoCatalogo[] {
  // Compara pela chave gravada **e** pela chave recalculada do rótulo. A chave
  // vem pronta do banco, e se ela divergir do rótulo — linha antiga, importação,
  // correção manual — a comparação por um lado só deixa passar o duplicado. Foi
  // o que aconteceu com "m²" gravado sob a chave "m2": a lista ofereceu o mesmo
  // valor duas vezes, uma como uso e outra como padrão.
  const jaTem = new Set(
    doCatalogo.flatMap(v => [v.chave, chaveDoEscopo(escopo, v.chave), chaveDoEscopo(escopo, v.rotulo)])
  );
  const novos = padroes
    .map(rotulo => ({ rotulo, chave: chaveDoEscopo(escopo, rotulo), usos: 0, ultimoUso: null, padrao: true }))
    .filter(v => v.chave !== "" && !jaTem.has(v.chave));
  return [...doCatalogo, ...novos];
}

export type SituacaoDoValor = "sugerido" | "oculto_por_desuso";

/**
 * Por que este valor aparece — ou não — na sugestão.
 *
 * A tela de administração precisa disto para não pedir trabalho à toa. Um
 * valor que o próprio corte já esconde não precisa ser removido à mão, e
 * mostrar os dois grupos misturados faria o administrador limpar o que já
 * estava resolvido.
 */
export function situacaoDoValor(valor: ValorDoCatalogo, agora: Date = new Date()): SituacaoDoValor {
  return ehEngano(valor, agora) ? "oculto_por_desuso" : "sugerido";
}

/**
 * A lista que a tela mostra: filtrada pelo que se digitou, sem enganos antigos,
 * ordenada por frequência recente e cortada em oito.
 */
export function ordenarSugestoes(
  catalogo: readonly ValorDoCatalogo[],
  opcoes: { agora?: Date; filtro?: string; limite?: number; escopo?: string } = {}
): ValorDoCatalogo[] {
  const agora = opcoes.agora ?? new Date();
  const limite = opcoes.limite ?? LIMITE_DE_SUGESTOES;
  const escopo = opcoes.escopo ?? "";
  const filtro = chaveDoEscopo(escopo, opcoes.filtro ?? "");
  // A chave gravada pode ser anterior à regra do escopo — `m²` gravado antes de
  // a fusão existir. Comparar pela chave recalculada é o que faz a linha antiga
  // continuar encontrável sem depender de o banco já ter sido reescrito.
  const chaveDe = (v: ValorDoCatalogo) => chaveDoEscopo(escopo, v.chave);

  return catalogo
    .filter(v => v.chave !== "")
    .filter(v => !ehEngano(v, agora))
    // Filtro por trecho, não por começo: quem digita "estrut" quer encontrar
    // "Alvenaria estrutural", e exigir o início da palavra esconderia
    // justamente o valor composto que mais se repete.
    .filter(v => (filtro === "" ? true : chaveDe(v).includes(filtro)))
    // O que já está escrito por extenso não é sugerido de volta: ocuparia uma
    // linha da lista para não oferecer nada.
    .filter(v => chaveDe(v) !== filtro)
    .sort((a, b) => pontuacao(b, agora) - pontuacao(a, agora) || a.rotulo.localeCompare(b.rotulo, "pt-BR"))
    .slice(0, limite);
}
