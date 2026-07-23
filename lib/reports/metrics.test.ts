import { describe, expect, it } from "vitest";
import { buildProjectCsv, evaluateMetric, normalizeReportDashboard, targetFor } from "./metrics";

function firstDataCell(csv: string) {
  const line = csv.split("\r\n")[1] ?? "";
  const first = line.split(";")[0] ?? "";
  if (!first.startsWith('"')) return first;
  return first.slice(1, -1).replaceAll('""', '"');
}

describe("motor de relatórios", () => {
  it("classifica métricas onde valores mínimos são desejáveis", () => {
    const target = { metric_key: "quality", comparison: "MIN" as const, warning_value: 90, critical_value: 75 };
    expect(evaluateMetric(95, target)).toBe("OK");
    expect(evaluateMetric(85, target)).toBe("WARNING");
    expect(evaluateMetric(70, target)).toBe("CRITICAL");
  });

  it("prioriza meta específica da obra", () => {
    const targets = [
      { metric_key: "nps", comparison: "MIN" as const, warning_value: 50, critical_value: 0, project_id: null },
      { metric_key: "nps", comparison: "MIN" as const, warning_value: 70, critical_value: 40, project_id: "obra-1" }
    ];
    expect(targetFor(targets, "nps", "obra-1")?.warning_value).toBe(70);
    expect(targetFor(targets, "nps", "obra-2")?.warning_value).toBe(50);
  });

  it.each([
    "=1+1",
    "+cmd",
    "-2+3",
    "@SUM(A1:A2)",
    '  =HYPERLINK("https://invalid")',
    "\t=1",
    "\r=1",
    "\n=1"
  ])("neutraliza fórmula de planilha em %j", value => {
    const dashboard = normalizeReportDashboard({
      period: {},
      executive: {},
      projects: [{ project_id: "1", code: value, name: "Obra", status: "ACTIVE" }],
      financeMonthly: [],
      targets: []
    });
    expect(firstDataCell(buildProjectCsv(dashboard))).toBe(`'${value}`);
  });

  it("preserva escaping CSV", () => {
    const dashboard = normalizeReportDashboard({
      period: {},
      executive: {},
      projects: [{ project_id: "1", code: "OB-1", name: "Casa; Araucária", status: "ACTIVE" }],
      financeMonthly: [],
      targets: []
    });
    expect(buildProjectCsv(dashboard)).toContain('"Casa; Araucária"');
  });
});
