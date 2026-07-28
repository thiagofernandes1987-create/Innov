import { describe, expect, it } from "vitest";
import { MENUS_DO_MODULO } from "../lib/casca/menus";
import { MODULE_REGISTRY } from "../lib/modules/registry";

const ACTIONS_REQUIRED = {
  planejamento: "/app/planejamento",
  tarefas: "/app/tarefas",
  diario: "/app/diario",
  equipes: "/app/equipes",
  propostas: "/app/propostas/nova",
  contratos: "/app/contratos/novo",
  aditivos: "/app/aditivos/novo",
  assinaturas: "/app/assinaturas/novo",
  documentos: "/app/documentos/novo"
} as const;

describe("descoberta funcional de todos os aplicativos", () => {
  it("impede aplicativo instalável sem navegação interna", () => {
    const appKeys = MODULE_REGISTRY
      .filter(module => module.key !== "dashboard")
      .map(module => module.key);

    expect(Object.keys(MENUS_DO_MODULO)).toEqual(expect.arrayContaining(appKeys));
    for (const key of appKeys) {
      expect(MENUS_DO_MODULO[key]?.length, key).toBeGreaterThan(0);
    }
  });

  it("expõe as ações primárias dos fluxos que antes eram somente leitura", () => {
    for (const [module, href] of Object.entries(ACTIONS_REQUIRED)) {
      expect(
        MENUS_DO_MODULO[module]?.some(item => item.href === href),
        `${module} precisa expor ${href}`
      ).toBe(true);
    }
  });
});
