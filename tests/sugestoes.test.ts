import { describe, expect, it } from "vitest";
import {
  LIMITE_DE_SUGESTOES,
  chaveNormalizada,
  comPadroes,
  mesmoValor,
  ordenarSugestoes,
  pontuacao,
  situacaoDoValor,
  type ValorDoCatalogo
} from "../lib/sugestoes/catalogo";
import { ESCOPOS_DESCRITOS, descreverEscopo } from "../lib/sugestoes/escopos";

const AGORA = new Date("2026-08-03T12:00:00Z");
const diasAtras = (n: number) => new Date(AGORA.getTime() - n * 86_400_000).toISOString();

const valor = (rotulo: string, usos: number, dias: number): ValorDoCatalogo => ({
  rotulo,
  chave: chaveNormalizada(rotulo),
  usos,
  ultimoUso: diasAtras(dias)
});

describe("chave normalizada — o que faz três grafias serem um valor só", () => {
  it("acento, caixa e espaço não criam entradas diferentes", () => {
    // É o defeito que a diretriz nomeia: "é onde nasce Fundação, fundacao e
    // Fundação com espaço no fim".
    const grafias = ["Fundação", "fundacao", "  Fundação  ", "FUNDAÇÃO", "Fundação"];
    const chaves = new Set(grafias.map(chaveNormalizada));
    expect(chaves.size).toBe(1);
  });

  it("espaço repetido no meio também colapsa", () => {
    expect(chaveNormalizada("Ar   condicionado")).toBe(chaveNormalizada("Ar condicionado"));
  });

  it("valores realmente diferentes continuam diferentes", () => {
    expect(chaveNormalizada("Alvenaria")).not.toBe(chaveNormalizada("Alvenaria estrutural"));
    expect(chaveNormalizada("m²")).not.toBe(chaveNormalizada("m³"));
  });

  it("`mesmoValor` responde a pergunta que a tela faz", () => {
    expect(mesmoValor("Fundação", "fundacao")).toBe(true);
    expect(mesmoValor("Fundação", "Fundações")).toBe(false);
  });

  it("cadeia vazia não vira chave — campo em branco não entra no catálogo", () => {
    expect(chaveNormalizada("   ")).toBe("");
    expect(chaveNormalizada("")).toBe("");
  });
});

describe("frequência recente", () => {
  it("o que se usa hoje vence o que se usava muito no ano passado", () => {
    // Contagem pura ordenaria ao contrário, e a lista ficaria congelada no
    // vocabulário de um ano atrás.
    const antigo = valor("Alvenaria comum", 40, 400);
    const novo = valor("Alvenaria estrutural", 6, 3);
    expect(pontuacao(novo, AGORA)).toBeGreaterThan(pontuacao(antigo, AGORA));
  });

  it("com a mesma idade, quem foi mais usado vem antes", () => {
    expect(pontuacao(valor("A", 10, 30), AGORA)).toBeGreaterThan(pontuacao(valor("B", 3, 30), AGORA));
  });

  it("com o mesmo uso, o mais recente vem antes", () => {
    expect(pontuacao(valor("A", 5, 2), AGORA)).toBeGreaterThan(pontuacao(valor("B", 5, 200), AGORA));
  });

  it("sem data de último uso, a pontuação não estoura — vale a contagem", () => {
    const semData: ValorDoCatalogo = { rotulo: "X", chave: "x", usos: 4, ultimoUso: null };
    expect(Number.isFinite(pontuacao(semData, AGORA))).toBe(true);
  });
});

