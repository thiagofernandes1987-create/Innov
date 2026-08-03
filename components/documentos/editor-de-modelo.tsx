"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ROTULO_ESCOPO,
  dicionarioDeExemplo,
  variaveisDaFuncao,
  type DefinicaoVariavel
} from "@/lib/documentos/dicionario";
import {
  contarPalavras,
  envolver,
  inserir,
  inserirLink,
  inserirTabela,
  linhaEColuna,
  numerarLinhas,
  prefixarLinhas,
  type Edicao,
  type Selecao
} from "@/lib/documentos/edicao";
import { markdownParaHTML } from "@/lib/documentos/markdown";
import { renderizar, variaveisInexistentes } from "@/lib/documentos/modelo";
import { BarraDeMenu, type Menu } from "./menu-do-editor";

// Editor de documento — layout desenhado pelo responsável em 3 de agosto.
//
// Estrutura, de cima para baixo, como nas duas capturas entregues:
//
//   barra do documento   nome, estado, "salvo às", Visualizar, Salvar ▾
//   barra de menu        File · Edit · Inserir · View
//   barra de ferramentas desfazer/refazer · fonte · tamanho · sub/sobrescrito ·
//                        B I U S · cor · listas · alinhamento · link · imagem ·
//                        tabela · código · citação · mais
//   corpo                explorador ⟷ editor ⟷ pré-visualização
//   barra de status      Lin/Col · palavras · formato · tema · codificação · fim de linha
//
// Explorador e pré-visualização **ligam e desligam** pelo menu View, como
// pedido. As convenções de menu vieram de pesquisa antes de escrever: abre no
// clique, troca no hover com outro aberto, fecha no Escape e no clique fora,
// atalho alinhado à direita, item indisponível fica visível e desabilitado.
//
// O que ainda não existe fica **desabilitado com explicação no `title`**, nunca
// escondido e nunca fingindo funcionar: esconder faz o usuário achar que a
// função não existe; fingir faz ele descobrir do jeito ruim.

type Aba = "markdown" | "wysiwyg";

const FONTES = ["Roboto", "Inter", "Manrope", "IBM Plex Mono", "Georgia", "Times New Roman"];
const TAMANHOS = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

