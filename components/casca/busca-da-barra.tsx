"use client";

import { Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
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
// Onde a busca da barra tem quem a consuma.
//
// `/app/crm` entrou porque o funil passou a ser a tela inicial do módulo: com
// só `/app/pipeline` na lista, mover o funil DESLIGOU a busca da tela mais
// usada do CRM, e o campo sumiu sem erro nenhum. Lista de rota escrita à mão é
// exatamente o tipo de acoplamento que a VACINA-014 descreve — ela envelhece
// em silêncio quando a rota muda.
const TELAS_COM_BUSCA = ["/app/pipeline", "/app/crm"];

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
    const termoDaUrl = typeof window === "undefined"
      ? ""
      : new URL(window.location.href).searchParams.get("q") ?? "";
    setTermo(termoDaUrl);
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
        <MagnifyingGlass size={16} weight="regular" aria-hidden="true" />

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

/**
 * Busca global da primeira barra.
 *
 * No launcher ela filtra os aplicativos em tempo real. Dentro de um módulo,
 * Enter leva a pessoa ao launcher já com o termo aplicado. Assim o campo do
 * mock não é decoração e não disputa estado com a busca/facetas da barra de
 * trabalho do pipeline.
 */
export function BuscaGlobal() {
  const caminho = usePathname() ?? "";
  const router = useRouter();
  const { termo, definir } = useContext(BuscaContexto);
  const noLauncher = caminho === "/app" || caminho.startsWith("/amostra-launcher");
  const [rascunho, setRascunho] = useState("");
  const valor = noLauncher ? termo : rascunho;

  function atualizar(proximo: string) {
    if (noLauncher) definir(proximo);
    else setRascunho(proximo);
  }

  function abrirLauncher() {
    const busca = valor.trim();
    if (!busca || noLauncher) return;
    definir(busca);
    router.push(`/app?q=${encodeURIComponent(busca)}`);
  }

  return (
    <div className="busca-global">
      <label>
        <span className="sr-only">Buscar aplicativos, relatórios e documentos</span>
        <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />
        <input
          type="search"
          value={valor}
          onChange={evento => atualizar(evento.target.value)}
          onKeyDown={evento => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              abrirLauncher();
            }
          }}
          placeholder="Buscar aplicativos, relatórios, documentos..."
        />
        <kbd>⌘ K</kbd>
      </label>
    </div>
  );
}

export function IconeFiltroDaBusca() {
  return <Funnel size={15} weight="fill" aria-hidden="true" />;
}
