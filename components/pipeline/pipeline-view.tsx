"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState, useTransition } from "react";
import {
  CalendarBlank,
  ChartBar,
  Kanban,
  ListBullets,
  MapPin,
  Pulse,
  Table,
  type Icon
} from "@phosphor-icons/react";
import { moverCartao } from "@/app/actions/pipeline";
import { BuscaDaBarra, useBusca } from "@/components/casca/busca-da-barra";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { SeletorDeFunil, type FunilDisponivel } from "./seletor-de-funil";
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
  clientes: RegistroDisponivel[];
  rotuloRegistro: string;
  funis: FunilDisponivel[];
  funilAtual: FunilDisponivel;
  presets: { chave: string; rotulo: string }[];
};

type Visao = "kanban" | "lista" | "calendario" | "tabela" | "grafico" | "localizacao" | "atividades";

const VISOES: { valor: Visao; rotulo: string; Icone: Icon }[] = [
  { valor: "kanban", rotulo: "Kanban", Icone: Kanban },
  { valor: "lista", rotulo: "Lista", Icone: ListBullets },
  { valor: "calendario", rotulo: "Calendário", Icone: CalendarBlank },
  { valor: "tabela", rotulo: "Tabela dinâmica", Icone: Table },
  { valor: "grafico", rotulo: "Gráfico", Icone: ChartBar },
  { valor: "localizacao", rotulo: "Localização", Icone: MapPin },
  { valor: "atividades", rotulo: "Atividades", Icone: Pulse }
];

export function PipelineView({
  trilha,
  pipelineId,
  colunas,
  orfaos,
  podeEditar,
  registros,
  clientes,
  rotuloRegistro,
  funis,
  funilAtual,
  presets
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
          de 44px no lugar do título de 180px. A busca é trabalho e por isso
          mora na barra 2; os nomes dos ícones permanecem no aria-label. */}
      <BarraDeTrabalho
        title={funilAtual.name}
        primaryAction={podeEditar ? (
            <button
              type="button"
              className="button button-primary barra-controle-novo"
              onClick={() => setAdicionandoEm(colunasFiltradas[0]?.etapa.id ?? null)}
              disabled={colunasFiltradas.length === 0}
            >
              Novo
            </button>
          ) : null}
        identity={
          <SeletorDeFunil
            trilha={trilha}
            funis={funis}
            atual={funilAtual}
            presets={presets}
            podeConfigurar={podeEditar}
            aoFalhar={setErro}
          />
        }
        meta={
          <span className="pipeline-contagem">
            {totalCartoes} {totalCartoes === 1 ? "cartão" : "cartões"}
          </span>
        }
        search={
          <Suspense fallback={<div className="barra-busca-vazia" aria-hidden="true" />}>
            <BuscaDaBarra />
          </Suspense>
        }
        controls={
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
                <item.Icone size={17} weight={visao === item.valor ? "fill" : "regular"} aria-hidden="true" />
              </button>
            ))}
          </div>
        }
      />

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
                  trilha={trilha}
                  clientes={clientes}
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
      ) : visao === "lista" ? (
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
      ) : (
        <VisaoAnalitica visao={visao} colunas={colunasFiltradas} trilha={trilha} agora={agora} />
      )}
    </section>
  );
}

