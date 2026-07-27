"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  arquivarFunil,
  criarFunil,
  definirFunilPadrao,
  excluirFunil,
  renomearFunil
} from "@/app/actions/pipeline";
import { IconeEngrenagem } from "@/components/casca/icones";

// Seletor de funil, na barra de controle ao lado do nome.
//
// Posição ditada pela pesquisa de campo da §13 do padrão de interface: no Odoo o
// escopo do funil aparece no breadcrumb da barra 2 — `Projects / Teste ⚙` —, e
// nunca na barra 1. A razão é simples: trocar de funil não troca de aplicativo,
// e a barra 1 é do aplicativo.
//
// É o que permite ao CRM ter SDR, pré-venda e venda sem sair do CRM.

export type FunilDisponivel = { id: string; key: string; name: string; padrao: boolean };

type Resultado = { ok: true } | { ok: false; erro: string };

export function SeletorDeFunil({
  trilha,
  funis,
  atual,
  presets,
  podeConfigurar,
  aoFalhar
}: {
  trilha: string;
  funis: FunilDisponivel[];
  atual: FunilDisponivel;
  presets: { chave: string; rotulo: string }[];
  podeConfigurar: boolean;
  aoFalhar: (erro: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [nome, setNome] = useState("");
  const [preset, setPreset] = useState("");
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const caixa = useRef<HTMLDivElement>(null);

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

  function trocar(funil: FunilDisponivel) {
    setAberto(false);
    // O funil escolhido vai para a URL: recarregar mantém o mesmo, e o endereço
    // pode ser mandado para outra pessoa já apontando para o funil certo.
    router.push(funil.padrao ? `/app/pipeline/${trilha}` : `/app/pipeline/${trilha}?funil=${funil.key}`);
  }

  if (renomeando) {
    return (
      <form
        className="funil-renomear"
        onSubmit={evento => {
          evento.preventDefault();
          executar(() => renomearFunil(atual.id, nome), () => {
            setRenomeando(false);
            setNome("");
          });
        }}
      >
        <label>
          <span className="sr-only">Novo nome do funil</span>
          <input autoFocus value={nome} onChange={e => setNome(e.target.value)} maxLength={80} disabled={pendente} />
        </label>
        <button type="submit" className="coluna-acao" aria-label="Salvar nome" disabled={pendente}>✓</button>
        <button
          type="button"
          className="coluna-acao"
          aria-label="Cancelar"
          onClick={() => { setRenomeando(false); setNome(""); }}
          disabled={pendente}
        >✕</button>
      </form>
    );
  }

  return (
    <div className="funil-seletor" ref={caixa}>
      <button
        type="button"
        className="funil-botao"
        aria-expanded={aberto}
        aria-haspopup="menu"
        onClick={() => setAberto(v => !v)}
        title={`Funil: ${atual.name}`}
      >
        <span>{atual.name}</span>
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false">
          <path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {podeConfigurar ? (
        <button
          type="button"
          className="coluna-acao funil-engrenagem"
          aria-label={`Configurar o funil ${atual.name}`}
          title="Configurar funil"
          onClick={() => { setNome(atual.name); setRenomeando(true); }}
        >
          <IconeEngrenagem tamanho={15} />
        </button>
      ) : null}

      {aberto ? (
        <div className="funil-menu" role="menu">
          <p className="funil-menu-titulo">Funis desta trilha</p>
          <ul>
            {funis.map(funil => (
              <li key={funil.id}>
                <button
                  type="button"
                  role="menuitem"
                  className={funil.id === atual.id ? "ativo" : undefined}
                  onClick={() => trocar(funil)}
                >
                  <span>{funil.name}</span>
                  {funil.padrao ? <small>padrão</small> : null}
                </button>
              </li>
            ))}
          </ul>

          {podeConfigurar ? (
            <>
              <div className="funil-menu-acoes">
                {!atual.padrao ? (
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() => executar(() => definirFunilPadrao(atual.id), () => setAberto(false))}
                  >
                    Tornar “{atual.name}” o padrão
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => executar(() => arquivarFunil(atual.id, true), () => setAberto(false))}
                >
                  Arquivar “{atual.name}”
                </button>
                <button
                  type="button"
                  className="perigo"
                  disabled={pendente}
                  onClick={() => executar(() => excluirFunil(atual.id), () => setAberto(false))}
                >
                  Excluir “{atual.name}”
                </button>
              </div>

              {criando ? (
                <form
                  className="funil-novo"
                  onSubmit={evento => {
                    evento.preventDefault();
                    executar(() => criarFunil(trilha, nome, preset || null), () => {
                      setNome("");
                      setPreset("");
                      setCriando(false);
                      setAberto(false);
                    });
                  }}
                >
                  <label>
                    <span className="sr-only">Nome do funil</span>
                    <input
                      autoFocus
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Nome do funil"
                      maxLength={80}
                      disabled={pendente}
                    />
                  </label>
                  <label>
                    <span className="sr-only">Modelo de etapas</span>
                    <select value={preset} onChange={e => setPreset(e.target.value)} disabled={pendente}>
                      <option value="">Começar em branco</option>
                      {presets.map(item => (
                        <option key={item.chave} value={item.chave}>{item.rotulo}</option>
                      ))}
                    </select>
                  </label>
                  <p className="coluna-aviso">
                    Em branco, as etapas são criadas na própria coluna do kanban.
                  </p>
                  <div className="coluna-novo-cartao-acoes">
                    <button type="submit" className="button button-primary" disabled={pendente || !nome.trim()}>
                      Criar
                    </button>
                    <button type="button" className="coluna-cancelar" onClick={() => setCriando(false)} disabled={pendente}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className="funil-menu-novo" onClick={() => { setNome(""); setCriando(true); }}>
                  + Novo funil
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
