"use client";

import { Monitor, Moon, Sun } from "@phosphor-icons/react";
import { useTransition } from "react";
import { definirTema } from "@/app/actions/tema";
import { TEMAS, type Tema } from "@/lib/tema";

const OPCOES = [
  { valor: "sistema" as const, rotulo: "Seguir o sistema", Icone: Monitor },
  { valor: "claro" as const, rotulo: "Tema claro", Icone: Sun },
  { valor: "escuro" as const, rotulo: "Tema escuro", Icone: Moon }
];

export function AlternadorTema({ atual }: { atual: Tema }) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="alternador-tema" role="group" aria-label="Tema da interface">
      {OPCOES.map(({ valor, rotulo, Icone }) => (
        <button
          key={valor}
          type="button"
          className={valor === atual ? "alternador-tema-opcao ativa" : "alternador-tema-opcao"}
          aria-pressed={valor === atual}
          aria-label={rotulo}
          title={rotulo}
          disabled={pendente}
          onClick={() => iniciar(() => definirTema(valor).then(() => undefined))}
        >
          <Icone size={17} weight="regular" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export { TEMAS };
