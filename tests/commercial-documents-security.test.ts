import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync(new URL("../app/actions/commercial-documents.ts", import.meta.url), "utf8");

describe("segurança das actions comerciais", () => {
  it("mantém contrato e aditivo ligados aos RPCs canônicos", () => {
    expect(actions).toContain('export async function createContractFromProposal');
    expect(actions).toContain('rpc("create_contract_from_proposal"');
    expect(actions).toContain('export async function createAmendment');
    expect(actions).toContain('rpc("create_amendment"');
  });

  it("não expõe mensagens técnicas do banco ao usuário", () => {
    expect(actions).toContain("function failDatabase");
    expect(actions).toContain("console.error");
    expect(actions).toContain('"Não foi possível criar o contrato."');
    expect(actions).toContain('"Não foi possível criar o aditivo."');
    expect(actions).not.toContain("error?.message");
    expect(actions).not.toContain("error.message");
  });
});
