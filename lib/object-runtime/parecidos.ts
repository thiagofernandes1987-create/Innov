// Campo parecido com o que está sendo declarado.
//
// O problema é o da T-32.3.4: **para não nascerem "Arquiteto" e "arquiteto"**.
// Dois campos quase iguais no mesmo objeto não é erro de digitação — é uma
// empresa com o mesmo dado preenchido pela metade em dois lugares, e nenhuma
// contagem que os some fecha.
//
// Sugestão nunca vira obrigação: quem quiser mesmo assim segue. O que a
// sugestão faz é tornar a repetição visível **antes** de ela existir, que é o
// único momento em que corrigi-la é barato.
//
// Lógica pura, sem `server-only`, para ser exercitada em teste.

import { chaveNormalizada } from "@/lib/sugestoes/catalogo";
import type { ObjectFieldSpec } from "./spec";

export type MotivoDeParecido = "mesmo_nome" | "um_contem_o_outro" | "quase_igual";

export type CampoParecido = {
  campo: ObjectFieldSpec;
  motivo: MotivoDeParecido;
};

/**
 * A partir de quantos caracteres a semelhança conta.
 *
 * Com três letras, duas trocas transformam qualquer palavra em qualquer outra
 * — "CEP" viraria sugestão para "CEI", e a sugestão errada é pior que a
 * ausência dela: ensina a ignorar o aviso.
 */
const MINIMO_PARA_SEMELHANCA = 5;

/** Quantas edições ainda contam como "quase igual". */
const DISTANCIA_MAXIMA = 2;

/**
 * Distância de edição entre dois nomes — trocas, inserções e remoções.
 *
 * Implementação por duas linhas da matriz, que é o suficiente: os nomes aqui
 * são rótulos de campo, não textos.
 */
export function distancia(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    for (let j = 1; j <= b.length; j += 1) {
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    anterior = atual;
  }
  return anterior[b.length];
}

const PESO: Record<MotivoDeParecido, number> = {
  mesmo_nome: 0,
  um_contem_o_outro: 1,
  quase_igual: 2
};

function motivoEntre(novo: string, existente: string): MotivoDeParecido | null {
  if (!novo || !existente) return null;
  if (novo === existente) return "mesmo_nome";

  // Palavra inteira dentro da outra: "Arquiteto" dentro de "Arquiteto
  // responsável". Comparar com as bordas evita casar "ata" dentro de "data".
  const dentro = (curto: string, longo: string) =>
    longo.startsWith(`${curto} `) || longo.endsWith(` ${curto}`) || longo.includes(` ${curto} `);
  if (dentro(novo, existente) || dentro(existente, novo)) return "um_contem_o_outro";

  if (Math.min(novo.length, existente.length) < MINIMO_PARA_SEMELHANCA) return null;
  return distancia(novo, existente) <= DISTANCIA_MAXIMA ? "quase_igual" : null;
}

/**
 * Os campos já declarados que se parecem com o rótulo digitado.
 *
 * Do mais parecido para o menos. Campo arquivado entra na lista — reativar o
 * que já existiu é melhor que criar um irmão quase igual, e quem declara
 * precisa saber que o dado antigo continua lá.
 */
export function camposParecidos(
  rotulo: string,
  campos: readonly ObjectFieldSpec[]
): CampoParecido[] {
  const novo = chaveNormalizada(rotulo);
  if (!novo) return [];

  const achados: CampoParecido[] = [];
  for (const campo of campos) {
    const motivo = motivoEntre(novo, chaveNormalizada(campo.label ?? campo.key ?? ""));
    if (motivo) achados.push({ campo, motivo });
  }

  return achados.sort(
    (a, b) => PESO[a.motivo] - PESO[b.motivo] || a.campo.label.localeCompare(b.campo.label, "pt-BR")
  );
}
