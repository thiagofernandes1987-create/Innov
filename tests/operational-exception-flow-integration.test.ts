import fs from "node:fs";
import { describe, expect, it } from "vitest";

const actions = fs.readFileSync("app/actions/operations.ts", "utf8");
const exceptionsPage = fs.readFileSync("app/app/excecoes/page.tsx", "utf8");
const responsibilitiesPage = fs.readFileSync("app/app/administracao/responsabilidades/page.tsx", "utf8");
const shell = fs.readFileSync("components/casca/canto-direito.tsx", "utf8");
const notices = fs.readFileSync("app/actions/avisos.ts", "utf8");

describe("fluxo de exceções operacionais", () => {
  it("mantém um produtor runtime ligado à RPC canônica e à responsabilidade da persona", () => {
    expect(actions).toContain('rpc("create_operational_event"');
    expect(actions).toContain('.from("operational_responsibilities")');
    expect(actions).toMatch(/scenarios\.pessimistic\.event\s*===\s*eventCode/);
    expect(actions).toContain("persona.scenarios.pessimistic.notify.includes");
    expect(actions).toContain("item.project_id === projectId");
  });

  it("expõe uma superfície navegável para registrar a exceção", () => {
    expect(exceptionsPage).toContain("registrarExcecaoOperacional");
    expect(exceptionsPage).toContain('name="eventCode"');
    expect(exceptionsPage).toContain('name="projectId"');
    expect(exceptionsPage).toContain('name="obligationPersona"');
    expect(shell).toContain('href="/app/excecoes"');
  });

  it("fecha o ciclo marcando notificações operacionais como lidas", () => {
    expect(notices).toContain('.from("operational_notifications")');
    expect(notices).toContain("read_at: new Date().toISOString()");
    expect(notices).toContain('.eq("recipient_user_id", userId)');
  });

  it("não devolve detalhes crus do Postgres nas superfícies operacionais", () => {
    expect(actions).not.toMatch(/(?:error|existing\.error|result\.error)\.message/);
    expect(responsibilitiesPage).toContain("reportDataAccessError");
    expect(responsibilitiesPage).not.toMatch(/throw new Error\([^)]*\.message/);
  });
});
