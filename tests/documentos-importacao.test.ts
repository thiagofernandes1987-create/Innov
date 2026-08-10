import { describe, expect, it } from "vitest";
import { docxParaMarkdown, listasNumeradas, niveisDeTitulo } from "../lib/documentos/docx";
import {
  celulasDaLinha,
  colunaDaReferencia,
  csvParaMarkdown,
  extensaoDe,
  importarParaMarkdown,
  planilhaParaMarkdown,
  separadorDoCsv
} from "../lib/documentos/importar";
import { analisarXML, primeiro, todos } from "../lib/documentos/xml";

const doc = (corpo: string) => `<?xml version="1.0"?><w:document><w:body>${corpo}</w:body></w:document>`;
const run = (texto: string, props = "") => `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${texto}</w:t></w:r>`;

describe("analisador de XML", () => {
  it("lê atributo, filho e texto", () => {
    const raiz = analisarXML('<a x="1"><b>oi</b></a>');
    expect(raiz.filhos[0].atributos.x).toBe("1");
    expect(primeiro(raiz, "b")?.texto).toBe("oi");
  });

  it("desescapa entidade, inclusive numérica", () => {
    expect(primeiro(analisarXML("<t>a &amp; b &lt;c&gt; &#233; &#xe9;</t>"), "t")?.texto).toBe("a & b <c> é é");
  });

  it("elemento vazio não abre nível", () => {
    const raiz = analisarXML("<a><b/><c>x</c></a>");
    expect(primeiro(raiz, "c")?.texto).toBe("x");
  });

  it("atributo com '>' dentro não parte a marca", () => {
    expect(analisarXML('<a t="1 > 0"><b/></a>').filhos[0].atributos.t).toBe("1 > 0");
  });

  it("fechamento sem abertura não derruba a leitura", () => {
    expect(todos(analisarXML("<a><b>x</b></c></a>"), "b")).toHaveLength(1);
  });
});

describe("estilos do Word", () => {
  it("o nível do título vem do NOME do estilo, não do id", () => {
    // Nos arquivos recebidos o id é "Ttulo1", porque o Word era português.
    // Casar pelo id só funcionaria nessa instalação.
    const estilos = `<w:styles>
      <w:style w:styleId="Ttulo1"><w:name w:val="heading 1"/></w:style>
      <w:style w:styleId="Ttulo9"><w:name w:val="heading 9"/></w:style>
      <w:style w:styleId="Normal"><w:name w:val="Normal"/></w:style>
    </w:styles>`;
    const mapa = niveisDeTitulo(estilos);
    expect(mapa.get("Ttulo1")).toBe(1);
    // Markdown vai só até seis. Nove viram seis, não nove sustenidos.
    expect(mapa.get("Ttulo9")).toBe(6);
    expect(mapa.has("Normal")).toBe(false);
  });

  it("lista numerada e lista com marcador se distinguem pela numeração", () => {
    const numeracao = `<w:numbering>
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>
      <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
      <w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num>
      <w:num w:numId="6"><w:abstractNumId w:val="1"/></w:num>
    </w:numbering>`;
    const mapa = listasNumeradas(numeracao);
    expect(mapa.get("5")).toBe(false);
    expect(mapa.get("6")).toBe(true);
  });
});