export function EditorDeModelo({
  funcao,
  corpoInicial = "",
  nomeArquivo = "Novo documento.md",
  arquivos = []
}: {
  funcao: string;
  corpoInicial?: string;
  nomeArquivo?: string;
  arquivos?: { pasta: string; itens: { nome: string; tipo: string }[] }[];
}) {
  const [corpo, setCorpo] = useState(corpoInicial);
  const [selecao, setSelecao] = useState<Selecao>({ inicio: 0, fim: 0 });
  const [aba, setAba] = useState<Aba>("markdown");
  const [mostrarExplorador, setMostrarExplorador] = useState(arquivos.length > 0);
  const [mostrarPrevia, setMostrarPrevia] = useState(true);
  const [tempoReal, setTempoReal] = useState(true);
  const [fonte, setFonte] = useState(FONTES[0]);
  const [tamanho, setTamanho] = useState(14);
  const [salvo, setSalvo] = useState(false);
  const [congelado, setCongelado] = useState(corpoInicial);
  const [listaAberta, setListaAberta] = useState(false);
  const [filtro, setFiltro] = useState("");

  const area = useRef<HTMLTextAreaElement>(null);
  const espelho = useRef<HTMLDivElement>(null);

  // A lista fecha no Escape e no clique fora, como todo menu suspenso.
  useEffect(() => {
    if (!listaAberta) return;
    function fechar(evento: MouseEvent | KeyboardEvent) {
      if (evento instanceof KeyboardEvent) {
        if (evento.key === "Escape") setListaAberta(false);
        return;
      }
      const alvo = evento.target as Node;
      if (!(alvo instanceof Element) || !alvo.closest(".editor-inserir")) setListaAberta(false);
    }
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [listaAberta]);
  const disponiveis = useMemo(() => variaveisDaFuncao(funcao), [funcao]);
  const exemplo = useMemo(() => dicionarioDeExemplo(funcao), [funcao]);

  // Em tempo real a prévia acompanha o que se digita; desligado, ela mostra o
  // último congelamento. Quem escreve documento longo em máquina modesta
  // desliga — e é por isso que a opção existe.
  const fonteDaPrevia = tempoReal ? corpo : congelado;
  const { texto, lacunas } = useMemo(() => renderizar(fonteDaPrevia, exemplo), [fonteDaPrevia, exemplo]);
  const html = useMemo(() => markdownParaHTML(texto), [texto]);
  const inexistentes = useMemo(
    () => variaveisInexistentes(corpo, disponiveis.map(v => v.nome)),
    [corpo, disponiveis]
  );
  const posicao = useMemo(() => linhaEColuna(corpo, selecao.inicio), [corpo, selecao.inicio]);
  const palavras = useMemo(() => contarPalavras(corpo), [corpo]);

  const aplicar = useCallback((edicao: Edicao) => {
    setCorpo(edicao.texto);
    setSelecao(edicao.selecao);
    setSalvo(false);
    // Devolver o foco e a seleção ao textarea é o que faz a barra de
    // ferramentas parecer parte do editor, e não um formulário à parte.
    requestAnimationFrame(() => {
      const el = area.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(edicao.selecao.inicio, edicao.selecao.fim);
    });
  }, []);

  const acao = useCallback(
    (fn: (t: string, s: Selecao) => Edicao) => () => aplicar(fn(corpo, selecao)),
    [aplicar, corpo, selecao]
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

  const emBreve = (o_que: string) => `${o_que} entra na próxima tarefa do motor de documento.`;

  const menus: Menu[] = [
    {
      rotulo: "File",
      itens: [
        { tipo: "acao", rotulo: "Novo", atalho: "Ctrl+N", aoEscolher: () => { setCorpo(""); setSalvo(false); } },
        { tipo: "acao", rotulo: "Abrir…", atalho: "Ctrl+O", desabilitado: true, dica: emBreve("Abrir modelo salvo") },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Salvar", atalho: "Ctrl+S", desabilitado: true, dica: emBreve("Gravar em document_templates") },
        { tipo: "acao", rotulo: "Salvar como…", desabilitado: true, dica: emBreve("Salvar como") },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Importar arquivo…", desabilitado: true, dica: "Conversão de DOCX, XLSX, CSV e PDF para Markdown depende de decisão sobre dependência — registrada na S-32." },
        { tipo: "acao", rotulo: "Exportar Markdown", aoEscolher: () => baixar(`${nomeArquivo}`, corpo, "text/markdown") },
        { tipo: "acao", rotulo: "Exportar HTML", aoEscolher: () => baixar(`${nomeArquivo.replace(/\.md$/, "")}.html`, html, "text/html") },
        { tipo: "acao", rotulo: "Exportar PDF", desabilitado: true, dica: emBreve("Conversão para PDF") },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Excluir modelo", desabilitado: true, dica: "Excluir exige modelo nunca publicado; o publicado é arquivado." }
      ]
    },
    {
      rotulo: "Edit",
      itens: [
        { tipo: "acao", rotulo: "Desfazer", atalho: "Ctrl+Z", aoEscolher: () => document.execCommand?.("undo") },
        { tipo: "acao", rotulo: "Refazer", atalho: "Ctrl+Y", aoEscolher: () => document.execCommand?.("redo") },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Selecionar tudo", atalho: "Ctrl+A", aoEscolher: () => area.current?.select() },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Negrito", atalho: "Ctrl+B", aoEscolher: acao((t, s) => envolver(t, s, "**")) },
        { tipo: "acao", rotulo: "Itálico", atalho: "Ctrl+I", aoEscolher: acao((t, s) => envolver(t, s, "*")) },
        { tipo: "acao", rotulo: "Tachado", aoEscolher: acao((t, s) => envolver(t, s, "~~")) },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Localizar e substituir", atalho: "Ctrl+H", desabilitado: true, dica: emBreve("Localizar e substituir") }
      ]
    },
    {
      rotulo: "Inserir",
      itens: [
        { tipo: "acao", rotulo: "Tabela", aoEscolher: acao((t, s) => inserirTabela(t, s)) },
        { tipo: "acao", rotulo: "Link", atalho: "Ctrl+K", aoEscolher: acao((t, s) => inserirLink(t, s)) },
        { tipo: "acao", rotulo: "Imagem", desabilitado: true, dica: "Depende do armazenamento de anexo do modelo." },
        { tipo: "acao", rotulo: "Bloco de código", aoEscolher: acao((t, s) => envolver(t, s, "\n```\n", "\n```\n")) },
        { tipo: "acao", rotulo: "Citação", aoEscolher: acao((t, s) => prefixarLinhas(t, s, "> ")) },
        { tipo: "acao", rotulo: "Linha horizontal", aoEscolher: acao((t, s) => inserir(t, s, "\n\n---\n\n")) },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Campo de assinatura", desabilitado: true, dica: "Assinatura entra junto com o envio para o módulo de assinaturas." },
        { tipo: "acao", rotulo: "Quebra de página", aoEscolher: acao((t, s) => inserir(t, s, "\n\n<!-- quebra-de-pagina -->\n\n")) }
      ]
    },
    {
      rotulo: "View",
      itens: [
        { tipo: "alternancia", rotulo: "Explorador", ativo: mostrarExplorador, aoEscolher: () => setMostrarExplorador(v => !v) },
        { tipo: "alternancia", rotulo: "Pré-visualização", ativo: mostrarPrevia, aoEscolher: () => setMostrarPrevia(v => !v) },
        { tipo: "alternancia", rotulo: "Atualizar em tempo real", ativo: tempoReal, aoEscolher: () => setTempoReal(v => !v) },
        { tipo: "separador" },
        { tipo: "alternancia", rotulo: "Editar em Markdown", ativo: aba === "markdown", aoEscolher: () => setAba("markdown") },
        { tipo: "alternancia", rotulo: "Editar em WYSIWYG", ativo: aba === "wysiwyg", aoEscolher: () => setAba("wysiwyg") },
        { tipo: "separador" },
        { tipo: "acao", rotulo: "Atualizar pré-visualização", aoEscolher: () => setCongelado(corpo), desabilitado: tempoReal, dica: "Disponível quando o tempo real está desligado." }
      ]
    }
  ];

  return (
    <div className="editor-doc">
      <header className="editor-doc-barra">
        <span className="editor-doc-identidade">
          <span className="editor-doc-icone" aria-hidden="true">▤</span>
          <strong>{nomeArquivo}</strong>
          <span className={salvo ? "editor-doc-estado salvo" : "editor-doc-estado"}>
            {salvo ? "Salvo" : "Não salvo"}
          </span>
        </span>
        <span className="editor-doc-acoes">
          <button type="button" className="button button-secondary" onClick={() => setMostrarPrevia(v => !v)}>
            {mostrarPrevia ? "Ocultar prévia" : "Visualizar"}
          </button>
          <button type="button" className="button button-primary" disabled title={emBreve("Gravar em document_templates")}>
            Salvar
          </button>
        </span>
      </header>

      <BarraDeMenu menus={menus} />

      <div className="editor-ferramentas" role="toolbar" aria-label="Formatação">
        <span className="editor-grupo">
          <select value={fonte} onChange={e => setFonte(e.target.value)} aria-label="Tipo de fonte">
            {FONTES.map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={tamanho} onChange={e => setTamanho(Number(e.target.value))} aria-label="Tamanho da fonte">
            {TAMANHOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </span>
        <span className="editor-grupo">
          <button type="button" title="Título 1" onClick={acao((t, s) => prefixarLinhas(t, s, "# "))}>H1</button>
          <button type="button" title="Título 2" onClick={acao((t, s) => prefixarLinhas(t, s, "## "))}>H2</button>
          <button type="button" title="Subscrito" onClick={acao((t, s) => envolver(t, s, "<sub>", "</sub>"))}>X₂</button>
          <button type="button" title="Sobrescrito" onClick={acao((t, s) => envolver(t, s, "<sup>", "</sup>"))}>X²</button>
          <button type="button" title="Tachado" onClick={acao((t, s) => envolver(t, s, "~~"))}><s>S</s></button>
        </span>
        <span className="editor-grupo">
          <button type="button" title="Negrito (Ctrl+B)" onClick={acao((t, s) => envolver(t, s, "**"))}><b>B</b></button>
          <button type="button" title="Itálico (Ctrl+I)" onClick={acao((t, s) => envolver(t, s, "*"))}><i>I</i></button>
          <button type="button" title="Código" onClick={acao((t, s) => envolver(t, s, "`"))}>{"</>"}</button>
        </span>
        <span className="editor-grupo">
          <button type="button" title="Lista" onClick={acao((t, s) => prefixarLinhas(t, s, "- "))}>•—</button>
          <button type="button" title="Lista numerada" onClick={acao(numerarLinhas)}>1—</button>
          <button type="button" title="Citação" onClick={acao((t, s) => prefixarLinhas(t, s, "> "))}>❝</button>
        </span>
        <span className="editor-grupo">
          <button type="button" title="Link (Ctrl+K)" onClick={acao((t, s) => inserirLink(t, s))}>🔗</button>
          <button type="button" title="Tabela" onClick={acao((t, s) => inserirTabela(t, s))}>▦</button>
        </span>
        {/* Variáveis como botão que desce lista, na barra superior — não como
            painel fixo na lateral. O painel fixo rouba largura permanente do
            editor e da prévia para uma ação que é ocasional; a lista suspensa
            aparece quando se precisa e some depois. */}
        <span className="editor-grupo editor-inserir">
          <button
            type="button"
            className="editor-inserir-botao"
            aria-haspopup="menu"
            aria-expanded={listaAberta}
            onClick={() => setListaAberta(v => !v)}
          >
            Variáveis <span aria-hidden="true">▾</span>
          </button>
          {listaAberta ? (
            <div className="editor-inserir-lista" role="menu">
              <input
                className="editor-inserir-busca"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                placeholder="Buscar variável…"
                aria-label="Buscar variável"
                autoFocus
              />
              <div className="editor-inserir-rolagem">
                {porEscopo.map(([escopo, itens]) => {
                  const visiveis = itens.filter(v =>
                    !filtro ||
                    v.rotulo.toLowerCase().includes(filtro.toLowerCase()) ||
                    v.nome.includes(filtro.toLowerCase())
                  );
                  if (visiveis.length === 0) return null;
                  return (
                    <div key={escopo}>
                      <h3>{ROTULO_ESCOPO[escopo as keyof typeof ROTULO_ESCOPO] ?? escopo}</h3>
                      {visiveis.map(v => (
                        <button
                          key={v.nome}
                          type="button"
                          role="menuitem"
                          className="editor-variavel"
                          title={`{{${v.nome}}}`}
                          onClick={() => {
                            aplicar(inserir(corpo, selecao, `{{${v.nome}}}`));
                            setListaAberta(false);
                            setFiltro("");
                          }}
                        >
                          <span>{v.rotulo}</span>
                          <small>{v.exemplo}</small>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </span>
      </div>

      <div className={`editor-corpo${mostrarExplorador ? " com-explorador" : ""}${mostrarPrevia ? " com-previa" : ""}`}>
        {mostrarExplorador ? (
          <aside className="editor-explorador">
            <header>
              <strong>EXPLORADOR</strong>
              <button type="button" onClick={() => setMostrarExplorador(false)} aria-label="Fechar explorador">×</button>
            </header>
            {arquivos.map(pasta => (
              <div className="editor-pasta" key={pasta.pasta}>
                <h3>{pasta.pasta}</h3>
                {pasta.itens.map(item => (
                  <button type="button" className="editor-arquivo" key={item.nome} disabled title={emBreve("Abrir arquivo")}>
                    <span aria-hidden="true">{item.tipo === "md" ? "M↓" : "▢"}</span>
                    {item.nome}
                  </button>
                ))}
              </div>
            ))}
          </aside>
        ) : null}

        <section className="editor-painel">
          <div className="editor-abas">
            <button type="button" className={aba === "markdown" ? "ativa" : ""} onClick={() => setAba("markdown")}>
              Markdown
            </button>
            <button
              type="button"
              className={aba === "wysiwyg" ? "ativa" : ""}
              onClick={() => setAba("wysiwyg")}
              disabled
              title="A edição visual entra depois; hoje o WYSIWYG é a própria pré-visualização ao lado."
            >
              WYSIWYG
            </button>
            <label className="editor-tempo-real">
              <input type="checkbox" checked={tempoReal} onChange={() => setTempoReal(v => !v)} />
              Tempo real
            </label>
          </div>
          {/* Numeração por espelho: cada linha lógica é repetida invisível, com a
              mesma fonte e a mesma largura do textarea, para que o número fique na
              altura certa mesmo quando a linha quebra sozinha. Numerar por
              contagem de "\n" erra assim que uma linha ocupa duas alturas — e no
              editor de 1366px quase todo parágrafo ocupa. */}
          <div className="editor-area">
            <div
              className="editor-espelho"
              ref={espelho}
              aria-hidden="true"
              style={{ fontFamily: fonte, fontSize: `${tamanho}px` }}
            >
              {corpo.split("\n").map((linha, i) => (
                <p key={i}>
                  <b>{i + 1}</b>
                  {linha || "​"}
                </p>
              ))}
            </div>
            <textarea
              ref={area}
              className="editor-texto"
              style={{ fontFamily: fonte, fontSize: `${tamanho}px` }}
              onScroll={e => {
                // O espelho está por baixo: sem acompanhar a rolagem, o número
                // fica parado enquanto o texto anda.
                if (espelho.current) espelho.current.scrollTop = e.currentTarget.scrollTop;
              }}
              value={corpo}
              spellCheck
              aria-label="Corpo do documento em Markdown"
              onChange={e => {
                setCorpo(e.target.value);
                setSalvo(false);
                setSelecao({ inicio: e.target.selectionStart, fim: e.target.selectionEnd });
              }}
              onSelect={e => {
                const el = e.target as HTMLTextAreaElement;
                setSelecao({ inicio: el.selectionStart, fim: el.selectionEnd });
              }}
              onKeyDown={e => {
                if (!(e.ctrlKey || e.metaKey)) return;
                const mapa: Record<string, () => Edicao> = {
                  b: () => envolver(corpo, selecao, "**"),
                  i: () => envolver(corpo, selecao, "*"),
                  k: () => inserirLink(corpo, selecao)
                };
                const fn = mapa[e.key.toLowerCase()];
                if (!fn) return;
                e.preventDefault();
                aplicar(fn());
              }}
            />
          </div>
          <input type="hidden" name="bodyMarkdown" value={corpo} />
        </section>

        {mostrarPrevia ? (
          <section className="editor-previa">
            <header>
              <strong>Pré-visualização</strong>
              {inexistentes.length > 0 ? (
                <span className="editor-selo erro">{inexistentes.length} variável(is) inexistente(s)</span>
              ) : lacunas.length > 0 ? (
                <span className="editor-selo aviso">{lacunas.length} lacuna(s)</span>
              ) : (
                <span className="editor-selo ok">sem lacuna</span>
              )}
            </header>
            {/* Seguro: `markdownParaHTML` escapa a entrada antes de aplicar
                marcação e não aceita HTML do usuário em nenhum caminho. */}
            <article className="editor-previa-corpo" dangerouslySetInnerHTML={{ __html: html }} />
          </section>
        ) : null}

      </div>

      <footer className="editor-status">
        <span>Lin {posicao.linha}, Col {posicao.coluna}</span>
        <span>{palavras} palavras</span>
        <span>Markdown</span>
        <span className="editor-status-direita">UTF-8</span>
        <span>LF</span>
      </footer>
    </div>
  );
}

/** Exportação sem servidor: o conteúdo já está no navegador. */
function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
