import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Messaging engine boundary", () => {
  it("proíbe imports e tipos Baileys fora dos adapters autorizados", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/validate-messaging-boundaries.mjs"],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );
    const result = JSON.parse(output) as {
      ok: boolean;
      contract: string;
      forbiddenPackages: string[];
      forbiddenNativeTypes: string[];
    };
    expect(result.ok).toBe(true);
    expect(result.contract).toBe("messaging-engine-boundary-v1");
    expect(result.forbiddenPackages).toContain("@whiskeysockets/baileys");
    expect(result.forbiddenNativeTypes).toContain("WAMessage");
    expect(result.forbiddenNativeTypes).toContain("BinaryNode");
  });
});
