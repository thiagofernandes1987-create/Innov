"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ordenarSugestoes, type ValorDoCatalogo } from "@/lib/sugestoes/catalogo";

// Campo de texto com o vocabulário da organização por trás.
//
// **É campo de texto com apoio, não lista fechada.** Está escrito assim na
// diretriz e a diferença é de consequência, não de estilo: lista fechada
// resolveria a grafia e criaria um problema pior — quem precisa de um valor
// inédito passa a escolher o mais parecido, e o dado fica errado com aparência
// de arrumado. Aqui, digitar qualquer coisa e sair grava aquilo.
//
// A lista aparece ao focar e ao digitar, some no Escape, no clique fora e ao
// escolher. Teclado funciona: setas percorrem, Enter escolhe — sem isso, quem
// preenche EAP inteira sem tirar a mão do teclado ignora a sugestão.

// Dois modos, e o segundo não é luxo: nem toda tela envia por formulário. A
// coluna nova do funil, por exemplo, guarda o nome em estado do React e chama
// a ação com o valor na mão. Sem o modo controlado, ou o campo com sugestão
// ficava de fora dessa tela, ou aquela tela teria que virar formulário só para
// caber no componente — e é o componente que serve a tela, não o contrário.
export function CampoComSugestao({
  name,
  sugestoes,
  defaultValue = "",
  value,
  onValueChange,
  placeholder,
  id,
  required,
  maxLength,
  disabled,
  autoFocus,
  className = "",
  ariaLabel
}: {
  name?: string;
  sugestoes: ValorDoCatalogo[];
  /** Modo não controlado: o valor vive no componente e sai pelo `name`. */
  defaultValue?: string;
  /** Modo controlado: quem chama é dono do valor. Exige `onValueChange`. */
  value?: string;
  onValueChange?: (valor: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(defaultValue);
  const valor = controlado ? value : interno;
  const setValor = (proximo: string) => {
    if (!controlado) setInterno(proximo);
    onValueChange?.(proximo);
  };
  const [aberta, setAberta] = useState(false);
  const [destacado, setDestacado] = useState(-1);
  const raiz = useRef<HTMLDivElement>(null);
  // O `combobox` precisa apontar para a lista que ele controla, senão o leitor
  // de tela anuncia um campo de texto comum e a pessoa nunca sabe que há
  // sugestão para percorrer.
  const idDaLista = useId();

  const lista = useMemo(() => ordenarSugestoes(sugestoes, { filtro: valor }), [sugestoes, valor]);

  useEffect(() => {
    if (!aberta) return;
    function fechar(evento: MouseEvent) {
      const alvo = evento.target;
      if (!(alvo instanceof Element) || !raiz.current?.contains(alvo)) setAberta(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberta]);

  const escolher = (escolhido: string) => {
    setValor(escolhido);
    setAberta(false);
    setDestacado(-1);
  };

  return (
    <div className={`campo-sugestao ${className}`.trim()} ref={raiz}>
      <input
        id={id}
        name={name}
        value={valor}
        required={required}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        role="combobox"
        aria-expanded={aberta && lista.length > 0}
        aria-controls={idDaLista}
        aria-autocomplete="list"
        onChange={e => {
          setValor(e.target.value);
          setAberta(true);
          setDestacado(-1);
        }}
        onFocus={() => setAberta(true)}
        onKeyDown={e => {
          if (e.key === "Escape") {
            // Escape fecha **uma** camada por vez. Sem barrar a propagação, a
            // tecla chegava também ao `keydown` de janela do planejador, e
            // fechar a lista de sugestões fechava o formulário inteiro junto —
            // com tudo o que já tinha sido digitado dentro dele.
            //
            // A barreira só existe enquanto há lista aberta. Com a lista
            // fechada, Escape volta a ser do formulário, que é o que a pessoa
            // espera ao apertar duas vezes.
            if (aberta) {
              e.preventDefault();
              e.stopPropagation();
              setAberta(false);
              setDestacado(-1);
            }
            return;
          }
          if (!aberta || lista.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setDestacado(i => (i + 1) % lista.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setDestacado(i => (i <= 0 ? lista.length - 1 : i - 1));
          } else if (e.key === "Enter" && destacado >= 0) {
            // Só intercepta o Enter quando há item destacado. Sem essa
            // condição, quem digita um valor novo e aperta Enter para enviar o
            // formulário teria o texto trocado pela primeira sugestão.
            e.preventDefault();
            escolher(lista[destacado].rotulo);
          }
        }}
      />
      {aberta && lista.length > 0 ? (
        <ul className="campo-sugestao-lista" id={idDaLista} role="listbox">
          {lista.map((s, i) => (
            <li key={s.chave}>
              <button
                type="button"
                role="option"
                aria-selected={i === destacado}
                className={i === destacado ? "campo-sugestao-item destacado" : "campo-sugestao-item"}
                onMouseEnter={() => setDestacado(i)}
                onClick={() => escolher(s.rotulo)}
              >
                <span>{s.rotulo}</span>
                {/* Padrão da plataforma não foi "usado 0 vezes" — dizer isso
                    seria informação falsa sobre o histórico da empresa. */}
                <small>
                  {s.padrao ? "sugestão padrão" : s.usos === 1 ? "usado 1 vez" : `usado ${s.usos} vezes`}
                </small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
