"use client";

import { useActionState, useState } from "react";
import { definirTiposDoAplicativo } from "@/app/actions/documentos";
import { ROTULO_CATEGORIA, TIPOS, categorias } from "@/lib/documentos/tipos";

// Matriz de disponibilização, um aplicativo por vez.
//
// Uma grade de 19 aplicativos × 35 tipos são 665 caixas na tela — impossível de
// conferir e fácil de marcar errado. O corte é por aplicativo: escolhe-se um, e
// os tipos aparecem agrupados por categoria, com o que ele oferece hoje já
// marcado. Cada gravação é de um aplicativo só, o que também torna óbvio o que
// se está mudando.

export type AplicativoDaMatriz = {
  chave: string;
  nome: string;
  categoria: string;
  selecionados: string[];
  configurado: boolean;
};

export function MatrizDeDisponibilizacao({ aplicativos }: { aplicativos: AplicativoDaMatriz[] }) {
  const [atual, setAtual] = useState(aplicativos[0]?.chave ?? "");
  const [estado, gravar, gravando] = useActionState(definirTiposDoAplicativo, { ok: false, mensagem: "" });

  const aplicativo = aplicativos.find(a => a.chave === atual);
  if (!aplicativo) return null;

  return (
    <div className="disponibilizacao">
      <aside className="disponibilizacao-aplicativos">
        <h2>Aplicativos</h2>
        {aplicativos.map(a => (
          <button
            key={a.chave}
            type="button"
            className={a.chave === atual ? "disponibilizacao-aplicativo ativo" : "disponibilizacao-aplicativo"}
            onClick={() => setAtual(a.chave)}
          >
            <span>{a.nome}</span>
            <small>
              {a.selecionados.length} tipo(s)
              {a.configurado ? "" : " · sugerido"}
            </small>
          </button>
        ))}
      </aside>

      {/* `key` no formulário: trocar de aplicativo tem de recarregar as caixas
          com o que aquele aplicativo oferece. Sem remontar, as marcas do
          anterior ficariam na tela e seriam gravadas no seguinte. */}
      <form className="disponibilizacao-tipos" action={gravar} key={aplicativo.chave}>
        <input type="hidden" name="aplicativo" value={aplicativo.chave} />

        <header>
          <div>
            <h2>{aplicativo.nome}</h2>
            <p className="muted">
              {aplicativo.configurado
                ? "Marcação desta empresa."
                : "Ainda não configurado: as marcas abaixo são a sugestão do catálogo. Gravar transforma sugestão em decisão."}
            </p>
          </div>
          <button type="submit" className="button button-primary" disabled={gravando}>
            {gravando ? "Gravando…" : "Gravar disponibilização"}
          </button>
        </header>

        {estado.mensagem ? (
          <p className={estado.ok ? "editor-aviso ok" : "editor-aviso erro"} role="status" aria-live="polite">
            {estado.mensagem}
          </p>
        ) : null}

        {categorias().map(categoria => (
          <fieldset key={categoria}>
            <legend>{ROTULO_CATEGORIA[categoria]}</legend>
            {TIPOS.filter(t => t.categoria === categoria).map(t => (
              <label key={t.chave} className="disponibilizacao-tipo">
                <input
                  type="checkbox"
                  name="tipo"
                  value={t.chave}
                  defaultChecked={aplicativo.selecionados.includes(t.chave)}
                />
                <span>
                  <strong>{t.rotulo}</strong>
                  <small>{t.descricao}</small>
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </form>
    </div>
  );
}
