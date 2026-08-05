import { describe, expect, it } from "vitest";
import { SIGNATURE_STATUS_BY_EVENT, shouldApplySignatureStatus } from "../lib/signatures/webhook-state";

describe("shouldApplySignatureStatus", () => {
  it("aplica progresso normal do envelope", () => {
    expect(shouldApplySignatureStatus(null, "SENT")).toBe(true);
    expect(shouldApplySignatureStatus("SENT", "VIEWED")).toBe(true);
    expect(shouldApplySignatureStatus("VIEWED", "PARTIALLY_SIGNED")).toBe(true);
    expect(shouldApplySignatureStatus("PARTIALLY_SIGNED", "COMPLETED")).toBe(true);
  });

  it("recusa regressão por evento fora de ordem", () => {
    expect(shouldApplySignatureStatus("COMPLETED", "VIEWED")).toBe(false);
    expect(shouldApplySignatureStatus("PARTIALLY_SIGNED", "SENT")).toBe(false);
    expect(shouldApplySignatureStatus("VIEWED", "SENT")).toBe(false);
  });

  it("recusa reentrega do mesmo estado", () => {
    expect(shouldApplySignatureStatus("COMPLETED", "COMPLETED")).toBe(false);
    expect(shouldApplySignatureStatus("SENT", "SENT")).toBe(false);
  });

  it("congela o envelope depois de um desfecho terminal", () => {
    for (const terminal of ["COMPLETED", "DECLINED", "EXPIRED", "CANCELED"]) {
      expect(shouldApplySignatureStatus(terminal, "SENT")).toBe(false);
      expect(shouldApplySignatureStatus(terminal, "COMPLETED")).toBe(false);
      expect(shouldApplySignatureStatus(terminal, "VIEWED")).toBe(false);
    }
  });

  it("permite sair de um estado de progresso para um desfecho terminal", () => {
    expect(shouldApplySignatureStatus("VIEWED", "DECLINED")).toBe(true);
    expect(shouldApplySignatureStatus("SENT", "EXPIRED")).toBe(true);
    expect(shouldApplySignatureStatus("PARTIALLY_SIGNED", "CANCELED")).toBe(true);
  });

  it("trata ERROR como estado aplicável e não terminal", () => {
    expect(shouldApplySignatureStatus("VIEWED", "ERROR")).toBe(true);
    expect(shouldApplySignatureStatus("ERROR", "COMPLETED")).toBe(true);
  });

  it("mapeia os eventos do provedor para os estados do envelope", () => {
    expect(SIGNATURE_STATUS_BY_EVENT.SIGNED).toBe("PARTIALLY_SIGNED");
    expect(SIGNATURE_STATUS_BY_EVENT.COMPLETED).toBe("COMPLETED");
    expect(SIGNATURE_STATUS_BY_EVENT.DESCONHECIDO).toBeUndefined();
  });
});
