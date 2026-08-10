import { describe, expect, it } from "vitest";
import {
  MINIMO_DE_OCORRENCIAS,
  modeloPara,
  modelosDeEtapa,
  type OcorrenciaDeEtapa
} from "../lib/planejamento/modelos-de-eap";

const etapa = (titulo: string, ...atividades: string[]): OcorrenciaDeEtapa => ({ titulo, atividades });

const CINCO = ["Escavação", "Forma", "Armação", "Concretagem", "Cura"];

describe("o caso que a tarefa descreve", () => {
  it("quem cria Fundação pela terceira vez recebe as cinco atividades", () => {
    const modelos = modelosDeEtapa([etapa("Fundação", ...CINCO), etapa("Fundação", ...CINCO)]);
    expect(modelos).toHaveLength(1);
    expect(modelos[0].vezes).toBe(2);
    expect(modelos[0].atividades.map(a => a.titulo)).toEqual(
      expect.arrayContaining(CINCO)
    );
    expect(modelos[0].atividades).toHaveLength(5);
  });

  it("uma vez só não é modelo, é um caso", () => {
    // Uma repetição pode ser coincidência de duas obras parecidas; oferecer
    // modelo a partir de uma ocorrência transformaria qualquer digitação em
    // padrão da empresa.
    expect(modelosDeEtapa([etapa("Fundação", ...CINCO)])).toEqual([]);
    expect(MINIMO_DE_OCORRENCIAS).toBe(2);
  });
});

describe("o que entra no modelo", () => {
  it("atividade que aparece na maioria entra; a excepcional não", () => {
    // Obra com imprevisto ganhou "Reforço de talude" uma vez. Exigir
    // unanimidade descartaria o modelo inteiro por causa dela; aceitar
    // qualquer uma transformaria o modelo na união de tudo que já foi feito.
    const modelos = modelosDeEtapa([
      etapa("Fundação", ...CINCO),
      etapa("Fundação", ...CINCO, "Reforço de talude"),
      etapa("Fundação", ...CINCO)
    ]);
    const titulos = modelos[0].atividades.map(a => a.titulo);
    expect(titulos).toEqual(expect.arrayContaining(CINCO));
    expect(titulos).not.toContain("Reforço de talude");
  });

  it("em duas ocorrências, aparecer numa só já é maioria", () => {
    // `ceil(2/2) = 1`. Com histórico curto, o corte é generoso de propósito:
    // o custo de oferecer a mais é desmarcar uma linha.
    const modelos = modelosDeEtapa([etapa("Alvenaria", "Marcação", "Elevação"), etapa("Alvenaria", "Marcação")]);
    expect(modelos[0].atividades.map(a => a.titulo)).toEqual(["Marcação", "Elevação"]);
  });

  it("a mais frequente vem primeiro", () => {
    const modelos = modelosDeEtapa([
      etapa("Cobertura", "Estrutura", "Telhamento"),
      etapa("Cobertura", "Estrutura", "Telhamento"),
      etapa("Cobertura", "Estrutura")
    ]);
    expect(modelos[0].atividades[0].titulo).toBe("Estrutura");
    expect(modelos[0].atividades[0].ocorrencias).toBe(3);
  });

  it("etapa repetida sem atividade constante não vira modelo", () => {
    // Oferecer "traga as 0 atividades" é ruído.
    const modelos = modelosDeEtapa([etapa("Serviços gerais"), etapa("Serviços gerais")]);
    expect(modelos).toEqual([]);
  });

  it("duas atividades iguais na mesma etapa contam uma vez", () => {
    // Duas "Escavação" na mesma fundação não tornam a atividade mais típica,
    // só mais numerosa — e inflariam a contagem acima do total de ocorrências.
    const modelos = modelosDeEtapa([
      etapa("Fundação", "Escavação", "Escavação", "Forma"),
      etapa("Fundação", "Escavação", "Forma")
    ]);
    expect(modelos[0].atividades.find(a => a.titulo === "Escavação")?.ocorrencias).toBe(2);
  });
});

describe("grafia", () => {
  it("acento e caixa não criam duas etapas", () => {
    const modelos = modelosDeEtapa([etapa("Fundação", "Forma"), etapa("fundacao", "Forma")]);
    expect(modelos).toHaveLength(1);
    expect(modelos[0].vezes).toBe(2);
  });

  it("a grafia exibida é a mais recente, que é a que a empresa usa hoje", () => {
    // A lista chega da mais nova para a mais antiga.
    const modelos = modelosDeEtapa([etapa("Fundação", "Forma"), etapa("FUNDACAO", "Forma")]);
    expect(modelos[0].titulo).toBe("Fundação");
  });

  it("título vazio é ignorado", () => {
    expect(modelosDeEtapa([etapa("   ", "Forma"), etapa("", "Forma")])).toEqual([]);
  });
});

