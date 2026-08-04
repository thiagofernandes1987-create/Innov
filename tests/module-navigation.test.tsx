import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/crm/leads"
}));

import { NavegacaoDoModulo } from "../components/casca/navegacao-do-modulo";

describe("NavegacaoDoModulo", () => {
  it("mantém os destinos do módulo disponíveis em tela estreita", () => {
    const html = renderToStaticMarkup(
      <NavegacaoDoModulo
        aplicativos={[
          { chave: "crm", nome: "CRM e Vendas", prefixo: "/app/crm" }
        ]}
      />
    );

    expect(html).toContain('class="barra-menu-movel"');
    expect(html).toContain("<summary");
    expect(html).toContain("Menu de CRM e Vendas");
    expect(html).toContain('href="/app/crm/leads"');
  });

  it("troca o menu inline pelo compacto na largura de notebook", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8"
    );

    expect(css).toMatch(
      /@media \(min-width: 900px\) and \(max-width: 1699px\)[\s\S]*?\.barra-menus\s*\{\s*display:\s*none;\s*\}[\s\S]*?\.barra-menu-movel\s*\{\s*display:\s*block;\s*\}/
    );
  });
});
