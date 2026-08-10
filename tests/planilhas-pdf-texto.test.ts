import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  LIMITES_PDF,
  PdfIlegivelError,
  decodificarAscii85,
  lerTextoDoPdf
} from "@/lib/planilhas/pdf-texto";

// Os PDFs aqui são montados à mão, byte a byte, em vez de commitados como
// fixture binária. O motivo é o de sempre: fixture binária de 98 KB é uma coisa
// que ninguém revisa, e quando o leitor muda ninguém sabe dizer se ela ainda
// representa o arquivo publicado. Montar o mínimo deixa **visível** o que cada
// teste está exercitando.
//
// A conferência contra o arquivo real do Sinduscon-MG é feita em execução, e o
// resultado está registrado na T-37.13c do inventário: 19 tipologias, 19
// fechando ao centavo.

function ascii85(bytes: Buffer): string {
  let saida = "";
  for (let i = 0; i < bytes.length; i += 4) {
    const grupo = bytes.subarray(i, i + 4);
    const completo = Buffer.alloc(4);
    grupo.copy(completo);
    const valor = completo.readUInt32BE(0);
    if (valor === 0 && grupo.length === 4) {
      saida += "z";
      continue;
    }
    const digitos: string[] = [];
    let resto = valor;
    for (let d = 0; d < 5; d += 1) {
      digitos.unshift(String.fromCharCode((resto % 85) + 33));
      resto = Math.floor(resto / 85);
    }
    saida += digitos.slice(0, grupo.length + 1).join("");
  }
  return `${saida}~>`;
}

function pdfCom(conteudo: Buffer | string): Buffer {
  const corpo = typeof conteudo === "string" ? Buffer.from(conteudo, "latin1") : conteudo;
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n<< /Length 0 >>\nstream\n", "latin1"),
    corpo,
    Buffer.from("\nendstream\nendobj\n%%EOF\n", "latin1")
  ]);
}

const FLUXO = "BT /F1 12 Tf (R8-N) Tj (2.548,75) Tj ET";

