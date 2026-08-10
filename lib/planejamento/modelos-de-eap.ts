// Modelo de EAP — o conjunto, não só a palavra.
//
// A sugestão de vocabulário resolve metade do problema: quem escreve "Fundação"
// pela terceira vez recebe a grafia certa. A outra metade é que, nas duas vezes
// anteriores, essa etapa veio com as mesmas cinco atividades embaixo — e elas
// continuam sendo digitadas uma a uma.
//
// **É observado, não cadastrado.** Vale o critério escrito na S-34: cura-se o
// que alimenta contagem, observa-se o que nomeia. Modelo de EAP não é dimensão
// de análise; é o jeito daquela construtora montar aquela etapa, e o único
// lugar onde isso está escrito é nas obras que ela já montou. Pedir para
// alguém cadastrar o modelo antes seria pedir que declarasse o que ele já faz
// — e o modelo declarado envelhece separado do modelo praticado.

import { chaveNormalizada } from "@/lib/sugestoes/catalogo";

/** Uma etapa já criada, com as atividades que vieram embaixo dela. */
export type OcorrenciaDeEtapa = {
  titulo: string;
  atividades: readonly string[];
};

export type AtividadeDoModelo = {
  titulo: string;
  /** Em quantas ocorrências desta etapa a atividade apareceu. */
  ocorrencias: number;
  /** Posição média que ela ocupou dentro da etapa, 0 no começo. */
  posicaoTipica: number;
};

export type ModeloDeEtapa = {
  /** A grafia mais recente da etapa, que é a que a empresa usa hoje. */
  titulo: string;
  chave: string;
  /** Quantas vezes esta etapa já foi criada. */
  vezes: number;
  atividades: AtividadeDoModelo[];
};

/**
 * A partir de quantas repetições existe modelo.
 *
 * Duas ocorrências anteriores — a terceira criação é a que recebe a oferta. É o
 * enunciado literal da tarefa, e não é arbitrário: uma repetição pode ser
 * coincidência de duas obras parecidas; a segunda já é o jeito de fazer.
 */
export const MINIMO_DE_OCORRENCIAS = 2;

/**
 * Uma atividade entra no modelo quando aparece na **maioria** das ocorrências.
 *
 * Não em todas: obra que teve um imprevisto ganhou uma atividade a mais, e
 * exigir unanimidade descartaria o modelo inteiro por causa dela. Nem em
 * qualquer uma: aí o modelo viraria a união de tudo que já foi feito, e
 * ofereceria doze atividades onde a empresa usa cinco.
 */
function entraNoModelo(aparicoes: number, total: number): boolean {
  return aparicoes >= Math.ceil(total / 2);
}

/**
 * Os modelos que emergem do histórico.
 *
 * Só etapas repetidas, e só as atividades que se repetem dentro delas. Etapa
 * criada uma vez não tem modelo — tem um caso.
 */
export function modelosDeEtapa(ocorrencias: readonly OcorrenciaDeEtapa[]): ModeloDeEtapa[] {
  const porChave = new Map<string, { titulo: string; listas: string[][] }>();

  for (const ocorrencia of ocorrencias) {
    const chave = chaveNormalizada(ocorrencia.titulo);
    if (!chave) continue;
    const atual = porChave.get(chave) ?? { titulo: ocorrencia.titulo, listas: [] };
    // O título mais recente vence: a lista chega ordenada da mais nova para a
    // mais antiga, então a primeira que se vê é a grafia de hoje.
    porChave.set(chave, {
      titulo: atual.listas.length === 0 ? ocorrencia.titulo : atual.titulo,
      listas: [...atual.listas, [...ocorrencia.atividades]]
    });
  }

  const modelos: ModeloDeEtapa[] = [];
  for (const [chave, { titulo, listas }] of porChave) {
    if (listas.length < MINIMO_DE_OCORRENCIAS) continue;

    const contagem = new Map<string, { titulo: string; vezes: number; somaDePosicoes: number }>();
    for (const lista of listas) {
      // Repetição dentro da mesma etapa conta uma vez: duas "Escavação" na
      // mesma fundação não tornam a atividade mais típica, só mais numerosa.
      const vistas = new Set<string>();
      let posicao = 0;
      for (const atividade of lista) {
        const chaveAtividade = chaveNormalizada(atividade);
        if (!chaveAtividade || vistas.has(chaveAtividade)) continue;
        vistas.add(chaveAtividade);
        const anterior = contagem.get(chaveAtividade);
        contagem.set(chaveAtividade, {
          titulo: anterior?.titulo ?? atividade,
          vezes: (anterior?.vezes ?? 0) + 1,
          somaDePosicoes: (anterior?.somaDePosicoes ?? 0) + posicao
        });
        posicao += 1;
      }
    }

    // **Ordena pela posição típica, não pela frequência.** EAP é sequência de
    // trabalho: escavar vem antes de armar, e armar antes de concretar. A
    // primeira versão ordenava por contagem e caía no desempate alfabético —
    // medido na tela, o modelo saiu "Armação, Escavação, Forma", que é a ordem
    // errada de construir. Frequência vira desempate; a sequência é o valor.
    const atividades = [...contagem.values()]
      .filter(a => entraNoModelo(a.vezes, listas.length))
      .map(a => ({
        titulo: a.titulo,
        ocorrencias: a.vezes,
        posicaoTipica: a.somaDePosicoes / a.vezes
      }))
      .sort(
        (a, b) =>
          a.posicaoTipica - b.posicaoTipica ||
          b.ocorrencias - a.ocorrencias ||
          a.titulo.localeCompare(b.titulo, "pt-BR")
      );

    // Etapa repetida sem nenhuma atividade constante não é modelo: oferecer
    // "traga as 0 atividades" é ruído, e a etapa continua sendo criada sozinha.
    if (atividades.length === 0) continue;

    modelos.push({ titulo, chave, vezes: listas.length, atividades });
  }

  return modelos.sort((a, b) => b.vezes - a.vezes || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

/** O modelo que corresponde ao que está sendo digitado, se houver. */
export function modeloPara(
  modelos: readonly ModeloDeEtapa[],
  titulo: string
): ModeloDeEtapa | null {
  const chave = chaveNormalizada(titulo);
  if (!chave) return null;
  return modelos.find(m => m.chave === chave) ?? null;
}
