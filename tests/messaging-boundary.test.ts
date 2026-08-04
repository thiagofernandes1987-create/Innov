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
      engineContracts: string[];
      implementedProviders: string[];
      baileysInstalled: boolean;
      uiCapabilityGate: boolean;
      serverCapabilityGate: boolean;
      metaRoutedThroughEngine: boolean;
      organizationProviderFlags: boolean;
    };
    expect(result.ok).toBe(true);
    expect(result.contract).toBe("messaging-engine-boundary-v3");
    expect(result.forbiddenPackages).toContain("@whiskeysockets/baileys");
    expect(result.forbiddenNativeTypes).toContain("WAMessage");
    expect(result.forbiddenNativeTypes).toContain("BinaryNode");
    expect(result.engineContracts).toEqual([
      "MessagingEngine",
      "SessionEngine",
      "EngineEventSource"
    ]);
    expect(result.implementedProviders).toEqual(["META_CLOUD"]);
    expect(result.baileysInstalled).toBe(false);
    expect(result.uiCapabilityGate).toBe(true);
    expect(result.serverCapabilityGate).toBe(true);
    expect(result.metaRoutedThroughEngine).toBe(true);
    expect(result.organizationProviderFlags).toBe(true);
  });
});
