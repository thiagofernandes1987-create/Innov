import fs from "node:fs";
import { describe, expect, it } from "vitest";

const actions = fs.readFileSync("app/actions/objetos.ts", "utf8");
const studio = fs.readFileSync("lib/object-runtime/estudio.ts", "utf8");
const contract = fs.readFileSync("diretrizes/OBJECT-RUNTIME.md", "utf8");

describe("segurança do Estúdio de Objetos", () => {
  it("não devolve mensagens cruas das RPCs para a interface", () => {
    expect(actions).toContain("reportDataAccessError");
    expect(actions).toContain("ERRO_DE_PERSISTENCIA");
    expect(actions).not.toMatch(/\berror\.message\b/);
  });

  it("não grava a mensagem crua do provedor nos logs de leitura", () => {
    expect(studio).toContain("reportDataAccessError");
    expect(studio).not.toContain("console.error");
    expect(studio).not.toMatch(/\berror\.message\b/);
  });

  it("mantém object_record_upsert latente até a leitura keyset existir", () => {
    expect(contract).toMatch(/leitura com paginação keyset/i);
    expect(contract).toMatch(/4\.\s+Leitura com paginação keyset[^\n]*\*\*Falta\.\*\*/i);
    expect(actions).not.toContain('rpc("object_record_upsert"');
  });
});
