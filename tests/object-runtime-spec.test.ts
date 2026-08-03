import { describe, expect, it } from "vitest";
import {
  MAX_FIELDS,
  SLOT_BUDGET,
  allocateSlots,
  canonicalSpecJson,
  slotFamilyFor,
  slotUsage,
  specFingerprint,
  validateSpec,
  type ObjectFieldSpec,
  type ObjectSpec
} from "../lib/object-runtime/spec";

function field(overrides: Partial<ObjectFieldSpec> & Pick<ObjectFieldSpec, "key">): ObjectFieldSpec {
  return { label: overrides.key, type: "texto", ...overrides };
}

function spec(overrides: Partial<ObjectSpec> = {}): ObjectSpec {
  return {
    key: "checklist_vistoria",
    name: "Checklist de vistoria",
    class: "cadastro",
    moduleKey: "qualidade",
    scope: "projeto",
    traits: ["auditavel", "arquivavel"],
    fields: [field({ key: "titulo" })],
    ...overrides
  };
}

describe("canonicalSpecJson", () => {
  it("produz a mesma saída independentemente da ordem de inserção das chaves", () => {
    const a = { beta: 1, alpha: { z: true, a: false }, gama: [3, 1, 2] };
    const b = { gama: [3, 1, 2], alpha: { a: false, z: true }, beta: 1 };
    expect(canonicalSpecJson(a)).toBe(canonicalSpecJson(b));
  });

  it("preserva a ordem dos arrays, que é dado e não apresentação", () => {
    expect(canonicalSpecJson([3, 1, 2])).not.toBe(canonicalSpecJson([1, 2, 3]));
  });

  it("não perde valores nulos", () => {
    expect(canonicalSpecJson({ a: null })).toBe('{"a":null}');
  });
});