describe("o que entra na lista", () => {
  it("corta em oito — sugestão com trezentos valores é ruído", () => {
    const muitos = Array.from({ length: 40 }, (_, i) => valor(`Etapa ${i}`, 40 - i, 1));
    expect(ordenarSugestoes(muitos, { agora: AGORA })).toHaveLength(LIMITE_DE_SUGESTOES);
  });

  it("valor usado UMA vez só, há mais de 6 meses, sai da lista", () => {
    // Erro de digitação antigo não vira sugestão para sempre.
    const lista = ordenarSugestoes(
      [valor("Fundacao", 1, 200), valor("Fundação", 12, 10)],
      { agora: AGORA }
    );
    expect(lista.map(v => v.rotulo)).toEqual(["Fundação"]);
  });

  it("usado uma vez, mas recentemente, continua — pode ser vocabulário novo", () => {
    const lista = ordenarSugestoes([valor("Fachada ventilada", 1, 5)], { agora: AGORA });
    expect(lista.map(v => v.rotulo)).toEqual(["Fachada ventilada"]);
  });

  it("usado várias vezes há muito tempo continua: é vocabulário sazonal, não erro", () => {
    const lista = ordenarSugestoes([valor("Impermeabilização", 9, 300)], { agora: AGORA });
    expect(lista).toHaveLength(1);
  });

  it("digitar filtra, sem exigir o começo da palavra", () => {
    const catalogo = [valor("Alvenaria", 5, 1), valor("Alvenaria estrutural", 5, 1), valor("Fundação", 5, 1)];
    expect(ordenarSugestoes(catalogo, { agora: AGORA, filtro: "estrut" }).map(v => v.rotulo))
      .toEqual(["Alvenaria estrutural"]);
  });

  it("o filtro ignora acento e caixa, como a digitação real", () => {
    // Trecho, e não o valor inteiro: digitar "FUNDACAO" por completo cai na
    // regra de baixo, que não sugere de volta o que já está escrito.
    const catalogo = [valor("Fundação", 5, 1)];
    expect(ordenarSugestoes(catalogo, { agora: AGORA, filtro: "FUNDA" })).toHaveLength(1);
    expect(ordenarSugestoes(catalogo, { agora: AGORA, filtro: "ÇÃO" })).toHaveLength(1);
  });

  it("o que já está escrito por extenso não é sugerido de volta", () => {
    // Sugerir exatamente o que está no campo ocupa uma linha para nada.
    const catalogo = [valor("Fundação", 5, 1), valor("Fundação profunda", 5, 1)];
    expect(ordenarSugestoes(catalogo, { agora: AGORA, filtro: "Fundação" }).map(v => v.rotulo))
      .toEqual(["Fundação profunda"]);
  });

  it("filtro sem correspondência devolve lista vazia, não o catálogo inteiro", () => {
    const catalogo = [valor("Alvenaria", 5, 1)];
    expect(ordenarSugestoes(catalogo, { agora: AGORA, filtro: "zzz" })).toEqual([]);
  });

  it("catálogo vazio não quebra", () => {
    expect(ordenarSugestoes([], { agora: AGORA })).toEqual([]);
  });
});

describe("situação de um valor — o que a administração precisa distinguir", () => {
  it("valor sugerido e valor já oculto por desuso são grupos diferentes", () => {
    // Sem essa separação, a tela pediria ao administrador que removesse à mão
    // o que o próprio corte já esconde.
    expect(situacaoDoValor(valor("Fundação", 12, 10), AGORA)).toBe("sugerido");
    expect(situacaoDoValor(valor("Fundacao", 1, 200), AGORA)).toBe("oculto_por_desuso");
  });

  it("a situação concorda com o que a lista de sugestão realmente mostra", () => {
    // Duas regras que divergem seriam pior que uma só: a tela diria "sugerido"
    // sobre um valor que a lista não oferece.
    const catalogo = [
      valor("Fundação", 12, 10),
      valor("Fundacao", 1, 200),
      valor("Fachada ventilada", 1, 5),
      valor("Impermeabilização", 9, 300)
    ];
    const oferecidos = new Set(ordenarSugestoes(catalogo, { agora: AGORA }).map(v => v.rotulo));
    for (const v of catalogo) {
      expect(situacaoDoValor(v, AGORA) === "sugerido").toBe(oferecidos.has(v.rotulo));
    }
  });
});

