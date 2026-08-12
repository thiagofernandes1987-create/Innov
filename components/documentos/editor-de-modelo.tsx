"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { duplicarModelo, excluirModelo, salvarModelo } from "@/app/actions/documentos";
import { useReencostarNoDom } from "@/lib/forms/reencostar-no-dom";
import {
  ROTULO_ESCOPO,
  dicionarioDeExemplo,
  variaveisDoTipo,
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
import { importarParaMarkdown } from "@/lib/documentos/importar";
import { ESTADO_INICIAL, nomeSugerido } from "@/lib/documentos/modelos";
import { ROTULO_CATEGORIA, TIPOS, categorias } from "@/lib/documentos/tipos";
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

export type ItemDaBiblioteca = {
  id: string;
  nome: string;
  status: string;
  escopo: "PLATAFORMA" | "ORGANIZACAO";
  clienteVe: boolean;
  aberto: boolean;
};

export type PastaDeModelos = {
  pasta: string;
  chave: string;
  grupos: { tipo: string; rotulo: string; itens: ItemDaBiblioteca[] }[];
};

export function EditorDeModelo({
  tipo: tipoInicial,
  corpoInicial = "",
  modeloId = null,
  nomeInicial = "",
  versaoInicial = 0,
  statusInicial = null,
  clienteVeInicial = false,
  escopoInicial = "ORGANIZACAO",
  pastas = []
}: {
  tipo: string;
  corpoInicial?: string;
  modeloId?: string | null;
  nomeInicial?: string;
  versaoInicial?: number;
  statusInicial?: "DRAFT" | "PUBLISHED" | null;
  clienteVeInicial?: boolean;
  escopoInicial?: "PLATAFORMA" | "ORGANIZACAO";
  pastas?: PastaDeModelos[];
}) {
  const [corpo, setCorpo] = useState(corpoInicial);
  const [nome, setNome] = useState(nomeInicial);
  const [tipo, setTipo] = useState(tipoInicial);

  // Este formulário atravessa a server action mais de uma vez sem desmontar —
  // salvar rascunho, publicar, salvar como — e é aí que a VACINA-051 morde: a
  // resposta re-renderiza a árvore do servidor, o navegador larga o valor do
  // campo, e o React não repõe porque o estado dele não mudou. Estado e DOM
  // divergem, e é o DOM que o formulário envia.
  const campo = useReencostarNoDom({ corpo, nome, tipo });
  const [clienteVe, setClienteVe] = useState(clienteVeInicial);
  const [selecao, setSelecao] = useState<Selecao>({ inicio: 0, fim: 0 });
  const [aba, setAba] = useState<Aba>("markdown");
  const [mostrarExplorador, setMostrarExplorador] = useState(pastas.length > 0);
  const [mostrarPrevia, setMostrarPrevia] = useState(true);
  const [tempoReal, setTempoReal] = useState(true);
  const [fonte, setFonte] = useState(FONTES[0]);
  const [tamanho, setTamanho] = useState(14);
  const [congelado, setCongelado] = useState(corpoInicial);
  const [listaAberta, setListaAberta] = useState(false);
  const [filtro, setFiltro] = useState("");

  // Trocar de modelo recarrega o conteúdo — mas **sem `key` na página**, que
  // remontaria o editor também na volta da própria gravação e jogaria fora o
  // que foi digitado depois de salvar. O ajuste durante a renderização é o
  // padrão que o React documenta para "estado derivado de prop que muda"; o
  // guarda contra `estado.modeloId` é o que separa "abri outro modelo" de
  // "acabei de salvar este".
  const [identidade, setIdentidade] = useState(modeloId);

  const router = useRouter();
  const area = useRef<HTMLTextAreaElement>(null);
  const espelho = useRef<HTMLDivElement>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const [estado, gravar, gravando] = useActionState(salvarModelo, {
    ...ESTADO_INICIAL,
    modeloId,
    nome: nomeInicial,
    versao: versaoInicial,
    status: statusInicial
  });
  const [remocao, remover, removendo] = useActionState(excluirModelo, ESTADO_INICIAL);
  const [copia, copiar, duplicando] = useActionState(duplicarModelo, ESTADO_INICIAL);

  if (modeloId !== identidade && modeloId !== estado.modeloId) {
    setIdentidade(modeloId);
    setCorpo(corpoInicial);
    setNome(nomeInicial);
    setCongelado(corpoInicial);
  }

  // O que vale é sempre a última resposta do servidor: depois de gravar, o id e
  // a versão mudam, e regravar com a versão antiga seria recusado como conflito.
  const idAtual = estado.modeloId ?? (copia.ok ? copia.modeloId : null) ?? modeloId;
  const versaoAtual = estado.versao || versaoInicial;
  const statusAtual = estado.status ?? statusInicial;
  // Depois de duplicar, o que está na tela é a cópia da empresa — o selo de
  // "padrão da plataforma" some junto, senão o editor continuaria dizendo que
  // não pode gravar o que acabou de virar dele.
  const daPlataforma = escopoInicial === "PLATAFORMA" && !copia.ok;

  // "Salvo" é derivado da resposta do servidor, não de um instantâneo tirado
  // aqui: a marca é o corpo que o banco confirmou ter gravado. Dizer salvo
  // antes ou por conta própria é a mentira que faz o usuário fechar a aba.
  const salvo = estado.ok && estado.corpoSalvo === corpo && estado.nome === nome;
  const alterado = !salvo && (corpo !== corpoInicial || nome !== nomeInicial);

  const enviar = useCallback((publicar: boolean) => {
    const form = formulario.current;
    if (!form) return;
    const campo = form.elements.namedItem("publicar");
    if (campo instanceof HTMLInputElement) campo.value = publicar ? "1" : "";
    if (campo instanceof HTMLInputElement) campo.disabled = !publicar;
    form.requestSubmit();
  }, []);

  // Depois da primeira gravação o modelo tem id, e o endereço passa a dizer
  // qual é. Sem isso, recarregar a página abre um editor em branco e o menu
  // File continua oferecendo "Excluir" para um modelo que ele acha que não
  // existe — o mesmo comportamento de qualquer editor que ganha identidade ao
  // salvar pela primeira vez.
  useEffect(() => {
    if (!estado.ok || !estado.modeloId || estado.modeloId === modeloId) return;
    // `history.replaceState` e não `router.replace`: navegar remontaria o
    // editor pela chave da rota e jogaria fora o que foi digitado depois de
    // salvar. Aqui não há nada a buscar — o estado já veio da gravação; o que
    // falta é só o endereço passar a apontar para o modelo.
    window.history.replaceState(
      null,
      "",
      `/app/modelos?tipo=${encodeURIComponent(tipo)}&modelo=${encodeURIComponent(estado.modeloId)}`
    );
  }, [estado.ok, estado.modeloId, tipo, modeloId]);

  const duplicar = useCallback(() => {
    const dados = new FormData();
    dados.set("modeloId", modeloId ?? "");
    startTransition(() => copiar(dados));
  }, [copiar, modeloId]);

  // A cópia recém-criada passa a ser o documento aberto, com o endereço junto:
  // recarregar depois de duplicar tem de trazer a cópia, não o padrão.
  useEffect(() => {
    if (!copia.ok || !copia.modeloId) return;
    window.history.replaceState(null, "", `/app/modelos?tipo=${encodeURIComponent(tipo)}&modelo=${encodeURIComponent(copia.modeloId)}`);
  }, [copia.ok, copia.modeloId, tipo]);

  const abrir = useCallback((id: string) => {
    if (alterado && !window.confirm("Há alterações não salvas neste modelo. Abrir outro descarta o que você escreveu.")) return;
    router.push(`/app/modelos?tipo=${encodeURIComponent(tipo)}&modelo=${encodeURIComponent(id)}`);
  }, [alterado, tipo, router]);

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
  const disponiveis = useMemo(() => variaveisDoTipo(tipo), [tipo]);
  const exemplo = useMemo(() => dicionarioDeExemplo(tipo), [tipo]);

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

  const totalDeModelos = pastas.reduce((soma, p) => soma + p.grupos.reduce((n, g) => n + g.itens.length, 0), 0);
  const arquivo = (nome || nomeSugerido(corpo, tipo))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "modelo";

  const novo = useCallback(() => {
    if (alterado && !window.confirm("Há alterações não salvas. Começar um modelo novo descarta o que você escreveu.")) return;
    router.push(`/app/modelos?tipo=${encodeURIComponent(tipo)}`);
  }, [alterado, tipo, router]);

  // "Salvar como" é uma gravação nova: some o id, e o servidor insere. Sem
  // limpar o id, salvar como sobrescreveria o modelo aberto — que é
  // exatamente o oposto do que o nome do comando promete.
  const salvarComo = useCallback(() => {
    const sugerido = window.prompt("Salvar como:", nome ? `${nome} (cópia)` : nomeSugerido(corpo, tipo));
    if (sugerido === null) return;
    const limpo = sugerido.trim();
    if (!limpo) return;
    setNome(limpo);
    const form = formulario.current;
    if (!form) return;
    const campoId = form.elements.namedItem("modeloId");
    if (campoId instanceof HTMLInputElement) campoId.value = "";
    requestAnimationFrame(() => enviar(false));
  }, [corpo, enviar, tipo, nome]);

  const entrada = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [avisoDaImportacao, setAvisoDaImportacao] = useState<{ ok: boolean; texto: string } | null>(null);

  const importar = useCallback(async (arquivo: File) => {
    setImportando(true);
    setAvisoDaImportacao(null);
    // Nada de servidor: o arquivo é lido no navegador e nunca sai da máquina.
    // Um modelo de proposta traz preço, nome de cliente e margem; mandá-lo para
    // um conversor só para virar texto seria expor o que não precisa sair.
    const r = await importarParaMarkdown(arquivo.name, await arquivo.arrayBuffer());
    setImportando(false);
    if (!r.ok) {
      setAvisoDaImportacao({ ok: false, texto: r.motivo });
      return;
    }
    if (corpo.trim() && !window.confirm("Importar substitui todo o corpo do editor. Continuar?")) return;
    setCorpo(r.markdown);
    setCongelado(r.markdown);
    if (!nome) setNome(nomeSugerido(r.markdown, tipo) || arquivo.name.replace(/\.[^.]+$/, ""));
    setAvisoDaImportacao({
      ok: true,
      texto: `${arquivo.name} convertido: ${r.markdown.split("\n").length} linhas.` + (r.aviso ? ` ${r.aviso}` : "")
    });
  }, [corpo, tipo, nome]);

  const excluir = useCallback(() => {
    const publicado = statusAtual === "PUBLISHED";
    const pergunta = publicado
      ? "Este modelo está publicado. Ele será arquivado: para de aparecer para quem emite documento e continua disponível para auditoria. Confirma?"
      : "Excluir este modelo? Ele nunca foi publicado, então some de vez.";
    if (!window.confirm(pergunta)) return;
    const dados = new FormData();
    dados.set("modeloId", idAtual ?? "");
    // Ação de `useActionState` chamada fora de transição não atualiza o estado
    // de "em andamento" — e o React avisa no console. Salvar passa pelo
    // `action` do formulário; excluir não tem formulário, então declara a
    // transição na mão.
    startTransition(() => remover(dados));
  }, [idAtual, remover, statusAtual]);

  const menus: Menu[] = [
    {
      rotulo: "File",
      itens: [
        { tipo: "acao", rotulo: "Novo", atalho: "Ctrl+N", aoEscolher: () => novo() },
        {
          tipo: "acao",
          rotulo: "Abrir…",
          atalho: "Ctrl+O",
          aoEscolher: () => setMostrarExplorador(true),
          desabilitado: totalDeModelos === 0,
          dica: totalDeModelos === 0 ? "A biblioteca ainda está vazia." : "Escolha no explorador, à esquerda."
        },
        { tipo: "separador" },
        {
          tipo: "acao",
          rotulo: "Salvar",
          atalho: "Ctrl+S",
          aoEscolher: () => enviar(false),
          desabilitado: gravando,
          dica: "Grava como rascunho. Rascunho é do autor: não precisa estar pronto."
        },
        {
          tipo: "acao",
          rotulo: "Salvar como…",
          aoEscolher: () => salvarComo(),
          desabilitado: gravando,
          dica: "Grava uma cópia com outro nome, e passa a editar a cópia."
        },
        {
          tipo: "acao",
          rotulo: "Publicar",
          aoEscolher: () => enviar(true),
          desabilitado: gravando || statusAtual === "PUBLISHED",
          dica:
            statusAtual === "PUBLISHED"
              ? "Este modelo já está publicado."
              : "Publicado passa a valer para quem emite documento. Exige acesso total ao aplicativo."
        },
        { tipo: "separador" },
        {
          tipo: "acao",
          rotulo: "Importar arquivo…",
          aoEscolher: () => entrada.current?.click(),
          desabilitado: importando,
          dica: "DOCX, XLSX, CSV, TXT e Markdown. A conversão acontece no navegador: o arquivo não sai da sua máquina."
        },
        { tipo: "acao", rotulo: "Exportar Markdown", aoEscolher: () => baixar(`${arquivo}.md`, corpo, "text/markdown") },
        { tipo: "acao", rotulo: "Exportar HTML", aoEscolher: () => baixar(`${arquivo}.html`, html, "text/html") },
        { tipo: "acao", rotulo: "Exportar PDF", desabilitado: true, dica: emBreve("Conversão para PDF") },
        { tipo: "separador" },
        {
          tipo: "acao",
          rotulo: statusAtual === "PUBLISHED" ? "Arquivar modelo" : "Excluir modelo",
          aoEscolher: () => excluir(),
          desabilitado: !idAtual || removendo,
          dica: !idAtual
            ? "Só é possível excluir um modelo já salvo."
            : "Modelo publicado é arquivado, nunca excluído: a auditoria precisa chegar no molde que originou o documento assinado."
        }
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

  const erroDoNome = estado.erros.find(e => e.campo === "nome");
  const errosDoCorpo = estado.erros.filter(e => e.campo !== "nome");
  const aviso = avisoDaImportacao?.texto || copia.mensagem || remocao.mensagem || estado.mensagem;
  const avisoOk = avisoDaImportacao
    ? avisoDaImportacao.ok
    : copia.mensagem
      ? copia.ok
      : remocao.mensagem
        ? remocao.ok
        : estado.ok;

  return (
    <form className="editor-doc" ref={formulario} action={gravar}>
      {/* O que vai para a action. O corpo é campo do formulário e não estado
          perdido: se a gravação falhar, ele continua no DOM — VACINA-042. */}
      <input type="hidden" name="modeloId" defaultValue={idAtual ?? ""} key={idAtual ?? "novo"} />
      <input type="hidden" name="versao" value={versaoAtual} />
      <input type="hidden" name="publicar" value="" disabled />
      {clienteVe ? <input type="hidden" name="clienteVe" value="1" /> : null}
      <textarea ref={campo("corpo")} name="corpo" value={corpo} readOnly hidden />
      <input
        ref={entrada}
        type="file"
        accept=".docx,.xlsx,.csv,.tsv,.txt,.md,.markdown"
        hidden
        onChange={e => {
          const arquivo = e.target.files?.[0];
          // Limpar o valor é o que permite importar o mesmo arquivo duas vezes:
          // sem isso o segundo `change` nunca dispara.
          e.target.value = "";
          if (arquivo) void importar(arquivo);
        }}
      />

      <header className="editor-doc-barra">
        <span className="editor-doc-identidade">
          <span className="editor-doc-icone" aria-hidden="true">▤</span>
          <input
            ref={campo("nome")}
            className={erroDoNome ? "editor-doc-nome invalido" : "editor-doc-nome"}
            name="nome"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder={nomeSugerido(corpo, tipo)}
            aria-label="Nome do modelo"
            aria-invalid={Boolean(erroDoNome)}
            maxLength={120}
          />
          <select
            ref={campo("tipo")}
            className="editor-doc-tipo"
            name="tipo"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            aria-label="Tipo de documento"
            disabled={daPlataforma}
          >
            {categorias().map(categoria => (
              <optgroup key={categoria} label={ROTULO_CATEGORIA[categoria]}>
                {TIPOS.filter(t => t.categoria === categoria).map(t => (
                  <option key={t.chave} value={t.chave}>{t.rotulo}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className={salvo ? "editor-doc-estado salvo" : "editor-doc-estado"}>
            {importando ? "Convertendo…" : gravando ? "Salvando…" : salvo ? `Salvo · v${versaoAtual}` : "Não salvo"}
          </span>
          {statusAtual === "PUBLISHED" ? <span className="editor-selo ok">Publicado</span> : null}
          {daPlataforma ? <span className="editor-selo aviso">Padrão da plataforma</span> : null}
        </span>
        <span className="editor-doc-acoes">
          <button type="button" className="button button-secondary" onClick={() => setMostrarPrevia(v => !v)}>
            {mostrarPrevia ? "Ocultar prévia" : "Visualizar"}
          </button>
          {daPlataforma ? (
            <button type="button" className="button button-primary" onClick={duplicar} disabled={duplicando}>
              {duplicando ? "Duplicando…" : "Duplicar para a minha empresa"}
            </button>
          ) : (
            <>
              <button type="button" className="button button-secondary" onClick={() => enviar(true)} disabled={gravando || statusAtual === "PUBLISHED"}>
                Publicar
              </button>
              <button type="button" className="button button-primary" onClick={() => enviar(false)} disabled={gravando}>
                {gravando ? "Salvando…" : "Salvar"}
              </button>
            </>
          )}
        </span>
      </header>

      {aviso ? (
        <p className={avisoOk ? "editor-aviso ok" : "editor-aviso erro"} role="status" aria-live="polite">
          {aviso}
          {errosDoCorpo.map(e => <span key={e.mensagem}>{e.mensagem}</span>)}
          {erroDoNome ? <span>{erroDoNome.mensagem}</span> : null}
        </p>
      ) : null}

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
            {pastas.map(pasta => (
              <div className="editor-pasta" key={pasta.chave}>
                <h3>{pasta.pasta}</h3>
                {pasta.grupos.map(grupo => (
                  <div className="editor-grupo-de-tipo" key={grupo.tipo}>
                    <h4>{grupo.rotulo}</h4>
                    {grupo.itens.map(item => (
                      <button
                        type="button"
                        className={item.aberto ? "editor-arquivo aberto" : "editor-arquivo"}
                        key={item.id}
                        onClick={() => abrir(item.id)}
                        title={
                          (item.escopo === "PLATAFORMA" ? "Padrão da plataforma" : "Da sua empresa") +
                          (item.status === "PUBLISHED" ? " · publicado" : " · rascunho") +
                          (item.clienteVe ? " · vai para o cliente" : "")
                        }
                      >
                        <span aria-hidden="true">{item.escopo === "PLATAFORMA" ? "◆" : "M↓"}</span>
                        {item.nome}
                        {item.status === "PUBLISHED" ? <em aria-label="publicado">•</em> : null}
                      </button>
                    ))}
                  </div>
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
                setSelecao({ inicio: e.target.selectionStart, fim: e.target.selectionEnd });
              }}
              onSelect={e => {
                const el = e.target as HTMLTextAreaElement;
                setSelecao({ inicio: el.selectionStart, fim: el.selectionEnd });
              }}
              onKeyDown={e => {
                if (!(e.ctrlKey || e.metaKey)) return;
                if (e.key.toLowerCase() === "s") {
                  // Ctrl+S no navegador salva a página. Num editor, salva o
                  // documento — e quem escreve aperta por reflexo.
                  e.preventDefault();
                  enviar(false);
                  return;
                }
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
        <label className="editor-status-cliente">
          <input
            type="checkbox"
            checked={clienteVe}
            onChange={() => setClienteVe(v => !v)}
            disabled={daPlataforma}
          />
          Pode ser enviado ao cliente
        </label>
        <span className="editor-status-direita">UTF-8</span>
        <span>LF</span>
      </footer>
    </form>
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
