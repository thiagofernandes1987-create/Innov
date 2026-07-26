import { describe, expect, it } from "vitest";
import {
  formatarCEP,
  formatarCNPJ,
  formatarCPF,
  formatarDocumento,
  formatarTelefone,
  somenteDigitos,
  validarCEP,
  validarCNPJ,
  validarCPF,
  validarDocumento,
  validarEmail,
  validarTelefone
} from "../lib/validacao/br";
import { checarCamposBR } from "../lib/validacao/formulario";

describe("somenteDigitos", () => {
  it("descarta máscara, letras e lixo", () => {
    expect(somenteDigitos("123.456.789-09")).toBe("12345678909");
    expect(somenteDigitos("12982#2($($")).toBe("129822");
    expect(somenteDigitos("Usushe")).toBe("");
    expect(somenteDigitos(null)).toBe("");
  });
});

describe("validarCPF", () => {
  it("aceita CPF com dígito verificador correto", () => {
    for (const cpf of ["529.982.247-25", "52998224725", "111.444.777-35"]) {
      expect(validarCPF(cpf).valido, cpf).toBe(true);
    }
  });

  it("recusa o CPF de 10 dígitos que passou em produção", () => {
    const resultado = validarCPF("3332227772");
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toMatch(/11 dígitos/);
  });

  it("recusa dígito verificador errado, que é o que só o formato não pega", () => {
    expect(validarCPF("529.982.247-26").valido).toBe(false);
    expect(validarCPF("52998224724").erro).toMatch(/inválido/i);
  });

  it("recusa os dígitos repetidos, que passam na conta mas não existem", () => {
    for (const cpf of ["00000000000", "11111111111", "99999999999"]) {
      expect(validarCPF(cpf).valido, cpf).toBe(false);
    }
  });

  it("recusa letra e vazio", () => {
    expect(validarCPF("abcdefghijk").valido).toBe(false);
    expect(validarCPF("").valido).toBe(false);
  });
});

describe("validarCNPJ", () => {
  it("aceita CNPJ com dígito verificador correto", () => {
    for (const cnpj of ["11.222.333/0001-81", "11222333000181"]) {
      expect(validarCNPJ(cnpj).valido, cnpj).toBe(true);
    }
  });

  it("recusa dígito verificador errado e comprimento errado", () => {
    expect(validarCNPJ("11.222.333/0001-82").valido).toBe(false);
    expect(validarCNPJ("1122233300018").erro).toMatch(/14 dígitos/);
  });

  it("recusa dígitos repetidos", () => {
    expect(validarCNPJ("00000000000000").valido).toBe(false);
  });
});

describe("validarDocumento", () => {
  it("escolhe a regra pelo tipo de pessoa", () => {
    expect(validarDocumento("529.982.247-25", "PERSON").valido).toBe(true);
    expect(validarDocumento("11.222.333/0001-81", "COMPANY").valido).toBe(true);
  });

  it("recusa CNPJ declarado como pessoa física", () => {
    expect(validarDocumento("11222333000181", "PERSON").valido).toBe(false);
  });

  it("sem tipo declarado, decide pelo comprimento", () => {
    expect(validarDocumento("52998224725").valido).toBe(true);
    expect(validarDocumento("11222333000181").valido).toBe(true);
    expect(validarDocumento("123").valido).toBe(false);
  });
});

describe("validarCEP", () => {
  it("aceita oito dígitos, com ou sem hífen", () => {
    expect(validarCEP("12420-010").valido).toBe(true);
    expect(validarCEP("12420010").valido).toBe(true);
  });

  it("recusa o CEP em letras que passou em produção", () => {
    const resultado = validarCEP("Usushe");
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toMatch(/8 dígitos/);
  });

  it("recusa comprimento errado e zeros", () => {
    expect(validarCEP("1242001").valido).toBe(false);
    expect(validarCEP("00000000").valido).toBe(false);
  });
});

describe("validarTelefone", () => {
  it("aceita celular de 11 dígitos com DDD válido e nono dígito 9", () => {
    expect(validarTelefone("(12) 98216-7788").valido).toBe(true);
    expect(validarTelefone("12982167788").valido).toBe(true);
  });

  it("aceita fixo de 10 dígitos", () => {
    expect(validarTelefone("(12) 3642-1234").valido).toBe(true);
  });

  it("recusa o telefone com lixo que passou em produção", () => {
    // "12982#2($($" reduz a 129822: seis dígitos, comprimento inválido.
    expect(validarTelefone("12982#2($($").valido).toBe(false);
  });

  it("recusa DDD inexistente", () => {
    const resultado = validarTelefone("(00) 98216-7788");
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toMatch(/DDD/);
  });

  it("recusa celular de 11 dígitos que não começa com 9 após o DDD", () => {
    expect(validarTelefone("12882167788").valido).toBe(false);
  });
});

