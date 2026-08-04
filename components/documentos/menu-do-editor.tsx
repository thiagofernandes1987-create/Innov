"use client";

import { useEffect, useRef, useState } from "react";

// Barra de menu no padrão de aplicativo de mesa: File, Edit, Inserir, View.
//
// Pesquisado antes de escrever, como exigido. As convenções que valem para
// todos os editores do mercado — VS Code, Word, Google Docs, Typora, TOAST UI:
//
//   - o menu abre no clique e **fecha no Escape, no clique fora e ao escolher**;
//   - com um menu aberto, passar o mouse sobre outro título troca de menu sem
//     precisar clicar de novo;
//   - atalho aparece alinhado à direita do item, não entre parênteses;
//   - item indisponível fica visível e desabilitado, nunca some — sumir esconde
//     do usuário que a função existe;
//   - separador agrupa por natureza da ação.

export type ItemDeMenu =
  | { tipo: "acao"; rotulo: string; atalho?: string; aoEscolher?: () => void; desabilitado?: boolean; dica?: string }
  | { tipo: "alternancia"; rotulo: string; atalho?: string; ativo: boolean; aoEscolher: () => void }
  | { tipo: "separador" };

export type Menu = { rotulo: string; itens: ItemDeMenu[] };

export function BarraDeMenu({ menus }: { menus: Menu[] }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function foraOuEscape(evento: MouseEvent | KeyboardEvent) {
      if (evento instanceof KeyboardEvent) {
        if (evento.key === "Escape") setAberto(null);
        return;
      }
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(null);
    }
    document.addEventListener("mousedown", foraOuEscape);
    document.addEventListener("keydown", foraOuEscape);
    return () => {
      document.removeEventListener("mousedown", foraOuEscape);
      document.removeEventListener("keydown", foraOuEscape);
    };
  }, [aberto]);

  return (
    <div className="editor-menubar" ref={raiz}>
      {menus.map(menu => (
        <div className="editor-menu" key={menu.rotulo}>
          <button
            type="button"
            className={aberto === menu.rotulo ? "editor-menu-titulo aberto" : "editor-menu-titulo"}
            onClick={() => setAberto(atual => (atual === menu.rotulo ? null : menu.rotulo))}
            // Com um menu aberto, passar o mouse troca — é o comportamento de
            // toda barra de menu de desktop.
            onMouseEnter={() => setAberto(atual => (atual ? menu.rotulo : atual))}
            aria-haspopup="menu"
            aria-expanded={aberto === menu.rotulo}
          >
            {menu.rotulo}
          </button>
          {aberto === menu.rotulo ? (
            <div className="editor-menu-lista" role="menu">
              {menu.itens.map((item, indice) => {
                if (item.tipo === "separador") return <hr key={`sep-${indice}`} />;
                const desabilitado = item.tipo === "acao" ? item.desabilitado : false;
                return (
                  <button
                    key={item.rotulo}
                    type="button"
                    role="menuitem"
                    className="editor-menu-item"
                    disabled={desabilitado}
                    title={item.tipo === "acao" ? item.dica : undefined}
                    onClick={() => {
                      item.aoEscolher?.();
                      setAberto(null);
                    }}
                  >
                    <span className="editor-menu-marca" aria-hidden="true">
                      {item.tipo === "alternancia" && item.ativo ? "✓" : ""}
                    </span>
                    <span className="editor-menu-rotulo">{item.rotulo}</span>
                    {item.atalho ? <kbd>{item.atalho}</kbd> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
