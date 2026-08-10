import { describe, expect, it } from "vitest";
import {
  ESCOPOS,
  chaveDeUnidade,
  chaveDoEscopo,
  chaveNormalizada,
  comPadroes,
  ordenarSugestoes,
  type ValorDoCatalogo
} from "../lib/sugestoes/catalogo";

const valor = (
  rotulo: string,
  escopo: string = ESCOPOS.unidade,
  extra: Partial<ValorDoCatalogo> = {}
): ValorDoCatalogo => ({
  rotulo,
  chave: chaveDoEscopo(escopo, rotulo),
  usos: 3,
  ultimoUso: new Date().toISOString(),
  ...extra
});

describe("m² e m2 são a mesma unidade", () => {
  it("o expoente vira dígito", () => {
    expect(chaveDeUnidade("m²")).toBe("m2");
    expect(chaveDeUnidade("m2")).toBe("m2");
    expect(chaveDeUnidade("M²")).toBe("m2");
    expect(chaveDeUnidade("m³")).toBe("m3");
    expect(chaveDeUnidade("cm³")).toBe("cm3");
  });

  it("índice inferior também: H₂O e H2O", () => {
    expect(chaveDeUnidade("H₂O")).toBe(chaveDeUnidade("H2O"));
  });

  it("o que já funcionava continua funcionando", () => {
    // Acento, caixa e espaço seguem valendo: a fusão de expoente é um degrau a
    // mais, não uma regra diferente.
    expect(chaveDeUnidade("  Metro Cúbico ")).toBe("metro cubico");
    expect(chaveDeUnidade("")).toBe("");
  });

  it("unidade que não tem expoente não muda", () => {
    for (const u of ["kg", "un", "m", "L", "saco", "peça"]) {
      expect(chaveDeUnidade(u)).toBe(chaveNormalizada(u));
    }
  });
});

describe("a fusão vale por escopo, não globalmente", () => {
  it("só o escopo de unidade funde expoente", () => {
    expect(chaveDoEscopo(ESCOPOS.unidade, "m²")).toBe("m2");
    expect(chaveDoEscopo(ESCOPOS.etapaDaEap, "m²")).toBe("m²");
    expect(chaveDoEscopo(ESCOPOS.disciplina, "m²")).toBe("m²");
  });

  it("escopo desconhecido não funde — o padrão é não mexer", () => {
    // Fundir onde ninguém pediu é o risco que a tarefa mandou evitar: "H²"
    // num nome de etapa é o nome da etapa, não uma unidade escrita torto.
    expect(chaveDoEscopo("escopo.inventado", "m²")).toBe("m²");
    expect(chaveDoEscopo("", "m²")).toBe("m²");
  });

  it("fora do escopo de unidade, a chave é exatamente a de sempre", () => {
    for (const texto of ["Fundação", "m²", "H₂O", "Alvenaria estrutural"]) {
      expect(chaveDoEscopo(ESCOPOS.etapaDaEap, texto)).toBe(chaveNormalizada(texto));
    }
  });
});

describe("o efeito na lista de sugestão", () => {
  it("o padrão não é oferecido de novo quando a empresa já usa a outra grafia", () => {
    // O caso real: `m²` gravado no catálogo com 31 usos, e `m2` na lista de
    // padrões da plataforma. Sem a fusão, a lista oferece os dois.
    const lista = comPadroes([valor("m²", ESCOPOS.unidade, { usos: 31 })], ["m2", "kg"], ESCOPOS.unidade);
    expect(lista.map(v => v.rotulo)).toEqual(["m²", "kg"]);
  });

  it("sem escopo de unidade, os dois continuam sendo valores diferentes", () => {
    const lista = comPadroes(
      [valor("m²", ESCOPOS.etapaDaEap, { usos: 31 })],
      ["m2"],
      ESCOPOS.etapaDaEap
    );
    expect(lista).toHaveLength(2);
  });

  it("digitar m2 não faz a lista oferecer o m² que já é aquilo", () => {
    // A regra de sempre: o que já está escrito por extenso não é sugerido de
    // volta, porque ocuparia uma linha para não oferecer nada. Com a fusão,
    // `m2` digitado passa a ser reconhecido como o `m²` gravado — antes eram
    // dois valores, e a lista devolvia o próprio valor recém-digitado.
    const lista = ordenarSugestoes([valor("m²", ESCOPOS.unidade, { usos: 31 }), valor("kg")], {
      filtro: "m2",
      escopo: ESCOPOS.unidade
    });
    expect(lista.map(v => v.rotulo)).toEqual([]);
  });

  it("fora do escopo de unidade, m2 e m² continuam sendo dois valores", () => {
    const lista = ordenarSugestoes(
      [{ rotulo: "m²", chave: chaveNormalizada("m²"), usos: 3, ultimoUso: new Date().toISOString() }],
      { filtro: "m2", escopo: ESCOPOS.etapaDaEap }
    );
    // Não é oferecido porque "m2" não é trecho de "m²" — e é exatamente esse o
    // ponto: no escopo errado, a fusão não acontece.
    expect(lista).toEqual([]);
  });

  it("digitar o prefixo encontra a unidade composta, com qualquer grafia", () => {
    const lista = ordenarSugestoes(
      [valor("m²", ESCOPOS.unidade, { usos: 31 }), valor("m³"), valor("kg")],
      { filtro: "m", escopo: ESCOPOS.unidade }
    );
    expect(lista.map(v => v.rotulo).sort()).toEqual(["m²", "m³"]);
  });

  it("chave gravada divergente do rótulo continua sendo pega", () => {
    // Linha antiga: gravada como `m²` antes da fusão existir. A comparação usa
    // a chave gravada **e** a recalculada — foi o defeito que fez a lista
    // oferecer o mesmo valor duas vezes.
    const antiga: ValorDoCatalogo = {
      rotulo: "m²",
      chave: "m²",
      usos: 31,
      ultimoUso: new Date().toISOString()
    };
    expect(comPadroes([antiga], ["m2"], ESCOPOS.unidade)).toHaveLength(1);
  });
});
