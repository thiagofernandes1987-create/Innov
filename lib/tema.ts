// Vocabulário do tema, fora do arquivo de ação.
//
// Um módulo `"use server"` só pode exportar função assíncrona: qualquer
// constante exportada de lá vira erro de compilação, porque o bundler
// precisaria transformá-la em chamada de rede. Constante fica aqui, ação fica
// lá — e os dois lados importam daqui.

export const TEMAS = ["sistema", "claro", "escuro"] as const;
export type Tema = (typeof TEMAS)[number];

export const COOKIE_TEMA = "innovar-tema";

/** Normaliza o que veio do cookie: valor desconhecido cai em "sistema". */
export function temaValido(valor: string | undefined | null): Tema {
  return (TEMAS as readonly string[]).includes(valor ?? "") ? (valor as Tema) : "sistema";
}
