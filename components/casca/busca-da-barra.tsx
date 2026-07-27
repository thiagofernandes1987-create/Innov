"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Busca com facetas, no centro da barra superior.
//
// Posição ditada pela seção 12 do padrão de interface: "pesquisa com filtros no
// meio". A anatomia vem das capturas `busca com filtro crm` — lupa dentro do
// campo, facetas dos filtros ativos como etiquetas removíveis **dentro** do
// mesmo campo, e o texto livre depois delas.
//
// O termo é estado de cliente, não navegação. A primeira versão escrevia em
// `router.replace` a cada tecla; como as telas do aplicativo são
// `force-dynamic`, cada digitação virava ida ao servidor e a lista chegava
// quase três segundos depois do que se digitou. O filtro é aplicado no
// navegador, sobre dados que já estão na tela: não há servidor a consultar.
//
// A URL continua acompanhando, por `history.replaceState` — sem navegação, sem
// re-render de servidor. Assim o endereço ainda descreve o que está na tela e
// pode ser mandado para outra pessoa.

type Contexto = { termo: string; definir: (valor: string) => void };

const BuscaContexto = createContext<Contexto>({ termo: "", definir: () => {} });

/** Lido por qualquer tela que saiba filtrar. */
export function useBusca(): string {
  return useContext(BuscaContexto).termo;
}

/** Telas que sabem consumir a busca. Fora daqui o campo não aparece. */
const TELAS_COM_BUSCA = ["/app/pipeline"];

function telaBusca(caminho: string): boolean {
  return TELAS_COM_BUSCA.some(prefixo => caminho.startsWith(prefixo));
}

export function ProvedorDeBusca({ children }: { children: React.ReactNode }) {
  const caminho = usePathname() ?? "";
  const [termo, setTermo] = useState("");

  // Trocar de tela zera o filtro. Um termo que sobrevive à navegação faz a tela
  // seguinte abrir vazia sem explicação — e o campo, escondido em telas que não
  // buscam, não teria como avisar.
  //
  // Ajustado na renderização, não em `useEffect`: sincronizar estado por efeito
  // rende uma passada a mais com o valor velho na tela, e é o que a regra de
  // renderização em cascata acusa.
  const [caminhoAnterior, setCaminhoAnterior] = useState(caminho);
  if (caminho !== caminhoAnterior) {
    setCaminhoAnterior(caminho);
    setTermo("");
  }

  // Espelha na URL sem navegar: `replaceState` não dispara re-render de
  // servidor, então o endereço acompanha sem custo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const atual = url.searchParams.get("q") ?? "";
    if (atual === termo) return;
    if (termo) url.searchParams.set("q", termo);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, [termo]);

  const definir = useCallback((valor: string) => setTermo(valor), []);
  const valor = useMemo(() => ({ termo, definir }), [termo, definir]);

  return <BuscaContexto.Provider value={valor}>{children}</BuscaContexto.Provider>;
}

export function BuscaDaBarra() {
  const caminho = usePathname() ?? "";
  const { termo, definir } = useContext(BuscaContexto);
  const [rascunho, setRascunho] = useState("");

  if (!telaBusca(caminho)) return <div className="barra-busca-vazia" aria-hidden="true" />;

  // Enter confirma o que foi digitado e vira faceta — é o comportamento das
  // capturas. A faceta é o filtro que está valendo; o campo ao lado continua
  // livre para o próximo termo, e é por isso que os dois convivem.
  function confirmar() {
    const valor = rascunho.trim();
    if (!valor) return;
    definir(valor);
    setRascunho("");
  }

  return (
    <div className="barra-busca">
      <label>
        <span className="sr-only">Buscar nesta tela</span>
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M15.2 15.2 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>

        {termo ? (
          <span className="barra-busca-faceta">
            <span title={termo}>{termo}</span>
            <button type="button" aria-label={`Remover o filtro ${termo}`} onClick={() => definir("")}>
              ×
            </button>
          </span>
        ) : null}

        <input
          type="search"
          aria-label="Buscar nesta tela"
          value={rascunho}
          onChange={evento => setRascunho(evento.target.value)}
          onKeyDown={evento => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              confirmar();
            }
            // Backspace no campo vazio remove a faceta, como no padrão: é o
            // caminho de volta sem tirar a mão do teclado.
            if (evento.key === "Backspace" && !rascunho && termo) definir("");
          }}
          placeholder={termo ? "" : "Buscar…"}
        />
      </label>
    </div>
  );
}
