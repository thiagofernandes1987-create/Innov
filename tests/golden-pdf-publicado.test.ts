import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { lerTextoDoPdf } from "@/lib/planilhas/pdf-texto";

// Golden do extrator de PDF contra o **arquivo publicado**, não contra fixture.
//
// Por que este teste existe, com o número que o motivou: o extrator devolvia
// **730 pedaços e 24.924 caracteres** para um arquivo que tem cerca de 1.800 —
// ruído binário de um fluxo de imagem, entregue como se fosse texto da
// publicação. E lia cada fluxo duas vezes, porque `endstream` contém `stream`.
//
// Os dois defeitos passaram por toda a bateria. Passaram porque o teste
// perguntava se o texto **continha** "R8-N", e continha — ao lado de 23.000
// caracteres de lixo. Agulha encontrada, palheiro ignorado.
//
// A diferença aqui é que a asserção constrange o resultado **inteiro**: número
// de fluxos, de pedaços, de caracteres, de códigos distintos e de valores
// monetários. Nenhuma escrita plausível de código satisfaz isso por acaso — só
// o comportamento correto satisfaz. É o que separa portão que me segura de
// portão que eu contorno escrevendo.
//
// ## Por que o binário não é commitado
//
// Fixture binária de 98 KB é coisa que ninguém revisa, e quando o leitor muda
// ninguém sabe dizer se ela ainda representa o publicado. O padrão do
// repositório para isso já existe em `sinapi:layout`: o artefato vem de fora e
// o esperado vem do arquivo versionado. Sem o artefato, o teste **pula com
// motivo**, em vez de passar em silêncio.
//
//   ARTEFATOS_DE_CUSTO=/caminho/da/pasta pnpm test tests/golden-pdf-publicado.test.ts

type Esperado = {
  fluxosLidos: number;
  pedacos: number;
  caracteres: number;
  codigosDistintos: number;
  valoresMonetarios: number;
  ocorrenciasDe_2_548_75: number;
  /** Trecho → quantas vezes aparece. Contagem exata, não presença: "contém"
   *  passa com uma agulha e não olha o palheiro, que foi exatamente como os
   *  dois defeitos do extrator sobreviveram à bateria. */
  ocorrencias: Record<string, number>;
};

type Artefato = {
  nome: string;
  origem: string;
  bytes: number;
  sha256_prefixo: string;
  esperado: Esperado;
};

const golden = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "tests/golden/pdf-sinduscon-mg.json"), "utf8")
) as { artefatos: Artefato[] };

const PASTA = process.env.ARTEFATOS_DE_CUSTO?.trim() ?? "";

const CODIGO = /\b(?:R1|R8|R16|PP-4|CAL-8|CSL-8|CSL-16)-[BNA]\b|\bPIS\b|\bRP1Q\b|\bGI\b/g;
const DINHEIRO = /\d{1,3}(?:\.\d{3})*,\d{2}/g;

describe("golden do extrator de PDF contra o publicado", () => {
  for (const artefato of golden.artefatos) {
    const caminho = PASTA ? path.join(PASTA, artefato.nome) : "";
    const disponivel = Boolean(caminho) && fs.existsSync(caminho);

    it.skipIf(!disponivel)(`${artefato.nome} bate com o golden`, () => {
      const arquivo = fs.readFileSync(caminho);

      // Identidade antes do conteúdo: comparar números contra outro arquivo
      // seria comparar contra outra coisa e chamar de regressão.
      expect(arquivo.length, "tamanho do artefato").toBe(artefato.bytes);
      expect(
        createHash("sha256").update(arquivo).digest("hex").slice(0, 16),
        "SHA-256 do artefato"
      ).toBe(artefato.sha256_prefixo);

      const lido = lerTextoDoPdf(arquivo);
      const codigos = new Set(lido.texto.match(CODIGO) ?? []);
      const valores = lido.texto.match(DINHEIRO) ?? [];

      // Uma asserção só, sobre o objeto inteiro: diferença em qualquer campo
      // reprova, e o relatório mostra os cinco lado a lado.
      expect({
        fluxosLidos: lido.fluxosLidos,
        pedacos: lido.pedacos.length,
        caracteres: lido.texto.length,
        codigosDistintos: codigos.size,
        valoresMonetarios: valores.length,
        ocorrenciasDe_2_548_75: valores.filter(v => v === "2.548,75").length
      }).toEqual({
        fluxosLidos: artefato.esperado.fluxosLidos,
        pedacos: artefato.esperado.pedacos,
        caracteres: artefato.esperado.caracteres,
        codigosDistintos: artefato.esperado.codigosDistintos,
        valoresMonetarios: artefato.esperado.valoresMonetarios,
        ocorrenciasDe_2_548_75: artefato.esperado.ocorrenciasDe_2_548_75
      });

      const contagem: Record<string, number> = {};
      for (const trecho of Object.keys(artefato.esperado.ocorrencias)) {
        contagem[trecho] = lido.texto.split(trecho).length - 1;
      }
      expect(contagem, "ocorrências por trecho").toEqual(artefato.esperado.ocorrencias);
    });
  }

  it("o golden versionado descreve os artefatos que o leitor deve reproduzir", () => {
    // Roda sempre, com ou sem artefato: garante que o arquivo de esperado não
    // seja esvaziado sem alguém perceber, que é como um golden morre.
    // Identidade exata dos dois artefatos, não "parece plausível": esvaziar ou
    // afrouxar o esperado passa a exigir editar esta linha, que é visível na
    // revisão. Golden que se defende sozinho é golden que sobrevive à pressa.
    expect(
      golden.artefatos.map(a => `${a.nome} ${a.bytes} ${a.sha256_prefixo} ${a.esperado.pedacos}`)
    ).toEqual([
      "composicao_cub_julho_26.pdf 97894 e28cbe319f94b72a 218",
      "tabela_cub_julho_2026.pdf 97679 9ae6efe8a662d7db 90"
    ]);
    if (!PASTA) {
      console.log(
        "golden do PDF: artefatos ausentes; defina ARTEFATOS_DE_CUSTO para exercitar " +
        "contra o arquivo publicado. As conferências de forma acima rodaram."
      );
    }
  });
});
