"use client";

import { ArrowRight, SlidersHorizontal } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useBusca } from "./busca-da-barra";
import { corDoModulo, IconeDoModulo } from "./icones";

export type AplicativoAutorizado = {
  chave: string;
  nome: string;
  descricao: string;
  categoria: string;
  href: string;
  nivel: string;
};

type Indicador = {
  rotulo: string;
  valor: string;
  apoio?: string;
  progresso?: number;
};

const ROTULO_NIVEL: Record<string, string> = {
  READ: "Leitura",
  READ_WRITE: "Leitura e edição",
  FULL: "Acesso completo"
};

const INDICADORES_DEMONSTRACAO: Record<string, Indicador> = {
  clientes: { rotulo: "Clientes ativos", valor: "1.243", apoio: "+12%", progresso: 76 },
  obras: { rotulo: "Em andamento", valor: "18", apoio: "12 em execução", progresso: 64 },
  planejamento: { rotulo: "Cronogramas ativos", valor: "27", apoio: "4 exigem decisão", progresso: 58 },
  tarefas: { rotulo: "Em aberto", valor: "142", apoio: "18 atrasadas", progresso: 72 },
  diario: { rotulo: "Último registro", valor: "28/07/2026", apoio: "Obra Residencial Vereda", progresso: 82 },
  equipes: { rotulo: "Pessoas alocadas", valor: "236", apoio: "12 equipes", progresso: 69 },
  orcamentos: { rotulo: "Em análise", valor: "14", apoio: "R$ 3,8 mi", progresso: 61 },
  propostas: { rotulo: "Enviadas", valor: "23", apoio: "7 aguardando retorno", progresso: 54 },
  contratos: { rotulo: "Vigentes", valor: "31", apoio: "3 renovações próximas", progresso: 73 },
  documentos: { rotulo: "Arquivos", valor: "8.742", apoio: "64% de 15 GB", progresso: 64 },
  qualidade: { rotulo: "Não conformidades", valor: "9", apoio: "2 críticas", progresso: 32 },
  financeiro: { rotulo: "Conciliação", valor: "94%", apoio: "7 pendências", progresso: 94 },
  compras: { rotulo: "Pedidos abertos", valor: "38", apoio: "6 críticos", progresso: 66 },
  estoque: { rotulo: "Itens monitorados", valor: "2.418", apoio: "11 abaixo do mínimo", progresso: 78 },
  sac: { rotulo: "Chamados abertos", valor: "17", apoio: "3 vencendo hoje", progresso: 48 },
  relatorios: { rotulo: "Painéis salvos", valor: "12", apoio: "Atualizados hoje", progresso: 85 },
  auditoria: { rotulo: "Eventos hoje", valor: "286", apoio: "Sem bloqueios", progresso: 91 },
  administracao: { rotulo: "Usuários ativos", valor: "84", apoio: "16 perfis", progresso: 80 }
};

const TODAS = "__todas__";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function Launcher({
  aplicativos,
  demonstracao = false
}: {
  aplicativos: AplicativoAutorizado[];
  demonstracao?: boolean;
}) {
  const busca = useBusca();
  const [categoria, setCategoria] = useState(TODAS);
  const [personalizando, setPersonalizando] = useState(false);
  const [mostrarIndicadores, setMostrarIndicadores] = useState(true);
  const [compacto, setCompacto] = useState(false);

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

  const destaque = encontrados.find(app => app.chave === "crm") ?? null;
  const demais = destaque ? encontrados.filter(app => app.chave !== destaque.chave) : encontrados;

  return (
    <section className={compacto ? "launcher compacto" : "launcher"} aria-labelledby="launcher-titulo">
      <header className="launcher-faixa">
        <h1 id="launcher-titulo">Aplicativos</h1>

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

        <div className="launcher-personalizacao">
          <button
            type="button"
            className="launcher-personalizar"
            aria-expanded={personalizando}
            onClick={() => setPersonalizando(valor => !valor)}
          >
            <SlidersHorizontal size={17} weight="regular" aria-hidden="true" />
            Personalizar
          </button>
          {personalizando ? (
            <div className="launcher-personalizar-painel" role="dialog" aria-label="Personalizar aplicativos">
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
          {destaque ? <AplicativoDestaque aplicativo={destaque} /> : null}
          <ul className="launcher-grade">
            {demais.map(app => (
              <li key={app.chave}>
                <AplicativoCard
                  aplicativo={app}
                  indicador={demonstracao ? INDICADORES_DEMONSTRACAO[app.chave] : undefined}
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

function AplicativoDestaque({ aplicativo }: { aplicativo: AplicativoAutorizado }) {
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

      <div className="launcher-recentes">
        <strong>Recentes</strong>
        <Link href={aplicativo.href}>
          <span><b>OP-2026-1147</b><small>Oportunidade · Construtora Alfa</small></span>
          <span><b>R$ 2,4 mi</b><small>Hoje</small></span>
        </Link>
        <Link href={aplicativo.href}>
          <span><b>OP-2026-1132</b><small>Negociação · Residencial Vereda</small></span>
          <span><b>R$ 980 mil</b><small>Ontem</small></span>
        </Link>
      </div>

      <Link href={aplicativo.href} className="launcher-ver-todas">
        Ver todas no aplicativo
        <ArrowRight size={15} weight="regular" aria-hidden="true" />
      </Link>
    </article>
  );
}

function AplicativoCard({
  aplicativo,
  indicador,
  mostrarIndicadores
}: {
  aplicativo: AplicativoAutorizado;
  indicador?: Indicador;
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
        <span className="launcher-indicador">
          <small>{indicador?.rotulo ?? "Permissão no módulo"}</small>
          <b>{indicador?.valor ?? ROTULO_NIVEL[aplicativo.nivel] ?? aplicativo.nivel}</b>
          {indicador?.apoio ? <em>{indicador.apoio}</em> : null}
          {indicador?.progresso !== undefined ? (
            <progress max={100} value={indicador.progresso} aria-label={`${indicador.rotulo}: ${indicador.valor}`} />
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
