import { describe, expect, it } from "vitest";
import { escaparHTML, markdownParaHTML } from "../lib/documentos/markdown";
import {
  extrairVariaveis,
  normalizarNome,
  renderizar,
  variaveisInexistentes
} from "../lib/documentos/modelo";

describe("nome da variável", () => {
  it("aceita as duas formas: a que o responsável escreveu e a canônica", () => {
    expect(normalizarNome("Cliente_Nome_Completo")).toBe("cliente.nome_completo");
    expect(normalizarNome("cliente.nome_completo")).toBe("cliente.nome_completo");
    expect(normalizarNome("{{Cliente_tel_pessoal}}".replace(/[{}]/g, ""))).toBe("cliente.tel_pessoal");
  });

  it("só o primeiro sublinhado separa escopo de campo", () => {
    expect(normalizarNome("Cliente_orc_valor1")).toBe("cliente.orc_valor1");
    expect(normalizarNome("Cliente_email_comercial")).toBe("cliente.email_comercial");
  });
});

describe("extração de variáveis", () => {
  it("lista sem repetir e na ordem de aparição", () => {
    const corpo = "{{cliente.nome}} e {{obra.codigo}} e de novo {{cliente.nome}}";
    expect(extrairVariaveis(corpo)).toEqual(["cliente.nome", "obra.codigo"]);
  });

  it("tolera espaço dentro das chaves, porque quem cola cola com espaço", () => {
    expect(extrairVariaveis("{{ cliente.nome }}")).toEqual(["cliente.nome"]);
  });

  it("corpo sem variável devolve lista vazia", () => {
    expect(extrairVariaveis("Contrato de prestação de serviços.")).toEqual([]);
  });
});

describe("renderização", () => {
  it("substitui o que existe", () => {
    const r = renderizar("Prezado {{cliente.nome_completo}},", {
      "cliente.nome_completo": "Construtora Alfa"
    });
    expect(r.texto).toBe("Prezado Construtora Alfa,");
    expect(r.lacunas).toEqual([]);
  });

  it("aceita o dicionário na forma com sublinhado", () => {
    const r = renderizar("{{Cliente_Nome_Completo}}", { Cliente_Nome_Completo: "Alfa" });
    expect(r.texto).toBe("Alfa");
  });

  it("variável vazia NÃO some — vira lacuna visível", () => {
    const r = renderizar("Tel: {{cliente.telefone}}", { "cliente.telefone": "" });
    expect(r.texto).toContain("sem valor");
    expect(r.texto).not.toBe("Tel: ");
    expect(r.lacunas).toHaveLength(1);
    expect(r.lacunas[0].motivo).toBe("vazia");
  });

  it("variável inexistente vira lacuna, não string vazia", () => {
    const r = renderizar("{{cliente.telfone}}", { "cliente.telefone": "11 99999-0000" });
    expect(r.lacunas[0]).toMatchObject({ variavel: "cliente.telfone", motivo: "desconhecida" });
    expect(r.texto).toContain("variável não existe");
  });

  it("valor nulo conta como lacuna, e zero NÃO conta", () => {
    expect(renderizar("{{a.b}}", { "a.b": null }).lacunas).toHaveLength(1);
    const zero = renderizar("{{a.b}}", { "a.b": 0 });
    expect(zero.lacunas).toEqual([]);
    expect(zero.texto).toBe("0");
  });

  it("dado do banco vira texto, nunca marcação", () => {
    // Nome de empresa com asterisco quebraria o negrito do documento inteiro.
    const r = renderizar("{{cliente.nome}}", { "cliente.nome": "Obras ** Ltda" });
    expect(r.texto).toBe("Obras \\*\\* Ltda");
    expect(markdownParaHTML(r.texto)).toContain("Obras ** Ltda");
    expect(markdownParaHTML(r.texto)).not.toContain("<strong>");
  });

  it("substituição, nunca execução: o modelo não avalia expressão", () => {
    const r = renderizar("{{ 1+1 }} {{cliente.nome.toUpperCase()}}", { "cliente.nome": "alfa" });
    // Nenhum dos dois é nome válido de variável, então nem sequer são marcadores.
    expect(r.texto).toContain("{{ 1+1 }}");
    expect(r.texto).toContain("{{cliente.nome.toUpperCase()}}");
  });

  it("validação antes de publicar aponta a variável que não existe", () => {
    const inexistentes = variaveisInexistentes("{{cliente.telfone}} {{obra.codigo}}", [
      "cliente.telefone",
      "obra.codigo"
    ]);
    expect(inexistentes).toEqual(["cliente.telfone"]);
  });
});

