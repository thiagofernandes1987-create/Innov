// Validação de documentos e contatos brasileiros.
//
// Lógica pura, sem `server-only` e sem React: a mesma função valida no
// navegador e recusa no servidor. Formulário é conveniência; quem recusa é a
// ação — a mesma regra que a escrita do Object Runtime segue ao passar por RPC.
//
// Contrato em `diretrizes/PADRAO-DE-INTERFACE.md`, seção 6.

export type Resultado = { valido: boolean; erro?: string };

const OK: Resultado = { valido: true };
const falha = (erro: string): Resultado => ({ valido: false, erro });

export function somenteDigitos(valor: string | null | undefined): string {
  return String(valor ?? "").replace(/\D/g, "");
}

/**
 * Campo em branco e campo preenchido só com letras são erros diferentes.
 * "Informe o CEP" para quem digitou "Usushe" manda procurar o que já está
 * lá; a mensagem precisa dizer o que falta de verdade.
 */
function vazio(valor: string | null | undefined): boolean {
  return String(valor ?? "").trim() === "";
}

function todosIguais(digitos: string): boolean {
  return digitos.length > 0 && /^(\d)\1*$/.test(digitos);
}

/** Dígito verificador por módulo 11, usado por CPF e CNPJ com pesos diferentes. */
function digitoModulo11(base: string, pesos: readonly number[]): number {
  const soma = base
    .split("")
    .reduce((total, caractere, indice) => total + Number(caractere) * pesos[indice], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// ── CPF ─────────────────────────────────────────────────────────────────────

const PESOS_CPF_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const PESOS_CPF_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function validarCPF(valor: string | null | undefined): Resultado {
  const digitos = somenteDigitos(valor);
  if (vazio(valor)) return falha("Informe o CPF.");
  if (digitos.length !== 11) return falha(`CPF precisa ter 11 dígitos; recebeu ${digitos.length}.`);
  // Sequências repetidas passam no cálculo do dígito, mas não são CPF de ninguém.
  if (todosIguais(digitos)) return falha("CPF inválido: dígitos repetidos.");

  const primeiro = digitoModulo11(digitos.slice(0, 9), PESOS_CPF_1);
  const segundo = digitoModulo11(digitos.slice(0, 10), PESOS_CPF_2);
  if (primeiro !== Number(digitos[9]) || segundo !== Number(digitos[10])) {
    return falha("CPF inválido: dígito verificador não confere.");
  }
  return OK;
}

// ── CNPJ ────────────────────────────────────────────────────────────────────

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function validarCNPJ(valor: string | null | undefined): Resultado {
  const digitos = somenteDigitos(valor);
  if (vazio(valor)) return falha("Informe o CNPJ.");
  if (digitos.length !== 14) return falha(`CNPJ precisa ter 14 dígitos; recebeu ${digitos.length}.`);
  if (todosIguais(digitos)) return falha("CNPJ inválido: dígitos repetidos.");

  const primeiro = digitoModulo11(digitos.slice(0, 12), PESOS_CNPJ_1);
  const segundo = digitoModulo11(digitos.slice(0, 13), PESOS_CNPJ_2);
  if (primeiro !== Number(digitos[12]) || segundo !== Number(digitos[13])) {
    return falha("CNPJ inválido: dígito verificador não confere.");
  }
  return OK;
}

// ── Documento, escolhendo a regra pelo tipo de pessoa ────────────────────────

export type TipoPessoa = "PERSON" | "COMPANY";

export function validarDocumento(valor: string | null | undefined, tipo?: TipoPessoa): Resultado {
  const digitos = somenteDigitos(valor);
  if (tipo === "PERSON") return validarCPF(digitos);
  if (tipo === "COMPANY") return validarCNPJ(digitos);
  if (digitos.length === 11) return validarCPF(digitos);
  if (digitos.length === 14) return validarCNPJ(digitos);
  return falha("Informe um CPF de 11 dígitos ou um CNPJ de 14 dígitos.");
}

// ── CEP ─────────────────────────────────────────────────────────────────────

export function validarCEP(valor: string | null | undefined): Resultado {
  const digitos = somenteDigitos(valor);
  if (vazio(valor)) return falha("Informe o CEP.");
  if (digitos.length !== 8) return falha(`CEP precisa ter 8 dígitos; recebeu ${digitos.length}.`);
  if (todosIguais(digitos)) return falha("CEP inválido.");
  return OK;
}

// ── Telefone ────────────────────────────────────────────────────────────────

// DDDs em uso no Brasil. Lista fechada: 00 e 01 não existem e precisam falhar.
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
]);

export function validarTelefone(valor: string | null | undefined): Resultado {
  const digitos = somenteDigitos(valor);
  if (vazio(valor)) return falha("Informe o telefone.");
  if (digitos.length !== 10 && digitos.length !== 11) {
    return falha(`Telefone precisa ter 10 dígitos com DDD, ou 11 com o nono dígito; recebeu ${digitos.length}.`);
  }
  if (!DDDS.has(Number(digitos.slice(0, 2)))) {
    return falha(`DDD ${digitos.slice(0, 2)} não existe.`);
  }
  if (digitos.length === 11 && digitos[2] !== "9") {
    return falha("Celular com 11 dígitos precisa começar com 9 depois do DDD.");
  }
  if (digitos.length === 10 && Number(digitos[2]) < 2) {
    return falha("Telefone fixo não começa com 0 ou 1 depois do DDD.");
  }
  return OK;
}

// ── E-mail ──────────────────────────────────────────────────────────────────

// Deliberadamente mais estrito que o `type="email"` do navegador, que aceita
// "a@b" — sem ponto no domínio. Endereço aceito e inentregável é pior do que
// recusado na hora.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function validarEmail(valor: string | null | undefined): Resultado {
  const texto = String(valor ?? "").trim();
  if (!texto) return falha("Informe o e-mail.");
  if (texto.length > 254) return falha("E-mail longo demais.");
  if (!EMAIL.test(texto)) return falha("E-mail inválido.");
  return OK;
}

export function normalizarEmail(valor: string | null | undefined): string {
  return String(valor ?? "").trim().toLowerCase();
}

// ── Formatação ──────────────────────────────────────────────────────────────
// Progressiva: aplica a máscara ao que já foi digitado, sem exigir o campo
// completo e sem nunca descartar dígito.

export function formatarCPF(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarCNPJ(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatarDocumento(valor: string | null | undefined, tipo?: TipoPessoa): string {
  const d = somenteDigitos(valor);
  if (tipo === "COMPANY") return formatarCNPJ(d);
  if (tipo === "PERSON") return formatarCPF(d);
  return d.length > 11 ? formatarCNPJ(d) : formatarCPF(d);
}

export function formatarCEP(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatarTelefone(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  const ddd = `(${d.slice(0, 2)})`;
  const resto = d.slice(2);
  if (resto.length <= 4) return `${ddd} ${resto}`;
  // Celular quebra em 5+4; fixo em 4+4.
  const corte = resto.length > 8 ? 5 : 4;
  return `${ddd} ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
