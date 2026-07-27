"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { corDoModulo, IconeDoModulo } from "./icones";

// Tela inicial de aplicativos.
//
// A lista já chega filtrada pela permissão do usuário — quem é da produção vê
// diário de campo, tarefas e contatos; quem é do financeiro vê financeiro e
// orçamentos. Nada é escondido por CSS: o que não veio da consulta não existe
// nesta tela, e a mesma regra vale no banco.
//
// Grade única e alinhada, seis por linha. Antes as categorias eram títulos de
// seção, e uma categoria com um aplicativo só deixava cinco buracos na linha —
// a tela parecia desarrumada justamente por estar organizada demais. A
// categoria virou filtro: agrupa quando se quer, sem quebrar o alinhamento.

export type AplicativoAutorizado = {
  chave: string;
  nome: string;
  descricao: string;
  categoria: string;
  href: string;
  nivel: string;
};

const ROTULO_NIVEL: Record<string, string> = {
  READ: "Leitura",
  READ_WRITE: "Leitura e edição",
  FULL: "Acesso completo"
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const TODAS = "__todas__";

export function Launcher({ aplicativos }: { aplicativos: AplicativoAutorizado[] }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState(TODAS);

  const categorias = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const app of aplicativos) contagem.set(app.categoria, (contagem.get(app.categoria) ?? 0) + 1);
    return [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [aplicativos]);

  const encontrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return aplicativos.filter(app => {
      if (categoria !== TODAS && app.categoria !== categoria) return false;
      if (!termo) return true;
      return [app.nome, app.descricao, app.categoria].some(campo => normalizar(campo).includes(termo));
    });
  }, [aplicativos, busca, categoria]);

  return (
    <div className="launcher">
      <div className="launcher-controles">
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
        </div>

        {categorias.length > 1 ? (
          <div className="launcher-filtros" role="group" aria-label="Filtrar por categoria">
            <button
              type="button"
              className={categoria === TODAS ? "launcher-filtro ativo" : "launcher-filtro"}
              aria-pressed={categoria === TODAS}
              onClick={() => setCategoria(TODAS)}
            >
              Todos <span>{aplicativos.length}</span>
            </button>
            {categorias.map(([nome, quantidade]) => (
              <button
                key={nome}
                type="button"
                className={categoria === nome ? "launcher-filtro ativo" : "launcher-filtro"}
                aria-pressed={categoria === nome}
                onClick={() => setCategoria(nome)}
              >
                {nome} <span>{quantidade}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {encontrados.length === 0 ? (
        <p className="launcher-vazio" role="status">
          {aplicativos.length === 0
            ? "Nenhum aplicativo liberado para o seu perfil nesta organização. Fale com quem administra os acessos."
            : "Nenhum aplicativo corresponde ao que você procura."}
        </p>
      ) : (
        <ul className="launcher-grade">
          {encontrados.map(app => (
            <li key={app.chave}>
              <Link
                href={app.href}
                className="launcher-app"
                title={app.descricao}
                style={{ ["--cor-app" as string]: corDoModulo(app.chave) }}
              >
                <span className="launcher-app-icone" aria-hidden="true">
                  <IconeDoModulo chave={app.chave} />
                </span>
                <strong>{app.nome}</strong>
                <small>{ROTULO_NIVEL[app.nivel] ?? app.nivel}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
