// O que o formulário de importação manual do CUB entrega, e só isso.
//
// T-37.13b. A divisão de trabalho aqui é deliberada e vale a pena registrar,
// porque a alternativa parece mais amigável e é pior:
//
//   * **as regras de domínio vivem em `registrar_cub_manual`, no banco** — UF
//     entre as 27, tipologia entre as dezenove da NBR 12721, data-base no
//     primeiro dia de um mês que já passou, ordem de grandeza do valor, e
//     reconciliação das parcelas dentro de um centavo. Elas são a guarda de
//     verdade: a função é `security definer` porque a referência oficial é
//     imutável para `authenticated` desde a T-37.12, e é ela que decide;
//   * **aqui fica o que só o formulário sabe**: campo em branco, número que não
//     é número, e a diferença entre não informado e zero.
//
// Repetir as regras de domínio deste lado daria mensagens um pouco mais rápidas
// e duas cópias para manter. Duas cópias divergindo em silêncio foi o defeito
// da T-37.7, e a que diverge sempre é a de fora do banco — porque é a que
// ninguém reexecuta quando a regra muda.

export type DeclaracaoDeCub = {
  uf: string;
  tipologia: string;
  /** Primeiro dia do mês de referência, em ISO. */
  dataBase: string;
  desonerado: boolean;
  total: number;
  material: number | null;
  maoDeObra: number | null;
  administrativo: number | null;
  fonte: string;
  endereco: string;
  publicacao: string | null;
  arquivoSha256: string | null;
};

export type LeituraDaDeclaracao =
  | { ok: true; declaracao: DeclaracaoDeCub }
  | { ok: false; problema: string };

export type CamposDaDeclaracao = Record<string, string | null | undefined>;

function texto(campos: CamposDaDeclaracao, chave: string) {
  return String(campos[chave] ?? "").trim();
}

/**
 * Número decimal com **ponto**, ou nada.
 *
 * Vírgula é recusada em vez de convertida, e a recusa diz o que fazer. Aceitar
 * "1.990,11" obrigaria a adivinhar se o ponto é milhar (pt-BR) ou decimal
 * (en-US) — e as duas leituras do mesmo texto diferem por um fator de mil. Num
 * campo que vira preço por metro quadrado de obra, esse é o erro que não pode
 * ser silencioso.
 */
function numero(bruto: string, rotulo: string): { valor: number } | { problema: string } {
  if (bruto.includes(",")) {
    return { problema: `Use ponto como separador decimal em ${rotulo} — por exemplo, 1990.11.` };
  }
  const valor = Number(bruto);
  if (!Number.isFinite(valor)) return { problema: `Informe ${rotulo} como número.` };
  return { valor };
}

/** Parcela opcional: em branco é ausência; `0` é zero, e são coisas diferentes. */
function parcela(
  campos: CamposDaDeclaracao,
  chave: string,
  rotulo: string
): { valor: number | null } | { problema: string } {
  const bruto = texto(campos, chave);
  if (!bruto) return { valor: null };
  const lido = numero(bruto, rotulo);
  return "problema" in lido ? lido : { valor: lido.valor };
}

export function lerDeclaracaoDeCub(campos: CamposDaDeclaracao): LeituraDaDeclaracao {
  const uf = texto(campos, "uf").toUpperCase();
  if (!uf) return { ok: false, problema: "Escolha o estado da referência." };

  const tipologia = texto(campos, "tipologia").toUpperCase();
  if (!tipologia) return { ok: false, problema: "Escolha a tipologia do CUB." };

  // `<input type="month">` devolve "2026-07"; a data-base do CUB é o dia 1º.
  const mes = texto(campos, "mes");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    return { ok: false, problema: "Informe o mês de referência do CUB." };
  }

  const fonte = texto(campos, "fonte");
  if (!fonte) return { ok: false, problema: "Informe o nome do sindicato que publicou o CUB." };

  const endereco = texto(campos, "endereco");
  if (!endereco) return { ok: false, problema: "Informe o endereço da publicação." };

  const total = numero(texto(campos, "total"), "o valor do CUB por m²");
  if ("problema" in total) return { ok: false, problema: total.problema };

  const material = parcela(campos, "material", "o material");
  if ("problema" in material) return { ok: false, problema: material.problema };
  const maoDeObra = parcela(campos, "maoDeObra", "a mão de obra");
  if ("problema" in maoDeObra) return { ok: false, problema: maoDeObra.problema };
  const administrativo = parcela(campos, "administrativo", "as despesas administrativas");
  if ("problema" in administrativo) return { ok: false, problema: administrativo.problema };

  const bruto = texto(campos, "desonerado").toLowerCase();
  const desonerado = bruto === "true" || bruto === "on" || bruto === "1";

  const publicacao = texto(campos, "publicacao") || null;
  const arquivoSha256 = texto(campos, "arquivoSha256").toLowerCase() || null;

  return {
    ok: true,
    declaracao: {
      uf,
      tipologia,
      dataBase: `${mes}-01`,
      desonerado,
      total: total.valor,
      material: material.valor,
      maoDeObra: maoDeObra.valor,
      administrativo: administrativo.valor,
      fonte,
      endereco,
      publicacao,
      arquivoSha256
    }
  };
}