describe("specFingerprint", () => {
  it("é estável para a mesma definição escrita em ordem diferente", () => {
    const um = spec();
    const outro = { ...spec(), name: "Checklist de vistoria" };
    expect(specFingerprint(um)).toBe(specFingerprint(outro));
  });

  it("muda quando qualquer campo da definição muda", () => {
    const base = specFingerprint(spec());
    expect(specFingerprint(spec({ name: "Outro nome" }))).not.toBe(base);
    expect(specFingerprint(spec({ fields: [field({ key: "titulo", required: true })] }))).not.toBe(base);
  });

  it("devolve hexadecimal de 64 caracteres", () => {
    expect(specFingerprint(spec())).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("slotFamilyFor", () => {
  it("agrupa os tipos numéricos na mesma família", () => {
    expect(slotFamilyFor("numero")).toBe("num");
    expect(slotFamilyFor("moeda")).toBe("num");
    expect(slotFamilyFor("percentual")).toBe("num");
  });

  it("trata seleção como texto e referência de usuário como referência", () => {
    expect(slotFamilyFor("selecao")).toBe("txt");
    expect(slotFamilyFor("texto")).toBe("txt");
    expect(slotFamilyFor("referencia")).toBe("ref");
    expect(slotFamilyFor("usuario")).toBe("ref");
  });

  it("recusa slot para os tipos que não são filtráveis", () => {
    expect(slotFamilyFor("texto_longo")).toBeNull();
    expect(slotFamilyFor("anexo")).toBeNull();
    expect(slotFamilyFor("geolocalizacao")).toBeNull();
    expect(slotFamilyFor("selecao_multipla")).toBeNull();
    expect(slotFamilyFor("assinatura")).toBeNull();
  });
});

describe("allocateSlots", () => {
  it("aloca na ordem de declaração e ignora campo não indexável", () => {
    const { slots, overflow } = allocateSlots([
      field({ key: "observacao", type: "texto_longo" }),
      field({ key: "titulo", type: "texto", indexed: true }),
      field({ key: "valor", type: "moeda", indexed: true }),
      field({ key: "descricao", type: "texto" }),
      field({ key: "codigo", type: "texto", indexed: true })
    ]);
    expect(overflow).toEqual([]);
    expect(slots).toEqual({ titulo: "txt_1", valor: "num_1", codigo: "txt_2" });
  });

  it("é determinística: a mesma entrada devolve a mesma alocação", () => {
    const fields = [
      field({ key: "a", type: "data", indexed: true }),
      field({ key: "b", type: "data_hora", indexed: true })
    ];
    expect(allocateSlots(fields).slots).toEqual(allocateSlots(fields).slots);
    expect(allocateSlots(fields).slots).toEqual({ a: "dt_1", b: "dt_2" });
  });

  it("reporta estouro por família sem derrubar as famílias que ainda cabem", () => {
    const numericos = Array.from({ length: SLOT_BUDGET.num + 1 }, (_, index) =>
      field({ key: `n${index}`, type: "numero", indexed: true })
    );
    const { slots, overflow } = allocateSlots([...numericos, field({ key: "t", type: "texto", indexed: true })]);
    expect(overflow).toEqual([`n${SLOT_BUDGET.num}`]);
    expect(slots.t).toBe("txt_1");
    expect(slots[`n${SLOT_BUDGET.num}`]).toBeUndefined();
  });

  it("marcar campo não filtrável como indexável não consome slot", () => {
    const { slots, overflow } = allocateSlots([field({ key: "anexo", type: "anexo", indexed: true })]);
    expect(slots).toEqual({});
    expect(overflow).toEqual([]);
  });
});

describe("validateSpec", () => {
  it("aprova uma definição mínima e coerente", () => {
    expect(validateSpec(spec())).toEqual([]);
  });

  it("recusa chave de campo duplicada", () => {
    const errors = validateSpec(spec({ fields: [field({ key: "titulo" }), field({ key: "titulo" })] }));
    expect(errors.some(error => error.includes("titulo"))).toBe(true);
  });

  it("recusa chave fora do formato de identificador", () => {
    expect(validateSpec(spec({ fields: [field({ key: "Título do Item" })] }))).not.toEqual([]);
    expect(validateSpec(spec({ key: "Checklist Vistoria" }))).not.toEqual([]);
  });

  it("recusa tipo desconhecido", () => {
    const errors = validateSpec(spec({ fields: [field({ key: "x", type: "inventado" as never })] }));
    expect(errors.some(error => error.includes("inventado"))).toBe(true);
  });

  it("recusa seleção sem opções e aceita seleção com opções", () => {
    expect(validateSpec(spec({ fields: [field({ key: "situacao", type: "selecao" })] }))).not.toEqual([]);
    expect(
      validateSpec(spec({ fields: [field({ key: "situacao", type: "selecao", options: ["a", "b"] })] }))
    ).toEqual([]);
  });

  it("recusa definição sem nenhum campo", () => {
    expect(validateSpec(spec({ fields: [] }))).not.toEqual([]);
  });

  it("recusa passar do teto de campos", () => {
    const fields = Array.from({ length: MAX_FIELDS + 1 }, (_, index) => field({ key: `campo_${index}` }));
    const errors = validateSpec(spec({ fields }));
    expect(errors.some(error => error.includes(String(MAX_FIELDS)))).toBe(true);
  });

  it("recusa estouro de slot com o nome do campo que não coube", () => {
    const fields = Array.from({ length: SLOT_BUDGET.num + 1 }, (_, index) =>
      field({ key: `n${index}`, type: "numero", indexed: true })
    );
    const errors = validateSpec(spec({ fields }));
    expect(errors.some(error => error.includes(`n${SLOT_BUDGET.num}`))).toBe(true);
  });

  it("recusa escopo e classe fora do conjunto fechado", () => {
    expect(validateSpec(spec({ scope: "global" as never }))).not.toEqual([]);
    expect(validateSpec(spec({ class: "planilha" as never }))).not.toEqual([]);
  });

  it("recusa característica desconhecida", () => {
    expect(validateSpec(spec({ traits: ["auditavel", "telepatico"] }))).not.toEqual([]);
  });

  it("exige module_key, porque é dele que a permissão do objeto é herdada", () => {
    expect(validateSpec(spec({ moduleKey: "" }))).not.toEqual([]);
  });
});

describe("quanto do orçamento de campos filtráveis já foi gasto", () => {
  it("conta por família, e só o que é filtrável", () => {
    const uso = slotUsage([
      field({ key: "titulo", type: "texto", indexed: true }),
      field({ key: "apelido", type: "texto" }),
      field({ key: "valor", type: "moeda", indexed: true }),
      field({ key: "observacao", type: "texto_longo", indexed: true })
    ]);
    expect(uso.txt.used).toBe(1);
    expect(uso.num.used).toBe(1);
    // `texto_longo` não tem família de slot: marcar filtrável não gasta nada,
    // e `validateSpec` já recusa a combinação.
    expect(uso.dt.used).toBe(0);
  });

  it("o limite exibido é o mesmo que o motor aplica", () => {
    const uso = slotUsage([]);
    expect(uso.txt.budget).toBe(SLOT_BUDGET.txt);
    expect(uso.ref.budget).toBe(SLOT_BUDGET.ref);
  });

  it("o que estourou não é contado como gasto", () => {
    // Cinco textos filtráveis com teto de quatro: o quinto não ocupa slot, e a
    // tela não pode dizer "5 de 4".
    const fields = Array.from({ length: SLOT_BUDGET.txt + 1 }, (_, i) =>
      field({ key: `t${i}`, type: "texto", indexed: true })
    );
    expect(slotUsage(fields).txt.used).toBe(SLOT_BUDGET.txt);
  });
});
