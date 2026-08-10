import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeInternalReturnPath } from "../lib/organization-context";
import { mapPublicOperationError } from "../lib/public-errors";

const SAFE_LOCAL_MESSAGE_VARIABLES = new Set(["validationError", "responseFailure"]);

function suspiciousMessageAccesses(source: string) {
  return [...source.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\??\.message\b/g)]
    .map(match => ({ variable: match[1], expression: match[0] }))
    .filter(({ variable }) =>
      (variable === "error" || variable.endsWith("Error")) &&
      !SAFE_LOCAL_MESSAGE_VARIABLES.has(variable)
    );
}

function actionSourceFiles() {
  return fs.readdirSync("app/actions", { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map(entry => path.join("app/actions", entry.name))
    .sort();
}

function recursiveSourceFiles(filePattern: RegExp, root = "app") {
  const files: string[] = [];

  function walk(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !filePattern.test(entry.name)) continue;
      files.push(fullPath);
    }
  }

  walk(root);
  return files.sort();
}

function serverPageSourceFiles() {
  return recursiveSourceFiles(/^page\.tsx?$/).filter(pagePath => {
    const source = fs.readFileSync(pagePath, "utf8");
    return !/^\s*["']use client["'];/.test(source);
  });
}

function routeHandlerSourceFiles() {
  return recursiveSourceFiles(/^route\.tsx?$/);
}

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

  it("não expõe mensagens internas nas superfícies protegidas", () => {
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

    for (const actionPath of actionSourceFiles()) {
      const source = fs.readFileSync(actionPath, "utf8");
      expect(suspiciousMessageAccesses(source), actionPath).toEqual([]);
    }

    for (const pagePath of serverPageSourceFiles()) {
      const source = fs.readFileSync(pagePath, "utf8");
      expect(suspiciousMessageAccesses(source), pagePath).toEqual([]);
    }

    for (const routePath of routeHandlerSourceFiles()) {
      const source = fs.readFileSync(routePath, "utf8");
      expect(suspiciousMessageAccesses(source), routePath).toEqual([]);
    }

    const protectedActions = [
      "app/actions/public-signing.ts",
      "app/actions/operational-finance.ts",
      "app/actions/procurement.ts",
      "app/actions/sinapi.ts",
      "app/actions/inventory.ts",
      "app/actions/inventory-extra.ts",
      "app/actions/inventory-stocktake.ts",
      "app/actions/budgets.ts",
      "app/actions/budget-versions.ts",
      "app/actions/quality.ts",
      "app/actions/listas.ts",
      "app/actions/sugestoes.ts",
      "app/actions/observability.ts",
      "app/actions/relationship.ts"
    ];
    for (const protectedPath of protectedActions) {
      const source = fs.readFileSync(protectedPath, "utf8");
      expect(source, protectedPath).toContain("reportDataAccessError");
    }

    const relationship = fs.readFileSync("app/actions/relationship.ts", "utf8");
    expect(relationship).toContain("safeInternalReturnPath");

    for (const serverPath of ["lib/reports/server.ts", "lib/inventory/server.ts", "lib/relationship/server.ts"]) {
      const source = fs.readFileSync(serverPath, "utf8");
      expect(source, serverPath).toContain("reportDataAccessError");
      expect(suspiciousMessageAccesses(source), serverPath).toEqual([]);
    }
    const relationshipLoader = fs.readFileSync("lib/relationship/server.ts", "utf8");
    expect(relationshipLoader).not.toContain("map(error=>error?.message)");

    // VACINA: as sondas SINAPI usam segredo efêmero de runtime. Não pode voltar
    // token literal versionado nem autenticação por query string.
    for (const probePath of [
      "app/api/internal/sinapi-leitura-real/route.ts",
      "app/api/internal/sinapi-source-probe/route.ts",
      "app/api/internal/sinapi-source-probe-v2/route.ts"
    ]) {
      const source = fs.readFileSync(probePath, "utf8");
      expect(source, probePath).toContain("SINAPI_PROBE_TOKEN");
      expect(source, probePath).not.toMatch(/const\s+(?:PROBE_)?TOKEN\s*=\s*["']/);
      expect(source, probePath).not.toContain('searchParams.get("token")');
    }
    const sinapiImporter = fs.readFileSync("scripts/importar-sinapi.mjs", "utf8");
    expect(sinapiImporter).toContain("SINAPI_PROBE_TOKEN");
    expect(sinapiImporter).toContain('"x-sinapi-probe-token": probeSecret');
    expect(sinapiImporter).not.toContain('searchParams.set("token"');

    const sinapiWorkflow = fs.readFileSync(".github/workflows/sinapi-atualizacao.yml", "utf8");
    expect(sinapiWorkflow).toContain("SINAPI_PROBE_TOKEN");
    expect(sinapiWorkflow).toContain('echo "::add-mask::$SINAPI_PROBE_TOKEN"');
    expect(sinapiWorkflow).toContain('echo "SINAPI_PROBE_TOKEN=$SINAPI_PROBE_TOKEN" >> "$GITHUB_ENV"');

    // VACINA: evento duplicado de assinatura não pode retornar antes de repetir
    // efeitos idempotentes de uma tentativa parcialmente concluída.
    const signatureWebhook = fs.readFileSync("app/api/signatures/webhook/route.ts", "utf8");
    expect(signatureWebhook).toContain('const duplicateEvent = eventError?.code === "23505"');
    expect(signatureWebhook).toContain("const replayCurrentStatus = duplicateEvent && envelope.status === nextStatus");
    expect(signatureWebhook).toContain("const applyEffects = applyStatus || replayCurrentStatus");
    expect(signatureWebhook).not.toContain('if (eventError?.code === "23505") {\n    return');
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
