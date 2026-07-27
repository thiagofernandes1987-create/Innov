"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { moverCartao } from "@/app/actions/pipeline";
import { useBusca } from "@/components/casca/busca-da-barra";
import {
  BotaoNovoCartao,
  FormularioNovoCartao,
  MenuDaEtapa,
  NovaEtapa,
  type RegistroDisponivel
} from "./coluna-acoes";
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
  pipelineId: string;
  colunas: ColunaPipeline[];
  orfaos: CartaoPipeline[];
  podeEditar: boolean;
  registros: RegistroDisponivel[];
  rotuloRegistro: string;
  nomeDoPipeline: string;
};

type Visao = "kanban" | "lista";

// As duas visualizações que existem hoje. O padrão de mercado tem sete —
// kanban, lista, calendário, tabela dinâmica, gráfico, mapa e atividades — e
// esta faixa é onde elas entram quando existirem. Ícone de visualização que não
// funciona é pior que ícone ausente, então só entra o que já lê dados.
const VISOES: { valor: Visao; rotulo: string; desenho: React.ReactElement }[] = [
  {
    valor: "kanban",
    rotulo: "Kanban",
    desenho: (
      <>
        <rect x="3" y="4" width="6" height="16" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="11" y="4" width="6" height="10" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="19" y="4" width="2" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </>
    )
  },
  {
    valor: "lista",
    rotulo: "Lista",
    desenho: (
      <path
        d="M4 6.5h16M4 12h16M4 17.5h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    )
  }
];

export function PipelineView({
  trilha,
  pipelineId,
  colunas,
  orfaos,
  podeEditar,
  registros,
  rotuloRegistro,
  nomeDoPipeline
}: Props) {
  const [visao, setVisao] = useState<Visao>("kanban");
  // O termo vem da busca da barra superior. Estado local aqui criaria dois
  // donos do mesmo filtro, e um deles sempre desatualizado.
  const busca = useBusca();
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [adicionandoEm, setAdicionandoEm] = useState<string | null>(null);
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
      {/* Barra de controle no padrão de mercado: criar à esquerda, nome da tela
          ao lado, busca no centro, visualizações em ícone à direita. Uma faixa
          de 44px no lugar do título de 180px. */}
      <header className="barra-controle">
        <div className="barra-controle-esquerda">
          {podeEditar ? (
            <button
              type="button"
              className="button button-primary barra-controle-novo"
              onClick={() => setAdicionandoEm(colunasFiltradas[0]?.etapa.id ?? null)}
              disabled={colunasFiltradas.length === 0}
            >
              Novo
            </button>
          ) : null}
          <h1 className="barra-controle-titulo">{nomeDoPipeline}</h1>
          <span className="pipeline-contagem">
            {totalCartoes} {totalCartoes === 1 ? "cartão" : "cartões"}
          </span>
        </div>

        {/* Sem busca aqui: ela subiu para o centro da barra 1, e repetir o
            campo nas duas faixas é dois lugares para a mesma pergunta. */}

        {/* Ícone, não palavra: "Ícones, igual ao Odoo, ocupam menos espaço,
            poluem menos e facilita a leitura do pipeline". O nome continua no
            `aria-label` e no `title`, para quem usa leitor de tela e para quem
            passa o mouse. */}
        <div className="barra-controle-visoes" role="group" aria-label="Visualização">
          {VISOES.map(item => (
            <button
              key={item.valor}
              type="button"
              className={visao === item.valor ? "barra-visao ativa" : "barra-visao"}
              onClick={() => setVisao(item.valor)}
              aria-pressed={visao === item.valor}
              aria-label={item.rotulo}
              title={item.rotulo}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                {item.desenho}
              </svg>
            </button>
          ))}
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
                {/* Engrenagem antes do `+`, na ordem do padrão de mercado. */}
                {podeEditar ? (
                  <span className="pipeline-coluna-acoes">
                    <MenuDaEtapa
                      stageId={coluna.etapa.id}
                      nome={coluna.etapa.name}
                      recolhida={coluna.etapa.recolhida}
                      aoFalhar={setErro}
                    />
                    <BotaoNovoCartao
                      etapa={coluna.etapa.name}
                      aberto={adicionandoEm === coluna.etapa.id}
                      aoAlternar={() =>
                        setAdicionandoEm(atual => (atual === coluna.etapa.id ? null : coluna.etapa.id))
                      }
                    />
                  </span>
                ) : null}
              </header>
              <div
                className="pipeline-coluna-progresso"
                role="presentation"
                style={{ ["--preenchimento" as string]: `${Math.round((coluna.quantidade / maiorColuna) * 100)}%` }}
              />

              {adicionandoEm === coluna.etapa.id ? (
                <FormularioNovoCartao
                  pipelineId={pipelineId}
                  stageId={coluna.etapa.id}
                  registros={registros}
                  rotuloRegistro={rotuloRegistro}
                  aoFalhar={setErro}
                  aoFechar={() => setAdicionandoEm(null)}
                />
              ) : null}

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
          {podeEditar ? <NovaEtapa pipelineId={pipelineId} aoFalhar={setErro} /> : null}
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
