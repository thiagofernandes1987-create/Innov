"use client";

import { useEffect, useRef } from "react";

/**
 * Mantém o DOM do campo encostado no estado depois de **cada** renderização.
 *
 * ## Por que isto existe
 *
 * A resposta de uma server action re-renderiza a árvore do servidor. Nesse
 * commit o navegador perde a seleção do `<select>`, e o React não a repõe: do
 * ponto de vista dele nada mudou — o estado continua com o mesmo valor, então
 * não há por que tocar no DOM.
 *
 * O que separa este defeito de um "perdeu o estado" comum é que o estado está
 * intacto. Medido na tela de emissão (VACINA-051):
 *
 *     antes                 "6db6ad90-…"
 *     depois do round trip  ""             ← DOM
 *     após render local     "6db6ad90-…"   ← o valor volta sozinho
 *
 * **Divergiram o estado e o DOM — e o formulário envia o DOM.** Por isso não há
 * erro, não há aviso, o formulário não some: um campo mostra a coisa errada por
 * alguns instantes, e o que sai é o que estava na tela naquele instante. Na
 * emissão de documento, o resultado foi um contrato gravado — e documento
 * emitido não se corrige — sem o cliente que a pessoa tinha escolhido.
 *
 * ## Sem lista de dependências, de propósito
 *
 * O efeito precisa rodar depois de **toda** renderização, porque é justamente a
 * renderização que não veio do estado que estraga o DOM. Uma lista de
 * dependências sobre os valores não dispararia: os valores não mudaram.
 *
 * É uso legítimo de efeito — sincronizar com um sistema externo, que aqui é o
 * próprio elemento — e não `setState` disfarçado.
 *
 * ## Como usar
 *
 * ```tsx
 * const campo = useReencostarNoDom({ clienteId, obraId });
 * <select ref={campo("clienteId")} name="clienteId" value={clienteId} onChange={…} />
 * ```
 *
 * O valor tem de vir do mesmo estado que alimenta o `value` do campo; é a
 * comparação entre os dois que decide se o DOM precisa ser corrigido.
 */
export function useReencostarNoDom<T extends Record<string, string>>(valores: T) {
  type Campo = HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement;
  const campos = useRef<Partial<Record<keyof T, Campo | null>>>({});

  // O efeito fecha sobre `valores` da renderização em que foi criado, e roda
  // depois dela — que é o instante certo. Guardar os valores num segundo `ref`
  // seria escrever em `ref` durante a renderização, o que o `react-hooks/refs`
  // proíbe com razão: leitura de `ref` durante a renderização não faz o
  // componente atualizar como se espera.
  useEffect(() => {
    for (const nome of Object.keys(valores) as (keyof T)[]) {
      const campo = campos.current[nome];
      const valor = valores[nome];
      if (campo && campo.value !== valor) campo.value = valor;
    }
  });

  return (nome: keyof T) => (elemento: Campo | null) => {
    campos.current[nome] = elemento;
  };
}
