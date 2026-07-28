import { describe, expect, it } from "vitest";
import {
  cadeiaMaisLonga,
  calcular,
  ordenar,
  SIGLA_PT,
  TIPOS_DEPENDENCIA,
  type Dependencia,
  type TarefaCronograma
} from "../lib/planejamento/cronograma";
import {
  feriadosNacionais,
  feriadosNaFaixa,
  paraDia,
  paraIso as paraIsoData,
  pascoa,
  regimePorChave,
  REGIME_PADRAO
} from "../lib/planejamento/calendario";

// Cálculo de cronograma testado antes da tela.
//
// É função pura sobre datas, então dá para provar aqui o que só apareceria
// olhando uma barra fora de lugar no Gantt — e barra fora de lugar num
// cronograma de obra é discussão de prazo com cliente.

function tarefa(id: string, duracao: number, inicio: string | null = null): TarefaCronograma {
  return { id, titulo: id, duracaoDias: duracao, inicioPlanejado: inicio, terminoPlanejado: null, progresso: 0 };
}

function dep(predecessorId: string, sucessorId: string, tipo: Dependencia["tipo"], folgaDias = 0): Dependencia {
  return { predecessorId, sucessorId, tipo, folgaDias };
}

const barra = (r: ReturnType<typeof calcular>, id: string) => r.barras.find(b => b.id === id)!;

describe("vocabulário", () => {
  it("mantém os quatro tipos e as siglas que o responsável nomeou", () => {
    expect(TIPOS_DEPENDENCIA).toEqual(["FS", "SS", "FF", "SF"]);
    expect(SIGLA_PT).toEqual({ FS: "TI", SS: "II", FF: "TT", SF: "IT" });
  });
});

describe("Término-Início (TI)", () => {
  it("a sucessora começa no dia seguinte ao término da anterior", () => {
    const r = calcular(
      [tarefa("medicao", 2, "2026-08-03"), tarefa("executivo", 3)],
      [dep("medicao", "executivo", "FS")]
    );
    expect(barra(r, "medicao")).toMatchObject({ inicio: "2026-08-03", termino: "2026-08-04" });
    // Não dividem o mesmo dia: 04 termina a medição, 05 começa o executivo.
    expect(barra(r, "executivo")).toMatchObject({ inicio: "2026-08-05", termino: "2026-08-07" });
  });

  it("folga positiva empurra e negativa antecipa", () => {
    const base = [tarefa("a", 2, "2026-08-03"), tarefa("b", 1)];
    expect(barra(calcular(base, [dep("a", "b", "FS", 2)]), "b").inicio).toBe("2026-08-07");
    expect(barra(calcular(base, [dep("a", "b", "FS", -1)]), "b").inicio).toBe("2026-08-04");
  });
});

describe("Início-Início (II)", () => {
  it("começam no mesmo dia, e a folga desloca o começo da segunda", () => {
    const base = [tarefa("a", 5, "2026-08-03"), tarefa("b", 2)];
    expect(barra(calcular(base, [dep("a", "b", "SS")]), "b").inicio).toBe("2026-08-03");
    expect(barra(calcular(base, [dep("a", "b", "SS", 3)]), "b").inicio).toBe("2026-08-06");
  });
});

describe("Término-Término (TT)", () => {
  it("terminam juntas, e o início recua pela duração", () => {
    const r = calcular(
      [tarefa("a", 5, "2026-08-03"), tarefa("b", 2)],
      [dep("a", "b", "FF")]
    );
    expect(barra(r, "a").termino).toBe("2026-08-07");
    expect(barra(r, "b")).toMatchObject({ inicio: "2026-08-06", termino: "2026-08-07" });
  });
});

describe("Início-Término (IT)", () => {
  it("a sucessora só termina quando a outra começa", () => {
    const r = calcular(
      [tarefa("provisoria", 10, "2026-08-10"), tarefa("definitiva", 3)],
      [dep("provisoria", "definitiva", "SF")]
    );
    expect(barra(r, "definitiva").termino).toBe("2026-08-10");
  });
});

describe("data fixada pelo planejador", () => {
  it("vence o cálculo quando é mais tarde", () => {
    // Quem marcou "não antes de 20" tinha um motivo que o grafo não conhece.
    const r = calcular(
      [tarefa("a", 2, "2026-08-03"), tarefa("b", 1, "2026-08-20")],
      [dep("a", "b", "FS")]
    );
    expect(barra(r, "b").inicio).toBe("2026-08-20");
  });

  it("não puxa a tarefa para antes do que a dependência permite", () => {
    const r = calcular(
      [tarefa("a", 5, "2026-08-03"), tarefa("b", 1, "2026-08-01")],
      [dep("a", "b", "FS")]
    );
    // "a" ocupa seg 03 a sex 07 — cinco dias ÚTEIS. O dia seguinte é sábado,
    // então "b" só pode começar na segunda 10.
    expect(barra(r, "a").termino).toBe("2026-08-07");
    expect(barra(r, "b").inicio).toBe("2026-08-10");
  });
});

