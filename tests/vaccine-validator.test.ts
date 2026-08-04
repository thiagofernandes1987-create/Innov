import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("validador de vacinas", () => {
  it("inclui todas as vacinas versionadas no catálogo executável", () => {
    const vaccineCount = readdirSync("diretrizes/vacinas").filter((name) =>
      /^VACINA-\d{3}-.*\.md$/.test(name),
    ).length;
    const result = spawnSync(process.execPath, ["scripts/validate-vaccines.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain(
      `Vacinas validadas: ${vaccineCount} causas-raiz documentadas`,
    );
  });
});
