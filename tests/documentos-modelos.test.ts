import { describe, expect, it } from "vitest";
import { MODULE_BY_KEY } from "../lib/modules/registry";
import { variaveisDoTipo } from "../lib/documentos/dicionario";
import {
  SUGESTAO_POR_APLICATIVO,
  TIPOS,
  categoriaDoTipo,
  categorias,
  rotuloDoTipo,
  tipo,
  tiposDaCategoria
} from "../lib/documentos/tipos";
import { porTipo, type ModeloDaBiblioteca } from "../lib/documentos/biblioteca";
import { nomeSugerido, traduzirFalhaDoBanco, validarModelo } from "../lib/documentos/modelos";

describe("catálogo de tipos", () => {
  it("nenhuma chave repetida — a chave é o que vai para o banco", () => {
    const chaves = TIPOS.map(t => t.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("cobre o que o responsável listou, inclusive as mensagens de CRM", () => {
    const chaves = new Set(TIPOS.map(t => t.chave));
    for (const esperada of [
      "PROPOSTA", "ORCAMENTO", "ADITIVO", "CONTRATO",
      "CRM_QUALIFICACAO", "CRM_GATILHO", "CRM_BOAS_VINDAS", "CRM_CONFIRMACAO_REUNIAO", "CRM_LGPD",
      "TERMO_ABERTURA", "TERMO_CIENCIA", "TERMO_CONSCIENTIZACAO", "TERMO_ENCERRAMENTO", "TERMO_TREINAMENTO",
      "MENSAGEM_ETAPA", "LEMBRETE", "AGENDAMENTO", "EMAIL", "EMAIL_MARKETING", "CONTATO",
      "FVS", "FVM"
    ]) {
      expect(chaves.has(esperada), esperada).toBe(true);
    }
  });

  it("toda categoria usada tem rótulo, e categorias() não repete", () => {
    const lista = categorias();
    expect(new Set(lista).size).toBe(lista.length);
    for (const c of lista) expect(tiposDaCategoria(c).length).toBeGreaterThan(0);
  });

  it("tipo desconhecido não inventa rótulo nem categoria", () => {
    expect(tipo("INEXISTENTE")).toBeNull();
    expect(categoriaDoTipo("INEXISTENTE")).toBeNull();
    expect(rotuloDoTipo("INEXISTENTE")).toBe("INEXISTENTE");
  });
});

describe("o mesmo documento serve a mais de um aplicativo", () => {
  // É a correção de 3 de agosto. Preso ao módulo emissor, não haveria como
  // mandar a proposta de dentro de Projetos nem anexar o contrato assinado num
  // atendimento — e foi exatamente esse o caso que o responsável apontou.
  it("proposta é oferecida em mais de um aplicativo", () => {
    const onde = Object.entries(SUGESTAO_POR_APLICATIVO)
      .filter(([chave, tipos]) => chave !== "modelos" && tipos.includes("PROPOSTA"))
      .map(([chave]) => chave);
    expect(onde.length).toBeGreaterThan(1);
    expect(onde).toContain("obras");
  });

  it("contrato chega ao pós-venda, que não é quem o emite", () => {
    expect(SUGESTAO_POR_APLICATIVO.sac).toContain("CONTRATO");
  });

  it("toda sugestão aponta para aplicativo e tipo que existem", () => {
    for (const [aplicativo, tipos] of Object.entries(SUGESTAO_POR_APLICATIVO)) {
      expect(MODULE_BY_KEY.has(aplicativo), aplicativo).toBe(true);
      for (const t of tipos) expect(tipo(t), `${aplicativo} → ${t}`).not.toBeNull();
    }
  });

  it("o aplicativo de modelos oferece o catálogo inteiro", () => {
    expect(SUGESTAO_POR_APLICATIVO.modelos).toHaveLength(TIPOS.length);
  });
});

describe("variáveis por tipo", () => {
  it("FVS não oferece orçamento; proposta oferece", () => {
    const fvs = variaveisDoTipo("FVS").map(v => v.escopo);
    expect(fvs).not.toContain("orcamento");
    expect(variaveisDoTipo("PROPOSTA").map(v => v.escopo)).toContain("orcamento");
  });

  it("mensagem de boas-vindas não oferece obra — o lead ainda não tem uma", () => {
    expect(variaveisDoTipo("CRM_BOAS_VINDAS").map(v => v.escopo)).not.toContain("obra");
  });

  it("tipo desconhecido cai num conjunto seguro em vez de oferecer tudo", () => {
    const escopos = new Set(variaveisDoTipo("INEXISTENTE").map(v => v.escopo));
    expect([...escopos].sort()).toEqual(["cliente", "empresa", "sistema"]);
  });
});

describe("validação antes de gravar", () => {
  const ok = { nome: "Proposta padrão", corpo: "Olá {{cliente.nome_completo}}", tipo: "PROPOSTA" };

  it("rascunho válido passa", () => {
    expect(validarModelo({ ...ok, publicar: false }).erros).toEqual([]);
  });

  it("nome vazio reprova, e o erro aponta o campo", () => {
    const r = validarModelo({ ...ok, nome: "   ", publicar: false });
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].campo).toBe("nome");
  });

  it("rascunho pode estar vazio; publicado não", () => {
    expect(validarModelo({ ...ok, corpo: "", publicar: false }).erros).toEqual([]);
    expect(validarModelo({ ...ok, corpo: "   ", publicar: true }).erros.map(e => e.campo)).toContain("corpo");
  });

  it("variável inexistente impede PUBLICAR e não impede salvar", () => {
    const corpo = "Prezado {{cliente.nome_completoo}}";
    expect(validarModelo({ ...ok, corpo, publicar: false }).erros).toEqual([]);
    const r = validarModelo({ ...ok, corpo, publicar: true });
    expect(r.erros[0].campo).toBe("corpo");
    expect(r.erros[0].mensagem).toContain("cliente.nome_completoo");
  });

  it("variável fora do escopo do tipo também não publica", () => {
    const r = validarModelo({
      nome: "FVS alvenaria",
      corpo: "Valor: {{orcamento.valor_total}}",
      tipo: "FVS",
      publicar: true
    });
    expect(r.erros.map(e => e.mensagem).join(" ")).toContain("orcamento.valor_total");
  });

  it("tipo fora do catálogo reprova antes de tocar no banco", () => {
    expect(validarModelo({ ...ok, tipo: "INEXISTENTE", publicar: false }).erros.map(e => e.campo)).toContain("tipo");
  });

  it("nome longo demais reprova com o limite dito", () => {
    expect(validarModelo({ ...ok, nome: "x".repeat(121), publicar: false }).erros[0].mensagem).toMatch(/120/);
  });
});

describe("falha do banco vira frase de domínio", () => {
  it("nome repetido diz o que repetiu, não o nome do índice", () => {
    const m = traduzirFalhaDoBanco({ code: "23505", message: 'duplicate key value violates unique constraint "document_templates_nome_unico_idx"' });
    expect(m).toContain("mesmo nome");
    expect(m).not.toContain("idx");
  });

  it("permissão recusada não é confundida com registro inexistente", () => {
    expect(traduzirFalhaDoBanco({ code: "42501", message: "new row violates row-level security policy" })).toContain("permissão");
  });

  it("falha desconhecida não vaza SQL para a tela", () => {
    const m = traduzirFalhaDoBanco({ code: "XX000", message: 'relation "document_templates" does not exist' });
    expect(m).not.toContain("document_templates");
    expect(m.length).toBeGreaterThan(10);
  });
});

describe("nome sugerido", () => {
  it("usa o primeiro título do corpo, que é o que o autor já escreveu", () => {
    expect(nomeSugerido("# Proposta comercial\n\ntexto", "PROPOSTA")).toBe("Proposta comercial");
  });

  it("ignora variável no título, que viraria nome com chaves", () => {
    expect(nomeSugerido("# Proposta {{proposta.numero}}", "PROPOSTA")).toBe("Proposta");
  });

  it("sem título, cai no rótulo do tipo", () => {
    expect(nomeSugerido("texto solto", "FVS")).toBe("FVS — verificação de serviço");
  });
});

describe("agrupamento da biblioteca", () => {
  const modelo = (id: string, t: string): ModeloDaBiblioteca => ({
    id,
    nome: `Modelo ${id}`,
    tipo: t,
    rotuloDoTipo: rotuloDoTipo(t),
    categoria: categoriaDoTipo(t),
    status: "PUBLISHED",
    escopo: "ORGANIZACAO",
    clienteVe: false,
    versao: 1,
    atualizadoEm: "2026-08-03T00:00:00Z"
  });

  it("agrupa por tipo sem perder nenhum item", () => {
    const grupos = porTipo([modelo("a", "PROPOSTA"), modelo("b", "CONTRATO"), modelo("c", "PROPOSTA")]);
    expect(grupos.map(g => g.tipo)).toEqual(["PROPOSTA", "CONTRATO"]);
    expect(grupos.flatMap(g => g.itens)).toHaveLength(3);
  });

  it("lista vazia não vira grupo vazio", () => {
    expect(porTipo([])).toEqual([]);
  });
});
