"use client";

import { useMemo, useState } from "react";
import {
  ROTULO_ESCOPO,
  dicionarioDeExemplo,
  variaveisDaFuncao,
  type DefinicaoVariavel
} from "@/lib/documentos/dicionario";
import { markdownParaHTML } from "@/lib/documentos/markdown";
import { renderizar, variaveisInexistentes } from "@/lib/documentos/modelo";

// Editor de modelo de documento: corpo, variáveis e pré-visualização.
//
// Três painéis, e a ordem importa: escreve à esquerda, escolhe variável no meio,
// vê o resultado à direita. A pré-visualização usa o **dicionário de exemplo**,
// não dado real — o modelo é escrito antes de existir o registro que vai
// preenchê-lo, e mostrar `{{cliente.nome}}` cru não deixa ninguém avaliar o
// documento.
//
// A variável é **escolhida**, nunca decorada: o painel lista o que existe para
// aquela função, com rótulo em português e valor de exemplo. Clicar insere no
// ponto do cursor.

export function EditorDeModelo({
  funcao,
  corpoInicial = "",
  nome
}: {
  funcao: string;
  corpoInicial?: string;
  nome?: string;
}) {
  const [corpo, setCorpo] = useState(corpoInicial);
  const [cursor, setCursor] = useState(corpoInicial.length);
  const [aba, setAba] = useState<"visual" | "fonte">("visual");

  const disponiveis = useMemo(() => variaveisDaFuncao(funcao), [funcao]);
  const exemplo = useMemo(() => dicionarioDeExemplo(funcao), [funcao]);

  const { texto, lacunas } = useMemo(() => renderizar(corpo, exemplo), [corpo, exemplo]);
  const html = useMemo(() => markdownParaHTML(texto), [texto]);
  const inexistentes = useMemo(
    () => variaveisInexistentes(corpo, disponiveis.map(v => v.nome)),
    [corpo, disponiveis]
  );

  const porEscopo = useMemo(() => {
    const mapa = new Map<string, DefinicaoVariavel[]>();
    for (const v of disponiveis) {
      const lista = mapa.get(v.escopo) ?? [];
      lista.push(v);
      mapa.set(v.escopo, lista);
    }
    return [...mapa.entries()];
  }, [disponiveis]);

  function inserir(nomeVariavel: string) {
    const posicao = Math.min(cursor, corpo.length);
    const marcador = `{{${nomeVariavel}}}`;
    const novo = corpo.slice(0, posicao) + marcador + corpo.slice(posicao);
    setCorpo(novo);
    setCursor(posicao + marcador.length);
  }

  return (
    <div className="modelo-editor">
      <section className="modelo-corpo card">
        <header className="modelo-cabecalho">
          <strong>Corpo do modelo</strong>
          <span className="modelo-formato">Markdown</span>
        </header>
        <textarea
          className="modelo-textarea"
          value={corpo}
          onChange={evento => {
            setCorpo(evento.target.value);
            setCursor(evento.target.selectionStart ?? evento.target.value.length);
          }}
          onSelect={evento => setCursor((evento.target as HTMLTextAreaElement).selectionStart ?? 0)}
          placeholder={"# Proposta comercial\n\nPrezado {{cliente.nome_completo}},\n\nSegue proposta para a obra {{obra.nome}}."}
          spellCheck
          aria-label="Corpo do modelo em Markdown"
        />
        {/* O que grava é o Markdown; PDF, DOCX e HTML de e-mail são conversão
            a partir dele. */}
        <input type="hidden" name="bodyMarkdown" value={corpo} />
        {nome ? <input type="hidden" name="name" value={nome} /> : null}
      </section>

      <aside className="modelo-variaveis card">
        <header className="modelo-cabecalho">
          <strong>Variáveis</strong>
          <span className="modelo-formato">{funcao}</span>
        </header>
        <p className="modelo-ajuda">Clique para inserir no ponto do cursor.</p>
        <div className="modelo-variaveis-lista">
          {porEscopo.map(([escopo, itens]) => (
            <div key={escopo} className="modelo-escopo">
              <h3>{ROTULO_ESCOPO[escopo as keyof typeof ROTULO_ESCOPO] ?? escopo}</h3>
              {itens.map(v => (
                <button
                  key={v.nome}
                  type="button"
                  className="modelo-variavel"
                  onClick={() => inserir(v.nome)}
                  title={`{{${v.nome}}}`}
                >
                  <span className="modelo-variavel-rotulo">{v.rotulo}</span>
                  <span className="modelo-variavel-exemplo">{v.exemplo}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <section className="modelo-previa card">
        <header className="modelo-cabecalho">
          <strong>Pré-visualização</strong>
          <span className="modelo-abas">
            <button type="button" className={aba === "visual" ? "ativa" : ""} onClick={() => setAba("visual")}>
              Visual
            </button>
            <button type="button" className={aba === "fonte" ? "ativa" : ""} onClick={() => setAba("fonte")}>
              Texto
            </button>
          </span>
        </header>

        {inexistentes.length > 0 ? (
          <p className="modelo-alerta" role="alert">
            {inexistentes.length === 1
              ? `A variável ${inexistentes[0]} não existe nesta função.`
              : `${inexistentes.length} variáveis não existem nesta função: ${inexistentes.join(", ")}.`}
          </p>
        ) : null}

        {lacunas.length > 0 && inexistentes.length === 0 ? (
          <p className="modelo-aviso">
            {lacunas.length === 1 ? "1 lacuna" : `${lacunas.length} lacunas`} com o registro de exemplo.
          </p>
        ) : null}

        {aba === "visual" ? (
          // O HTML vem de `markdownParaHTML`, que escapa a entrada antes de
          // aplicar marcação e não aceita HTML do usuário em nenhum caminho.
          // É por isso que este `dangerouslySetInnerHTML` é seguro, e é o
          // único lugar do módulo onde ele aparece.
          <article className="modelo-previa-corpo" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="modelo-previa-fonte">{texto}</pre>
        )}
      </section>
    </div>
  );
}