describe("achar o modelo do que está sendo digitado", () => {
  const modelos = modelosDeEtapa([
    etapa("Fundação", ...CINCO),
    etapa("Fundação", ...CINCO),
    etapa("Alvenaria", "Marcação", "Elevação"),
    etapa("Alvenaria", "Marcação", "Elevação")
  ]);

  it("encontra pela grafia normalizada", () => {
    expect(modeloPara(modelos, "fundacao")?.titulo).toBe("Fundação");
    expect(modeloPara(modelos, "  FUNDAÇÃO  ")?.titulo).toBe("Fundação");
  });

  it("nome inédito não tem modelo, e isso não é erro", () => {
    // Sugestão nunca vira obrigação: valor novo continua passando.
    expect(modeloPara(modelos, "Impermeabilização")).toBeNull();
  });

  it("campo vazio não tem modelo", () => {
    expect(modeloPara(modelos, "")).toBeNull();
    expect(modeloPara(modelos, "   ")).toBeNull();
  });

  it("parecido não basta — é o mesmo nome ou nada", () => {
    // Trazer as atividades de "Fundação" para quem digitou "Fundação profunda"
    // seria adivinhar, e o custo do erro é a EAP nascer errada.
    expect(modeloPara(modelos, "Fundação profunda")).toBeNull();
  });
});

describe("ordem dos modelos", () => {
  it("o mais repetido vem primeiro", () => {
    const modelos = modelosDeEtapa([
      etapa("Alvenaria", "Marcação"),
      etapa("Alvenaria", "Marcação"),
      etapa("Alvenaria", "Marcação"),
      etapa("Fundação", "Forma"),
      etapa("Fundação", "Forma")
    ]);
    expect(modelos.map(m => m.titulo)).toEqual(["Alvenaria", "Fundação"]);
  });

  it("histórico vazio não quebra", () => {
    expect(modelosDeEtapa([])).toEqual([]);
  });
});

describe("a ordem do modelo é a sequência do trabalho", () => {
  it("preserva a ordem em que as atividades foram montadas", () => {
    // Medido na tela: a primeira versão ordenava por frequência e caía no
    // desempate alfabético — o modelo saiu "Armação, Escavação, Forma", que é
    // a ordem errada de construir. Escavar vem antes de armar.
    const modelos = modelosDeEtapa([
      etapa("Fundação", "Escavação", "Forma", "Armação"),
      etapa("Fundação", "Escavação", "Forma", "Armação")
    ]);
    expect(modelos[0].atividades.map(a => a.titulo)).toEqual(["Escavação", "Forma", "Armação"]);
  });

  it("com ordens diferentes entre obras, vale a posição média", () => {
    // Uma obra inverteu duas etapas. O modelo não pode herdar a exceção nem
    // desempatar por nome: a média coloca cada uma onde ela costuma estar.
    const modelos = modelosDeEtapa([
      etapa("Cobertura", "Estrutura", "Telhamento", "Calhas"),
      etapa("Cobertura", "Estrutura", "Telhamento", "Calhas"),
      etapa("Cobertura", "Telhamento", "Estrutura", "Calhas")
    ]);
    expect(modelos[0].atividades.map(a => a.titulo)).toEqual(["Estrutura", "Telhamento", "Calhas"]);
  });

  it("a frequência só desempata quando a posição empata", () => {
    const modelos = modelosDeEtapa([
      etapa("Pintura", "Massa", "Selador"),
      etapa("Pintura", "Massa"),
      etapa("Pintura", "Massa", "Selador")
    ]);
    const [primeira] = modelos[0].atividades;
    expect(primeira.titulo).toBe("Massa");
    expect(primeira.posicaoTipica).toBe(0);
  });

  it("repetição interna não desloca a posição das seguintes", () => {
    // "Escavação, Escavação, Forma" — a segunda é ignorada, e Forma continua
    // sendo a segunda posição, não a terceira.
    const modelos = modelosDeEtapa([
      etapa("Fundação", "Escavação", "Escavação", "Forma"),
      etapa("Fundação", "Escavação", "Forma")
    ]);
    expect(modelos[0].atividades.map(a => a.posicaoTipica)).toEqual([0, 1]);
  });
});
