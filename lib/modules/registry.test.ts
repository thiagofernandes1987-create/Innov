import { describe, expect, it } from "vitest";
import { MODULE_REGISTRY, capabilitiesForLevel, moduleForPath } from "./registry";

describe("module registry",()=>{
  it("keeps application keys unique",()=>{
    const keys=MODULE_REGISTRY.map(item=>item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("resolves the most specific application for a route",()=>{
    expect(moduleForPath("/app/orcamentos/123")?.key).toBe("budgets");
    expect(moduleForPath("/app/obras/abc/cronograma")?.key).toBe("works");
    expect(moduleForPath("/app/administracao/perfis")?.key).toBe("administration");
  });

  it("maps simple levels to granular capabilities",()=>{
    expect(capabilitiesForLevel("NONE")).toEqual([]);
    expect(capabilitiesForLevel("READ")).toEqual(["read"]);
    expect(capabilitiesForLevel("READ_WRITE")).toContain("update");
    expect(capabilitiesForLevel("FULL")).toContain("delete");
    expect(capabilitiesForLevel("FULL")).toContain("manage");
  });
});
