import { describe, expect, it } from "vitest";
import { canonicalJson, safeFileName } from "../lib/signatures/format";

describe("safeFileName", () => {
  it("remove acentuação preservando o nome legível", () => {
    expect(safeFileName("Relatório de Medição.pdf")).toBe("Relatorio-de-Medicao.pdf");
  });

  it("neutraliza travessia de caminho e separadores", () => {
    // Os pontos são preservados, mas nenhum separador de caminho sobrevive.
    expect(safeFileName("../../etc/passwd")).toBe("..-..-etc-passwd");
    expect(safeFileName("../../etc/passwd")).not.toMatch(/[/\\]/);
    expect(safeFileName("C:\\Windows\\system32.dll")).toBe("C-Windows-system32.dll");
  });

  it("remove aspas e quebras que escapariam de Content-Disposition", () => {
    expect(safeFileName('nota";x=1.pdf')).toBe("nota-x-1.pdf");
    expect(safeFileName("linha\nquebrada.pdf")).toBe("linha-quebrada.pdf");
    expect(safeFileName("arquivo\u0000.pdf")).toBe("arquivo-.pdf");
  });

  it("limita o comprimento", () => {
    expect(safeFileName(`${"a".repeat(400)}.pdf`)).toHaveLength(120);
  });

  it("devolve um nome padrão quando nada sobra", () => {
    expect(safeFileName("***")).toBe("arquivo");
    expect(safeFileName("")).toBe("arquivo");
  });
});

describe("canonicalJson", () => {
  it("ordena chaves para produzir a mesma serialização", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("ordena chaves em profundidade", () => {
    expect(canonicalJson({ z: { d: 1, c: 2 }, a: [3, { f: 4, e: 5 }] }))
      .toBe('{"a":[3,{"e":5,"f":4}],"z":{"c":2,"d":1}}');
  });

  it("preserva a ordem dos arrays", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("distingue documentos diferentes", () => {
    expect(canonicalJson({ valor: 100 })).not.toBe(canonicalJson({ valor: 1000 }));
    expect(canonicalJson({ a: null })).toBe('{"a":null}');
  });
});
