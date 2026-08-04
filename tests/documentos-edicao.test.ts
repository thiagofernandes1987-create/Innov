import { describe, expect, it } from "vitest";
import {
  contarPalavras,
  envolver,
  inserir,
  inserirLink,
  inserirTabela,
  linhaEColuna,
  numerarLinhas,
  prefixarLinhas
} from "../lib/documentos/edicao";

describe("negrito, itálico e afins", () => {
  it("envolve a seleção", () => {
    const r = envolver("um dois tres", { inicio: 3, fim: 7 }, "**");
    expect(r.texto).toBe("um **dois** tres");
    // A seleção acompanha o conteúdo, não o marcador.
    expect(r.texto.slice(r.selecao.inicio, r.selecao.fim)).toBe("dois");
  });

  it("clicar de novo TIRA — a ação é reversível pelo mesmo botão", () => {
    const r = envolver("um **dois** tres", { inicio: 5, fim: 9 }, "**");
    expect(r.texto).toBe("um dois tres");
  });

  it("também tira quando o marcador está dentro da seleção", () => {
    const r = envolver("um **dois** tres", { inicio: 3, fim: 11 }, "**");
    expect(r.texto).toBe("um dois tres");
  });

  it("sem seleção, insere o par e deixa o cursor no meio", () => {
    const r = envolver("um  tres", { inicio: 3, fim: 3 }, "**");
    expect(r.texto).toBe("um **** tres");
    expect(r.selecao).toEqual({ inicio: 5, fim: 5 });
  });

  it("marcador de abertura e fechamento diferentes, para subscrito", () => {
    const r = envolver("H2O", { inicio: 1, fim: 2 }, "<sub>", "</sub>");
    expect(r.texto).toBe("H<sub>2</sub>O");
  });
});

describe("prefixo por linha", () => {
  it("título aplica só na linha do cursor", () => {
    const r = prefixarLinhas("um\ndois\ntres", { inicio: 4, fim: 4 }, "## ");
    expect(r.texto).toBe("um\n## dois\ntres");
  });

  it("lista transforma cada linha da seleção em um item", () => {
    const r = prefixarLinhas("um\ndois\ntres", { inicio: 0, fim: 12 }, "- ");
    expect(r.texto).toBe("- um\n- dois\n- tres");
  });

  it("clicar de novo remove de todas", () => {
    const r = prefixarLinhas("- um\n- dois", { inicio: 0, fim: 11 }, "- ");
    expect(r.texto).toBe("um\ndois");
  });

  it("aplica em todas quando só algumas têm — não deixa a seleção meio a meio", () => {
    const r = prefixarLinhas("- um\ndois", { inicio: 0, fim: 9 }, "- ");
    expect(r.texto).toBe("- - um\n- dois");
  });

  it("lista numerada renumera a partir de 1", () => {
    const r = numerarLinhas("um\ndois\ntres", { inicio: 0, fim: 12 });
    expect(r.texto).toBe("1. um\n2. dois\n3. tres");
  });

  it("lista numerada também é reversível", () => {
    const r = numerarLinhas("1. um\n2. dois", { inicio: 0, fim: 12 });
    expect(r.texto).toBe("um\ndois");
  });
});

describe("inserções", () => {
  it("link usa a seleção como rótulo e seleciona o destino", () => {
    const r = inserirLink("veja o site aqui", { inicio: 12, fim: 16 });
    expect(r.texto).toBe("veja o site [aqui](https://)");
    expect(r.texto.slice(r.selecao.inicio, r.selecao.fim)).toBe("https://");
  });

  it("link sem seleção usa um rótulo padrão", () => {
    const r = inserirLink("", { inicio: 0, fim: 0 });
    expect(r.texto).toContain("[texto do link]");
  });

  it("tabela sai no formato que o renderizador reconhece", () => {
    const r = inserirTabela("", { inicio: 0, fim: 0 }, 2, 1);
    expect(r.texto).toContain("| Coluna 1 | Coluna 2 |");
    expect(r.texto).toContain("|---|---|");
  });

  it("tabela abre linha nova quando não está no começo de uma", () => {
    const r = inserirTabela("texto", { inicio: 5, fim: 5 }, 2, 1);
    expect(r.texto.startsWith("texto\n\n|")).toBe(true);
  });

  it("inserir variável substitui a seleção", () => {
    const r = inserir("Prezado NOME,", { inicio: 8, fim: 12 }, "{{cliente.nome_completo}}");
    expect(r.texto).toBe("Prezado {{cliente.nome_completo}},");
  });
});

describe("barra de status", () => {
  it("conta palavras ignorando espaço repetido", () => {
    expect(contarPalavras("um  dois\ntres")).toBe(3);
    expect(contarPalavras("   ")).toBe(0);
    expect(contarPalavras("")).toBe(0);
  });

  it("linha e coluna começam em 1, como em todo editor", () => {
    expect(linhaEColuna("abc", 0)).toEqual({ linha: 1, coluna: 1 });
    expect(linhaEColuna("abc", 3)).toEqual({ linha: 1, coluna: 4 });
    expect(linhaEColuna("abc\ndef", 4)).toEqual({ linha: 2, coluna: 1 });
    expect(linhaEColuna("abc\ndef", 7)).toEqual({ linha: 2, coluna: 4 });
  });
});