describe("markdown para HTML", () => {
  it("escapa antes de marcar — a ordem que evita a falha clássica", () => {
    expect(escaparHTML("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
    expect(markdownParaHTML("<script>alert(1)</script>")).not.toContain("<script>");
  });

  it("título, negrito, itálico e código", () => {
    expect(markdownParaHTML("# Contrato")).toBe("<h1>Contrato</h1>");
    expect(markdownParaHTML("texto **forte**")).toContain("<strong>forte</strong>");
    expect(markdownParaHTML("texto *leve*")).toContain("<em>leve</em>");
    expect(markdownParaHTML("use `código`")).toContain("<code>código</code>");
  });

  it("listas com marcador e numeradas", () => {
    expect(markdownParaHTML("- um\n- dois")).toBe("<ul><li>um</li><li>dois</li></ul>");
    expect(markdownParaHTML("1. um\n2. dois")).toBe("<ol><li>um</li><li>dois</li></ol>");
  });

  it("tabela só quando há linha separadora", () => {
    const html = markdownParaHTML("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>2</td>");
    // Texto com barra vertical não vira tabela por engano.
    expect(markdownParaHTML("valor a | valor b")).toContain("<p>");
  });

  it("link com esquema perigoso vira texto, e não some", () => {
    const html = markdownParaHTML("[clique](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("clique");
  });

  it("link http passa, com rel de segurança", () => {
    const html = markdownParaHTML("[site](https://exemplo.com.br)");
    expect(html).toContain('href="https://exemplo.com.br"');
    expect(html).toContain("noopener");
  });

  it("citação e linha horizontal", () => {
    expect(markdownParaHTML("> aviso")).toBe("<blockquote>aviso</blockquote>");
    expect(markdownParaHTML("---")).toBe("<hr />");
  });

  it("o escape do valor não aparece na tela", () => {
    const r = renderizar("{{c.n}}", { "c.n": "Alfa & Beta (Ltda)" });
    expect(markdownParaHTML(r.texto)).toContain("Alfa &amp; Beta (Ltda)");
    expect(markdownParaHTML(r.texto)).not.toContain("\\");
  });
});

describe("dicionário de variáveis", () => {
  it("cada tipo oferece só os escopos que resolvem nele", async () => {
    const { variaveisDoTipo } = await import("../lib/documentos/dicionario");
    // FVS é ficha de verificação de serviço: não tem orçamento nem proposta.
    // Oferecer variável que nunca resolve é convidar a lacuna a aparecer na
    // frente do cliente.
    const fvs = variaveisDoTipo("FVS").map(v => v.escopo);
    expect(fvs).not.toContain("orcamento");
    expect(fvs).not.toContain("proposta");
    expect(variaveisDoTipo("PROPOSTA").map(v => v.escopo)).toContain("orcamento");
  });

  it("função desconhecida cai num conjunto seguro em vez de oferecer tudo", async () => {
    const { variaveisDoTipo } = await import("../lib/documentos/dicionario");
    const escopos = new Set(variaveisDoTipo("INEXISTENTE").map(v => v.escopo));
    expect([...escopos].sort()).toEqual(["cliente", "empresa", "sistema"]);
  });

  it("o catálogo e a validação enxergam a mesma lista", async () => {
    const { variaveisDoTipo, dicionarioDeExemplo } = await import("../lib/documentos/dicionario");
    const nomes = variaveisDoTipo("PROPOSTA").map(v => v.nome);
    const corpo = nomes.map(n => `{{${n}}}`).join(" ");
    expect(variaveisInexistentes(corpo, nomes)).toEqual([]);
    // E a pré-visualização resolve todas, sem lacuna.
    expect(renderizar(corpo, dicionarioDeExemplo("PROPOSTA")).lacunas).toEqual([]);
  });

  it("todo nome do catálogo já está na forma canônica", async () => {
    const { VARIAVEIS } = await import("../lib/documentos/dicionario");
    for (const v of VARIAVEIS) {
      expect(v.nome).toBe(normalizarNome(v.nome));
      expect(v.nome).toContain(".");
    }
  });
});
