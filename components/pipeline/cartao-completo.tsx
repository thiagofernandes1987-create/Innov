"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { definirDataDoCartao, definirPrioridade, moverCartao, registrarObservacao } from "@/app/actions/pipeline";
import { descrever, type CodigoData } from "@/lib/pipeline/datas";
import {
  formatarData,
  formatarMoeda,
  ordenarCodigos,
  prazoPrincipal,
  rotuloSituacao,
  type CartaoPipeline,
  type EtapaPipeline,
  type Trilha
} from "@/lib/pipeline/domain";

// Formulário do cartão, na estrutura da seção 5 do padrão de interface:
// barra de etapas no topo, botões de estatística que abrem os objetos
// relacionados, abas para as seções longas e conversa à direita.

type Aba = "dados" | "projetos" | "documentos" | "chamados" | "prazos";

type Props = {
  trilha: Trilha;
  cartao: CartaoPipeline;
  etapas: EtapaPipeline[];
  datasDaEtapa: { codigo: CodigoData; obrigatoria: boolean }[];
  cliente: Record<string, unknown> | null;
  projetos: { id: string; code: string; name: string; status: string; planned_end: string | null }[];
  documentos: { id: string; title: string | null; category: string | null; created_at: string }[];
  chamados: { id: string; code: string; title: string; status: string; created_at: string }[];
  observacoes: { id: string; tipo: string; corpo: string; autor_id: string | null; created_at: string }[];
  historico: { id: string; de_stage_id: string | null; para_stage_id: string; movido_em: string }[];
  podeEditar: boolean;
};

function texto(valor: unknown): string {
  const bruto = String(valor ?? "").trim();
  return bruto || "—";
}

