"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampoComSugestao } from "@/components/comum/campo-com-sugestao";
import { IconeEngrenagem } from "@/components/casca/icones";
import type { ValorDoCatalogo } from "@/lib/sugestoes/catalogo";
import {
  alternarEtapaRecolhida,
  criarCartao,
  criarChamadoComCartao,
  criarClienteComCartao,
  criarEtapa,
  criarProjetoComCartao,
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
  trilha,
  pipelineId,
  stageId,
  registros,
  clientes,
  rotuloRegistro,
  aoFalhar,
  aoFechar
}: {
  trilha: string;
  pipelineId: string;
  stageId: string;
  registros: RegistroDisponivel[];
  clientes: RegistroDisponivel[];
  rotuloRegistro: string;
  aoFalhar: (erro: string) => void;
  aoFechar: () => void;
}) {
  const [modo, setModo] = useState<"existente" | "novo">("existente");
  const [titulo, setTitulo] = useState("");
  const [registro, setRegistro] = useState("");
  const { pendente, executar } = useAcao(aoFalhar);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  // Duas abas, porque são duas situações diferentes: o registro já existe, ou
  // ele nasce agora. Antes só havia a primeira, e o responsável marcou duas
  // vezes: "falta botão para acrescentar novo cliente" e "como vou planejar
  // algo que nem existe cadastro?".
  if (modo === "novo") {
    return (
      <div className="coluna-novo-cartao">
        <div className="conversa-abas" role="tablist" aria-label="Origem do cartão">
          <button type="button" role="tab" aria-selected={false} className="conversa-aba" onClick={() => setModo("existente")}>
            {rotuloRegistro} existente
          </button>
          <button type="button" role="tab" aria-selected className="conversa-aba ativa">
            Cadastrar novo
          </button>
        </div>
        <FormularioRegistroNovo
          trilha={trilha}
          pipelineId={pipelineId}
          stageId={stageId}
          clientes={clientes}
          aoFalhar={aoFalhar}
          aoFechar={aoFechar}
        />
      </div>
    );
  }

  if (registros.length === 0) {
    return (
      <div className="coluna-novo-cartao">
        <p className="coluna-aviso">
          Não há {rotuloRegistro.toLowerCase()} sem cartão nesta trilha.
        </p>
        <div className="coluna-novo-cartao-acoes">
          <button type="button" className="button button-primary" onClick={() => setModo("novo")}>
            Cadastrar {rotuloRegistro.toLowerCase()}
          </button>
          <button type="button" className="coluna-cancelar" onClick={aoFechar}>
            Fechar
          </button>
        </div>
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
        // Este formulário é uma camada dispensável: `Escape` fecha ele, e
        // fechar já é agir. Sem barrar a propagação, a mesma tecla continua
        // subindo e chega ao ouvinte de janela do vizinho — o menu da etapa —,
        // e um gesto fecha duas coisas (VACINA-054). O caro dos dois é este:
        // fechar o menu custa um clique, fechar o formulário custa o que foi
        // digitado.
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          aoFechar();
        }
      }}
    >
      <div className="conversa-abas" role="tablist" aria-label="Origem do cartão">
        <button type="button" role="tab" aria-selected className="conversa-aba ativa">
          {rotuloRegistro} existente
        </button>
        <button type="button" role="tab" aria-selected={false} className="conversa-aba" onClick={() => setModo("novo")}>
          Cadastrar novo
        </button>
      </div>
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
  sugestoesDeEtapa = [],
  aoFalhar
}: {
  pipelineId: string;
  sugestoesDeEtapa?: ValorDoCatalogo[];
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
            {/* Etapa de funil repete entre trilhas: "Qualificação", "Proposta
                enviada", "Aguardando cliente" são as mesmas em quase todo funil
                que a empresa cria. Modo controlado porque esta tela chama a ação
                com o valor na mão, sem passar por formulário. */}
            <CampoComSugestao
              sugestoes={sugestoesDeEtapa}
              value={nome}
              onValueChange={setNome}
              placeholder="Nome da etapa"
              maxLength={60}
              disabled={pendente}
              autoFocus
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

/**
 * Cadastro do registro dentro da própria coluna.
 *
 * Cada trilha pede o mínimo do seu registro, não o cadastro completo: o
 * objetivo é não obrigar a sair do funil e voltar. O cadastro completo continua
 * na tela do módulo, e o cartão leva até lá.
 *
 * A validação brasileira acontece no servidor, na mesma guarda que o formulário
 * completo usa — aqui o campo só orienta.
 */
function FormularioRegistroNovo({
  trilha,
  pipelineId,
  stageId,
  clientes,
  aoFalhar,
  aoFechar
}: {
  trilha: string;
  pipelineId: string;
  stageId: string;
  clientes: RegistroDisponivel[];
  aoFalhar: (erro: string) => void;
  aoFechar: () => void;
}) {
  const { pendente, executar } = useAcao(aoFalhar);
  const [tipo, setTipo] = useState("PERSON");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cliente, setCliente] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");

  if (trilha === "cliente") {
    return (
      <form
        onSubmit={evento => {
          evento.preventDefault();
          const dados = new FormData();
          dados.set("type", tipo);
          dados.set("legalName", nome);
          dados.set("taxId", documento);
          dados.set("phone", telefone);
          dados.set("email", email);
          executar(() => criarClienteComCartao(pipelineId, stageId, dados), aoFechar);
        }}
      >
        <div className="conversa-campos">
          <label>
            <span>Tipo</span>
            <select value={tipo} onChange={e => setTipo(e.target.value)} disabled={pendente}>
              <option value="PERSON">Pessoa física</option>
              <option value="COMPANY">Pessoa jurídica</option>
            </select>
          </label>
          <label>
            <span>{tipo === "PERSON" ? "CPF" : "CNPJ"}</span>
            <input value={documento} onChange={e => setDocumento(e.target.value)} disabled={pendente} inputMode="numeric" />
          </label>
        </div>
        <label>
          <span>{tipo === "PERSON" ? "Nome" : "Razão social"}</span>
          <input autoFocus value={nome} onChange={e => setNome(e.target.value)} maxLength={160} disabled={pendente} />
        </label>
        <div className="conversa-campos">
          <label>
            <span>Telefone</span>
            <input value={telefone} onChange={e => setTelefone(e.target.value)} disabled={pendente} inputMode="tel" />
          </label>
          <label>
            <span>E-mail</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={pendente} />
          </label>
        </div>
        <Rodape pendente={pendente} pronto={Boolean(nome.trim())} aoFechar={aoFechar} />
      </form>
    );
  }

  if (trilha === "projeto") {
    return (
      <form
        onSubmit={evento => {
          evento.preventDefault();
          executar(() => criarProjetoComCartao(pipelineId, stageId, cliente, codigo, nome), aoFechar);
        }}
      >
        <label>
          <span>Cliente</span>
          <select value={cliente} onChange={e => setCliente(e.target.value)} disabled={pendente}>
            <option value="">Escolha o cliente…</option>
            {clientes.map(item => (
              <option key={item.id} value={item.id}>{item.rotulo}</option>
            ))}
          </select>
        </label>
        <div className="conversa-campos">
          <label>
            <span>Código</span>
            <input value={codigo} onChange={e => setCodigo(e.target.value)} maxLength={40} disabled={pendente} />
          </label>
          <label>
            <span>Nome</span>
            <input value={nome} onChange={e => setNome(e.target.value)} maxLength={160} disabled={pendente} />
          </label>
        </div>
        <p className="coluna-aviso">O projeto nasce sem contrato — o contrato pode ser ligado depois.</p>
        <Rodape pendente={pendente} pronto={Boolean(cliente && codigo.trim() && nome.trim())} aoFechar={aoFechar} />
      </form>
    );
  }

  return (
    <form
      onSubmit={evento => {
        evento.preventDefault();
        executar(() => criarChamadoComCartao(pipelineId, stageId, cliente, nome, descricao), aoFechar);
      }}
    >
      <label>
        <span>Cliente</span>
        <select value={cliente} onChange={e => setCliente(e.target.value)} disabled={pendente}>
          <option value="">Escolha o cliente…</option>
          {clientes.map(item => (
            <option key={item.id} value={item.id}>{item.rotulo}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Assunto</span>
        <input autoFocus value={nome} onChange={e => setNome(e.target.value)} maxLength={160} disabled={pendente} />
      </label>
      <label>
        <span>O que está acontecendo</span>
        <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} disabled={pendente} />
      </label>
      <Rodape pendente={pendente} pronto={Boolean(cliente && nome.trim() && descricao.trim())} aoFechar={aoFechar} />
    </form>
  );
}

function Rodape({ pendente, pronto, aoFechar }: { pendente: boolean; pronto: boolean; aoFechar: () => void }) {
  return (
    <div className="coluna-novo-cartao-acoes">
      <button type="submit" className="button button-primary" disabled={pendente || !pronto}>
        Criar e abrir cartão
      </button>
      <button type="button" className="coluna-cancelar" onClick={aoFechar} disabled={pendente}>
        Cancelar
      </button>
    </div>
  );
}
