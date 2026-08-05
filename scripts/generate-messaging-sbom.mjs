import { createHash } from "node:crypto";
import fs from "node:fs";

const gateway = JSON.parse(fs.readFileSync("apps/messaging-gateway/package.json", "utf8"));
const lockfile = fs.readFileSync("pnpm-lock.yaml", "utf8");
const components = Object.entries(gateway.dependencies ?? {})
  .map(([name, version]) => ({ name, version: String(version), scope: "required", packageManager: "pnpm" }))
  .sort((left, right) => left.name.localeCompare(right.name));
const sbom = {
  bomFormat: "CycloneDX-compatible-minimal",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${createHash("sha256").update(JSON.stringify(components)).digest("hex").slice(0, 32)}`,
  metadata: {
    component: { name: gateway.name, version: gateway.version, type: "application" },
    nodeEngine: gateway.engines?.node ?? null,
    generatedFromLockfileSha256: createHash("sha256").update(lockfile).digest("hex"),
    lifecycleScriptsExecuted: false
  },
  components
};
console.log(JSON.stringify(sbom, null, 2));
