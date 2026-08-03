// Dicionário de variáveis: o que cada escopo oferece.
//
// A decisão que sustenta este arquivo está em `REUSO-DE-INFORMACAO.md`: **a
// variável é escolhida, não decorada**. Ninguém deve memorizar
// `{{cliente.tel_pessoal}}`; o editor mostra a lista com nome legível e o
// usuário clica. Decorar nome de variável é a razão de esse recurso morrer sem
// uso na maioria dos sistemas que o têm.
//
// Este catálogo é a fonte da lista mostrada no editor **e** da validação que
// roda antes de publicar. Um catálogo só, para que "a variável existe" e "a
// variável aparece na lista" nunca possam divergir.

import { tipo } from "./tipos";

export type EscopoVariavel = "cliente" | "obra" | "orcamento" | "proposta" | "empresa" | "sistema";

export type DefinicaoVariavel = {
  /** `escopo.campo`, sempre em minúsculo. */
  nome: string;
  rotulo: string;
  escopo: EscopoVariavel;
  /** Como aparece no painel, para o usuário reconhecer sem testar. */
  exemplo: string;
};

export const VARIAVEIS: readonly DefinicaoVariavel[] = [
  { nome: "cliente.nome_completo", rotulo: "Nome ou razão social", escopo: "cliente", exemplo: "Construtora Alfa Ltda" },
  { nome: "cliente.nome_fantasia", rotulo: "Nome fantasia", escopo: "cliente", exemplo: "Alfa Engenharia" },
  { nome: "cliente.documento", rotulo: "CPF ou CNPJ", escopo: "cliente", exemplo: "12.345.678/0001-90" },
  { nome: "cliente.email_comercial", rotulo: "E-mail comercial", escopo: "cliente", exemplo: "contato@alfa.com.br" },
  { nome: "cliente.tel_pessoal", rotulo: "Telefone pessoal", escopo: "cliente", exemplo: "(11) 98888-7777" },
  { nome: "cliente.telefone", rotulo: "Telefone comercial", escopo: "cliente", exemplo: "(11) 3333-4444" },
  { nome: "cliente.endereco", rotulo: "Endereço completo", escopo: "cliente", exemplo: "Rua das Obras, 100 — São Paulo/SP" },
  { nome: "cliente.cidade", rotulo: "Cidade", escopo: "cliente", exemplo: "São Paulo" },
  { nome: "cliente.uf", rotulo: "UF", escopo: "cliente", exemplo: "SP" },
  { nome: "cliente.cep", rotulo: "CEP", escopo: "cliente", exemplo: "01310-100" },

  { nome: "obra.codigo", rotulo: "Código da obra", escopo: "obra", exemplo: "OBR-2026-0007" },
  { nome: "obra.nome", rotulo: "Nome da obra", escopo: "obra", exemplo: "Residencial Vereda" },
  { nome: "obra.endereco", rotulo: "Endereço da obra", escopo: "obra", exemplo: "Av. Central, 2000" },
  { nome: "obra.inicio_previsto", rotulo: "Início previsto", escopo: "obra", exemplo: "10/08/2026" },
  { nome: "obra.termino_previsto", rotulo: "Término previsto", escopo: "obra", exemplo: "30/01/2027" },

  { nome: "orcamento.codigo", rotulo: "Código do orçamento", escopo: "orcamento", exemplo: "ORC-2026-0001" },
  { nome: "orcamento.valor_total", rotulo: "Valor total", escopo: "orcamento", exemplo: "R$ 120.000,00" },
  { nome: "orcamento.validade", rotulo: "Validade da proposta", escopo: "orcamento", exemplo: "30 dias" },

  { nome: "proposta.numero", rotulo: "Número da proposta", escopo: "proposta", exemplo: "PRO-2026-0014" },
  { nome: "proposta.data", rotulo: "Data da proposta", escopo: "proposta", exemplo: "02/08/2026" },

  { nome: "empresa.razao_social", rotulo: "Razão social da empresa", escopo: "empresa", exemplo: "Innovar Construções Ltda" },
  { nome: "empresa.cnpj", rotulo: "CNPJ da empresa", escopo: "empresa", exemplo: "98.765.432/0001-10" },

  { nome: "sistema.hoje", rotulo: "Data de hoje", escopo: "sistema", exemplo: "02/08/2026" },
  { nome: "sistema.autor", rotulo: "Quem está gerando", escopo: "sistema", exemplo: "Ana Souza" }
];

export const ROTULO_ESCOPO: Record<EscopoVariavel, string> = {
  cliente: "Cliente",
  obra: "Obra",
  orcamento: "Orçamento",
  proposta: "Proposta",
  empresa: "Empresa",
  sistema: "Sistema"
};

/**
 * As variáveis oferecidas para um tipo de documento, na ordem do catálogo.
 *
 * Os escopos vêm de `tipos.ts`, que é o catálogo único: uma FVS não tem
 * orçamento, e uma mensagem de boas-vindas não tem obra. Mostrar variável que
 * nunca vai resolver naquele documento é convidar a lacuna — o usuário insere,
 * publica, e a lacuna aparece na frente de quem recebe.
 *
 * Tipo desconhecido cai num conjunto seguro em vez de oferecer tudo.
 */
export function variaveisDoTipo(tipoDoDocumento: string): DefinicaoVariavel[] {
  const escopos = tipo(tipoDoDocumento)?.escopos ?? (["cliente", "empresa", "sistema"] as const);
  return VARIAVEIS.filter(v => (escopos as readonly string[]).includes(v.escopo));
}

/** Dicionário de exemplo, para a pré-visualização antes de haver registro real. */
export function dicionarioDeExemplo(tipoDoDocumento: string): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const v of variaveisDoTipo(tipoDoDocumento)) saida[v.nome] = v.exemplo;
  return saida;
}
