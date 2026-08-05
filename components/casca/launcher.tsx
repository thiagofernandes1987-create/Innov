"use client";

import { ArrowRight, SlidersHorizontal } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LauncherSummary, LauncherSummaryMap } from "@/lib/casca/launcher-domain";
import { useBusca } from "./busca-da-barra";
import { corDoModulo, IconeDoModulo } from "./icones";
import type { Indicador } from "@/lib/casca/indicadores";

export type AplicativoAutorizado = {
  chave: string;
  nome: string;
  descricao: string;
  categoria: string;
  href: string;
  nivel: string;
};





const TODAS = "__todas__";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resumoDe(chave: string, resumos: LauncherSummaryMap): LauncherSummary {
  return resumos[chave] ?? {
    label: "Acesso ao aplicativo",
    value: "Ativo",
    support: "Indicadores serão consolidados neste módulo",
    progress: null,
    available: false
  };
}

export function Launcher({
  aplicativos,
  indicadores = {}
}: {
  aplicativos: AplicativoAutorizado[];
  /** Contagem real por módulo. Ausente = card sem indicador, nunca número inventado. */
  indicadores?: Record<string, Indicador>;
}) {
  const busca = useBusca();
  const [categoria, setCategoria] = useState(TODAS);
  const [personalizando, setPersonalizando] = useState(false);
  const [mostrarIndicadores, setMostrarIndicadores] = useState(true);
  const [compacto, setCompacto] = useState(false);
  const personalizacaoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!personalizando) return;

    function fecharAoClicarFora(evento: MouseEvent | TouchEvent) {
      if (!personalizacaoRef.current?.contains(evento.target as Node)) setPersonalizando(false);
    }

    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setPersonalizando(false);
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("touchstart", fecharAoClicarFora, { passive: true });
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("touchstart", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [personalizando]);

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
      const resumo = resumoDe(app.chave, resumos);
      return [app.nome, app.descricao, app.categoria, resumo.label, resumo.value, resumo.support ?? ""]
        .some(campo => normalizar(campo).includes(termo));
    });
  }, [aplicativos, busca, categoria, resumos]);

  const destaque = encontrados.find(app => app.chave === "crm") ?? null;
  const demais = destaque ? encontrados.filter(app => app.chave !== destaque.chave) : encontrados;

  return (
    <section className={compacto ? "launcher compacto" : "launcher"} aria-labelledby="launcher-titulo">
      <header className="launcher-faixa">
        <div className="launcher-titulo-grupo">
          <h1 id="launcher-titulo">Aplicativos</h1>
          <span>{encontrados.length} disponível(is)</span>
        </div>

        {categorias.length > 1 ? (
          <div className="launcher-filtros" role="group" aria-label="Filtrar por categoria">
            <button
              type="button"
              className={categoria === TODAS ? "launcher-filtro ativo" : "launcher-filtro"}
              aria-pressed={categoria === TODAS}
              onClick={() => setCategoria(TODAS)}
            >
              Todos
            </button>
            {categorias.map(([nome]) => (
              <button
                key={nome}
                type="button"
                className={categoria === nome ? "launcher-filtro ativo" : "launcher-filtro"}
                aria-pressed={categoria === nome}
                onClick={() => setCategoria(nome)}
              >
                {nome}
              </button>
            ))}
          </div>
        ) : null}

        <div className="launcher-personalizacao" ref={personalizacaoRef}>
          <button
            type="button"
            className="launcher-personalizar"
            aria-expanded={personalizando}
            aria-controls="launcher-personalizar-painel"
            onClick={() => setPersonalizando(valor => !valor)}
          >
            <SlidersHorizontal size={17} weight="regular" aria-hidden="true" />
            Personalizar
          </button>
          {personalizando ? (
            <div id="launcher-personalizar-painel" className="launcher-personalizar-painel" role="dialog" aria-label="Personalizar aplicativos">
              <label>
                <input
                  type="checkbox"
                  checked={mostrarIndicadores}
                  onChange={evento => setMostrarIndicadores(evento.target.checked)}
                />
                Mostrar indicadores
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={compacto}
                  onChange={evento => setCompacto(evento.target.checked)}
                />
                Cards compactos
              </label>
            </div>
          ) : null}
        </div>
      </header>

      {encontrados.length === 0 ? (
        <p className="launcher-vazio" role="status">
          {aplicativos.length === 0
            ? "Nenhum aplicativo liberado para o seu perfil nesta organização."
            : "Nenhum aplicativo corresponde à busca ou ao filtro selecionado."}
        </p>
      ) : (
        <div className={destaque ? "launcher-paineis com-destaque" : "launcher-paineis"}>
          {destaque ? (
            <AplicativoDestaque aplicativo={destaque} resumo={resumoDe(destaque.chave, resumos)} mostrarIndicadores={mostrarIndicadores} />
          ) : null}
          <ul className="launcher-grade">
            {demais.map(app => (
              <li key={app.chave}>
                <AplicativoCard
                  aplicativo={app}
                  indicador={indicadores[app.chave]}
                  mostrarIndicadores={mostrarIndicadores}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function AplicativoDestaque({
  aplicativo,
  resumo,
  mostrarIndicadores
}: {
  aplicativo: AplicativoAutorizado;
  resumo: LauncherSummary;
  mostrarIndicadores: boolean;
}) {
  const cor = corDoModulo(aplicativo.chave);
  return (
    <article className="launcher-destaque" style={{ ["--cor-app" as string]: cor }}>
      <div className="launcher-card-topo">
        <span className="launcher-app-icone" aria-hidden="true">
          <IconeDoModulo chave={aplicativo.chave} tamanho={30} />
        </span>
        <span className="launcher-categoria">{aplicativo.categoria}</span>
      </div>
      <h2>{aplicativo.nome}</h2>
      <p>{aplicativo.descricao}</p>
      <Link href={aplicativo.href} className="launcher-acessar">
        Acessar
        <ArrowRight size={18} weight="regular" aria-hidden="true" />
      </Link>

      {mostrarIndicadores ? (
        <div className="launcher-destaque-resumo" data-available={resumo.available}>
          <span>
            <small>{resumo.label}</small>
            <strong>{resumo.value}</strong>
            {resumo.support ? <em>{resumo.support}</em> : null}
          </span>
          {resumo.secondaryLabel ? (
            <span>
              <small>{resumo.secondaryLabel}</small>
              <strong>{resumo.secondaryValue ?? "—"}</strong>
            </span>
          ) : null}
          <MiniGrafico progress={resumo.progress} />
        </div>
      ) : null}

      {resumo.recent?.length ? (
        <div className="launcher-recentes">
          <strong>Recentes</strong>
          {resumo.recent.map(item => (
            <Link href={item.href} key={item.id}>
              <span><b>{item.title}</b><small>{item.subtitle}</small></span>
              <span><b>{item.meta ?? ""}</b><small>Abrir</small></span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="launcher-recentes launcher-recentes-vazio">
          <strong>Recentes</strong>
          <p>Nenhum registro recente confirmado.</p>
        </div>
      )}

      <Link href={aplicativo.href} className="launcher-ver-todas">
        Ver todas no aplicativo
        <ArrowRight size={15} weight="regular" aria-hidden="true" />
      </Link>
    </article>
  );
}

function AplicativoCard({
  aplicativo,
  resumo,
  mostrarIndicadores
}: {
  aplicativo: AplicativoAutorizado;
  resumo: LauncherSummary;
  mostrarIndicadores: boolean;
}) {
  const cor = corDoModulo(aplicativo.chave);
  return (
    <Link
      href={aplicativo.href}
      className="launcher-app"
      title={aplicativo.descricao}
      style={{ ["--cor-app" as string]: cor }}
    >
      <span className="launcher-card-topo">
        <span className="launcher-app-icone" aria-hidden="true">
          <IconeDoModulo chave={aplicativo.chave} tamanho={27} />
        </span>
        <span className="launcher-categoria">{aplicativo.categoria}</span>
      </span>
      <strong>{aplicativo.nome}</strong>
      <p>{aplicativo.descricao}</p>

      {mostrarIndicadores ? (
        <span className="launcher-indicador" data-available={resumo.available}>
          <small>{resumo.label}</small>
          <b>{resumo.value}</b>
          {resumo.support ? <em>{resumo.support}</em> : null}
          {resumo.secondaryLabel ? (
            <span className="launcher-indicador-secundario">
              <small>{resumo.secondaryLabel}</small>
              <strong>{resumo.secondaryValue ?? "—"}</strong>
            </span>
          ) : null}
          <MiniGrafico progress={resumo.progress} />
        </span>
      ) : null}
    </Link>
  );
}

// ── Formas do micro-indicador ───────────────────────────────────────────────
//
// Alvo visual de 2 de agosto: a forma acompanha a natureza do dado, não o gosto
// de quem desenha. Série para o que varia no tempo, etapas para o que percorre
// um fluxo, faixas para o que se reparte entre estados, uso para o que enche,
// barras para distribuição, pessoas para quem é gente.
//
// Tudo em SVG inline e CSS: nenhuma biblioteca de gráfico entra na tela inicial,
// que é a primeira coisa que todo usuário carrega.

function FormaDoIndicador({ indicador }: { indicador: Indicador }) {
  const forma = indicador.forma;
  if (!forma) return null;

  if (forma.tipo === "serie") {
    const pontos = forma.pontos;
    if (pontos.length < 2) return null;
    const max = Math.max(...pontos);
    const min = Math.min(...pontos);
    const faixa = max - min || 1;
    const d = pontos
      .map((v, i) => `${(i / (pontos.length - 1)) * 100},${28 - ((v - min) / faixa) * 24}`)
      .join(" L ");
    return (
      <svg className="ind-serie" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
        <path d={`M ${d}`} fill="none" stroke="var(--cor-app, currentColor)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  if (forma.tipo === "etapas") {
    return (
      <span className="ind-etapas" aria-hidden="true">
        {forma.etapas.map(etapa => (
          <span key={etapa.rotulo} className={etapa.ativo ? "ind-etapa ativa" : "ind-etapa"}>
            <i />
            <small>{etapa.rotulo}</small>
          </span>
        ))}
      </span>
    );
  }

  if (forma.tipo === "faixas") {
    const total = forma.faixas.reduce((soma, f) => soma + f.valor, 0) || 1;
    return (
      <span className="ind-faixas">
        <span className="ind-faixas-barra" aria-hidden="true">
          {forma.faixas.map(f => (
            <i key={f.rotulo} data-tom={f.tom} style={{ width: `${(f.valor / total) * 100}%` }} />
          ))}
        </span>
        <span className="ind-faixas-legenda">
          {forma.faixas.map(f => (
            <span key={f.rotulo}>
              <i data-tom={f.tom} aria-hidden="true" />
              {f.rotulo}
              <b>{f.valor}</b>
            </span>
          ))}
        </span>
      </span>
    );
  }

  if (forma.tipo === "uso") {
    return (
      <span className="ind-uso">
        <progress max={100} value={forma.percentual} aria-label={`${indicador.rotulo}: ${forma.apoio}`} />
        <small>{forma.apoio}</small>
      </span>
    );
  }

  if (forma.tipo === "barras") {
    const max = Math.max(...forma.valores, 1);
    return (
      <span className="ind-barras" aria-hidden="true">
        {forma.valores.map((v, i) => (
          <i key={i} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
        ))}
      </span>
    );
  }

  if (forma.tipo === "pessoas") {
    const bolhas = Math.min(5, forma.total);
    const resto = forma.total - bolhas;
    return (
      <span className="ind-pessoas" aria-hidden="true">
        {Array.from({ length: bolhas }, (_, i) => (
          <i key={i} />
        ))}
        {resto > 0 ? <b>+{resto}</b> : null}
      </span>
    );
  }

  return null;
}
