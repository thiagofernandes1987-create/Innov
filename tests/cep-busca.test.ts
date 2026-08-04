import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarCEP, interpretarRespostaViaCEP } from "../lib/validacao/cep";

const RESPOSTA_OK = {
  cep: "12420-010",
  logradouro: "Rua João Pessoa",
  complemento: "de 1 a 999",
  bairro: "Centro",
  localidade: "Pindamonhangaba",
  uf: "SP",
  estado: "São Paulo",
  regiao: "Sudeste",
  ibge: "3538006",
  ddd: "12"
};

describe("interpretarRespostaViaCEP", () => {
  it("normaliza a resposta para o vocabulário da plataforma", () => {
    const resultado = interpretarRespostaViaCEP(RESPOSTA_OK);
    expect(resultado).toEqual({
      encontrado: true,
      cep: "12420-010",
      logradouro: "Rua João Pessoa",
      complemento: "de 1 a 999",
      bairro: "Centro",
      cidade: "Pindamonhangaba",
      uf: "SP",
      ibge: "3538006",
      ddd: "12"
    });
  });

  it("trata CEP com formato válido e inexistente", () => {
    const resultado = interpretarRespostaViaCEP({ erro: true });
    expect(resultado.encontrado).toBe(false);
    expect(resultado.erro).toMatch(/não encontrado/i);
  });

  it("aceita o `erro` em texto, que a API também devolve", () => {
    expect(interpretarRespostaViaCEP({ erro: "true" }).encontrado).toBe(false);
  });

  it("recusa corpo que não é objeto", () => {
    for (const corpo of [null, "texto", 42, []]) {
      expect(interpretarRespostaViaCEP(corpo).encontrado, String(corpo)).toBe(false);
    }
  });

  it("campo ausente vira string vazia, nunca `undefined` na tela", () => {
    const resultado = interpretarRespostaViaCEP({ cep: "01001-000", localidade: "São Paulo", uf: "SP" });
    expect(resultado.logradouro).toBe("");
    expect(resultado.bairro).toBe("");
  });
});

describe("buscarCEP", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("recusa antes de sair da rede quando o CEP não tem 8 dígitos", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const resultado = await buscarCEP("Usushe");
    expect(resultado.encontrado).toBe(false);
    expect(resultado.erro).toMatch(/8 dígitos/);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("consulta o serviço apenas com os dígitos e devolve o endereço", async () => {
    const fetchFalso = vi.fn(async (url: unknown) => {
      expect(String(url)).toBe("https://viacep.com.br/ws/12420010/json/");
      return new Response(JSON.stringify(RESPOSTA_OK), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchFalso);
    const resultado = await buscarCEP("12420-010");
    expect(fetchFalso).toHaveBeenCalledOnce();
    expect(resultado.encontrado).toBe(true);
    expect(resultado.cidade).toBe("Pindamonhangaba");
  });

  it("serviço fora do ar não derruba o cadastro", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const resultado = await buscarCEP("12420010");
    expect(resultado.encontrado).toBe(false);
    expect(resultado.erro).toMatch(/consultar/i);
  });

  it("resposta HTTP de erro é tratada", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const resultado = await buscarCEP("12420010");
    expect(resultado.encontrado).toBe(false);
    expect(resultado.erro).toMatch(/consultar/i);
  });

  it("JSON inválido é tratado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 200 })));
    const resultado = await buscarCEP("12420010");
    expect(resultado.encontrado).toBe(false);
    expect(resultado.erro).toMatch(/inválida/i);
  });

  it("CEP inexistente é diferente de serviço indisponível", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erro: true }), { status: 200 })));
    const resultado = await buscarCEP("99999998");
    expect(resultado.erro).toMatch(/não encontrado/i);
  });
});