describe("ASCII85 do PDF", () => {
  it("volta ao original em ida e volta", () => {
    const original = Buffer.from("Composição CUB/m² — Julho/2026", "latin1");
    expect(decodificarAscii85(ascii85(original)).toString("latin1")).toBe(original.toString("latin1"));
  });

  it("o grupo final incompleto devolve um byte a menos que os dígitos", () => {
    // É o ponto em que uma implementação apressada corrompe o fim de cada
    // fluxo — que num PDF de tabela é onde fica o rodapé com a data.
    for (const texto of ["a", "ab", "abc", "abcd", "abcde"]) {
      const bytes = Buffer.from(texto, "latin1");
      expect(decodificarAscii85(ascii85(bytes)).toString("latin1")).toBe(texto);
    }
  });

  it("`z` só abrevia quatro zeros fora de um grupo", () => {
    expect([...decodificarAscii85("z")]).toEqual([0, 0, 0, 0]);
    expect([...decodificarAscii85("zz")]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("texto de dentro do PDF", () => {
  it("lê fluxo cru", () => {
    const lido = lerTextoDoPdf(pdfCom(FLUXO));
    expect(lido.texto).toContain("R8-N");
    expect(lido.texto).toContain("2.548,75");
    expect(lido.fluxosLidos).toBe(1);
  });

  it("lê fluxo comprimido com Flate", () => {
    expect(lerTextoDoPdf(pdfCom(zlib.deflateSync(Buffer.from(FLUXO, "latin1")))).texto).toContain("R8-N");
  });

  it("lê ASCII85 e Flate encadeados, que é o que o Sinduscon-MG publica", () => {
    const encadeado = ascii85(zlib.deflateSync(Buffer.from(FLUXO, "latin1")));
    expect(lerTextoDoPdf(pdfCom(encadeado)).texto).toContain("2.548,75");
  });

  it("desfaz o escape octal, senão nenhuma âncora de rótulo casa", () => {
    // "Composição" chega no fluxo como "Composi\347\343o" em WinAnsiEncoding.
    const lido = lerTextoDoPdf(pdfCom("BT (Composi\\347\\343o CUB/m\\262) Tj ET"));
    expect(lido.texto).toContain("Composição CUB/m²");
  });

  it("parêntese escapado dentro da string não encerra a string", () => {
    const lido = lerTextoDoPdf(pdfCom("BT (M.Obra \\(com encargos\\) 1.299,50) Tj ET"));
    expect(lido.texto).toContain("M.Obra (com encargos) 1.299,50");
  });

  it("mantém a ordem do fluxo, que é a única ordem que existe", () => {
    const lido = lerTextoDoPdf(pdfCom("BT (Materiais) Tj (1.158,95) Tj (Total) Tj (2.548,75) Tj ET"));
    expect(lido.pedacos).toEqual(["Materiais", "1.158,95", "Total", "2.548,75"]);
  });

  it("junta o vetor do TJ e o intercala com os Tj pela posição", () => {
    // `TJ` recebe um vetor que mistura literais e ajustes de espaçamento; os
    // ajustes não são texto, e as partes são pedaços da mesma palavra.
    const lido = lerTextoDoPdf(pdfCom("BT (Item) Tj [(R8) -250 (-N)] TJ (2.548,75) Tj ET"));
    expect(lido.pedacos).toEqual(["Item", "R8-N", "2.548,75"]);
  });

  it("só entra literal que é operando de operador de texto", () => {
    // **A regressão que motivou esta guarda.** Extrair todo `(…)` do fluxo
    // parece equivalente e não é: um fluxo de imagem em ASCII85 contém, por
    // acaso, bytes que formam parênteses e a sequência `Tj`. Medido no
    // `composicao_cub_julho_26.pdf` antes da correção: 730 pedaços e 24.924
    // caracteres, contra 218 e 1.849 depois — o resto era ruído binário
    // devolvido como se fosse texto da publicação.
    //
    // Passava despercebido porque o texto verdadeiro vinha junto e as buscas
    // por âncora continuavam achando o que procuravam.
    const lido = lerTextoDoPdf(
      pdfCom("BT (texto de verdade) Tj ET (isto e um vetor de cor) 0 0 1 rg (nome de recurso) /Im0")
    );
    expect(lido.pedacos).toEqual(["texto de verdade"]);
  });

  it("fluxo sem objeto de texto não contribui, mesmo tendo parênteses e Tj soltos", () => {
    const comImagem = Buffer.concat([
      Buffer.from("%PDF-1.7\n1 0 obj\nstream\n", "latin1"),
      // Bytes que imitam a forma sem ser um fluxo de conteúdo.
      Buffer.from("(\\377\\330\\377) Tj (\\001\\002) Tj", "latin1"),
      Buffer.from("\nendstream\n2 0 obj\nstream\n", "latin1"),
      Buffer.from(FLUXO, "latin1"),
      Buffer.from("\nendstream\n%%EOF\n", "latin1")
    ]);
    const lido = lerTextoDoPdf(comImagem);
    expect(lido.pedacos).toEqual(["R8-N", "2.548,75"]);
    expect(lido.fluxosLidos).toBe(1);
  });

  it("pula fluxo que não abre em vez de abortar", () => {
    // Um PDF tem fluxos de imagem e de metadado que nada têm a ver com o texto.
    const misturado = Buffer.concat([
      Buffer.from("%PDF-1.7\n1 0 obj\nstream\n", "latin1"),
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      Buffer.from("\nendstream\n2 0 obj\nstream\n", "latin1"),
      Buffer.from(FLUXO, "latin1"),
      Buffer.from("\nendstream\n%%EOF\n", "latin1")
    ]);
    expect(lerTextoDoPdf(misturado).texto).toContain("R8-N");
  });
});

describe("o que o leitor recusa", () => {
  it("arquivo que não é PDF", () => {
    expect(() => lerTextoDoPdf(Buffer.from("<html>não sou pdf</html>", "latin1")))
      .toThrowError(PdfIlegivelError);
    try {
      lerTextoDoPdf(Buffer.from("<html>", "latin1"));
    } catch (erro) {
      expect((erro as PdfIlegivelError).codigo).toBe("NAO_E_PDF");
    }
  });

  it("arquivo acima do limite, antes de tentar abrir qualquer coisa", () => {
    const grande = Buffer.concat([Buffer.from("%PDF-", "latin1"), Buffer.alloc(2048)]);
    try {
      lerTextoDoPdf(grande, { ...LIMITES_PDF, bytesDoArquivo: 512 });
      throw new Error("deveria ter recusado");
    } catch (erro) {
      expect((erro as PdfIlegivelError).codigo).toBe("ARQUIVO_GRANDE_DEMAIS");
    }
  });

  it("PDF sem texto legível é erro, e não string vazia", () => {
    // Devolver "" faria o leitor de cima concluir "a publicação não traz o
    // R8-N" quando a verdade é "não consegui ler a publicação". São respostas
    // diferentes e só uma delas manda alguém olhar o arquivo.
    try {
      lerTextoDoPdf(pdfCom("q 1 0 0 1 0 0 cm /Im0 Do Q"));
      throw new Error("deveria ter recusado");
    } catch (erro) {
      expect((erro as PdfIlegivelError).codigo).toBe("SEM_TEXTO");
    }
  });

  it("bomba de descompressão para no limite do fluxo", () => {
    const bomba = zlib.deflateSync(Buffer.alloc(5 * 1024 * 1024, 0x41));
    try {
      lerTextoDoPdf(pdfCom(bomba), { ...LIMITES_PDF, bytesPorFluxo: 1024 });
      throw new Error("deveria ter recusado");
    } catch (erro) {
      // O fluxo estourado é pulado; sem outro fluxo com texto, sobra SEM_TEXTO.
      expect((erro as PdfIlegivelError).codigo).toBe("SEM_TEXTO");
    }
  });
});