function VisaoAnalitica({
  visao,
  colunas,
  trilha,
  agora
}: {
  visao: Exclude<Visao, "kanban" | "lista">;
  colunas: ColunaPipeline[];
  trilha: Trilha;
  agora: Date;
}) {
  const itens = colunas.flatMap(coluna =>
    ordenarPorUrgencia(coluna.cartoes, agora).map(cartao => ({
      cartao,
      etapa: coluna.etapa,
      prazo: prazoPrincipal(cartao, agora)
    }))
  );
  const total = Math.max(1, itens.length);

  if (visao === "calendario") {
    return (
      <div className="pipeline-painel pipeline-calendario">
        <CabecalhoDaVisao
          icone={<CalendarBlank size={22} aria-hidden="true" />}
          titulo="Calendário de compromissos"
          descricao="Prazos priorizados por data e urgência."
        />
        <div className="pipeline-calendario-grade">
          {itens.map(({ cartao, etapa, prazo }) => (
            <Link key={cartao.id} href={`/app/pipeline/${trilha}/${cartao.id}`} className="pipeline-calendario-item">
              <time dateTime={prazo?.data}>{prazo ? formatarData(prazo.data) : "Sem data"}</time>
              <strong>{cartao.titulo}</strong>
              <span>
                {etapa.name} · {prazo ? rotuloSituacao(prazo.situacao) : "Defina um prazo"}
              </span>
            </Link>
          ))}
          {itens.length === 0 ? <EstadoVazio texto="Nenhum compromisso para exibir." /> : null}
        </div>
      </div>
    );
  }

  if (visao === "tabela") {
    return (
      <div className="pipeline-painel pipeline-lista-envelope">
        <table className="pipeline-lista pipeline-tabela-dinamica">
          <thead>
            <tr>
              <th scope="col">Etapa</th>
              <th scope="col">Cartões</th>
              <th scope="col">Participação</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {colunas.map(coluna => (
              <tr key={coluna.etapa.id}>
                <td>{coluna.etapa.name}</td>
                <td>{coluna.quantidade}</td>
                <td>{Math.round((coluna.quantidade / total) * 100)}%</td>
                <td>{formatarMoeda(coluna.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (visao === "grafico") {
    const maior = Math.max(1, ...colunas.map(coluna => coluna.quantidade));
    return (
      <div className="pipeline-painel pipeline-grafico">
        <CabecalhoDaVisao
          icone={<ChartBar size={22} aria-hidden="true" />}
          titulo="Distribuição por etapa"
          descricao="Volume e valor corrente do funil."
        />
        <div className="pipeline-grafico-grade">
          {colunas.map(coluna => (
            <div className="pipeline-grafico-linha" key={coluna.etapa.id}>
              <strong>{coluna.etapa.name}</strong>
              <progress max={maior} value={coluna.quantidade} />
              <span>
                {coluna.quantidade} · {formatarMoeda(coluna.valor)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visao === "localizacao") {
    return (
      <div className="pipeline-painel pipeline-localizacao">
        <CabecalhoDaVisao
          icone={<MapPin size={22} aria-hidden="true" />}
          titulo="Localização dos cartões"
          descricao="Somente endereços válidos serão posicionados no mapa."
        />
        <EstadoVazio texto="Os cartões deste funil ainda não possuem localização cadastrada." />
        <ul>
          {itens.slice(0, 5).map(({ cartao }) => (
            <li key={cartao.id}>
              <Link href={`/app/pipeline/${trilha}/${cartao.id}`}>{cartao.titulo}</Link>
              <span>Localização pendente</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="pipeline-painel pipeline-atividades">
      <CabecalhoDaVisao
        icone={<Pulse size={22} aria-hidden="true" />}
        titulo="Atividades e próximos prazos"
        descricao="Quem precisa agir e qual compromisso está mais próximo."
      />
      <ol>
        {itens.map(({ cartao, etapa, prazo }) => (
          <li key={cartao.id}>
            <span className={`pipeline-atividade-status ${prazo ? `estado-${prazo.situacao.estado}` : ""}`} />
            <div>
              <Link href={`/app/pipeline/${trilha}/${cartao.id}`}>{cartao.titulo}</Link>
              <span>
                {etapa.name} · {cartao.responsavel ?? "Responsável não definido"}
              </span>
            </div>
            <time dateTime={prazo?.data}>{prazo ? formatarData(prazo.data) : "Sem prazo"}</time>
          </li>
        ))}
      </ol>
      {itens.length === 0 ? <EstadoVazio texto="Nenhuma atividade para exibir." /> : null}
    </div>
  );
}

function CabecalhoDaVisao({
  icone,
  titulo,
  descricao
}: {
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <header className="pipeline-painel-cabecalho">
      {icone}
      <div>
        <strong>{titulo}</strong>
        <span>{descricao}</span>
      </div>
    </header>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return <p className="pipeline-visao-vazia">{texto}</p>;
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