describe("propagação em cadeia", () => {
  it("atrasar a primeira empurra todas as seguintes", () => {
    const tarefas = (inicio: string) => [tarefa("m", 2, inicio), tarefa("p", 3), tarefa("f", 5)];
    const deps = [dep("m", "p", "FS"), dep("p", "f", "FS")];

    const antes = calcular(tarefas("2026-08-03"), deps);
    const depois = calcular(tarefas("2026-08-06"), deps);

    // Contado em dias úteis: m 03-04, p 05-07, f 10-14 (seg a sex).
    expect(barra(antes, "f").termino).toBe("2026-08-14");
    // Começando na quinta 06, tudo escorrega uma semana de trabalho.
    expect(barra(depois, "f").termino).toBe("2026-08-19");
  });
});

describe("ciclo", () => {
  it("é detectado em vez de travar em laço", () => {
    const r = calcular(
      [tarefa("a", 1, "2026-08-03"), tarefa("b", 1), tarefa("c", 1)],
      [dep("a", "b", "FS"), dep("b", "c", "FS"), dep("c", "a", "FS")]
    );
    expect(r.ciclo).toBe(true);
    expect(r.barras).toEqual([]);
  });

  it("`ordenar` devolve nulo no ciclo e a ordem completa fora dele", () => {
    const tarefas = [tarefa("a", 1), tarefa("b", 1)];
    expect(ordenar(tarefas, [dep("a", "b", "FS"), dep("b", "a", "FS")])).toBeNull();
    expect(ordenar(tarefas, [dep("a", "b", "FS")])?.map(t => t.id)).toEqual(["a", "b"]);
  });
});

describe("cadeia mais longa", () => {
  it("segue o ramo que empurra a entrega, não o mais curto", () => {
    const r = calcular(
      [tarefa("inicio", 1, "2026-08-03"), tarefa("curto", 1), tarefa("longo", 10), tarefa("fim", 1)],
      [
        dep("inicio", "curto", "FS"),
        dep("inicio", "longo", "FS"),
        dep("curto", "fim", "FS"),
        dep("longo", "fim", "FS")
      ]
    );
    const cadeia = cadeiaMaisLonga(r.barras, [
      dep("inicio", "curto", "FS"),
      dep("inicio", "longo", "FS"),
      dep("curto", "fim", "FS"),
      dep("longo", "fim", "FS")
    ]);
    expect([...cadeia].sort()).toEqual(["fim", "inicio", "longo"]);
    expect(cadeia.has("curto")).toBe(false);
  });
});

describe("bordas", () => {
  it("tarefa de um dia começa e termina no mesmo dia", () => {
    const r = calcular([tarefa("a", 1, "2026-08-03")], []);
    expect(barra(r, "a")).toMatchObject({ inicio: "2026-08-03", termino: "2026-08-03", duracaoDias: 1 });
  });

  it("duração zero não produz término antes do início", () => {
    const r = calcular([tarefa("marco", 0, "2026-08-03")], []);
    expect(barra(r, "marco").termino).toBe("2026-08-03");
  });

  it("atravessa a virada de mês, e um início no domingo escorrega para segunda", () => {
    const r = calcular(
      [tarefa("a", 3, "2026-08-30"), tarefa("b", 2)],
      [dep("a", "b", "FS")]
    );
    // 30/08/2026 é domingo: a tarefa começa na segunda 31.
    expect(barra(r, "a")).toMatchObject({ inicio: "2026-08-31", termino: "2026-09-02" });
    expect(barra(r, "b")).toMatchObject({ inicio: "2026-09-03", termino: "2026-09-04" });
  });

  it("atravessa a virada de ano respeitando o feriado de 1º de janeiro", () => {
    const r = calcular(
      [tarefa("a", 2, "2026-12-31"), tarefa("b", 1)],
      [dep("a", "b", "FS")]
    );
    // 31/12 é quinta e conta; 01/01 é feriado; o segundo dia útil cai na
    // segunda 04. Sem calendário, o término seria 01/01 — um dia em que
    // ninguém trabalha.
    expect(barra(r, "a").termino).toBe("2027-01-04");
    expect(barra(r, "b").inicio).toBe("2027-01-05");
  });

  it("sem dependência nenhuma, cada tarefa fica onde foi marcada", () => {
    const r = calcular([tarefa("a", 2, "2026-08-03"), tarefa("b", 2, "2026-09-10")], []);
    expect(barra(r, "a").inicio).toBe("2026-08-03");
    expect(barra(r, "b").inicio).toBe("2026-09-10");
    expect(barra(r, "a").derivada).toBe(false);
  });
});


