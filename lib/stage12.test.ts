import { describe, expect, it } from "vitest";
import { daysBetween, formatPercent, statusBadge } from "./stage12";

describe("stage12 planning helpers", () => {
  it("calcula duração entre datas civis", () => {
    expect(daysBetween("2026-07-01", "2026-07-31")).toBe(30);
  });

  it("formata progresso em percentual", () => {
    expect(formatPercent(0.425)).toContain("43");
  });

  it("classifica estados críticos", () => {
    expect(statusBadge("BLOCKED")).toContain("danger");
    expect(statusBadge("COMPLETED")).toContain("success");
  });
});
