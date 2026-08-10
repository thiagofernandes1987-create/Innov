import { describe, expect, it } from "vitest";
import { lerDeclaracaoDeCub } from "@/lib/orcamentos/cub-manual";

// O que este módulo **não** testa, de propósito: UF válida, tipologia da NBR
// 12721, data-base no primeiro dia do mês, ordem de grandeza do valor e
// reconciliação das parcelas. Essas regras vivem em `registrar_cub_manual`, no
// banco, e é lá que estão provadas — repeti-las aqui criaria duas cópias que
// divergem em silêncio, que é o defeito da T-37.7.
//
// Aqui se testa o que só o formulário sabe: campo vazio, número que não é
// número, e a diferença entre **não informado** e **zero**.

function campos(parcial: Record<string, string> = {}) {
  return {
    uf: "MG",
    tipologia: "R8-N",
    mes: "2026-07",
    desonerado: "false",
    total: "1990.11",
    material: "",
    maoDeObra: "",
    administrativo: "",
    fonte: "Sinduscon-MG",
    endereco: "https://sinduscon-mg.org.br/cub/julho-2026.pdf",
    publicacao: "",
    arquivoSha256: "",
    ...parcial
  };
}

describe("a declaração que sai do formulário", () => {
  it("o mês vira o primeiro dia do mês", () => {
    // `<input type="month">` devolve "2026-07". A data-base do CUB é o dia 1º,
    // e converter aqui evita que a pessoa precise saber disso.
    const leitura = lerDeclaracaoDeCub(campos());
    expect(leitura.ok).toBe(true);
    if (leitura.ok) expect(leitura.declaracao.dataBase).toBe("2026-07-01");
  });

  it("parcela em branco é ausência, não zero", () => {
    // É a VACINA-060 no formulário: gravar 0,00 para "não informado" faria a
    // tela exibir "material: R$ 0,00" como se fosse um fato medido.
    const leitura = lerDeclaracaoDeCub(campos());
    expect(leitura.ok).toBe(true);
    if (leitura.ok) {
      expect(leitura.declaracao.material).toBeNull();
      expect(leitura.declaracao.maoDeObra).toBeNull();
      expect(leitura.declaracao.administrativo).toBeNull();
    }
  });

  it("mas zero digitado é zero, e chega como zero", () => {
    const leitura = lerDeclaracaoDeCub(
      campos({ material: "1990.11", maoDeObra: "0", administrativo: "0" })
    );
    expect(leitura.ok).toBe(true);
    if (leitura.ok) {
      expect(leitura.declaracao.material).toBe(1990.11);
      expect(leitura.declaracao.maoDeObra).toBe(0);
      expect(leitura.declaracao.administrativo).toBe(0);
    }
  });

  it("espaço em volta não conta como preenchimento", () => {
    const leitura = lerDeclaracaoDeCub(campos({ fonte: "   " }));
    expect(leitura.ok).toBe(false);
    if (!leitura.ok) expect(leitura.problema).toMatch(/sindicato/i);
  });

  it("valor que não é número é recusado antes de ir ao banco", () => {
    const leitura = lerDeclaracaoDeCub(campos({ total: "mil e novecentos" }));
    expect(leitura.ok).toBe(false);
    if (!leitura.ok) expect(leitura.problema).toMatch(/valor do CUB/i);
  });

  it("vírgula decimal é recusada com instrução, não convertida no escuro", () => {
    // Converter "1.990,11" seria adivinhar: em pt-BR o ponto é milhar, em
    // en-US é decimal, e o mesmo texto vale 1.990,11 ou 1,99011. Errar aqui
    // muda o orçamento por um fator de mil.
    const leitura = lerDeclaracaoDeCub(campos({ total: "1.990,11" }));
    expect(leitura.ok).toBe(false);
    if (!leitura.ok) expect(leitura.problema).toMatch(/ponto/i);
  });

  it("mês fora do formato é recusado", () => {
    expect(lerDeclaracaoDeCub(campos({ mes: "julho de 2026" })).ok).toBe(false);
    expect(lerDeclaracaoDeCub(campos({ mes: "2026-13" })).ok).toBe(false);
    expect(lerDeclaracaoDeCub(campos({ mes: "" })).ok).toBe(false);
  });

  it("o regime chega como booleano, e o padrão é sem desoneração", () => {
    const semCampo = lerDeclaracaoDeCub(campos({ desonerado: "" }));
    expect(semCampo.ok).toBe(true);
    if (semCampo.ok) expect(semCampo.declaracao.desonerado).toBe(false);

    // A caixa marcada de HTML manda "on", não "true".
    const marcada = lerDeclaracaoDeCub(campos({ desonerado: "on" }));
    expect(marcada.ok).toBe(true);
    if (marcada.ok) expect(marcada.declaracao.desonerado).toBe(true);
  });

  it("campos opcionais vazios viram nulo, e não string vazia", () => {
    const leitura = lerDeclaracaoDeCub(campos());
    expect(leitura.ok).toBe(true);
    if (leitura.ok) {
      expect(leitura.declaracao.publicacao).toBeNull();
      expect(leitura.declaracao.arquivoSha256).toBeNull();
    }
  });

  it("o SHA do arquivo é normalizado para minúsculas", () => {
    const sha = "A".repeat(64);
    const leitura = lerDeclaracaoDeCub(campos({ arquivoSha256: ` ${sha} ` }));
    expect(leitura.ok).toBe(true);
    if (leitura.ok) expect(leitura.declaracao.arquivoSha256).toBe("a".repeat(64));
  });

  it("UF e tipologia sobem em maiúsculas, que é como o banco compara", () => {
    const leitura = lerDeclaracaoDeCub(campos({ uf: " mg ", tipologia: " r8-n " }));
    expect(leitura.ok).toBe(true);
    if (leitura.ok) {
      expect(leitura.declaracao.uf).toBe("MG");
      expect(leitura.declaracao.tipologia).toBe("R8-N");
    }
  });
});
