import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(
  new URL("../app/actions/flexible-workflows.ts", import.meta.url),
  "utf8"
);
const formSource = readFileSync(
  new URL("../components/propostas/proposal-form.tsx", import.meta.url),
  "utf8"
);
const pageSource = readFileSync(
  new URL("../app/app/propostas/nova/page.tsx", import.meta.url),
  "utf8"
);

describe("upload de PDF da proposta", () => {
  it("envia o arquivo diretamente ao Storage e passa apenas o caminho à ação", () => {
    expect(formSource).toContain("uploadToSignedUrl");
    expect(formSource).toContain('name="uploadedPath"');
    expect(formSource).not.toContain('name="file"');
    expect(formSource).not.toContain('encType="multipart/form-data"');
    expect(actionSource).not.toContain('formData.get("file")');
    expect(actionSource).toContain("createSignedUploadUrl");
  });

  it("confirma tamanho, organização e assinatura PDF no servidor", () => {
    expect(actionSource).toContain("validProposalPath");
    expect(actionSource).toContain("MAX_COMMERCIAL_PDF_SIZE");
    expect(actionSource).toContain('!== "%PDF-"');
    expect(actionSource).toContain('download(storagePath)');
  });

  it("não expõe mensagem do provedor quando a criação falha", () => {
    expect(actionSource).toContain('reportDataAccessError("create-flexible-proposal.rpc", error)');
    expect(actionSource).not.toContain('fail("/app/propostas/nova", error?.message');
  });

  it("oferece somente versões aptas à preparação comercial", () => {
    expect(pageSource).toContain('"APPROVAL_PENDING"');
    expect(pageSource).toContain('"APPROVED"');
    expect(pageSource).not.toContain('"TECHNICAL_REVIEW"');
    expect(pageSource).not.toContain('"FINANCIAL_REVIEW"');
    expect(pageSource).not.toContain('.not("frozen_at", "is", null)');
  });
});
