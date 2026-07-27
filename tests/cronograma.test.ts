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
    expect(barra(r, "b").inicio).toBe("2026-08-08");
  });
});

describe("propagação em cadeia", () => {
  it("atrasar a primeira empurra todas as seguintes", () => {
    const tarefas = (inicio: string) => [tarefa("m", 2, inicio), tarefa("p", 3), tarefa("f", 5)];
    const deps = [dep("m", "p", "FS"), dep("p", "f", "FS")];

    const antes = calcular(tarefas("2026-08-03"), deps);
    const depois = calcular(tarefas("2026-08-06"), deps);

    expect(barra(antes, "f").termino).toBe("2026-08-12");
    expect(barra(depois, "f").termino).toBe("2026-08-15");
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

  it("atravessa a virada de mês sem perder um dia", () => {
    const r = calcular(
      [tarefa("a", 3, "2026-08-30"), tarefa("b", 2)],
      [dep("a", "b", "FS")]
    );
    expect(barra(r, "a").termino).toBe("2026-09-01");
    expect(barra(r, "b")).toMatchObject({ inicio: "2026-09-02", termino: "2026-09-03" });
  });

  it("atravessa a virada de ano", () => {
    const r = calcular(
      [tarefa("a", 2, "2026-12-31"), tarefa("b", 1)],
      [dep("a", "b", "FS")]
    );
    expect(barra(r, "a").termino).toBe("2027-01-01");
    expect(barra(r, "b").inicio).toBe("2027-01-02");
  });

  it("sem dependência nenhuma, cada tarefa fica onde foi marcada", () => {
    const r = calcular([tarefa("a", 2, "2026-08-03"), tarefa("b", 2, "2026-09-10")], []);
    expect(barra(r, "a").inicio).toBe("2026-08-03");
    expect(barra(r, "b").inicio).toBe("2026-09-10");
    expect(barra(r, "a").derivada).toBe(false);
  });
});
