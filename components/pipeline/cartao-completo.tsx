"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  agendarAtividade,
  alternarAtividade,
  alternarSeguidor,
  definirDataDoCartao,
  definirPrioridade,
  definirResponsavel,
  moverCartao,
  registrarObservacao,
  registrarWhatsApp
} from "@/app/actions/pipeline";
import { Conversa } from "@/components/conversa/conversa";
import type { AcoesConversa, AtividadeConversa, EntradaConversa } from "@/components/conversa/tipos";
import type { Pessoa } from "@/lib/pipeline/server";
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
  atividades: {
    id: string;
    tipo: string;
    titulo: string;
    prazo: string | null;
    responsavel_id: string | null;
    concluida_em: string | null;
  }[];
  autores: Record<string, string>;
  telefone: string | null;
  responsavel: Pessoa | null;
  seguidores: Pessoa[];
  euSigo: boolean;
  pessoas: Pessoa[];
  podeEditar: boolean;
};

// As ações do pipeline, na forma que a conversa entende. É este objeto que faz
// o mesmo componente servir a outro módulo depois: quem grava muda, a tela não.
const ACOES_DO_PIPELINE: AcoesConversa = {
  registrarNota: (registroId, corpo) => registrarObservacao(registroId, corpo),
  registrarWhatsApp: (registroId, corpo, telefone) => registrarWhatsApp(registroId, corpo, telefone),
  agendarAtividade: (registroId, tipo, titulo, prazo, responsavelId) =>
    agendarAtividade(registroId, tipo, titulo, prazo, responsavelId),
  alternarAtividade: atividadeId => alternarAtividade(atividadeId)
};

/** Iniciais para o avatar. Duas letras: mais que isso vira sopa de letras. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function texto(valor: unknown): string {
  const bruto = String(valor ?? "").trim();
  return bruto || "—";
}

export function CartaoCompleto(props: Props) {
  const {
    trilha,
    cartao,
    etapas,
    datasDaEtapa,
    cliente,
    projetos,
    documentos,
    chamados,
    observacoes,
    historico,
    atividades,
    autores,
    telefone,
    responsavel,
    seguidores,
    euSigo,
    pessoas,
    podeEditar
  } = props;

  const [aba, setAba] = useState<Aba>("dados");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const etapaAtual = etapas.find(etapa => etapa.id === cartao.stageId);
  const prazo = prazoPrincipal(cartao);
  const datasPorCodigo = new Map(cartao.datas.map(item => [item.codigo, item.data]));

  // Observação e movimento de etapa viram a mesma lista, ordenada pelo relógio.
  // Duas listas lado a lado obrigariam quem lê a intercalar de cabeça o que
  // aconteceu antes do quê.
  const entradas: EntradaConversa[] = [
    ...observacoes.map(item => ({
      id: item.id,
      tipo: (item.tipo === "mensagem" || item.tipo === "whatsapp" ? item.tipo : "nota") as EntradaConversa["tipo"],
      corpo: item.corpo,
      autor: item.autor_id ? (autores[item.autor_id] ?? "Usuário removido") : null,
      quando: item.created_at
    })),
    ...historico.map(evento => {
      const de = etapas.find(etapa => etapa.id === evento.de_stage_id);
      const para = etapas.find(etapa => etapa.id === evento.para_stage_id);
      return {
        id: evento.id,
        tipo: "movimento" as const,
        corpo: de ? `${de.name} → ${para?.name ?? "?"}` : `Cartão criado em ${para?.name ?? "?"}`,
        autor: null,
        quando: evento.movido_em
      };
    })
  ].sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando));

  const atividadesDaConversa: AtividadeConversa[] = atividades.map(item => ({
    id: item.id,
    tipo: item.tipo,
    titulo: item.titulo,
    prazo: item.prazo,
    responsavel: item.responsavel_id ? (autores[item.responsavel_id] ?? null) : null,
    concluida: item.concluida_em !== null
  }));

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

          {/* `h1` e não `h2`: com o cabeçalho de página fora, este é o nome da
              tela, e é dele que o leitor de tela precisa. */}
          <div className="cartao-titulo">
            <h1>{cartao.titulo}</h1>
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
            <div className="cartao-pessoas">
              <div className="cartao-responsavel">
                <span className="cartao-rotulo">Responsável</span>
                {podeEditar ? (
                  <select
                    aria-label="Responsável pelo cartão"
                    value={responsavel?.id ?? ""}
                    disabled={pendente}
                    onChange={event =>
                      executar(() => definirResponsavel(cartao.id, event.target.value || null))
                    }
                  >
                    <option value="">Sem responsável</option>
                    {pessoas.map(pessoa => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>{responsavel?.nome ?? "Sem responsável"}</strong>
                )}
              </div>

              <div className="cartao-seguidores">
                <span className="cartao-rotulo">
                  Seguidores <span className="cartao-contagem">{seguidores.length}</span>
                </span>
                <div className="cartao-seguidores-lista">
                  {seguidores.map(pessoa => (
                    <span
                      key={pessoa.id}
                      className="cartao-avatar"
                      title={pessoa.email ? `${pessoa.nome} · ${pessoa.email}` : pessoa.nome}
                    >
                      {iniciais(pessoa.nome)}
                    </span>
                  ))}
                  {seguidores.length === 0 ? <span className="muted">Ninguém acompanha</span> : null}
                  <button
                    type="button"
                    className={euSigo ? "cartao-seguir seguindo" : "cartao-seguir"}
                    disabled={pendente}
                    aria-pressed={euSigo}
                    onClick={() => executar(() => alternarSeguidor(cartao.id))}
                  >
                    {euSigo ? "Deixar de seguir" : "Seguir"}
                  </button>
                </div>
              </div>
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

        <Conversa
          registroId={cartao.id}
          entradas={entradas}
          atividades={atividadesDaConversa}
          pessoas={pessoas}
          telefone={telefone}
          podeEditar={podeEditar}
          acoes={ACOES_DO_PIPELINE}
        />
      </div>

      <p className="cartao-voltar">
        <Link href={`/app/pipeline/${trilha}`}>← Voltar ao pipeline</Link>
      </p>
    </div>
  );
}
