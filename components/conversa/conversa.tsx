"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROTULO_ATIVIDADE, TIPOS_ATIVIDADE, type TipoAtividade } from "@/lib/pipeline/atividades";
import type { AcoesConversa, AtividadeConversa, EntradaConversa, PessoaConversa, ResultadoConversa } from "./tipos";

// Conversa lateral — um componente para todos os módulos.
//
// Três formas de escrever, separadas porque têm consequências diferentes:
// nota fica em casa, WhatsApp sai para o cliente, atividade cria compromisso
// para alguém. Misturar as três em um campo só é como se manda para o cliente
// um texto que era para ser interno.
//
// O envio de WhatsApp não é feito aqui: a plataforma registra a mensagem e
// abre o aplicativo com o texto pronto. Fingir um envio que não existe seria
// pior que não ter o botão — o registro ficaria dizendo que o cliente foi
// avisado quando ninguém enviou nada.

type Aba = "nota" | "whatsapp" | "atividade";

export function Conversa({
  registroId,
  entradas,
  atividades,
  pessoas,
  telefone,
  podeEditar,
  acoes,
  titulo = "Conversa"
}: {
  registroId: string;
  entradas: EntradaConversa[];
  atividades: AtividadeConversa[];
  pessoas: PessoaConversa[];
  telefone: string | null;
  podeEditar: boolean;
  acoes: AcoesConversa;
  titulo?: string;
}) {
  const [aba, setAba] = useState<Aba>("nota");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const [nota, setNota] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoAtividade, setTipoAtividade] = useState<TipoAtividade>("tarefa");
  const [tituloAtividade, setTituloAtividade] = useState("");
  const [prazo, setPrazo] = useState("");
  const [responsavel, setResponsavel] = useState("");

  function executar(acao: () => Promise<ResultadoConversa>, aoConcluir?: () => void) {
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) setErro(resultado.erro);
      else {
        aoConcluir?.();
        router.refresh();
      }
    });
  }

  const abertas = atividades.filter(item => !item.concluida);

  // O telefone cadastrado é texto livre e chega sujo do mundo real — um dos
  // registros tem "12982#2($($". Sem conferir aqui, o rodapé prometia abrir o
  // WhatsApp para esse número e só depois de enviar é que a recusa aparecia.
  const digitos = (telefone ?? "").replace(/\D/g, "");
  const telefoneUtil = digitos.length >= 10 ? digitos : null;

  return (
    <aside className="conversa" aria-label={titulo}>
      <div className="conversa-abas" role="tablist" aria-label="Como registrar">
        {(
          [
            ["nota", "Registrar"],
            ["whatsapp", "WhatsApp"],
            ["atividade", "Agendar"]
          ] as [Aba, string][]
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={aba === valor}
            className={aba === valor ? "conversa-aba ativa" : "conversa-aba"}
            onClick={() => {
              setAba(valor);
              setErro(null);
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {erro ? (
        <p className="conversa-erro" role="alert">
          {erro}
        </p>
      ) : null}

      {aba === "nota" ? (
        <form
          className="conversa-forma"
          onSubmit={event => {
            event.preventDefault();
            executar(() => acoes.registrarNota(registroId, nota), () => setNota(""));
          }}
        >
          <label>
            <span className="sr-only">Observação</span>
            <textarea
              value={nota}
              onChange={event => setNota(event.target.value)}
              rows={3}
              placeholder="O que precisa ficar registrado…"
              disabled={!podeEditar || pendente}
            />
          </label>
          <div className="conversa-forma-rodape">
            <small>Fica interno. Não é enviado ao cliente.</small>
            <button type="submit" className="button button-primary" disabled={!podeEditar || pendente || !nota.trim()}>
              Registrar
            </button>
          </div>
        </form>
      ) : null}

      {aba === "whatsapp" ? (
        <form
          className="conversa-forma"
          onSubmit={event => {
            event.preventDefault();
            if (!telefoneUtil) return;
            setErro(null);
            iniciar(async () => {
              const resultado = await acoes.registrarWhatsApp(registroId, mensagem, telefoneUtil);
              if (!resultado.ok) {
                setErro(resultado.erro);
                return;
              }
              setMensagem("");
              // A janela abre depois de gravar: se a gravação falhar, ninguém
              // sai daqui achando que o registro ficou feito.
              if (resultado.link) window.open(resultado.link, "_blank", "noopener,noreferrer");
              router.refresh();
            });
          }}
        >
          <label>
            <span className="sr-only">Mensagem de WhatsApp</span>
            <textarea
              value={mensagem}
              onChange={event => setMensagem(event.target.value)}
              rows={3}
              placeholder="Mensagem para o cliente…"
              disabled={!podeEditar || pendente || !telefoneUtil}
            />
          </label>
          <div className="conversa-forma-rodape">
            {telefoneUtil ? (
              <small>Registra aqui e abre o WhatsApp para {formatarTelefone(telefoneUtil)}.</small>
            ) : telefone ? (
              <small className="conversa-alerta">
                O telefone cadastrado ({telefone}) não é um número válido. Corrija no cadastro do cliente.
              </small>
            ) : (
              <small className="conversa-alerta">Sem telefone cadastrado neste registro.</small>
            )}
            <button
              type="submit"
              className="button button-primary"
              disabled={!podeEditar || pendente || !telefoneUtil || !mensagem.trim()}
            >
              Registrar e abrir
            </button>
          </div>
        </form>
      ) : null}

      {aba === "atividade" ? (
        <form
          className="conversa-forma"
          onSubmit={event => {
            event.preventDefault();
            executar(
              () => acoes.agendarAtividade(registroId, tipoAtividade, tituloAtividade, prazo || null, responsavel || null),
              () => {
                setTituloAtividade("");
                setPrazo("");
                setResponsavel("");
              }
            );
          }}
        >
          <div className="conversa-campos">
            <label>
              <span>Tipo</span>
              <select
                value={tipoAtividade}
                onChange={event => setTipoAtividade(event.target.value as TipoAtividade)}
                disabled={!podeEditar || pendente}
              >
                {TIPOS_ATIVIDADE.map(item => (
                  <option key={item} value={item}>
                    {ROTULO_ATIVIDADE[item]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Prazo</span>
              <input
                type="date"
                value={prazo}
                onChange={event => setPrazo(event.target.value)}
                disabled={!podeEditar || pendente}
              />
            </label>
          </div>
          <label>
            <span>O que precisa ser feito</span>
            <input
              value={tituloAtividade}
              onChange={event => setTituloAtividade(event.target.value)}
              maxLength={160}
              placeholder="Ligar para confirmar a medição"
              disabled={!podeEditar || pendente}
            />
          </label>
          <label>
            <span>Responsável</span>
            <select
              value={responsavel}
              onChange={event => setResponsavel(event.target.value)}
              disabled={!podeEditar || pendente}
            >
              <option value="">Eu mesmo</option>
              {pessoas.map(pessoa => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.nome}
                </option>
              ))}
            </select>
          </label>
          <div className="conversa-forma-rodape">
            <small>Aparece nas notificações de quem for responsável.</small>
            <button
              type="submit"
              className="button button-primary"
              disabled={!podeEditar || pendente || !tituloAtividade.trim()}
            >
              Agendar
            </button>
          </div>
        </form>
      ) : null}

      {abertas.length > 0 ? (
        <section className="conversa-pendencias" aria-label="Atividades em aberto">
          <h3>Em aberto</h3>
          <ul>
            {abertas.map(item => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={!podeEditar || pendente}
                    onChange={() => executar(() => acoes.alternarAtividade(item.id))}
                  />
                  <span>
                    <strong>{item.titulo}</strong>
                    <small>
                      {ROTULO_ATIVIDADE[item.tipo as TipoAtividade] ?? item.tipo}
                      {item.prazo ? ` · ${formatarDia(item.prazo)}` : ""}
                      {item.responsavel ? ` · ${item.responsavel}` : ""}
                    </small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="conversa-linha-do-tempo">
        {entradas.map(entrada => (
          <li key={entrada.id} className={entrada.tipo}>
            <div className="conversa-entrada-topo">
              <strong>{entrada.autor ?? "Sistema"}</strong>
              <time dateTime={entrada.quando}>{formatarInstante(entrada.quando)}</time>
            </div>
            {entrada.tipo !== "movimento" && entrada.tipo !== "nota" ? (
              <span className="conversa-canal">{entrada.tipo === "whatsapp" ? "WhatsApp" : "Mensagem"}</span>
            ) : null}
            <p>{entrada.corpo}</p>
          </li>
        ))}
        {atividades
          .filter(item => item.concluida)
          .map(item => (
            <li key={item.id} className="atividade-concluida">
              <div className="conversa-entrada-topo">
                <strong>{ROTULO_ATIVIDADE[item.tipo as TipoAtividade] ?? item.tipo}</strong>
                <button
                  type="button"
                  className="conversa-reabrir"
                  disabled={!podeEditar || pendente}
                  onClick={() => executar(() => acoes.alternarAtividade(item.id))}
                >
                  Reabrir
                </button>
              </div>
              <p>{item.titulo}</p>
            </li>
          ))}
        {entradas.length === 0 && atividades.length === 0 ? <li className="muted">Sem histórico ainda.</li> : null}
      </ol>
    </aside>
  );
}

/** (11) 98888-7777 — o formato que se lê em voz alta ao conferir o número. */
function formatarTelefone(digitos: string): string {
  const numero = digitos.length > 11 ? digitos.slice(-11) : digitos;
  if (numero.length === 11) return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  if (numero.length === 10) return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  return numero;
}

function formatarDia(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarInstante(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
