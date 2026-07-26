"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { moverCartao } from "@/app/actions/pipeline";
import {
  formatarData,
  formatarMoeda,
  ordenarPorUrgencia,
  prazoPrincipal,
  rotuloSituacao,
  type CartaoPipeline,
  type ColunaPipeline,
  type Trilha
} from "@/lib/pipeline/domain";

// Kanban e lista sobre os mesmos dados e o mesmo filtro.
//
// A regra central do padrão de mercado é que a visualização é escolha do
// usuário, não decisão de quem escreveu a tela. Aqui as duas visões leem a
// mesma lista de colunas; trocar de visão não recarrega nada.
//
// Contrato em `diretrizes/PADRAO-DE-INTERFACE.md`, seções 3 e 9.

type Props = {
  trilha: Trilha;
  colunas: ColunaPipeline[];
  orfaos: CartaoPipeline[];
  podeEditar: boolean;
};

type Visao = "kanban" | "lista";

export function PipelineView({ trilha, colunas, orfaos, podeEditar }: Props) {
  const [visao, setVisao] = useState<Visao>("kanban");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const agora = useMemo(() => new Date(), []);

  const colunasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return colunas;
    return colunas.map(coluna => {
      const cartoes = coluna.cartoes.filter(cartao =>
        [cartao.titulo, cartao.subtitulo, ...cartao.marcadores.map(marcador => marcador.nome)]
          .filter(Boolean)
          .some(texto => String(texto).toLowerCase().includes(termo))
      );
      return {
        ...coluna,
        cartoes,
        quantidade: cartoes.length,
        valor: cartoes.reduce((total, cartao) => total + (cartao.valor ?? 0), 0)
      };
    });
  }, [colunas, busca]);

  const totalCartoes = colunasFiltradas.reduce((total, coluna) => total + coluna.quantidade, 0);
  const maiorColuna = Math.max(1, ...colunasFiltradas.map(coluna => coluna.quantidade));

  function soltar(stageId: string) {
    const cardId = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!cardId) return;

    const origem = colunas.find(coluna => coluna.cartoes.some(cartao => cartao.id === cardId));
    if (origem?.etapa.id === stageId) return;

    setErro(null);
    iniciar(async () => {
      const resultado = await moverCartao(cardId, stageId);
      if (!resultado.ok) setErro(resultado.erro);
      else router.refresh();
    });
  }

  return (
    <section className="pipeline" aria-busy={pendente || undefined}>
      <header className="pipeline-controle">
        <div className="pipeline-controle-busca">
          <label className="pipeline-busca">
            <span className="sr-only">Buscar no pipeline</span>
            <input
              type="search"
              value={busca}
              onChange={event => setBusca(event.target.value)}
              placeholder="Buscar por título, cliente ou marcador…"
            />
          </label>
          <span className="pipeline-contagem">
            {totalCartoes} {totalCartoes === 1 ? "cartão" : "cartões"}
          </span>
        </div>
        <div className="pipeline-visoes" role="group" aria-label="Visualização">
          <button
            type="button"
            className={visao === "kanban" ? "pipeline-visao ativa" : "pipeline-visao"}
            onClick={() => setVisao("kanban")}
            aria-pressed={visao === "kanban"}
          >
            Kanban
          </button>
          <button
            type="button"
            className={visao === "lista" ? "pipeline-visao ativa" : "pipeline-visao"}
            onClick={() => setVisao("lista")}
            aria-pressed={visao === "lista"}
          >
            Lista
          </button>
        </div>
      </header>

      {erro ? (
        <p className="pipeline-erro" role="alert">
          {erro}
        </p>
      ) : null}

      {orfaos.length > 0 ? (
        <p className="pipeline-aviso" role="status">
          {orfaos.length} {orfaos.length === 1 ? "cartão está" : "cartões estão"} em uma etapa que não pertence a esta
          trilha e não aparecem nas colunas.
        </p>
      ) : null}

      {visao === "kanban" ? (
        <div className="pipeline-kanban">
          {colunasFiltradas.map(coluna => (
            <div
              key={coluna.etapa.id}
              className={[
                "pipeline-coluna",
                coluna.etapa.recolhida ? "recolhida" : "",
                alvo === coluna.etapa.id ? "alvo" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={event => {
                if (!podeEditar || !arrastando) return;
                event.preventDefault();
                setAlvo(coluna.etapa.id);
              }}
              onDragLeave={() => setAlvo(atual => (atual === coluna.etapa.id ? null : atual))}
              onDrop={event => {
                event.preventDefault();
                soltar(coluna.etapa.id);
              }}
            >
              <header className="pipeline-coluna-cabecalho">
                <strong title={coluna.etapa.name}>{coluna.etapa.name}</strong>
                <span className="pipeline-coluna-numeros">
                  <span className="pipeline-coluna-quantidade">{coluna.quantidade}</span>
                  {coluna.valor > 0 ? <span className="pipeline-coluna-valor">{formatarMoeda(coluna.valor)}</span> : null}
                </span>
              </header>
              <div
                className="pipeline-coluna-progresso"
                role="presentation"
                style={{ ["--preenchimento" as string]: `${Math.round((coluna.quantidade / maiorColuna) * 100)}%` }}
              />

              <div className="pipeline-coluna-cartoes">
                {ordenarPorUrgencia(coluna.cartoes, agora).map(cartao => (
                  <Cartao
                    key={cartao.id}
                    cartao={cartao}
                    trilha={trilha}
                    agora={agora}
                    arrastavel={podeEditar}
                    aoArrastar={() => setArrastando(cartao.id)}
                    aoSoltar={() => setArrastando(null)}
                  />
                ))}
                {coluna.quantidade === 0 ? <p className="pipeline-coluna-vazia">Nenhum cartão</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pipeline-lista-envelope">
          <table className="pipeline-lista">
            <thead>
              <tr>
                <th scope="col">Etapa</th>
                <th scope="col">Cartão</th>
                <th scope="col">Cliente</th>
                <th scope="col">Prazo</th>
                <th scope="col">Situação</th>
                <th scope="col">Marcadores</th>
                <th scope="col">Valor</th>
              </tr>
            </thead>
            <tbody>
              {colunasFiltradas.flatMap(coluna =>
                ordenarPorUrgencia(coluna.cartoes, agora).map(cartao => {
                  const prazo = prazoPrincipal(cartao, agora);
                  return (
                    <tr key={cartao.id}>
                      <td>
                        <span className={`pipeline-etiqueta-etapa categoria-${coluna.etapa.categoria}`}>
                          {coluna.etapa.name}
                        </span>
                      </td>
                      <td>
                        <Link href={`/app/pipeline/${trilha}/${cartao.id}`}>{cartao.titulo}</Link>
                      </td>
                      <td>{cartao.subtitulo ?? "—"}</td>
                      <td>{prazo ? `${prazo.codigo} · ${formatarData(prazo.data)}` : "—"}</td>
                      <td>
                        {prazo ? (
                          <span className={`pipeline-prazo estado-${prazo.situacao.estado}`}>
                            {rotuloSituacao(prazo.situacao)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {cartao.marcadores.length
                          ? cartao.marcadores.map(marcador => (
                              <span className={`pipeline-marcador cor-${marcador.cor}`} key={marcador.id}>
                                {marcador.nome}
                              </span>
                            ))
                          : "—"}
                      </td>
                      <td>{formatarMoeda(cartao.valor)}</td>
                    </tr>
                  );
                })
              )}
              {totalCartoes === 0 ? (
                <tr>
                  <td colSpan={7} className="pipeline-coluna-vazia">
                    Nenhum cartão nesta trilha.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Cartao({
  cartao,
  trilha,
  agora,
  arrastavel,
  aoArrastar,
  aoSoltar
}: {
  cartao: CartaoPipeline;
  trilha: Trilha;
  agora: Date;
  arrastavel: boolean;
  aoArrastar: () => void;
  aoSoltar: () => void;
}) {
  const prazo = prazoPrincipal(cartao, agora);

  return (
    <article
      className={`pipeline-cartao cor-${cartao.cor}`}
      draggable={arrastavel}
      onDragStart={aoArrastar}
      onDragEnd={aoSoltar}
    >
      <Link className="pipeline-cartao-titulo" href={`/app/pipeline/${trilha}/${cartao.id}`}>
        {cartao.titulo}
      </Link>
      {cartao.subtitulo ? <p className="pipeline-cartao-cliente">{cartao.subtitulo}</p> : null}

      {cartao.marcadores.length ? (
        <p className="pipeline-cartao-marcadores">
          {cartao.marcadores.map(marcador => (
            <span className={`pipeline-marcador cor-${marcador.cor}`} key={marcador.id}>
              {marcador.nome}
            </span>
          ))}
        </p>
      ) : null}

      <footer className="pipeline-cartao-rodape">
        <span className="pipeline-estrelas" aria-label={`Prioridade ${cartao.prioridade} de 3`}>
          {[1, 2, 3].map(nivel => (
            <span key={nivel} className={nivel <= cartao.prioridade ? "cheia" : "vazia"} aria-hidden="true">
              ★
            </span>
          ))}
        </span>
        {prazo ? (
          <span className={`pipeline-prazo estado-${prazo.situacao.estado}`} title={`${prazo.codigo} · ${formatarData(prazo.data)}`}>
            {rotuloSituacao(prazo.situacao)}
          </span>
        ) : null}
        {cartao.valor !== null ? <span className="pipeline-cartao-valor">{formatarMoeda(cartao.valor)}</span> : null}
      </footer>
    </article>
  );
}
