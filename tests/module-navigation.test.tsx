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
});