describe("DOCX para Markdown", () => {
  it("título usa o nível do estilo", () => {
    const md = docxParaMarkdown({
      documento: doc(`<w:p><w:pPr><w:pStyle w:val="H2"/></w:pPr>${run("Objetivo")}</w:p>`),
      estilos: '<w:styles><w:style w:styleId="H2"><w:name w:val="heading 2"/></w:style></w:styles>'
    });
    expect(md).toBe("## Objetivo");
  });

  it("runs vizinhos de mesma formatação viram UMA marcação", () => {
    // O Word parte o mesmo trecho em vários runs por causa de revisão e de id
    // de sessão. Sem juntar, "7.0 PROCEDIMENTOS" sai como `**7****.0 …**`, que
    // nenhum renderizador entende — foi o defeito real do arquivo recebido.
    const md = docxParaMarkdown({
      documento: doc(`<w:p>${run("7", "<w:b/>")}${run(".0 PROCEDIMENTOS", "<w:b/>")}</w:p>`)
    });
    expect(md).toBe("**7.0 PROCEDIMENTOS**");
    expect(md).not.toContain("****");
  });

  it("o marcador encosta no texto, e o espaço fica fora", () => {
    const md = docxParaMarkdown({ documento: doc(`<w:p>${run("antes ")}${run("forte", "<w:b/>")}${run(" depois")}</w:p>`) });
    expect(md).toBe("antes **forte** depois");
  });

  it("negrito desligado por w:val não vira negrito", () => {
    const md = docxParaMarkdown({ documento: doc(`<w:p>${run("normal", '<w:b w:val="0"/>')}</w:p>`) });
    expect(md).toBe("normal");
  });

  it("o texto do Word é literal: o que pareceria marcação é escapado", () => {
    const md = docxParaMarkdown({ documento: doc(`<w:p>${run("desconto de 50% *ou* 2*3")}</w:p>`) });
    expect(md).toContain("\\*ou\\*");
  });

  it("lista numerada e com marcador, com recuo", () => {
    const numeracao = `<w:numbering>
      <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
      <w:num w:numId="6"><w:abstractNumId w:val="1"/></w:num>
    </w:numbering>`;
    const md = docxParaMarkdown({
      documento: doc(
        `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="6"/></w:numPr></w:pPr>${run("primeiro")}</w:p>` +
          `<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="9"/></w:numPr></w:pPr>${run("sub")}</w:p>`
      ),
      numeracao
    });
    expect(md).toBe("1. primeiro\n\n  - sub");
  });

  it("tabela vira tabela, com a primeira linha de cabeçalho", () => {
    const celula = (t: string) => `<w:tc><w:p>${run(t)}</w:p></w:tc>`;
    const md = docxParaMarkdown({
      documento: doc(
        `<w:tbl><w:tr>${celula("Profissional")}${celula("Valor")}</w:tr>` +
          `<w:tr>${celula("Engenheiro")}${celula("R$ 330,00")}</w:tr></w:tbl>`
      )
    });
    expect(md).toBe("| Profissional | Valor |\n|---|---|\n| Engenheiro | R$ 330,00 |");
  });

  it("barra vertical dentro da célula não parte a coluna", () => {
    const md = docxParaMarkdown({
      documento: doc(`<w:tbl><w:tr><w:tc><w:p>${run("a | b")}</w:p></w:tc></w:tr></w:tbl>`)
    });
    expect(md.split("\n")[0]).toBe("| a \\| b |");
  });

  it("linha com menos células é completada, senão a tabela desmonta", () => {
    const celula = (t: string) => `<w:tc><w:p>${run(t)}</w:p></w:tc>`;
    const md = docxParaMarkdown({
      documento: doc(`<w:tbl><w:tr>${celula("a")}${celula("b")}</w:tr><w:tr>${celula("c")}</w:tr></w:tbl>`)
    });
    expect(md.split("\n")[2]).toBe("| c |  |");
  });

  it("imagem vira marca visível, nunca silêncio", () => {
    const md = docxParaMarkdown({ documento: doc(`<w:p><w:r><w:drawing/></w:r></w:p>`) });
    expect(md).toContain("imagem não convertida");
  });

  it("link externo vira link; interno vira só o texto", () => {
    const rels = `<Relationships>
      <Relationship Id="rId7" Target="https://exemplo.com.br"/>
      <Relationship Id="rId8" Target="arquivo.docx"/>
    </Relationships>`;
    const md = docxParaMarkdown({
      documento: doc(`<w:p><w:hyperlink r:id="rId7">${run("site")}</w:hyperlink> e <w:hyperlink r:id="rId8">${run("outro")}</w:hyperlink></w:p>`),
      relacoes: rels
    });
    expect(md).toContain("[site](https://exemplo.com.br)");
    expect(md).toContain("outro");
    expect(md).not.toContain("arquivo.docx");
  });

  it("texto de revisão aceita e campo de formulário não somem", () => {
    const md = docxParaMarkdown({
      documento: doc(`<w:p><w:ins>${run("inserido")}</w:ins><w:sdt><w:sdtContent>${run(" e campo")}</w:sdtContent></w:sdt></w:p>`)
    });
    expect(md).toBe("inserido e campo");
  });

  it("parágrafo vazio não produz uma pilha de linhas em branco", () => {
    const md = docxParaMarkdown({ documento: doc(`<w:p>${run("um")}</w:p><w:p/><w:p/><w:p/><w:p>${run("dois")}</w:p>`) });
    expect(md).toBe("um\n\ndois");
  });
});