export function CartaoCompleto(props: Props) {
  const { trilha, cartao, etapas, datasDaEtapa, cliente, projetos, documentos, chamados, observacoes, historico, podeEditar } =
    props;

  const [aba, setAba] = useState<Aba>("dados");
  const [erro, setErro] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const etapaAtual = etapas.find(etapa => etapa.id === cartao.stageId);
  const prazo = prazoPrincipal(cartao);
  const datasPorCodigo = new Map(cartao.datas.map(item => [item.codigo, item.data]));

  function executar(acao: () => Promise<{ ok: true } | { ok: false; erro: string }>) {
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) setErro(resultado.erro);
      else router.refresh();
    });
  }

  const codigosDaEtapa = ordenarCodigos(datasDaEtapa.map(item => item.codigo));
  const obrigatorias = new Set(datasDaEtapa.filter(item => item.obrigatoria).map(item => item.codigo));

  return (
    <div className="cartao-completo" aria-busy={pendente || undefined}>
      <header className="cartao-barra-etapas" aria-label="Etapas">
        {etapas.map(etapa => {
          const atual = etapa.id === cartao.stageId;
          return (
            <button
              key={etapa.id}
              type="button"
              className={[
                "cartao-etapa",
                atual ? "atual" : "",
                `categoria-${etapa.categoria}`
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={atual ? "step" : undefined}
              disabled={!podeEditar || atual || pendente}
              onClick={() => executar(() => moverCartao(cartao.id, etapa.id))}
            >
              {etapa.name}
            </button>
          );
        })}
      </header>

      {erro ? (
        <p className="pipeline-erro" role="alert">
          {erro}
        </p>
      ) : null}

      <div className="cartao-corpo">
        <section className="cartao-folha">
          <div className="cartao-estatisticas" role="group" aria-label="Registros relacionados">
            <button type="button" className="cartao-estatistica" onClick={() => setAba("projetos")}>
              <strong>{projetos.length}</strong>
              <span>Projetos</span>
            </button>
            <button type="button" className="cartao-estatistica" onClick={() => setAba("documentos")}>
              <strong>{documentos.length}</strong>
              <span>Documentos</span>
            </button>
            <button type="button" className="cartao-estatistica" onClick={() => setAba("chamados")}>
              <strong>{chamados.length}</strong>
              <span>Chamados</span>
            </button>
            <button type="button" className="cartao-estatistica" onClick={() => setAba("prazos")}>
              <strong>{cartao.datas.length}</strong>
              <span>Prazos</span>
            </button>
          </div>

          <div className="cartao-titulo">
            <h2>{cartao.titulo}</h2>
            <p className="muted">
              {etapaAtual ? etapaAtual.name : "Etapa desconhecida"}
              {prazo ? (
                <>
                  {" · "}
                  <span className={`pipeline-prazo estado-${prazo.situacao.estado}`}>
                    {prazo.codigo} · {formatarData(prazo.data)} · {rotuloSituacao(prazo.situacao)}
                  </span>
                </>
              ) : null}
            </p>
            <div className="cartao-prioridade" role="group" aria-label="Prioridade">
              {[0, 1, 2, 3].map(nivel => (
                <button
                  key={nivel}
                  type="button"
                  className={nivel <= cartao.prioridade && nivel > 0 ? "estrela cheia" : "estrela"}
                  disabled={!podeEditar || pendente}
                  aria-label={nivel === 0 ? "Sem prioridade" : `Prioridade ${nivel}`}
                  onClick={() => executar(() => definirPrioridade(cartao.id, nivel))}
                >
                  {nivel === 0 ? "∅" : "★"}
                </button>
              ))}
            </div>
            {cartao.marcadores.length ? (
              <p className="pipeline-cartao-marcadores">
                {cartao.marcadores.map(marcador => (
                  <span className={`pipeline-marcador cor-${marcador.cor}`} key={marcador.id}>
                    {marcador.nome}
                  </span>
                ))}
              </p>
            ) : null}
          </div>

          <nav className="cartao-abas" role="tablist" aria-label="Seções do cartão">
            {(
              [
                ["dados", "Dados do cliente"],
                ["projetos", `Projetos (${projetos.length})`],
                ["documentos", `Documentos (${documentos.length})`],
                ["chamados", `Chamados (${chamados.length})`],
                ["prazos", "Prazos e datas"]
              ] as [Aba, string][]
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                role="tab"
                aria-selected={aba === chave}
                className={aba === chave ? "cartao-aba ativa" : "cartao-aba"}
                onClick={() => setAba(chave)}
              >
                {rotulo}
              </button>
            ))}
          </nav>

          <div className="cartao-aba-conteudo" role="tabpanel">
            {aba === "dados" ? (
              cliente ? (
                <dl className="cartao-campos">
                  <div>
                    <dt>Razão social</dt>
                    <dd>{texto(cliente.legal_name)}</dd>
                  </div>
                  <div>
                    <dt>Nome fantasia</dt>
                    <dd>{texto(cliente.trade_name)}</dd>
                  </div>
                  <div>
                    <dt>CPF/CNPJ</dt>
                    <dd>{texto(cliente.tax_id)}</dd>
                  </div>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{texto(cliente.email)}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>{texto(cliente.phone)}</dd>
                  </div>
                  <div>
                    <dt>Endereço</dt>
                    <dd>{texto(cliente.address_line)}</dd>
                  </div>
                  <div>
                    <dt>Cidade / UF</dt>
                    <dd>
                      {texto(cliente.city)} / {texto(cliente.state)}
                    </dd>
                  </div>
                  <div>
                    <dt>CEP</dt>
                    <dd>{texto(cliente.postal_code)}</dd>
                  </div>
                  <div>
                    <dt>Canal preferido</dt>
                    <dd>{texto(cliente.preferred_contact_channel)}</dd>
                  </div>
                  <div>
                    <dt>Valor do cartão</dt>
                    <dd>{formatarMoeda(cartao.valor)}</dd>
                  </div>
                  <div className="cartao-campo-largo">
                    <dt>Observações do cadastro</dt>
                    <dd>{texto(cliente.notes)}</dd>
                  </div>
                  <div className="cartao-campo-largo">
                    <dt>Abrir cadastro completo</dt>
                    <dd>
                      <Link href={`/app/clientes/${String(cliente.id)}`}>Ver ficha do cliente</Link>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="muted">Este cartão não está ligado a um cliente.</p>
              )
            ) : null}

            {aba === "projetos" ? (
              projetos.length ? (
                <table className="pipeline-lista">
                  <thead>
                    <tr>
                      <th scope="col">Código</th>
                      <th scope="col">Projeto</th>
                      <th scope="col">Situação</th>
                      <th scope="col">Término previsto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projetos.map(projeto => (
                      <tr key={projeto.id}>
                        <td>{projeto.code}</td>
                        <td>
                          <Link href={`/app/obras/${projeto.id}`}>{projeto.name}</Link>
                        </td>
                        <td>{projeto.status}</td>
                        <td>{formatarData(projeto.planned_end)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">Nenhum projeto para este cliente.</p>
              )
            ) : null}

            {aba === "documentos" ? (
              documentos.length ? (
                <table className="pipeline-lista">
                  <thead>
                    <tr>
                      <th scope="col">Documento</th>
                      <th scope="col">Categoria</th>
                      <th scope="col">Enviado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map(documento => (
                      <tr key={documento.id}>
                        <td>
                          <Link href={`/app/documentos/${documento.id}`}>{documento.title ?? "Sem título"}</Link>
                        </td>
                        <td>{documento.category ?? "—"}</td>
                        <td>{formatarData(documento.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">Nenhum documento vinculado ao projeto deste cartão.</p>
              )
            ) : null}

            {aba === "chamados" ? (
              chamados.length ? (
                <table className="pipeline-lista">
                  <thead>
                    <tr>
                      <th scope="col">Código</th>
                      <th scope="col">Assunto</th>
                      <th scope="col">Situação</th>
                      <th scope="col">Aberto em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chamados.map(chamado => (
                      <tr key={chamado.id}>
                        <td>{chamado.code}</td>
                        <td>
                          <Link href={`/app/ocorrencias/${chamado.id}`}>{chamado.title}</Link>
                        </td>
                        <td>{chamado.status}</td>
                        <td>{formatarData(chamado.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">Nenhum chamado para este cliente.</p>
              )
            ) : null}

            {aba === "prazos" ? (
              <div className="cartao-prazos">
                {codigosDaEtapa.length === 0 ? (
                  <p className="muted">Esta etapa não declara datas.</p>
                ) : (
                  codigosDaEtapa.map(codigo => (
                    <label className="cartao-prazo" key={codigo}>
                      <span>
                        <strong>{codigo}</strong> — {descrever(codigo)}
                        {obrigatorias.has(codigo) ? " *" : ""}
                      </span>
                      <input
                        type="date"
                        defaultValue={datasPorCodigo.get(codigo) ?? ""}
                        disabled={!podeEditar || pendente}
                        onChange={event => executar(() => definirDataDoCartao(cartao.id, codigo, event.target.value))}
                      />
                    </label>
                  ))
                )}

                {cartao.datas.length ? (
                  <table className="pipeline-lista cartao-prazos-tabela">
                    <thead>
                      <tr>
                        <th scope="col">Código</th>
                        <th scope="col">Significado</th>
                        <th scope="col">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenarCodigos(cartao.datas.map(item => item.codigo)).map(codigo => (
                        <tr key={codigo}>
                          <td>{codigo}</td>
                          <td>{descrever(codigo)}</td>
                          <td>{formatarData(datasPorCodigo.get(codigo))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="cartao-conversa" aria-label="Observações e histórico">
          <form
            className="cartao-nova-nota"
            onSubmit={event => {
              event.preventDefault();
              const corpo = nota;
              executar(async () => {
                const resultado = await registrarObservacao(cartao.id, corpo);
                if (resultado.ok) setNota("");
                return resultado;
              });
            }}
          >
            <label>
              <span>Observação</span>
              <textarea
                value={nota}
                onChange={event => setNota(event.target.value)}
                rows={3}
                placeholder="O que precisa ficar registrado sobre este cartão…"
                disabled={!podeEditar || pendente}
              />
            </label>
            <button type="submit" className="button button-primary" disabled={!podeEditar || pendente || !nota.trim()}>
              Registrar
            </button>
          </form>

          <ol className="cartao-linha-do-tempo">
            {observacoes.map(observacao => (
              <li key={observacao.id} className={`nota tipo-${observacao.tipo}`}>
                <time dateTime={observacao.created_at}>{formatarData(observacao.created_at)}</time>
                <p>{observacao.corpo}</p>
              </li>
            ))}
            {historico.map(evento => {
              const de = etapas.find(etapa => etapa.id === evento.de_stage_id);
              const para = etapas.find(etapa => etapa.id === evento.para_stage_id);
              return (
                <li key={evento.id} className="movimento">
                  <time dateTime={evento.movido_em}>{formatarData(evento.movido_em)}</time>
                  <p>{de ? `${de.name} → ${para?.name ?? "?"}` : `Cartão criado em ${para?.name ?? "?"}`}</p>
                </li>
              );
            })}
            {observacoes.length === 0 && historico.length === 0 ? (
              <li className="muted">Sem histórico ainda.</li>
            ) : null}
          </ol>
        </aside>
      </div>

      <p className="cartao-voltar">
        <Link href={`/app/pipeline/${trilha}`}>← Voltar ao pipeline</Link>
      </p>
    </div>
  );
}
