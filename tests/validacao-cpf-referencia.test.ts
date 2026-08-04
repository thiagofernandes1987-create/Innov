import { describe, expect, it } from "vitest";
import { validarCPF } from "../lib/validacao/br";

// Porte fiel do `validaCPF` em PHP fornecido como referência. Existe para
// conferir a implementação da plataforma contra uma segunda implementação,
// escrita de forma diferente: a nossa usa vetores de peso e `11 - resto`,
// esta usa `((10 * soma) % 11) % 10`. Se as duas concordam em toda a faixa,
// a equivalência deixa de ser suposição.
function validaCPFReferencia(entrada: string): boolean {
  const cpf = entrada.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (let t = 9; t < 11; t += 1) {
    let soma = 0;
    for (let c = 0; c < t; c += 1) {
      soma += Number(cpf[c]) * (t + 1 - c);
    }
    const digito = ((10 * soma) % 11) % 10;
    if (Number(cpf[t]) !== digito) return false;
  }
  return true;
}

/** Gera um CPF com dígitos verificadores corretos a partir de 9 dígitos base. */
function cpfValido(base: string): string {
  let parcial = base;
  for (let t = 9; t < 11; t += 1) {
    let soma = 0;
    for (let c = 0; c < t; c += 1) soma += Number(parcial[c]) * (t + 1 - c);
    parcial += String(((10 * soma) % 11) % 10);
  }
  return parcial;
}

describe("validarCPF conferido contra a implementação de referência", () => {
  it("concorda em 2000 CPFs gerados válidos", () => {
    const divergentes: string[] = [];
    for (let i = 0; i < 2000; i += 1) {
      const base = String(100000000 + i * 499).slice(0, 9);
      const cpf = cpfValido(base);
      if (validarCPF(cpf).valido !== validaCPFReferencia(cpf)) divergentes.push(cpf);
    }
    expect(divergentes).toEqual([]);
  });

  it("concorda em 2000 sequências arbitrárias, válidas ou não", () => {
    const divergentes: string[] = [];
    let semente = 7;
    for (let i = 0; i < 2000; i += 1) {
      semente = (semente * 1103515245 + 12345) % 2147483648;
      const cpf = String(semente).padStart(11, "0").slice(0, 11);
      if (validarCPF(cpf).valido !== validaCPFReferencia(cpf)) divergentes.push(cpf);
    }
    expect(divergentes).toEqual([]);
  });

  it("concorda nos casos de borda", () => {
    for (const cpf of [
      "00000000000", "11111111111", "99999999999",
      "3332227772", "529.982.247-25", "529.982.247-26",
      "", "abcdefghijk", "5299822472500"
    ]) {
      expect(validarCPF(cpf).valido, cpf).toBe(validaCPFReferencia(cpf));
    }
  });
});