describe("CSV", () => {
  it("separador é detectado, não presumido", () => {
    // Planilha exportada no Brasil sai com ponto e vírgula, porque a vírgula é
    // o separador decimal. Presumir vírgula parte "1.234,56" em duas colunas.
    expect(separadorDoCsv("item;valor\ncimento;1.234,56")).toBe(";");
    expect(separadorDoCsv("item,valor\ncimento,1234.56")).toBe(",");
  });

  it("aspas protegem o separador e as aspas dobradas viram uma", () => {
    expect(celulasDaLinha('a;"b;c";"d""e"', ";")).toEqual(["a", "b;c", 'd"e']);
  });

  it("vira tabela com cabeçalho", () => {
    expect(csvParaMarkdown("item;valor\ncimento;R$ 40,00")).toBe(
      "| item | valor |\n|---|---|\n| cimento | R$ 40,00 |"
    );
  });

  it("BOM do Excel não vira caractere no cabeçalho", () => {
    expect(csvParaMarkdown("﻿item;valor\na;b").startsWith("| item |")).toBe(true);
  });
});

describe("XLSX", () => {
  it("referência de célula vira índice de coluna", () => {
    expect(colunaDaReferencia("A1")).toBe(0);
    expect(colunaDaReferencia("Z9")).toBe(25);
    expect(colunaDaReferencia("AA1")).toBe(26);
  });

  it("célula pulada não desloca as seguintes", () => {
    // Sem respeitar a referência, uma coluna vazia no meio empurraria todo o
    // resto da linha para a esquerda e a tabela sairia desalinhada.
    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>
    </sheetData></worksheet>`;
    expect(planilhaParaMarkdown(sheet, ["item", "valor"])).toBe("| item |  | valor |\n|---|---|---|");
  });

  it("número fica como está e texto vem da tabela compartilhada", () => {
    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>1234.5</v></c></row>
    </sheetData></worksheet>`;
    expect(planilhaParaMarkdown(sheet, ["cimento"])).toContain("| cimento | 1234.5 |");
  });
});

describe("porta de entrada da importação", () => {
  it("extensão sai do nome, sem depender do tipo declarado pelo navegador", () => {
    expect(extensaoDe("Proposta.DOCX")).toBe("docx");
    expect(extensaoDe("sem-extensao")).toBe("");
  });

  it("formato antigo é recusado com o que fazer, não com erro genérico", async () => {
    const r = await importarParaMarkdown("antigo.doc", new Uint8Array([1, 2, 3]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("salve como");
  });

  it("PDF é recusado dizendo por que, e o que fazer no lugar", async () => {
    const r = await importarParaMarkdown("contrato.pdf", new Uint8Array([1]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("docx");
  });

  it("arquivo corrompido devolve motivo em vez de estourar", async () => {
    const r = await importarParaMarkdown("modelo.docx", new Uint8Array(80).fill(7));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo.length).toBeGreaterThan(10);
  });

  it("CSV entra pela mesma porta", async () => {
    const bytes = new TextEncoder().encode("a;b\n1;2");
    const r = await importarParaMarkdown("planilha.csv", bytes);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.markdown).toContain("| a | b |");
  });
});