// ── Calendário de trabalho ─────────────────────────────────────────────────

describe("regime de trabalho e feriados", () => {
  it("reproduz o exemplo do responsável: 20 dias úteis com um feriado no meio", () => {
    // "uma atividade leva 20 dias úteis, a equipe só trabalha de seg a sex, e
    // tem um feriado no meio da execução."
    const cal = {
      regime: REGIME_PADRAO,
      feriados: new Set([paraDia("2026-08-19")])
    };
    const r = calcular([tarefa("brocas", 20, "2026-08-03")], [], cal);
    const b = barra(r, "brocas");

    expect(b.inicio).toBe("2026-08-03");
    expect(b.termino).toBe("2026-08-31");
    expect(b.diasUteis).toBe(20);
    expect(b.diasParados).toBe(9);      // 8 de fim de semana + 1 feriado
    expect(b.duracaoDias).toBe(29);     // 20 + 8 + 1
  });

  it("o feriado empurra o término em um dia de calendário", () => {
    const semFeriado = { regime: REGIME_PADRAO, feriados: new Set<number>() };
    const comFeriado = { regime: REGIME_PADRAO, feriados: new Set([paraDia("2026-08-19")]) };
    const t = [tarefa("brocas", 20, "2026-08-03")];

    expect(barra(calcular(t, [], semFeriado), "brocas").termino).toBe("2026-08-28");
    expect(barra(calcular(t, [], comFeriado), "brocas").termino).toBe("2026-08-31");
  });

  it("regime de segunda a sábado encurta o prazo em dias corridos", () => {
    const segSex = { regime: regimePorChave("seg_sex"), feriados: new Set<number>() };
    const segSab = { regime: regimePorChave("seg_sab"), feriados: new Set<number>() };
    const t = [tarefa("alvenaria", 12, "2026-08-03")];

    // 12 dias úteis: seg–sex termina sáb 18/08 (16 corridos); seg–sáb termina
    // no sábado 15/08 (13 corridos). Trabalhar aos sábados devolve 3 dias de
    // calendário — que é o argumento de quem propõe o regime.
    expect(barra(calcular(t, [], segSex), "alvenaria")).toMatchObject({ termino: "2026-08-18", duracaoDias: 16 });
    expect(barra(calcular(t, [], segSab), "alvenaria")).toMatchObject({ termino: "2026-08-15", duracaoDias: 13 });
  });

  it("a folga da dependência também é contada em dias úteis", () => {
    const cal = { regime: REGIME_PADRAO, feriados: new Set<number>() };
    const r = calcular(
      [tarefa("a", 5, "2026-08-03"), tarefa("b", 1)],
      [dep("a", "b", "FS", 2)],
      cal
    );
    // "a" termina sexta 07. Mais 1 dia útil = seg 10, mais 2 de folga = qua 12.
    expect(barra(r, "b").inicio).toBe("2026-08-12");
  });
});

describe("feriados nacionais", () => {
  it("calcula a Páscoa em vez de manter tabela por ano", () => {
    expect(paraIsoData(pascoa(2026))).toBe("2026-04-05");
    expect(paraIsoData(pascoa(2027))).toBe("2027-03-28");
    expect(paraIsoData(pascoa(2030))).toBe("2030-04-21");
  });

  it("deriva os móveis da Páscoa, e traz os fixos", () => {
    const lista = feriadosNacionais(2026);
    const porNome = new Map(lista.map(f => [f.nome, f.data]));

    expect(porNome.get("Sexta-feira Santa")).toBe("2026-04-03");
    expect(porNome.get("Carnaval (terça)")).toBe("2026-02-17");
    expect(porNome.get("Corpus Christi")).toBe("2026-06-04");
    expect(porNome.get("Natal")).toBe("2026-12-25");
    expect(porNome.get("Tiradentes")).toBe("2026-04-21");
    expect(lista).toHaveLength(13);
  });

  it("cobre a faixa inteira, ano a ano", () => {
    const feriados = feriadosNaFaixa("2026-12-01", "2027-02-28");
    expect(feriados.has(paraDia("2026-12-25"))).toBe(true);
    expect(feriados.has(paraDia("2027-01-01"))).toBe(true);
    expect(feriados.has(paraDia("2027-02-09"))).toBe(true); // Carnaval de 2027
  });
});
