import { describe, expect, it } from "vitest";
import { encontrarLinkDaSerie } from "@/lib/cost-sources/cub-fonte";

// O recorte é o da página oficial `sindusconsp.com.br/servicos/cub/`, lida em
// 4 de agosto de 2026.
const PAGINA_REAL = `
  <div class="uk-margin-xmedium-top">
    <a href="https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx"
       title="Download da série histórica" class="uk-button uk-button-secondary" target="blank">
      Download da série histórica
    </a>
  </div>
`;

describe("o link da série histórica é descoberto, não fixado", () => {
  it("acha o .xlsx da série na página oficial", () => {
    expect(encontrarLinkDaSerie(PAGINA_REAL)).toBe(
      "https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx"
    );
  });

  it("resolve caminho relativo contra o domínio oficial", () => {
    expect(encontrarLinkDaSerie('<a href="/wp-content/uploads/Cub-Serie-Historica-Ago-26.xlsx">x</a>')).toBe(
      "https://sindusconsp.com.br/wp-content/uploads/Cub-Serie-Historica-Ago-26.xlsx"
    );
  });

  it("acha mesmo sem acento, que é como a página já escreveu", () => {
    expect(
      encontrarLinkDaSerie('<a href="https://sindusconsp.com.br/x/Cub-Série-Histórica-Jul-26.xlsx">x</a>')
    ).toContain(".xlsx");
  });

  it("recusa link para fora do domínio oficial", () => {
    // A página é HTML de terceiro. Seguir o que ela mandar sem conferir é
    // seguir quem editar a página.
    expect(
      encontrarLinkDaSerie('<a href="https://exemplo.invalido/Cub-Serie-Historica.xlsx">x</a>')
    ).toBeNull();
    expect(
      encontrarLinkDaSerie('<a href="http://sindusconsp.com.br/Cub-Serie-Historica.xlsx">x</a>')
    ).toBeNull();
    // Domínio que só **termina** parecido não vale.
    expect(
      encontrarLinkDaSerie('<a href="https://sindusconsp.com.br.invalido/Cub-Serie-Historica.xlsx">x</a>')
    ).toBeNull();
  });

  it("recusa outro arquivo do mesmo domínio", () => {
    expect(encontrarLinkDaSerie('<a href="https://sindusconsp.com.br/x/Convencao-Coletiva.xlsx">x</a>')).toBeNull();
  });

  it("página sem o link devolve nulo em vez de adivinhar endereço", () => {
    // Fixar o endereço do mês passado faria a sincronização "funcionar" para
    // sempre com o arquivo errado.
    expect(encontrarLinkDaSerie("<html><body>sem link</body></html>")).toBeNull();
  });
});
