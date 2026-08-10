import { describe, expect, it } from "vitest";
import { camposParecidos, distancia } from "../lib/object-runtime/parecidos";
import type { ObjectFieldSpec } from "../lib/object-runtime/spec";

const campo = (label: string, extra: Partial<ObjectFieldSpec> = {}): ObjectFieldSpec => ({
  key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
  label,
  type: "texto",
  ...extra
});

describe("o caso que a tarefa descreve", () => {
  it("'arquiteto' encontra o 'Arquiteto' que já existe", () => {
    const achados = camposParecidos("arquiteto", [campo("Arquiteto"), campo("Data da visita")]);
    expect(achados).toHaveLength(1);
    expect(achados[0].campo.label).toBe("Arquiteto");
    expect(achados[0].motivo).toBe("mesmo_nome");
  });

  it("acento e caixa não criam dois campos diferentes", () => {
    const achados = camposParecidos("RESPONSÁVEL", [campo("Responsavel")]);
    expect(achados[0]?.motivo).toBe("mesmo_nome");
  });
});

describe("parecido sem ser igual", () => {
  it("um nome dentro do outro é oferecido", () => {
    // "Arquiteto" e "Arquiteto responsável" costumam ser o mesmo dado com dois
    // nomes; oferecer o que existe é mais barato que descobrir depois que a
    // empresa tem os dois preenchidos pela metade.
    const achados = camposParecidos("Arquiteto responsável", [campo("Arquiteto")]);
    expect(achados[0]?.motivo).toBe("um_contem_o_outro");
  });

  it("erro de digitação curto é oferecido", () => {
    const achados = camposParecidos("Responsavl", [campo("Responsável")]);
    expect(achados[0]?.motivo).toBe("quase_igual");
  });

  it("nome curto não vira sugestão por semelhança", () => {
    // Com três letras, duas trocas transformam qualquer palavra em qualquer
    // outra: "CEP" viraria sugestão para "CEI". Semelhança só vale a partir de
    // cinco caracteres.
    expect(camposParecidos("cep", [campo("cei")])).toEqual([]);
  });

  it("campos sem relação não são oferecidos", () => {
    expect(camposParecidos("Data da vistoria", [campo("Valor do contrato"), campo("Fornecedor")])).toEqual([]);
  });
});

describe("o que não atrapalha quem está declarando", () => {
  it("rótulo vazio não sugere nada", () => {
    expect(camposParecidos("", [campo("Arquiteto")])).toEqual([]);
    expect(camposParecidos("   ", [campo("Arquiteto")])).toEqual([]);
  });

  it("lista vazia não quebra", () => {
    expect(camposParecidos("Arquiteto", [])).toEqual([]);
  });

  it("o mais parecido vem primeiro", () => {
    const achados = camposParecidos("Arquiteto", [campo("Arquiteto responsável"), campo("Arquiteto")]);
    expect(achados.map(a => a.campo.label)).toEqual(["Arquiteto", "Arquiteto responsável"]);
  });

  it("campo arquivado também é oferecido, e diz que está arquivado", () => {
    // Reativar o que já existiu é melhor que criar um irmão quase igual — e a
    // pessoa precisa saber que o dado antigo continua lá.
    const achados = camposParecidos("Arquiteto", [campo("Arquiteto", { archived: true })]);
    expect(achados[0].campo.archived).toBe(true);
  });
});

describe("distância entre dois nomes", () => {
  it("conta trocas, inserções e remoções", () => {
    expect(distancia("casa", "casa")).toBe(0);
    expect(distancia("casa", "caza")).toBe(1);
    expect(distancia("casa", "cas")).toBe(1);
    expect(distancia("casa", "casas")).toBe(1);
    expect(distancia("casa", "porta")).toBeGreaterThan(2);
  });

  it("string vazia é o comprimento da outra", () => {
    expect(distancia("", "casa")).toBe(4);
    expect(distancia("casa", "")).toBe(4);
  });
});
