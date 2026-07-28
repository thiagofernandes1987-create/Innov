import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("validador do inventário de execução", () => {
  it("aceita o inventário versionado também quando o checkout usa CRLF", () => {
    const result = spawnSync(process.execPath, ["scripts/validate-inventory.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain("Inventário de execução validado");
  });
});
