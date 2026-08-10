import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A busca da barra superior só aparece nas rotas listadas em
// `TELAS_COM_BUSCA`. Lista escrita à mão envelhece em silêncio: quando o funil
// passou a ser a tela inicial do CRM, a lista continuou com `/app/pipeline` e a
// busca **sumiu da tela mais usada do módulo**, sem erro, sem log e sem teste
// reprovando.
//
// Este teste fecha o laço: toda rota que renderiza a tela de funil precisa
// estar coberta. É a mesma prevenção da VACINA-014 — o que acopla dois lugares
// por texto tem de ser conferido por máquina.

const RAIZ = path.join(__dirname, "..");

function rotasQueRenderizamFunil(): string[] {
  const rotas: string[] = [];
  function varrer(dir: string) {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        varrer(completo);
        continue;
      }
      if (entrada.name !== "page.tsx") continue;
      const conteudo = fs.readFileSync(completo, "utf8");
      if (!conteudo.includes("PaginaDeFunil")) continue;
      const relativo = path.relative(path.join(RAIZ, "app"), path.dirname(completo));
      rotas.push(`/${relativo.split(path.sep).join("/")}`);
    }
  }
  varrer(path.join(RAIZ, "app", "app"));
  return rotas;
}

function telasComBusca(): string[] {
  const fonte = fs.readFileSync(path.join(RAIZ, "components/casca/busca-da-barra.tsx"), "utf8");
  const bloco = /const TELAS_COM_BUSCA = \[([^\]]*)\]/.exec(fonte);
  if (!bloco) throw new Error("TELAS_COM_BUSCA não encontrada — o formato da lista mudou.");
  return [...bloco[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
}

describe("busca da barra cobre as telas de funil", () => {
  it("encontra pelo menos uma rota de funil", () => {
    expect(rotasQueRenderizamFunil().length).toBeGreaterThan(0);
  });

  it("toda rota que renderiza o funil está coberta pela busca", () => {
    const cobertas = telasComBusca();
    const descobertas = rotasQueRenderizamFunil().filter(rota => {
      // Segmento dinâmico vira prefixo: `/app/pipeline/[trilha]` é coberto por
      // `/app/pipeline`.
      const estatico = rota.split("/").filter(p => !p.startsWith("[")).join("/");
      return !cobertas.some(prefixo => estatico.startsWith(prefixo));
    });
    expect(descobertas).toEqual([]);
  });
});
