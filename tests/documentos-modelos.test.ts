import { describe, expect, it } from "vitest";
import { MODULE_BY_KEY } from "../lib/modules/registry";
import { ESCOPOS_POR_FUNCAO } from "../lib/documentos/dicionario";
import {
  FUNCOES,
  funcoesDoModulo,
  moduloDaFuncao,
  rotuloDaFuncao
} from "../lib/documentos/funcoes";
import {
  nomeSugerido,
  traduzirFalhaDoBanco,
  validarModelo
} from "../lib/documentos/modelos";

describe("a função diz de qual módulo o modelo é", () => {
  it("cada função conhecida aponta para um módulo que existe no registro", () => {
    for (const f of FUNCOES) {
      expect(MODULE_BY_KEY.has(f.moduleKey), `${f.funcao} → ${f.moduleKey}`).toBe(true);
    }
  });

  it("toda função que oferece variáveis também sabe gravar", () => {
    // Se o dicionário oferece variáveis para uma função, ela tem tela; e tela
    // sem módulo dono não teria por onde a RLS decidir quem enxerga.
    for (const funcao of Object.keys(ESCOPOS_POR_FUNCAO)) {
      expect(moduloDaFuncao(funcao), funcao).toBeTruthy();
    }
  });

  it("o documento fica no módulo que o emite, não num depósito comum", () => {
    // É o que faz a RLS separar sem regra nova: quem lê propostas vê modelo de
    // proposta; quem só tem qualidade vê FVS e não vê contrato.
    expect(moduloDaFuncao("PROPOSTA")).toBe("propostas");
    expect(moduloDaFuncao("CONTRATO")).toBe("contratos");
    expect(moduloDaFuncao("FVS")).toBe("qualidade");
    expect(moduloDaFuncao("FVM")).toBe("qualidade");
  });

  it("função desconhecida não vira modelo em módulo nenhum", () => {
    expect(moduloDaFuncao("INEXISTENTE")).toBeNull();
    expect(rotuloDaFuncao("INEXISTENTE")).toBe("INEXISTENTE");
  });

  it("um módulo pode ter mais de uma função — é para isso que `purpose` existe", () => {
    expect(funcoesDoModulo("qualidade").map(f => f.funcao).sort()).toEqual(["FVM", "FVS", "LAUDO"]);
  });
});

describe("validação antes de gravar", () => {
  const ok = { nome: "Proposta padrão", corpo: "Olá {{cliente.nome_completo}}", funcao: "PROPOSTA" };

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
    const publicado = validarModelo({ ...ok, corpo: "   ", publicar: true });
    expect(publicado.erros.map(e => e.campo)).toContain("corpo");
  });

  it("variável inexistente impede PUBLICAR e não impede salvar", () => {
    const corpo = "Prezado {{cliente.nome_completoo}}";
    expect(validarModelo({ ...ok, corpo, publicar: false }).erros).toEqual([]);
    const r = validarModelo({ ...ok, corpo, publicar: true });
    expect(r.erros[0].campo).toBe("corpo");
    expect(r.erros[0].mensagem).toContain("cliente.nome_completoo");
  });

  it("variável fora do escopo da função também não publica", () => {
    // `orcamento.valor_total` existe no catálogo, mas uma FVS nunca resolve
    // orçamento: publicar assim produz lacuna na frente de quem recebe.
    const r = validarModelo({
      nome: "FVS alvenaria",
      corpo: "Valor: {{orcamento.valor_total}}",
      funcao: "FVS",
      publicar: true
    });
    expect(r.erros.map(e => e.mensagem).join(" ")).toContain("orcamento.valor_total");
  });

  it("função sem módulo dono reprova antes de tocar no banco", () => {
    const r = validarModelo({ ...ok, funcao: "INEXISTENTE", publicar: false });
    expect(r.erros.map(e => e.campo)).toContain("funcao");
  });

  it("nome longo demais reprova com o limite dito", () => {
    const r = validarModelo({ ...ok, nome: "x".repeat(121), publicar: false });
    expect(r.erros[0].mensagem).toMatch(/120/);
  });
});

describe("falha do banco vira frase de domínio", () => {
  it("nome repetido diz o que repetiu, não o nome do índice", () => {
    const m = traduzirFalhaDoBanco({ code: "23505", message: 'duplicate key value violates unique constraint "document_templates_nome_unico_idx"' });
    expect(m).toContain("mesmo nome");
    expect(m).not.toContain("idx");
    expect(m).not.toContain("duplicate");
  });

  it("permissão recusada não é confundida com registro inexistente", () => {
    expect(traduzirFalhaDoBanco({ code: "42501", message: "new row violates row-level security policy" }))
      .toContain("permissão");
  });

  it("corpo vazio ao publicar tem frase própria, vinda da constraint", () => {
    expect(traduzirFalhaDoBanco({ code: "23514", message: 'violates check constraint "document_templates_publicado_tem_corpo"' }))
      .toContain("corpo");
  });

  it("falha desconhecida não vaza SQL para a tela", () => {
    const m = traduzirFalhaDoBanco({ code: "XX000", message: "relation \"document_templates\" does not exist" });
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

  it("sem título, cai no rótulo da função", () => {
    expect(nomeSugerido("texto solto", "FVS")).toBe("FVS — ficha de verificação de serviço");
  });
});
