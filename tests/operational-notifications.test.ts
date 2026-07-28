import { describe, expect, it } from "vitest";
import {
  agruparNotificacoesOperacionais,
  planejarNotificacoesOperacionais
} from "../lib/operations/notifications";

const eventoCritico = {
  eventCode: "planning.critical_path_at_risk",
  objectType: "project" as const,
  objectId: "obra-17",
  title: "Entrega da marcenaria em risco",
  impact: "7 dias no caminho crítico",
  actor: "P2" as const,
  occurredAt: "2026-07-28T12:00:00.000Z",
  responseDueAt: "2026-07-28T14:00:00.000Z",
  clientApproved: false
};

describe("notificações operacionais por exceção", () => {
  it("não notifica no fluxo otimista ou normal", () => {
    expect(planejarNotificacoesOperacionais({ ...eventoCritico, scenario: "optimistic" })).toEqual([]);
    expect(planejarNotificacoesOperacionais({ ...eventoCritico, scenario: "normal" })).toEqual([]);
  });

  it("usa os destinatários da persona e recorta a mensagem por função", () => {
    const notificacoes = planejarNotificacoesOperacionais({
      ...eventoCritico,
      scenario: "pessimistic"
    });

    expect(notificacoes.map(item => item.recipient).sort()).toEqual(["P10", "P13", "P8", "P9"].sort());
    expect(notificacoes.find(item => item.recipient === "P13")?.body)
      .not.toBe(notificacoes.find(item => item.recipient === "P9")?.body);
  });

  it("cliente só recebe recorte explicitamente aprovado", () => {
    const base = {
      eventCode: "service.sla_breached",
      objectType: "ticket" as const,
      objectId: "sac-9",
      title: "Atendimento crítico fora do SLA",
      impact: "Peça sem disponibilidade",
      actor: "P5" as const,
      occurredAt: "2026-07-28T12:00:00.000Z",
      responseDueAt: "2026-07-28T13:00:00.000Z",
      scenario: "pessimistic" as const
    };

    expect(planejarNotificacoesOperacionais({ ...base, clientApproved: false })
      .some(item => item.recipient === "P15")).toBe(false);
    expect(planejarNotificacoesOperacionais({ ...base, clientApproved: true })
      .some(item => item.recipient === "P15")).toBe(true);
  });

  it("SLA vencido escala para a diretoria sem duplicar destinatário", () => {
    const notificacoes = planejarNotificacoesOperacionais(
      { ...eventoCritico, scenario: "pessimistic" },
      new Date("2026-07-28T15:00:00.000Z")
    );
    expect(notificacoes.filter(item => item.recipient === "P13")).toHaveLength(1);
    expect(notificacoes.find(item => item.recipient === "P13")?.escalated).toBe(true);
  });

  it("agrupa vários fatos do mesmo objeto em um aviso por destinatário", () => {
    const primeira = planejarNotificacoesOperacionais({
      ...eventoCritico,
      scenario: "pessimistic"
    });
    const segunda = planejarNotificacoesOperacionais({
      ...eventoCritico,
      title: "Material crítico sem confirmação",
      eventCode: "procurement.critical_supply_risk",
      actor: "P9",
      scenario: "pessimistic"
    });

    const agrupadas = agruparNotificacoesOperacionais([...primeira, ...segunda]);
    const gerente = agrupadas.filter(item => item.recipient === "P8" && item.objectId === "obra-17");
    expect(gerente).toHaveLength(1);
    expect(gerente[0].eventCount).toBe(2);
  });
});
