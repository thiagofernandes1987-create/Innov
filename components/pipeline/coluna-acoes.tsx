"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconeEngrenagem } from "@/components/casca/icones";
import {
  alternarEtapaRecolhida,
  criarCartao,
  criarEtapa,
  excluirEtapa,
  renomearEtapa
} from "@/app/actions/pipeline";

// Configuração da etapa pela própria coluna.
//
// É o que o responsável marcou em três comentários distintos das capturas:
// `+` no cabeçalho para criar cartão, engrenagem que aparece ao passar o
// mouse, e um campo no fim das colunas para criar etapa nova. Sem isso, mudar
// o nome de uma coluna é tarefa de administrador, e o kanban deixa de ser
// ferramenta de trabalho para virar relatório configurável.

export type RegistroDisponivel = { id: string; rotulo: string };

type Resultado = { ok: true } | { ok: false; erro: string };

function useAcao(aoFalhar: (erro: string) => void) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  function executar(acao: () => Promise<Resultado>, aoConcluir?: () => void) {
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) aoFalhar(resultado.erro);
      else {
        aoConcluir?.();
        router.refresh();
      }
    });
  }
  return { pendente, executar };
}

/**
 * `+` do cabeçalho.
 *
 * O botão fica no cabeçalho e o formulário abaixo dele, dentro da coluna — por
 * isso são dois componentes e o estado de "qual coluna está aberta" mora na
 * visão. Um formulário aberto por vez: dois campos de título piscando em
 * colunas diferentes é convite para digitar no lugar errado.
 */
export function BotaoNovoCartao({
  etapa,
  aberto,
  aoAlternar
}: {
  etapa: string;
  aberto: boolean;
  aoAlternar: () => void;
}) {
  return (
    <button
      type="button"
      className="coluna-acao"
      aria-label={`Adicionar cartão em ${etapa}`}
      aria-expanded={aberto}
      title="Adicionar cartão"
      onClick={aoAlternar}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M12 5.5v13M5.5 12h13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function FormularioNovoCartao({
  pipelineId,
  stageId,
  registros,
  rotuloRegistro,
  aoFalhar,
  aoFechar
}: {
  pipelineId: string;
  stageId: string;
  registros: RegistroDisponivel[];
  rotuloRegistro: string;
  aoFalhar: (erro: string) => void;
  aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [registro, setRegistro] = useState("");
  const { pendente, executar } = useAcao(aoFalhar);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  if (registros.length === 0) {
    return (
      <div className="coluna-novo-cartao">
        <p className="coluna-aviso">
          Não há {rotuloRegistro.toLowerCase()} sem cartão nesta trilha. Cadastre o registro antes de abrir o cartão.
        </p>
        <button type="button" className="coluna-cancelar" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    );
  }

  return (
    <form
      className="coluna-novo-cartao"
      onSubmit={event => {
        event.preventDefault();
        executar(() => criarCartao(pipelineId, stageId, titulo, registro), aoFechar);
      }}
      onKeyDown={event => {
        if (event.key === "Escape") aoFechar();
      }}
    >
      <label>
        <span className="sr-only">Título do cartão</span>
        <input
          ref={campo}
          value={titulo}
          onChange={event => setTitulo(event.target.value)}
          placeholder="Título do cartão"
          maxLength={160}
          disabled={pendente}
        />
      </label>
      <label>
        <span className="sr-only">{rotuloRegistro}</span>
        <select value={registro} onChange={event => setRegistro(event.target.value)} disabled={pendente}>
          <option value="">{rotuloRegistro}…</option>
          {registros.map(item => (
            <option key={item.id} value={item.id}>
              {item.rotulo}
            </option>
          ))}
        </select>
      </label>
      <div className="coluna-novo-cartao-acoes">
        <button type="submit" className="button button-primary" disabled={pendente || !titulo.trim() || !registro}>
          Adicionar
        </button>
        <button type="button" className="coluna-cancelar" onClick={aoFechar} disabled={pendente}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Engrenagem da coluna: renomear, recolher e excluir. */
export function MenuDaEtapa({
  stageId,
  nome,
  recolhida,
  aoFalhar
}: {
  stageId: string;
  nome: string;
  recolhida: boolean;
  aoFalhar: (erro: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(nome);
  const { pendente, executar } = useAcao(aoFalhar);
  const caixa = useRef<HTMLDivElement>(null);

  // Menu que só fecha no próprio botão é menu que fica aberto atrás de tudo.
  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) setAberto(false);
    }
    function escape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", escape);
    };
  }, [aberto]);

  if (renomeando) {
    return (
      <form
        className="coluna-renomear"
        onSubmit={event => {
          event.preventDefault();
          executar(() => renomearEtapa(stageId, novoNome), () => setRenomeando(false));
        }}
      >
        <label>
          <span className="sr-only">Novo nome da etapa</span>
          <input
            autoFocus
            value={novoNome}
            onChange={event => setNovoNome(event.target.value)}
            maxLength={60}
            disabled={pendente}
          />
        </label>
        <button type="submit" className="coluna-acao" aria-label="Salvar nome" disabled={pendente}>
          ✓
        </button>
        <button
          type="button"
          className="coluna-acao"
          aria-label="Cancelar"
          onClick={() => {
            setNovoNome(nome);
            setRenomeando(false);
          }}
          disabled={pendente}
        >
          ✕
        </button>
      </form>
    );
  }

  return (
    <div className="coluna-menu" ref={caixa}>
      <button
        type="button"
        className="coluna-acao coluna-engrenagem"
        aria-label={`Configurar a etapa ${nome}`}
        aria-expanded={aberto}
        title="Configurar etapa"
        onClick={() => setAberto(valor => !valor)}
      >
        <IconeEngrenagem tamanho={16} />
      </button>

      {aberto ? (
        <ul className="coluna-menu-lista" role="menu">
          <li>
            <button type="button" role="menuitem" onClick={() => { setAberto(false); setRenomeando(true); }}>
              Renomear
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              disabled={pendente}
              onClick={() => executar(() => alternarEtapaRecolhida(stageId), () => setAberto(false))}
            >
              {recolhida ? "Expandir coluna" : "Recolher coluna"}
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              className="perigo"
              disabled={pendente}
              onClick={() => executar(() => excluirEtapa(stageId), () => setAberto(false))}
            >
              Excluir
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

/** Campo no fim das colunas — a etapa nasce onde ela vai ficar. */
export function NovaEtapa({
  pipelineId,
  aoFalhar
}: {
  pipelineId: string;
  aoFalhar: (erro: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const { pendente, executar } = useAcao(aoFalhar);

  return (
    <div className="pipeline-coluna pipeline-coluna-nova">
      {aberto ? (
        <form
          onSubmit={event => {
            event.preventDefault();
            executar(() => criarEtapa(pipelineId, nome), () => {
              setNome("");
              setAberto(false);
            });
          }}
        >
          <label>
            <span className="sr-only">Nome da nova etapa</span>
            <input
              autoFocus
              value={nome}
              onChange={event => setNome(event.target.value)}
              placeholder="Nome da etapa"
              maxLength={60}
              disabled={pendente}
            />
          </label>
          <div className="coluna-novo-cartao-acoes">
            <button type="submit" className="button button-primary" disabled={pendente || !nome.trim()}>
              Criar
            </button>
            <button type="button" className="coluna-cancelar" onClick={() => setAberto(false)} disabled={pendente}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="pipeline-coluna-nova-abrir" onClick={() => setAberto(true)}>
          + Etapa
        </button>
      )}
    </div>
  );
}
