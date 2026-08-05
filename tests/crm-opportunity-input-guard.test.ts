import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(
  new URL("../app/actions/crm-opportunities.ts", import.meta.url),
  "utf8"
);
const pageSource = readFileSync(
  new URL("../app/app/crm/oportunidades/novo/page.tsx", import.meta.url),
  "utf8"
);
const formSource = readFileSync(
  new URL("../components/relationship/opportunity-form.tsx", import.meta.url),
  "utf8"
);

describe("criação segura de oportunidade", () => {
  it("substitui ID livre por listas de cliente e lead", () => {
    expect(formSource).toContain('<select name="clientId"');
    expect(formSource).toContain('<select name="leadId"');
    expect(formSource).not.toContain('<input name="leadId"');
    expect(pageSource).toContain('.from("crm_leads")');
  });

  it("valida UUID, estágio e números antes da RPC", () => {
    expect(actionSource).toContain("UUID_PATTERN");
    expect(actionSource).toContain("validOptionalUuid");
    expect(actionSource).toContain("ALLOWED_STAGES");
    expect(actionSource.indexOf("validOptionalUuid")).toBeLessThan(actionSource.indexOf('rpc("create_crm_opportunity"'));
  });

  it("não redireciona mensagem SQL para a URL", () => {
    expect(actionSource).toContain('reportDataAccessError("create-crm-opportunity.rpc", error)');
    expect(actionSource).not.toContain("error.message");
    expect(pageSource).not.toContain("query.error");
  });
});
