// Dinheiro em português do Brasil: entrada, exibição e leitura no servidor.
//
// Ditado pelo responsável em 2 de agosto: "todos os campos de moeda sem
// formatação, são erros tão primários".
//
// A crítica procede. Os campos eram `<input type="number" step="0.01">`, o que
// significa: sem separador de milhar, sem prefixo, e — o pior — **ponto como
// separador decimal**. Quem digita "1.500" num campo desses no teclado
// brasileiro quer mil e quinhentos e grava **um e meio**. Não é questão de
// estética: é um erro de três ordens de grandeza num campo de valor.
//
// A regra de leitura precisa ser tolerante, porque o valor pode chegar de três
// lugares: digitado com máscara ("R$ 1.500,00"), colado de planilha
// ("1500,00" ou "1.500,00") ou vindo de integração ("1500.00").

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const DECIMAL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** "R$ 1.500,00". Nulo e não-número viram travessão, nunca "NaN" na tela. */
export function formatarMoeda(valor: number | string | null | undefined): string {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (valor === null || valor === undefined || valor === "" || !Number.isFinite(numero)) return "—";
  return MOEDA.format(numero);
}

/** "1.500,00", sem o símbolo — para grade e coluna de tabela. */
export function formatarDecimal(valor: number | string | null | undefined): string {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (valor === null || valor === undefined || valor === "" || !Number.isFinite(numero)) return "";
  return DECIMAL.format(numero);
}

/**
 * Lê valor monetário digitado por gente.
 *
 * A ambiguidade real é "1.500": pode ser mil e quinhentos (milhar brasileiro)
 * ou um e meio (decimal americano). A regra que resolve sem adivinhação:
 *
 *   - se há vírgula, ela é o decimal e o ponto é milhar — "1.500,25" = 1500,25;
 *   - sem vírgula, ponto **só** é decimal quando separa exatamente 1 ou 2
 *     dígitos finais e aparece uma vez — "1.5" = 1,5 e "1.50" = 1,50;
 *   - nos demais casos sem vírgula, ponto é milhar — "1.500" = 1500 e
 *     "1.500.000" = 1500000.
 *
 * Devolve `null` para vazio, para o chamador distinguir "não informado" de
 * zero — que em dinheiro são coisas diferentes.
 */
export function lerMoeda(entrada: string | number | null | undefined): number | null {
  if (typeof entrada === "number") return Number.isFinite(entrada) ? entrada : null;
  const bruto = String(entrada ?? "").trim();
  if (!bruto) return null;

  const negativo = /^-|\(.*\)$/.test(bruto);
  const limpo = bruto.replace(/[^\d.,]/g, "");
  if (!limpo) return null;

  let normalizado: string;
  if (limpo.includes(",")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    const pontos = limpo.split(".").length - 1;
    const depoisDoUltimo = limpo.slice(limpo.lastIndexOf(".") + 1);
    const pontoEhDecimal = pontos === 1 && depoisDoUltimo.length >= 1 && depoisDoUltimo.length <= 2;
    normalizado = pontoEhDecimal ? limpo : limpo.replace(/\./g, "");
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return negativo && numero > 0 ? -numero : numero;
}

/**
 * Máscara aplicada a cada tecla, no padrão de caixa: o número entra pela
 * direita, em centavos.
 *
 * Digitar 1, 5, 0, 0 produz 0,01 → 0,15 → 1,50 → 15,00. É o comportamento que
 * todo aplicativo de banco usa, e o que evita o usuário se perder no ponto e na
 * vírgula. Campo vazio continua vazio — não vira "0,00" antes de o usuário
 * digitar, porque zero informado e nada informado são coisas diferentes.
 */
export function mascararMoeda(entrada: string): string {
  const digitos = String(entrada ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  const semZerosAEsquerda = digitos.replace(/^0+(?=\d)/, "");
  const centavos = semZerosAEsquerda.padStart(3, "0");
  const inteiros = centavos.slice(0, -2);
  const decimais = centavos.slice(-2);
  return `${Number(inteiros).toLocaleString("pt-BR")},${decimais}`;
}
