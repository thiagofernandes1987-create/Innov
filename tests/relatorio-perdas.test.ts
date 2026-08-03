import { describe, expect, it } from "vitest";
import {
  MINIMO_PARA_CLASSIFICAR,
  SEM_MOTIVO,
  classificacaoUtil,
  motivosSemUso,
  pareto,
  totalPerdido
} from "../lib/relatorios/perdas";

const perda = (motivo: string | null, valor: number) => ({ motivo, valor });

describe("Pareto ordena por valor, não por contagem", () => {
  it("uma perda grande vem antes de doze pequenas", () => {
    // É a decisão que separa este relatório de uma contagem: doze perdas de
    // R$ 5 mil somam R$ 60 mil e uma de R$ 400 mil vale quase sete vezes mais.
    // Ordenar por contagem mandaria a empresa resolver o problema errado.
    const linhas = pareto([
      ...Array.from({ length: 12 }, () => perda("Parou de responder", 5_000)),
      perda("Praça errada", 400_000)
    ]);
    expect(linhas[0].motivo).toBe("Praça errada");
    expect(linhas[0].negocios).toBe(1);
    expect(linhas[1].negocios).toBe(12);
  });

  it("a contagem continua visível — frequência alta com valor baixo também diz algo", () => {
    const linhas = pareto([perda("A", 10), perda("A", 10), perda("B", 100)]);
    expect(linhas.find(l => l.motivo === "A")?.negocios).toBe(2);
  });

  it("empate de valor desempata por contagem, e depois por nome", () => {
    const linhas = pareto([perda("Zebra", 100), perda("Alfa", 50), perda("Alfa", 50)]);
    expect(linhas.map(l => l.motivo)).toEqual(["Alfa", "Zebra"]);
  });
});

describe("fatia e acumulado", () => {
  it("as fatias somam 100%", () => {
    const linhas = pareto([perda("A", 60), perda("B", 30), perda("C", 10)]);
    expect(linhas.reduce((s, l) => s + l.fatia, 0)).toBeCloseTo(1, 10);
    expect(linhas[linhas.length - 1].acumulado).toBeCloseTo(1, 10);
  });

  it("o acumulado cresce na ordem das linhas", () => {
    const linhas = pareto([perda("A", 60), perda("B", 30), perda("C", 10)]);
    expect(linhas.map(l => Math.round(l.acumulado * 100))).toEqual([60, 90, 100]);
  });

  it("classe A é o que cabe nos primeiros 80% do valor", () => {
    const linhas = pareto([perda("A", 60), perda("B", 30), perda("C", 10)]);
    expect(linhas.map(l => l.classe)).toEqual(["A", "B", "C"]);
  });

  it("um motivo sozinho é classe A e 100%", () => {
    const linhas = pareto([perda("Único", 1)]);
    expect(linhas[0]).toMatchObject({ fatia: 1, acumulado: 1, classe: "A" });
  });
});

describe("casos que quebrariam a divisão", () => {
  it("nenhuma perda devolve lista vazia", () => {
    expect(pareto([])).toEqual([]);
    expect(totalPerdido([])).toEqual({ negocios: 0, valor: 0 });
  });

  it("perdas com valor zero não produzem NaN", () => {
    // Oportunidade sem valor estimado existe, e a divisão por zero apareceria
    // na tela como "NaN%".
    const linhas = pareto([perda("A", 0), perda("B", 0)]);
    expect(linhas.every(l => Number.isFinite(l.fatia))).toBe(true);
    expect(linhas.every(l => l.fatia === 0)).toBe(true);
  });

  it("valor negativo não subtrai do total", () => {
    const linhas = pareto([perda("A", -500), perda("B", 100)]);
    expect(linhas.find(l => l.motivo === "A")?.valor).toBe(0);
    expect(totalPerdido(linhas).valor).toBe(100);
  });
});