describe("descrição de escopo", () => {
  it("todo escopo em uso tem nome próprio, não a chave técnica", () => {
    for (const escopo of ESCOPOS_DESCRITOS) {
      expect(escopo.nome).not.toBe(escopo.chave);
      expect(escopo.origem.length).toBeGreaterThan(10);
    }
  });

  it("escopo desconhecido não some da tela — vem descrito como tal", () => {
    // Escopo gravado por versão anterior do código continua no banco. Devolver
    // `undefined` esconderia valores que existem, e vocabulário invisível é o
    // que o administrador não consegue limpar.
    const orfao = descreverEscopo("legado.qualquer");
    expect(orfao.chave).toBe("legado.qualquer");
    expect(orfao.emUso).toBe(false);
    expect(orfao.origem).toMatch(/versão anterior/);
  });

  it("nenhuma chave de escopo se repete", () => {
    const chaves = ESCOPOS_DESCRITOS.map(e => e.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe("sugestão padrão da plataforma — o dia zero", () => {
  it("empresa sem vocabulário nenhum ainda recebe sugestão", () => {
    // Campo sem sugestão alguma é pior que a lista fechada que ele substituiu.
    const lista = ordenarSugestoes(comPadroes([], ["Arquitetura", "Estrutural"]), { agora: AGORA });
    expect(lista.map(v => v.rotulo)).toEqual(["Arquitetura", "Estrutural"]);
  });

  it("o que a empresa usa vem antes do padrão", () => {
    // Padrão é ponto de partida, não preferência.
    const lista = ordenarSugestoes(
      comPadroes([valor("Impermeabilização", 9, 3)], ["Arquitetura"]),
      { agora: AGORA }
    );
    expect(lista[0].rotulo).toBe("Impermeabilização");
  });

  it("padrão que a empresa já usou não aparece duas vezes", () => {
    const lista = comPadroes([valor("Arquitetura", 4, 10)], ["Arquitetura", "arquitetura", "ARQUITETURA"]);
    expect(lista.filter(v => chaveNormalizada(v.rotulo) === "arquitetura")).toHaveLength(1);
    expect(lista[0].usos).toBe(4);
  });

  it("padrão nunca é descartado como engano antigo", () => {
    // Ele não tem histórico para envelhecer: `usos: 0` e sem data de uso
    // cairiam no corte de engano se a regra não o isentasse.
    const padrao = comPadroes([], ["Paisagismo"])[0];
    expect(situacaoDoValor(padrao, AGORA)).toBe("sugerido");
    expect(ordenarSugestoes([padrao], { agora: AGORA })).toHaveLength(1);
  });

  it("padrão também obedece ao filtro do que foi digitado", () => {
    const catalogo = comPadroes([], ["Arquitetura", "Estrutural", "Elétrica"]);
    expect(ordenarSugestoes(catalogo, { agora: AGORA, filtro: "estrut" }).map(v => v.rotulo))
      .toEqual(["Estrutural"]);
  });

  it("lista de padrões vazia não muda nada", () => {
    const catalogo = [valor("Alvenaria", 5, 1)];
    expect(comPadroes(catalogo, [])).toEqual(catalogo);
  });
});

describe("chave gravada que divergiu do rótulo", () => {
  it("não faz o mesmo valor aparecer duas vezes", () => {
    // Linha com `normalized` desalinhado do `label` — importação, correção
    // manual ou versão anterior da normalização. Comparar só pela chave
    // gravada deixava passar o duplicado: "m²" do uso e "m²" do padrão.
    const gravadoTorto: ValorDoCatalogo = { rotulo: "m²", chave: "m2", usos: 31, ultimoUso: diasAtras(3) };
    const lista = ordenarSugestoes(comPadroes([gravadoTorto], ["m²", "m³"]), { agora: AGORA });
    expect(lista.filter(v => v.rotulo === "m²")).toHaveLength(1);
    expect(lista.find(v => v.rotulo === "m²")?.usos).toBe(31);
  });
});
