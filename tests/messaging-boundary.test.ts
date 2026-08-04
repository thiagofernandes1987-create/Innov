import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Messaging engine boundary", () => {
  it("confina Baileys e implementa store cifrado sem registrar runtime", () => {
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
      scannedRoots: string[];
      requiredFiles: number;
      allowedEngineDirectories: string[];
      nativeTypesConfined: boolean;
      baileysPackage: string;
      baileysVersion: string;
      installedOnlyInGateway: boolean;
      adapterImplemented: boolean;
      encryptedSessionStoreImplemented: boolean;
      sessionPersistence: boolean;
      runtimeRegistered: boolean;
      externalSocketBlockedByDefault: boolean;
      qrValueDiscarded: boolean;
      sessionLeaseImplemented: boolean;
      realSessionMaterialPresent: boolean;
      realNumberUsed: boolean;
      productionEnabled: boolean;
      implementedProviders: string[];
    };
    expect(result.ok).toBe(true);
    expect(result.contract).toBe("messaging-engine-boundary-v5");
    expect(result.scannedRoots).toEqual(expect.arrayContaining(["app", "components", "lib", "apps"]));
    expect(result.requiredFiles).toBeGreaterThanOrEqual(27);
    expect(result.allowedEngineDirectories).toContain(
      "apps/messaging-gateway/src/engines/baileys/"
    );
    expect(result.nativeTypesConfined).toBe(true);
    expect(result.baileysPackage).toBe("@whiskeysockets/baileys");
    expect(result.baileysVersion).toBe("7.0.0-rc13");
    expect(result.installedOnlyInGateway).toBe(true);
    expect(result.adapterImplemented).toBe(true);
    expect(result.encryptedSessionStoreImplemented).toBe(true);
    expect(result.sessionPersistence).toBe(true);
    expect(result.runtimeRegistered).toBe(false);
    expect(result.externalSocketBlockedByDefault).toBe(true);
    expect(result.qrValueDiscarded).toBe(true);
    expect(result.sessionLeaseImplemented).toBe(false);
    expect(result.realSessionMaterialPresent).toBe(false);
    expect(result.realNumberUsed).toBe(false);
    expect(result.productionEnabled).toBe(false);
    expect(result.implementedProviders).toEqual(["META_CLOUD"]);
  });
});
