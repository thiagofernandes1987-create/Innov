import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contrato de contraste dos estados", () => {
  it("compõe avisos e bloqueios apenas com tokens semânticos", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8"
    );

    expect(css).toMatch(
      /\.validation\s*\{[^}]*background:\s*var\(--warning-soft\);[^}]*color:\s*var\(--warning\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.validation\.blocking\s*\{[^}]*background:\s*var\(--danger-soft\);[^}]*color:\s*var\(--danger\);[^}]*\}/
    );
  });
});
