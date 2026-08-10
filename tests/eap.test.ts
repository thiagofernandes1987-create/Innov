import { describe, expect, it } from "vitest";
import { compararCodigos, diferencas, proximoCodigo, renumerar, type ItemEAP } from "../lib/planejamento/eap";

// Os casos vêm do que o responsável descreveu, um por frase:
//
//   "o primeiro item é o 1"
//   "os subitens devem automaticamente serem 1.1, 1.2, 1.xxx"
//   "o item da próxima etapa é o 2, e assim por diante"
//   "se um subitem eu mudo para etapa ele vira o número da etapa anterior+1"

describe("numeração da EAP", () => {
  it("o primeiro item da raiz é 1", () => {
    expect(proximoCodigo([], null)).toBe("1");
  });

  it("o próximo item de raiz é o seguinte", () => {
    expect(proximoCodigo(["1"], null)).toBe("2");
    expect(proximoCodigo(["1", "2", "3"], null)).toBe("4");
  });

  it("o primeiro subitem de 1 é 1.1", () => {
    expect(proximoCodigo(["1"], "1")).toBe("1.1");
  });

  it("os subitens seguem 1.1, 1.2, 1.3", () => {
    expect(proximoCodigo(["1", "1.1"], "1")).toBe("1.2");
    expect(proximoCodigo(["1", "1.1", "1.2"], "1")).toBe("1.3");
  });

  it("subitem de outra etapa não interfere na numeração", () => {
    // "2.1" existir não pode fazer o próximo filho de 1 virar 1.2 por engano.
    expect(proximoCodigo(["1", "2", "2.1"], "1")).toBe("1.1");
  });

  it("neto não conta como filho direto", () => {
    // "1.1.5" tem três níveis: para o pai "1", o próximo filho continua sendo 1.2.
    expect(proximoCodigo(["1", "1.1", "1.1.5"], "1")).toBe("1.2");
  });

  it("passa de 9 para 10 sem ordenar como texto", () => {
    const nove = Array.from({ length: 9 }, (_, i) => String(i + 1));
    expect(proximoCodigo(nove, null)).toBe("10");
    expect(proximoCodigo([...nove, "10"], null)).toBe("11");
  });

  it("não reaproveita número de item excluído", () => {
    // Se 2 foi excluído, o próximo é 4 e não 2: reaproveitar faria documento
    // antigo apontar para coisa diferente com o mesmo código.
    expect(proximoCodigo(["1", "3"], null)).toBe("4");
  });

  it("ordena código como número, não como texto", () => {
    expect(compararCodigos("2", "10")).toBeLessThan(0);
    expect(compararCodigos("1.10", "1.9")).toBeGreaterThan(0);
    expect(compararCodigos("1.2", "1.2")).toBe(0);
  });
});

describe("renumeração da árvore", () => {
  const arvore: ItemEAP[] = [
    { id: "a", parentId: null, sequence: 0, code: "1" },
    { id: "a1", parentId: "a", sequence: 0, code: "1.1" },
    { id: "a2", parentId: "a", sequence: 1, code: "1.2" },
    { id: "b", parentId: null, sequence: 1, code: "2" },
    { id: "b1", parentId: "b", sequence: 0, code: "2.1" }
  ];

  it("mantém a numeração quando nada mudou", () => {
    expect(diferencas(arvore)).toEqual([]);
  });

  it("subitem promovido a etapa vira a etapa seguinte, e o resto anda junto", () => {
    // a2 deixa de ser filho de "a" e passa a ser etapa logo depois dela.
    const movido = arvore.map(i =>
      i.id === "a2" ? { ...i, parentId: null, sequence: 0.5 } : i
    );
    const codigos = renumerar(movido);
    expect(codigos.get("a")).toBe("1");
    expect(codigos.get("a1")).toBe("1.1");
    expect(codigos.get("a2")).toBe("2"); // etapa anterior (1) + 1
    expect(codigos.get("b")).toBe("3"); // empurrada
    expect(codigos.get("b1")).toBe("3.1"); // o filho acompanha o pai
  });

  it("etapa rebaixada a subitem recebe o código do novo pai", () => {
    const movido = arvore.map(i => (i.id === "b" ? { ...i, parentId: "a", sequence: 9 } : i));
    const codigos = renumerar(movido);
    expect(codigos.get("b")).toBe("1.3");
    expect(codigos.get("b1")).toBe("1.3.1");
  });

  it("inserir no meio renumera quem vem depois", () => {
    const comNovo: ItemEAP[] = [
      ...arvore,
      { id: "novo", parentId: "a", sequence: 0.5, code: "" }
    ];
    const codigos = renumerar(comNovo);
    expect(codigos.get("a1")).toBe("1.1");
    expect(codigos.get("novo")).toBe("1.2");
    expect(codigos.get("a2")).toBe("1.3");
  });

  it("item com pai inexistente é tratado como raiz, e não some", () => {
    const orfao: ItemEAP[] = [
      { id: "a", parentId: null, sequence: 0, code: "1" },
      { id: "x", parentId: "fantasma", sequence: 1, code: "9.9" }
    ];
    const codigos = renumerar(orfao);
    expect(codigos.get("x")).toBe("2");
  });

  it("devolve só o que mudou", () => {
    const movido = arvore.map(i => (i.id === "b" ? { ...i, sequence: -1 } : i));
    const mudou = diferencas(movido);
    // b passa a ser a primeira etapa; a vira 2. a1/a2/b1 acompanham.
    expect(mudou.map(m => m.id).sort()).toEqual(["a", "a1", "a2", "b", "b1"]);
    expect(mudou.find(m => m.id === "b")?.code).toBe("1");
    expect(mudou.find(m => m.id === "a")?.code).toBe("2");
  });
});
