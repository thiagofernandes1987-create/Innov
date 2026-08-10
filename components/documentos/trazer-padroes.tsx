"use client";

import { useActionState } from "react";
import { trazerPadroesDaPlataforma } from "@/app/actions/documentos";

// Traz para a empresa os modelos padrão que ela ainda não tem.
//
// Empresa nova já nasce com eles — o gatilho de `organizations` semeia no
// cadastro. Este botão cobre dois casos que o gatilho não alcança: a empresa
// criada **antes** de um padrão novo ser publicado, e a que arquivou uma cópia
// e quer o padrão de volta. A função no banco é idempotente, então repetir não
// duplica e o botão pode ser apertado sem medo.
export function TrazerPadroes() {
  const [estado, trazer, trazendo] = useActionState(trazerPadroesDaPlataforma, { ok: false, mensagem: "" });

  return (
    <form action={trazer} className="trazer-padroes">
      <button type="submit" className="button button-secondary" disabled={trazendo}>
        {trazendo ? "Trazendo…" : "Trazer padrões da plataforma"}
      </button>
      {estado.mensagem ? (
        <span className={estado.ok ? "trazer-padroes-aviso ok" : "trazer-padroes-aviso erro"} role="status" aria-live="polite">
          {estado.mensagem}
        </span>
      ) : null}
    </form>
  );
}
