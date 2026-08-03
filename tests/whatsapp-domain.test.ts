import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isSupportWindowOpen,
  normalizePhone,
  orderedTemplateParameters,
  parseSourceToken,
  parseVariables,
  renderCanonicalText,
  verifyMetaWebhookSignature,
  WhatsAppDomainError
} from "@/lib/whatsapp/domain";

describe("WhatsApp domain", () => {
  it("normaliza telefone sem pontuação", () => {
    expect(normalizePhone("+55 (12) 99999-9999")).toBe("5512999999999");
  });

  it("rejeita telefone inválido", () => {
    expect(() => normalizePhone("123")).toThrow(WhatsAppDomainError);
  });

  it("resolve variáveis da fonte canônica", () => {
    expect(
      renderCanonicalText("Olá, {{ cliente }}. Obra: {{obra}}.", {
        cliente: "Marcos",
        obra: "OB-0026"
      })
    ).toBe("Olá, Marcos. Obra: OB-0026.");
  });

  it("não envia modelo com variável pendente", () => {
    expect(() => renderCanonicalText("Olá, {{cliente}}.", {})).toThrow(
      "Variáveis obrigatórias"
    );
  });

  it("aplica a janela móvel de 24 horas", () => {
    const now = new Date("2026-08-03T18:00:00-03:00");
    expect(isSupportWindowOpen("2026-08-02T18:00:01-03:00", now)).toBe(true);
    expect(isSupportWindowOpen("2026-08-02T17:59:59-03:00", now)).toBe(false);
    expect(isSupportWindowOpen(null, now)).toBe(false);
  });

  it("valida token de origem e campo permitido", () => {
    expect(
      parseSourceToken(
        "PROPOSAL_VERSION|11111111-1111-1111-1111-111111111111|COMMERCIAL_SUMMARY"
      )
    ).toEqual({
      sourceType: "PROPOSAL_VERSION",
      sourceId: "11111111-1111-1111-1111-111111111111",
      sourceField: "COMMERCIAL_SUMMARY"
    });
    expect(() =>
      parseSourceToken(
        "PROJECT_DOCUMENT_VERSION|11111111-1111-1111-1111-111111111111|BODY_TEMPLATE"
      )
    ).toThrow(WhatsAppDomainError);
  });

  it("interpreta e ordena parâmetros do template", () => {
    const variables = parseVariables('{"obra":"OB-1","cliente":"Ana"}');
    expect(orderedTemplateParameters(["cliente", "obra"], variables)).toEqual([
      "Ana",
      "OB-1"
    ]);
  });

  it("verifica a assinatura HMAC do webhook", () => {
    const body = '{"object":"whatsapp_business_account"}';
    const secret = "segredo-de-teste";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyMetaWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyMetaWebhookSignature(body, "sha256=00", secret)).toBe(false);
  });
});
