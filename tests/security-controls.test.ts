import { afterEach, describe, expect, it, vi } from "vitest";
import { safeInternalReturnPath } from "../lib/organization-context";
import { mapPublicOperationError } from "../lib/public-errors";

describe("safeInternalReturnPath", () => {
  it("preserva caminho interno com query e fragmento", () => {
    expect(safeInternalReturnPath("/app/obras?status=ativa#topo")).toBe("/app/obras?status=ativa#topo");
  });

  it("recusa URL absoluta de outro host", () => {
    expect(safeInternalReturnPath("https://exemplo.invalid/phish")).toBe("/app");
  });

  it("recusa caminho protocolo-relativo", () => {
    expect(safeInternalReturnPath("//exemplo.invalid/phish")).toBe("/app");
  });

  it("recusa contrabarra usada para escapar do host", () => {
    expect(safeInternalReturnPath("/\\exemplo.invalid")).toBe("/app");
    expect(safeInternalReturnPath("/%5Cexemplo.invalid")).toBe("/app");
  });

  it("recusa caminho protocolo-relativo codificado", () => {
    expect(safeInternalReturnPath("/%2F%2Fexemplo.invalid")).toBe("/app");
  });

  it("recusa caracteres de controle", () => {
    expect(safeInternalReturnPath("/app\nSet-Cookie: a=b")).toBe("/app");
    expect(safeInternalReturnPath("/app%0d%0aSet-Cookie:%20a=b")).toBe("/app");
  });

  it("recusa codificação percentual inválida", () => {
    expect(safeInternalReturnPath("/app/%E0%A4%A")).toBe("/app");
  });

  it("usa o fallback informado quando o valor é ausente", () => {
    expect(safeInternalReturnPath(null, "/cliente")).toBe("/cliente");
    expect(safeInternalReturnPath(undefined)).toBe("/app");
    expect(safeInternalReturnPath("")).toBe("/app");
  });
});

describe("mapPublicOperationError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não expõe a mensagem interna e devolve identificador de correlação", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = mapPublicOperationError(
      { code: "42501", message: "permission denied for table finance_entries" },
      "REPORT_GENERATION_FAILED",
      "Não foi possível gerar o relatório.",
      "get_report_dashboard"
    );
    expect(result).toEqual({
      code: "REPORT_GENERATION_FAILED",
      message: "Não foi possível gerar o relatório.",
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/)
    });
    expect(JSON.stringify(result)).not.toContain("finance_entries");
  });

  it("registra o código interno apenas no log estruturado", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = mapPublicOperationError(new Error("falha de rede"), "REPORT_AUDIT_FAILED", "Falha.", "record_report_export");
    const entry = JSON.parse(String(logged.mock.calls[0][0]));
    expect(entry).toMatchObject({
      event: "operation.failed",
      operation: "record_report_export",
      correlationId: result.correlationId,
      errorCode: "UNKNOWN"
    });
  });

  it("gera identificadores distintos por ocorrência", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const first = mapPublicOperationError(null, "X", "m", "op");
    const second = mapPublicOperationError(null, "X", "m", "op");
    expect(first.correlationId).not.toBe(second.correlationId);
  });
});