describe("perda sem motivo entra na conta", () => {
  it("aparece como linha própria, não some", () => {
    // Esconder produziria um relatório bonito e falso: os percentuais fechariam
    // em 100% sobre uma base que não é o total perdido.
    const linhas = pareto([perda(null, 300), perda("Praça errada", 100)]);
    expect(linhas[0].motivo).toBe(SEM_MOTIVO);
    expect(linhas[0].fatia).toBeCloseTo(0.75, 10);
  });

  it("motivo em branco e só espaços contam como sem motivo, junto", () => {
    const linhas = pareto([perda(null, 10), perda("", 10), perda("   ", 10)]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].negocios).toBe(3);
  });
});

describe("motivos cadastrados que ninguém escolheu", () => {
  it("são listados para a curadoria", () => {
    // Motivo que ninguém escolhe em doze meses ou não descreve a realidade da
    // empresa, ou está escrito de um jeito que ninguém reconhece. O que não
    // aparece não chama atenção — por isso a lista existe.
    const linhas = pareto([perda("Praça errada", 100)]);
    const cadastrados = [{ rotulo: "Praça errada" }, { rotulo: "Produto errado" }, { rotulo: "Sem verba" }];
    expect(motivosSemUso(cadastrados, linhas)).toEqual(["Produto errado", "Sem verba"]);
  });

  it("com todos em uso, a lista é vazia", () => {
    const linhas = pareto([perda("A", 1), perda("B", 1)]);
    expect(motivosSemUso([{ rotulo: "A" }, { rotulo: "B" }], linhas)).toEqual([]);
  });
});

describe("a regra da tabela canônica, e o caso que ela não tinha", () => {
  it("reproduz a classificação de QUALIDADE-CAUSA-RAIZ §2", () => {
    // Os mesmos oito valores da tabela da diretriz. Se este teste mudar, ou a
    // diretriz mudou junto, ou a implementação divergiu dela.
    const linhas = pareto([
      { motivo: "Medida diferente do projeto", valor: 387_003 },
      { motivo: "Peça faltando ou trocada", valor: 158_552 },
      { motivo: "Chuva ou condição", valor: 52_716 },
      { motivo: "Acesso bloqueado", valor: 49_421 },
      { motivo: "Cliente muda no local", valor: 44_986 },
      { motivo: "Ferragem errada", valor: 43_021 },
      { motivo: "Sem energia / andaime", valor: 39_537 },
      { motivo: "Outra equipe no ambiente", valor: 29_652 }
    ]);
    expect(linhas.map(l => l.classe)).toEqual(["A", "A", "A", "B", "B", "B", "C", "C"]);
    expect(linhas.filter(l => l.classe === "A")).toHaveLength(3);
  });

  it("com um motivo só, ele é A e não C", () => {
    // Pela regra literal da tabela, o acumulado da primeira linha já é 100% e a
    // única causa da empresa sairia rotulada como desprezível.
    expect(pareto([{ motivo: "Praça errada", valor: 500 }])[0].classe).toBe("A");
  });

  it("mesmo dominando 96% do valor, o primeiro é A", () => {
    const linhas = pareto([{ motivo: "Preço", valor: 960 }, { motivo: "Prazo", valor: 40 }]);
    expect(linhas.map(l => l.classe)).toEqual(["A", "C"]);
  });
});

describe("quando a classificação A/B/C ajuda", () => {
  it("com poucos motivos, não é exibida", () => {
    // Medido na tela: com dois motivos, "praça errada" com 44% da perda saía
    // como classe C — o rótulo de desprezível para quase metade do prejuízo.
    // ABC pressupõe cauda longa; sem ela, a ordem por valor é a mensagem toda.
    const dois = pareto([{ motivo: "Preço", valor: 150 }, { motivo: "Praça", valor: 120 }]);
    expect(classificacaoUtil(dois)).toBe(false);
  });

  it("a partir do corte, é exibida", () => {
    const cinco = pareto(
      ["a", "b", "c", "d", "e"].map((m, i) => ({ motivo: m, valor: 100 - i * 10 }))
    );
    expect(cinco).toHaveLength(MINIMO_PARA_CLASSIFICAR);
    expect(classificacaoUtil(cinco)).toBe(true);
  });

  it("lista vazia não classifica", () => {
    expect(classificacaoUtil([])).toBe(false);
  });
});
