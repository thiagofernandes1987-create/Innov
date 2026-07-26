"use client";

import { useTransition } from "react";
import { definirTema } from "@/app/actions/tema";
import { TEMAS, type Tema } from "@/lib/tema";

// Três estados, não dois. "Sistema" é o padrão porque a maioria das pessoas já
// decidiu isso no aparelho; forçar claro ou escuro é ignorar uma escolha que
// elas já fizeram. Os outros dois existem para quem quer contrariar o aparelho
// em uma tela só.

const OPCOES: { valor: Tema; rotulo: string; desenho: React.ReactElement }[] = [
  {
    valor: "sistema",
    rotulo: "Seguir o sistema",
    desenho: (
      <>
        <rect x="3" y="4.5" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8.5 20h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    )
  },
  {
    valor: "claro",
    rotulo: "Tema claro",
    desenho: (
      <>
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 2.8v2.1M12 19.1v2.1M4.4 4.4l1.5 1.5M18.1 18.1l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.4 19.6l1.5-1.5M18.1 5.9l1.5-1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    )
  },
  {
    valor: "escuro",
    rotulo: "Tema escuro",
    desenho: (
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    )
  }
];

export function AlternadorTema({ atual }: { atual: Tema }) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="alternador-tema" role="group" aria-label="Tema da interface">
      {OPCOES.map(opcao => {
        const ativo = opcao.valor === atual;
        return (
          <button
            key={opcao.valor}
            type="button"
            className={ativo ? "alternador-tema-opcao ativa" : "alternador-tema-opcao"}
            aria-pressed={ativo}
            aria-label={opcao.rotulo}
            title={opcao.rotulo}
            disabled={pendente}
            onClick={() => iniciar(() => definirTema(opcao.valor).then(() => undefined))}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
              {opcao.desenho}
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export { TEMAS };
