"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconeDoModulo } from "./icones";

// Tela inicial de aplicativos.
//
// A lista já chega filtrada pela permissão do usuário — quem é da produção vê
// diário de campo, tarefas e contatos; quem é do financeiro vê financeiro e
// orçamentos. Nada é escondido por CSS: o que não veio da consulta não existe
// nesta tela, e a mesma regra vale no banco.
//
// Sem menu lateral. Um menu que lista tudo e desabilita metade ensina o usuário
// a ignorar o que está cinza; a grade só mostra o que abre.

export type AplicativoAutorizado = {
  chave: string;
  nome: string;
  descricao: string;
  categoria: string;
  href: string;
  nivel: string;
};

const ROTULO_NIVEL: Record<string, string> = {
  READ: "Somente leitura",
  READ_WRITE: "Leitura e edição",
  FULL: "Acesso completo"
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function Launcher({ aplicativos }: { aplicativos: AplicativoAutorizado[] }) {
  const [busca, setBusca] = useState("");

  const encontrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return aplicativos;
    return aplicativos.filter(app =>
      [app.nome, app.descricao, app.categoria].some(campo => normalizar(campo).includes(termo))
    );
  }, [aplicativos, busca]);

  const categorias = useMemo(() => {
    const mapa = new Map<string, AplicativoAutorizado[]>();
    for (const app of encontrados) {
      const lista = mapa.get(app.categoria) ?? [];
      lista.push(app);
      mapa.set(app.categoria, lista);
    }
    return [...mapa.entries()];
  }, [encontrados]);

  return (
    <div className="launcher">
      <div className="launcher-busca">
        <label htmlFor="busca-aplicativo" className="sr-only">
          Buscar aplicativo
        </label>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="launcher-busca-icone">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          id="busca-aplicativo"
          type="search"
          value={busca}
          onChange={event => setBusca(event.target.value)}
          placeholder="Buscar aplicativo…"
          autoComplete="off"
        />
        <span className="launcher-contagem">
          {aplicativos.length} {aplicativos.length === 1 ? "aplicativo" : "aplicativos"}
        </span>
      </div>

      {encontrados.length === 0 ? (
        <p className="launcher-vazio" role="status">
          {aplicativos.length === 0
            ? "Nenhum aplicativo liberado para o seu perfil nesta organização. Fale com quem administra os acessos."
            : `Nenhum aplicativo corresponde a “${busca}”.`}
        </p>
      ) : (
        categorias.map(([categoria, lista]) => (
          <section className="launcher-categoria" key={categoria} aria-labelledby={`cat-${normalizar(categoria)}`}>
            <h2 id={`cat-${normalizar(categoria)}`}>{categoria}</h2>
            <ul className="launcher-grade">
              {lista.map(app => (
                <li key={app.chave}>
                  <Link href={app.href} className="launcher-app" title={app.descricao}>
                    <span className="launcher-app-icone" aria-hidden="true">
                      <IconeDoModulo chave={app.chave} />
                    </span>
                    <strong>{app.nome}</strong>
                    <small>{ROTULO_NIVEL[app.nivel] ?? app.nivel}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