describe("validarEmail", () => {
  it("aceita endereço comum", () => {
    expect(validarEmail("thiagofernandes_87@hotmail.com").valido).toBe(true);
    expect(validarEmail("a.b+tag@sub.dominio.com.br").valido).toBe(true);
  });

  it("recusa o que o type=email do navegador deixa passar", () => {
    for (const invalido of ["a@b", "sem-arroba.com", "dois@@arrobas.com", "espaco @dominio.com", "@dominio.com"]) {
      expect(validarEmail(invalido).valido, invalido).toBe(false);
    }
  });

  it("normaliza espaço nas bordas", () => {
    expect(validarEmail("  pessoa@dominio.com  ").valido).toBe(true);
  });
});

describe("formatação", () => {
  it("aplica máscara progressiva enquanto se digita", () => {
    expect(formatarCPF("529")).toBe("529");
    expect(formatarCPF("529982")).toBe("529.982");
    expect(formatarCPF("52998224725")).toBe("529.982.247-25");
    expect(formatarCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCEP("12420010")).toBe("12420-010");
  });

  it("formata celular e fixo de maneiras diferentes", () => {
    expect(formatarTelefone("12982167788")).toBe("(12) 98216-7788");
    expect(formatarTelefone("1236421234")).toBe("(12) 3642-1234");
  });

  it("nunca perde dígito ao formatar", () => {
    for (const bruto of ["529", "52998", "52998224725", "1122233300018"]) {
      expect(somenteDigitos(formatarDocumento(bruto))).toBe(bruto);
    }
  });

  it("não quebra com entrada suja", () => {
    expect(formatarTelefone("12982#2($($")).toBe("(12) 9822");
    expect(formatarCEP("Usushe")).toBe("");
  });
});

describe("checarCamposBR — guarda de servidor", () => {
  function dados(pares: Record<string, string>) {
    const form = new FormData();
    for (const [chave, valor] of Object.entries(pares)) form.append(chave, valor);
    return form;
  }

  it("aprova quando tudo está correto", () => {
    const erro = checarCamposBR(
      dados({ taxId: "529.982.247-25", email: "a@b.com", phone: "(12) 98216-7788", postalCode: "12420-010" }),
      [
        { campo: "taxId", tipo: "documento" },
        { campo: "email", tipo: "email" },
        { campo: "phone", tipo: "telefone" },
        { campo: "postalCode", tipo: "cep" }
      ]
    );
    expect(erro).toBeNull();
  });

  it("recusa exatamente o que passou em produção, e diz qual campo", () => {
    const erro = checarCamposBR(dados({ taxId: "3332227772" }), [
      { campo: "taxId", tipo: "documento", rotulo: "CPF/CNPJ" }
    ]);
    expect(erro).not.toBeNull();
    expect(erro).toMatch(/CPF\/CNPJ/);
  });

  it("campo opcional em branco não é erro", () => {
    expect(checarCamposBR(dados({ phone: "" }), [{ campo: "phone", tipo: "telefone" }])).toBeNull();
    expect(checarCamposBR(dados({}), [{ campo: "phone", tipo: "telefone" }])).toBeNull();
  });

  it("campo obrigatório em branco é erro", () => {
    const erro = checarCamposBR(dados({ email: "" }), [
      { campo: "email", tipo: "email", obrigatorio: true, rotulo: "E-mail" }
    ]);
    expect(erro).toMatch(/E-mail/);
  });

  it("usa o tipo de pessoa para escolher entre CPF e CNPJ", () => {
    const form = dados({ type: "COMPANY", taxId: "52998224725" });
    expect(checarCamposBR(form, [{ campo: "taxId", tipo: "documento", campoTipoPessoa: "type" }])).not.toBeNull();
  });

  it("relata o primeiro erro apenas, para não despejar lista no usuário", () => {
    const erro = checarCamposBR(dados({ taxId: "111", phone: "000" }), [
      { campo: "taxId", tipo: "documento", rotulo: "Documento" },
      { campo: "phone", tipo: "telefone", rotulo: "Telefone" }
    ]);
    expect(erro).toMatch(/Documento/);
    expect(erro).not.toMatch(/Telefone/);
  });
});
