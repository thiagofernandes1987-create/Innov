// Regras de gravação de modelo — puras, para o servidor e o editor usarem a
// mesma, e para terem teste sem banco.
//
// Duas decisões governam este arquivo.
//
// A primeira é VACINA-042: **falha de formulário não apaga contexto**. Nada
// aqui redireciona nem lança; tudo devolve erro por campo, e o corpo digitado
// continua onde estava. Perder um modelo de contrato de duas páginas porque o
// nome repetiu é o tipo de defeito que faz o usuário parar de usar a tela.
//
// A segunda é a diferença entre **salvar** e **publicar**. Salvar é do autor:
// aceita rascunho incompleto, corpo vazio, variável ainda errada — é trabalho
// em andamento. Publicar é da organização: o modelo passa a gerar documento que
// vai para fora, e aí a régua é a mais dura que existir.

import { variaveisDoTipo } from "./dicionario";
import { variaveisInexistentes } from "./modelo";
import { rotuloDoTipo, tipo } from "./tipos";

export const LIMITE_DO_NOME = 120;

export type ErroDeCampo = { campo: "nome" | "corpo" | "tipo"; mensagem: string };

export type EntradaDeModelo = {
  nome: string;
  corpo: string;
  /** Chave do catálogo `tipos.ts` — é como o módulo organiza a biblioteca. */
  tipo: string;
  publicar: boolean;
};

/**
 * Valida antes de tocar no banco.
 *
 * O que o banco também garante — nome não vazio, corpo em publicado, nome único
 * — continua garantido lá: constraint é a única verificação que ninguém
 * contorna. Isto aqui existe para o usuário saber **qual campo** corrigir sem
 * esperar a ida ao servidor, não para substituir a constraint.
 */
export function validarModelo(entrada: EntradaDeModelo): { erros: ErroDeCampo[] } {
  const erros: ErroDeCampo[] = [];
  const nome = String(entrada.nome ?? "").trim();
  const corpo = String(entrada.corpo ?? "");

  if (!nome) erros.push({ campo: "nome", mensagem: "Dê um nome ao modelo para poder encontrá-lo depois." });
  else if (nome.length > LIMITE_DO_NOME) {
    erros.push({ campo: "nome", mensagem: `O nome do modelo cabe em ${LIMITE_DO_NOME} caracteres.` });
  }

  if (!tipo(entrada.tipo)) {
    erros.push({ campo: "tipo", mensagem: "Escolha um tipo de documento do catálogo." });
  }

  if (entrada.publicar) {
    if (!corpo.trim()) {
      erros.push({ campo: "corpo", mensagem: "Modelo publicado sem corpo geraria documento em branco." });
    }
    // Publicar com variável que não resolve é o defeito que só aparece na
    // frente de quem recebe o documento. A conferência do editor é conforto; a
    // que vale é esta, no servidor, porque validação de cliente não é validação.
    const conhecidas = variaveisDoTipo(entrada.tipo).map(v => v.nome);
    const faltantes = variaveisInexistentes(corpo, conhecidas);
    if (faltantes.length > 0) {
      erros.push({
        campo: "corpo",
        mensagem:
          `Estas variáveis não existem em ${rotuloDoTipo(entrada.tipo)}: ${faltantes.join(", ")}. ` +
          "Corrija ou remova antes de publicar."
      });
    }
  }

  return { erros };
}

/**
 * Falha do banco vira frase de domínio.
 *
 * Mensagem de provedor na tela é o defeito registrado em VACINA-042: o usuário
 * lê o nome de um índice e não descobre o que fazer. E vazar nome de tabela e
 * de constraint conta ao visitante como o banco é feito.
 */
export function traduzirFalhaDoBanco(erro: { code?: string; message?: string } | null | undefined): string {
  const code = String(erro?.code ?? "");
  const message = String(erro?.message ?? "");

  if (code === "23505") return "Já existe um modelo com o mesmo nome neste tipo de documento. Escolha outro nome.";
  if (code === "42501" || /row-level security/i.test(message)) {
    return "Você não tem permissão para gravar na biblioteca de modelos. Fale com quem administra os acessos.";
  }
  if (code === "23514") {
    if (/publicado_tem_corpo/.test(message)) return "Modelo publicado precisa ter corpo.";
    return "O modelo não atende a uma regra do aplicativo. Revise nome, tipo e corpo.";
  }
  if (code === "23503") return "Este tipo de documento não existe mais no catálogo.";
  return "Não foi possível gravar o modelo agora. O que você escreveu continua aqui — tente de novo.";
}

/** Nome sugerido ao salvar pela primeira vez: o título que o autor já escreveu. */
export function nomeSugerido(corpo: string, tipoDoDocumento: string): string {
  const titulo = String(corpo ?? "")
    .split("\n")
    .map(l => l.trim())
    .find(l => /^#{1,3}\s+\S/.test(l));
  if (!titulo) return rotuloDoTipo(tipoDoDocumento);
  const limpo = titulo
    .replace(/^#{1,3}\s+/, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return limpo ? limpo.slice(0, LIMITE_DO_NOME) : rotuloDoTipo(tipoDoDocumento);
}

export type EstadoDoModelo = {
  ok: boolean;
  mensagem: string;
  erros: ErroDeCampo[];
  modeloId: string | null;
  nome: string;
  versao: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | null;
  salvoEm: string | null;
  /** Origem do modelo: da plataforma (não editável) ou da empresa. */
  escopo: "PLATAFORMA" | "ORGANIZACAO" | null;
  /**
   * O corpo que o servidor confirmou ter gravado.
   *
   * É o que permite ao editor dizer "salvo" sem `useEffect` e sem acreditar em
   * si mesmo: a marca vem de quem gravou, e basta comparar com o que está na
   * tela. Snapshot tirado no cliente diria "salvo" também quando a gravação
   * falhou no caminho de volta.
   */
  corpoSalvo: string | null;
};

export const ESTADO_INICIAL: EstadoDoModelo = {
  ok: false,
  mensagem: "",
  erros: [],
  modeloId: null,
  nome: "",
  versao: 0,
  status: null,
  salvoEm: null,
  escopo: null,
  corpoSalvo: null
};

export type EstadoDaEmissao = {
  ok: boolean;
  mensagem: string;
  documentoId: string | null;
  /** Texto como saiu, para a tela mostrar antes e depois de gravar. */
  texto: string;
  lacunas: { variavel: string; motivo: string }[];
  /** Escopos pedidos que não voltaram registro — inclui o que a RLS negou. */
  vazios: string[];
};

export const EMISSAO_INICIAL: EstadoDaEmissao = {
  ok: false,
  mensagem: "",
  documentoId: null,
  texto: "",
  lacunas: [],
  vazios: []
};
