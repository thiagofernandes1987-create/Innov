import { describe, expect, it } from "vitest";
import {
  PROPOSITOS,
  campoDoProposito,
  chaveDeCampo,
  proposito,
  propositoDoTipo
} from "../lib/object-runtime/proposito";
import { FIELD_TYPES, slotFamilyFor, validateSpec, type ObjectSpec } from "../lib/object-runtime/spec";

const objetoCom = (campos: ObjectSpec["fields"]): ObjectSpec => ({
  key: "vistoria",
  name: "Vistoria",
  class: "cadastro",
  moduleKey: "qualidade",
  scope: "projeto",
  traits: [],
  fields: campos
});

describe("o vocabulário cobre a biblioteca de tipos", () => {
  it("todo tipo tem um propósito que chega até ele", () => {
    // Tipo sem propósito é tipo inalcançável: existe no motor, tem coluna, tem
    // validação, e nenhuma tela consegue criá-lo. É a mesma família de defeito
    // da VACINA-057 — o artefato existe e o efeito não.
    const cobertos = new Set(PROPOSITOS.map(p => p.tipo));
    expect([...FIELD_TYPES].filter(t => !cobertos.has(t))).toEqual([]);
  });

  it("nenhum tipo é oferecido por dois propósitos", () => {
    // O campo gravado guarda o tipo, não o propósito. Dois propósitos no mesmo
    // tipo tornariam a reabertura do campo um chute sobre qual pergunta foi
    // respondida. É limite consciente do primeiro corte.
    const tipos = PROPOSITOS.map(p => p.tipo);
    expect(new Set(tipos).size).toBe(tipos.length);
  });

  it("todo propósito diz o que acontece com o campo", () => {
    for (const p of PROPOSITOS) {
      expect(p.pergunta.trim().length).toBeGreaterThan(0);
      expect(p.exemplo.trim().length).toBeGreaterThan(0);
      expect(p.efeito.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("o que a informação faz decide o tipo", () => {
  it("dinheiro vira moeda, pessoa da equipe vira usuário, data vira data", () => {
    expect(proposito("dinheiro")?.tipo).toBe("moeda");
    expect(proposito("pessoa")?.tipo).toBe("usuario");
    expect(proposito("data")?.tipo).toBe("data");
  });

  it("propósito desconhecido não tem tipo, e isso não quebra", () => {
    expect(proposito("inventado")).toBeNull();
    expect(proposito("")).toBeNull();
  });

  it("o campo já gravado reabre na pergunta que o criou", () => {
    for (const p of PROPOSITOS) {
      expect(propositoDoTipo(p.tipo)?.id).toBe(p.id);
    }
  });
});

describe("nasce filtrável quando o tipo permite", () => {
  it("nenhum propósito nasce filtrável num tipo sem slot", () => {
    // `validateSpec` recusa campo filtrável de tipo sem família de slot. Um
    // padrão incoerente aqui faria a tela nascer com um erro que o usuário não
    // pediu e não entende.
    for (const p of PROPOSITOS) {
      if (p.filtravelPorPadrao) expect(slotFamilyFor(p.tipo)).not.toBeNull();
    }
  });

  it("todo tipo com slot nasce filtrável", () => {
    // Campo que não entra na busca vira campo que ninguém lê. Onde dá para
    // filtrar, o padrão é filtrar; desmarcar é do usuário.
    for (const p of PROPOSITOS) {
      if (slotFamilyFor(p.tipo)) expect(p.filtravelPorPadrao).toBe(true);
    }
  });
});

describe("o campo que sai da resposta é publicável", () => {
  it("cada propósito produz um campo que o motor aceita", () => {
    for (const p of PROPOSITOS) {
      const campo = campoDoProposito(p.id, "Campo de prova");
      expect(campo).not.toBeNull();
      const comOpcoes =
        campo && (campo.type === "selecao" || campo.type === "selecao_multipla")
          ? { ...campo, options: ["a", "b"] }
          : campo;
      expect(validateSpec(objetoCom([comOpcoes!]))).toEqual([]);
    }
  });

  it("escolha nasce pedindo as opções, em vez de nascer vazia em silêncio", () => {
    const campo = campoDoProposito("escolha", "Situação")!;
    expect(campo.options).toEqual([]);
    expect(validateSpec(objetoCom([campo]))).toEqual([
      'O campo "situacao" é de seleção e precisa declarar as opções.'
    ]);
  });

  it("rótulo sem chave utilizável não vira campo", () => {
    // "———" normaliza para nada. Devolver um campo de chave vazia empurraria o
    // erro para a publicação, longe de onde ele nasceu.
    expect(campoDoProposito("nome", "———")).toBeNull();
    expect(campoDoProposito("nome", "  ")).toBeNull();
  });

  it("propósito inexistente não produz campo", () => {
    expect(campoDoProposito("inventado", "Qualquer")).toBeNull();
  });
});

describe("a chave sai do rótulo — o usuário não digita chave", () => {
  it("acento, cedilha e espaço viram chave legível", () => {
    expect(chaveDeCampo("Responsável pela vistoria")).toBe("responsavel_pela_vistoria");
    expect(chaveDeCampo("Situação da inspeção")).toBe("situacao_da_inspecao");
  });

  it("rótulo que começa com dígito ganha prefixo em vez de ser recusado", () => {
    // "2ª medição" é rótulo legítimo de obra. Recusar seria transformar uma
    // regra de identificador em problema do usuário.
    expect(chaveDeCampo("2ª medição")).toBe("campo_2a_medicao");
  });

  it("pontuação não deixa sublinhado dobrado nem nas pontas", () => {
    expect(chaveDeCampo("Valor (R$) — total:")).toBe("valor_r_total");
    expect(chaveDeCampo("...Área...")).toBe("area");
  });

  it("rótulo longo é cortado sem terminar em sublinhado", () => {
    const chave = chaveDeCampo("a".repeat(40) + " " + "b".repeat(40));
    expect(chave.length).toBeLessThanOrEqual(63);
    expect(chave.endsWith("_")).toBe(false);
  });

  it("o que sai daqui sempre serve como chave, ou é vazio", () => {
    const identificador = /^[a-z][a-z0-9_]{0,62}$/;
    for (const rotulo of [
      "Responsável",
      "2ª medição",
      "Valor (R$)",
      "m²",
      "———",
      "",
      "  ",
      "ÁRVORE   DE   FALHAS",
      "x".repeat(200)
    ]) {
      const chave = chaveDeCampo(rotulo);
      if (chave !== "") expect(chave).toMatch(identificador);
    }
  });
});
