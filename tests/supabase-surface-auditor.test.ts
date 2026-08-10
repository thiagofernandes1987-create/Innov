import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("auditor de superfícies Supabase", () => {
  it("não trata templates de partição dinâmica como tabela estática", () => {
    const output = execFileSync(process.execPath, ["scripts/auditar-superficies-supabase.mjs", "--json"], {
      encoding: "utf8"
    });
    const report = JSON.parse(output) as {
      candidatesWithoutJsConsumer: { tablesOrViews: string[] };
      consumers: { runtime: { tables: Record<string, string[]> } };
    };

    expect(report.candidatesWithoutJsConsumer.tablesOrViews).not.toContain("object_records_p");
    expect(report.consumers.runtime.tables).not.toHaveProperty("object_records_p");
  });
});
