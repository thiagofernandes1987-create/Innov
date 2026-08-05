"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { emitirDocumento } from "@/app/actions/documentos";
import { EMISSAO_INICIAL } from "@/lib/documentos/modelos";
import { markdownParaHTML } from "@/lib/documentos/markdown";

// Painel de emissão: escolher, ver e então gravar.
//
// **A prévia e a gravação são o mesmo caminho**, com um campo a menos. O que a
// pessoa vê antes de emitir é literalmente o que vai ser gravado, e não uma
// aproximação feita no cliente com outro conjunto de regras — que é como um
// documento acaba saindo diferente do que foi conferido.
//
// Por isso a prévia vai ao servidor: é lá que a RLS decide o que resolve. Uma
// prévia calculada no navegador mostraria valores que o servidor recusaria a
// preencher, e a diferença só apareceria depois de o documento sair.

type Opcao = { id: string; nome: string };

export function PainelDeEmissao({
  modeloInicial,
  modelos,
  clientes,
  obras,
  orcamentos,
  propostas
}: {
  modeloInicial: string | null;
  modelos: { id: string; nome: string; tipo: string }[];
  clientes: Opcao[];
  obras: Opcao[];
  orcamentos: Opcao[];
  propostas: Opcao[];
}) {
  const [estado, emitir, emitindo] = useActionState(emitirDocumento, EMISSAO_INICIAL);
  const [modeloId, setModeloId] = useState(modeloInicial ?? modelos[0]?.id ?? "");

  // **Controlados, não `defaultValue`.** A prévia é uma ida ao servidor, e no
  // retorno o React re-renderiza o formulário: campo não controlado volta ao
  // vazio, e o segundo envio — o que grava — sairia sem o cliente que a pessoa
  // escolheu. Foi o defeito medido na primeira verificação: a prévia tinha 9
  // lacunas e o documento emitido saiu com 11, porque perdeu o cliente entre
  // um clique e o outro. É VACINA-042 na sua forma mais traiçoeira, já que o
  // formulário não some — só esquece.
  const [clienteId, setClienteId] = useState("");
  const [obraId, setObraId] = useState("");
  const [orcamentoId, setOrcamentoId] = useState("");
  const [propostaId, setPropostaId] = useState("");
  const [titulo, setTitulo] = useState("");

  // O DOM do `select` escorrega, e o estado não.
  //
  // A resposta de uma server action re-renderiza a árvore do servidor. Nesse
  // commit o navegador perde a seleção do `select` — mede-se assim: logo depois
  // da prévia o campo mostra "", mas qualquer re-renderização local seguinte
  // traz o valor de volta, prova de que o estado do React nunca mudou.
  //
  // Isso seria só um incômodo visual se o formulário não enviasse **o DOM**. Na
  // primeira verificação a prévia saiu com 7 lacunas e o documento emitido com
  // 11: entre um clique e o outro o cliente e a obra sumiram do envio sem
  // ninguém tocar em nada.
  //
  // O efeito reencosta o DOM no estado depois de cada renderização. É o uso
  // legítimo de efeito — sincronizar com um sistema externo, que aqui é o
  // próprio elemento —, e não `setState` disfarçado.
  const campos = useRef<Record<string, HTMLSelectElement | null>>({});
  const escolhas = { clienteId, obraId, orcamentoId, propostaId, modeloId };
  useEffect(() => {
    for (const [nome, valor] of Object.entries(escolhas)) {
      const campo = campos.current[nome];
      if (campo && campo.value !== valor) campo.value = valor;
    }
  });

  const html = useMemo(() => (estado.texto ? markdownParaHTML(estado.texto) : ""), [estado.texto]);
  const modelo = modelos.find(m => m.id === modeloId);

  if (modelos.length === 0) {
    return (
      <section className="card-pad">
        <h2>Nenhum modelo publicado</h2>
        <p className="muted">
          Só modelo publicado gera documento: rascunho é trabalho em andamento de alguém, e emitir a
          partir dele mandaria para fora um texto que ninguém aprovou. Publique um modelo na biblioteca
          para emitir aqui.
        </p>
      </section>
    );
  }

  return (
    <form className="emissao" action={emitir}>
      <section className="card-pad emissao-escolhas">
        <label>
          <span>Modelo</span>
          <select ref={el => { campos.current.modeloId = el; }} name="modeloId" value={modeloId} onChange={e => setModeloId(e.target.value)}>
            {modelos.map(m => (
              <option key={m.id} value={m.id}>{m.nome} — {m.tipo}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Título do documento</span>
          <input name="titulo" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={modelo?.nome ?? "Documento"} maxLength={160} />
        </label>

        {/* Cada lista é opcional. Um termo de treinamento não tem orçamento, e
            obrigar a escolher um faria a pessoa apontar qualquer coisa só para
            passar da tela. O que faltar vira lacuna, e a lacuna aparece. */}
        <label>
          <span>Cliente</span>
          <select ref={el => { campos.current.clienteId = el; }} name="clienteId" value={clienteId} onChange={e => setClienteId(e.target.value)}>
            <option value="">— sem cliente —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>

        <label>
          <span>Obra</span>
          <select ref={el => { campos.current.obraId = el; }} name="obraId" value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">— sem obra —</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </label>

        <label>
          <span>Orçamento</span>
          <select ref={el => { campos.current.orcamentoId = el; }} name="orcamentoId" value={orcamentoId} onChange={e => setOrcamentoId(e.target.value)}>
            <option value="">— sem orçamento —</option>
            {orcamentos.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </label>

        <label>
          <span>Proposta</span>
          <select ref={el => { campos.current.propostaId = el; }} name="propostaId" value={propostaId} onChange={e => setPropostaId(e.target.value)}>
            <option value="">— sem proposta —</option>
            {propostas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>

        <div className="emissao-acoes">
          <button type="submit" className="button button-secondary" disabled={emitindo}>
            {emitindo ? "Gerando…" : "Gerar prévia"}
          </button>
          <button type="submit" name="gravar" value="1" className="button button-primary" disabled={emitindo || !estado.texto}>
            Emitir documento
          </button>
        </div>
        {!estado.texto ? (
          <p className="muted">
            Gere a prévia antes de emitir. Emitir sem ver é como assinar sem ler — e o documento
            emitido não se corrige, se substitui.
          </p>
        ) : null}
      </section>

      {estado.mensagem ? (
        <p className={estado.ok ? "editor-aviso ok" : "editor-aviso erro"} role="status" aria-live="polite">
          {estado.mensagem}
          {estado.vazios.length > 0 ? (
            <span>
              Sem registro para: {estado.vazios.join(", ")}. Pode ser que não exista, ou que você não
              tenha acesso a ele.
            </span>
          ) : null}
          {estado.lacunas.length > 0 ? (
            <span>Faltando: {estado.lacunas.map(l => l.variavel).join(", ")}.</span>
          ) : null}
        </p>
      ) : null}

      {estado.texto ? (
        <section className="card-pad">
          <h2>{estado.documentoId ? "Documento emitido" : "Prévia"}</h2>
          {/* Seguro: `markdownParaHTML` escapa a entrada antes de aplicar
              marcação e não aceita HTML de usuário em nenhum caminho. */}
          <article className="editor-previa-corpo" dangerouslySetInnerHTML={{ __html: html }} />
        </section>
      ) : null}
    </form>
  );
}
