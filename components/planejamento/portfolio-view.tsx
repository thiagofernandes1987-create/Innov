"use client";

import Link from "next/link";
import { CalendarBlank, ListBullets, SquaresFour } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

export type PlanningPortfolioRow = {
  id: string;
  code: string;
  name: string;
  entryMode: string;
  location: string;
  clientName: string;
  currentTitle: string;
  currentStatus: string;
  currentPeriod: string;
  responsible: string;
  progress: number;
  progressLabel: string;
  slackDays: number | null;
  deadlineClass: string;
  deadlineLabel: string;
  blockedCount: number;
  nextTitle: string;
  plannedEnd: string | null;
};

export type PlanningMilestone = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  title: string;
  plannedDate: string;
  plannedDateLabel: string;
  completed: boolean;
};

type View = "list" | "cards" | "calendar";

const views = [
  { id: "list" as const, label: "Lista", Icon: ListBullets },
  { id: "cards" as const, label: "Cartões", Icon: SquaresFour },
  { id: "calendar" as const, label: "Calendário", Icon: CalendarBlank }
];

export function PlanningPortfolioView({
  rows,
  milestones
}: {
  rows: PlanningPortfolioRow[];
  milestones: PlanningMilestone[];
}) {
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    const saved = window.localStorage.getItem("planning-portfolio-view");
    if (saved === "list" || saved === "cards" || saved === "calendar") setView(saved);
  }, []);

  function selectView(next: View) {
    setView(next);
    window.localStorage.setItem("planning-portfolio-view", next);
  }

  const calendarItems = useMemo(() => {
    const projectEnds = rows
      .filter((row) => Boolean(row.plannedEnd))
      .map((row) => ({
        id: `project-${row.id}`,
        date: row.plannedEnd as string,
        dateLabel: new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${row.plannedEnd}T12:00:00Z`)),
        title: `Término previsto · ${row.code}`,
        description: row.name,
        href: `/app/obras/${row.id}/cronograma`,
        status: row.deadlineLabel,
        statusClass: row.deadlineClass
      }));
    const milestoneItems = milestones.map((milestone) => ({
      id: `milestone-${milestone.id}`,
      date: milestone.plannedDate,
      dateLabel: milestone.plannedDateLabel,
      title: milestone.title,
      description: `${milestone.projectCode} · ${milestone.projectName}`,
      href: `/app/obras/${milestone.projectId}/cronograma`,
      status: milestone.completed ? "Concluído" : "Marco",
      statusClass: milestone.completed ? "badge badge-success" : "badge"
    }));
    return [...projectEnds, ...milestoneItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows, milestones]);

  return (
    <section aria-label="Portfólio de planejamento">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, margin: "18px 0 12px" }}>
        <span className="muted">{rows.length} projeto(s) na visão atual</span>
        <div className="barra-controle-visoes" role="group" aria-label="Visualização do planejamento">
          {views.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={view === id ? "barra-visao ativa" : "barra-visao"}
              aria-label={label}
              title={label}
              aria-pressed={view === id}
              onClick={() => selectView(id)}
            >
              <Icon size={17} weight={view === id ? "fill" : "regular"} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? <ListView rows={rows} /> : null}
      {view === "cards" ? <CardsView rows={rows} /> : null}
      {view === "calendar" ? <CalendarView items={calendarItems} /> : null}
    </section>
  );
}

function ListView({ rows }: { rows: PlanningPortfolioRow[] }) {
  return (
    <section className="card table-wrap">
      <table>
        <thead><tr><th>Projeto</th><th>Origem/local</th><th>Cliente</th><th>Etapa atual</th><th>Datas da etapa</th><th>Responsável</th><th>Progresso</th><th>Folga</th><th>Situação</th><th>Próxima tarefa</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><Link href={`/app/obras/${row.id}/cronograma`}><strong>{row.code}</strong><br /><span className="muted">{row.name}</span></Link></td>
              <td><span className="badge">{row.entryMode}</span><br /><small className="muted">{row.location}</small></td>
              <td>{row.clientName}</td>
              <td><strong>{row.currentTitle}</strong><small>{row.currentStatus}</small></td>
              <td>{row.currentPeriod}</td>
              <td>{row.responsible}</td>
              <td style={{ minWidth: 150 }}><div className="progress-row"><div><span>{row.progressLabel}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: row.progressLabel }} /></div></div></td>
              <td>{row.slackDays === null ? "—" : row.slackDays >= 0 ? `${row.slackDays} d` : <span className="badge badge-danger">{row.slackDays} d</span>}</td>
              <td><span className={row.deadlineClass}>{row.deadlineLabel}</span>{row.blockedCount ? <small>{row.blockedCount} bloqueada(s)</small> : null}</td>
              <td>{row.nextTitle}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={10}>Nenhum projeto encontrado com os filtros informados.</td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}

function CardsView({ rows }: { rows: PlanningPortfolioRow[] }) {
  if (!rows.length) return <div className="card card-pad"><strong>Nenhum projeto encontrado.</strong><p className="muted">Ajuste a busca ou os filtros ativos.</p></div>;

  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(285px,1fr))" }}>
      {rows.map((row) => (
        <article className="card card-pad" key={row.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
            <div><span className="mono muted">{row.code}</span><h2 style={{ marginTop: 6 }}>{row.name}</h2></div>
            <span className={row.deadlineClass}>{row.deadlineLabel}</span>
          </div>
          <p className="muted">{row.clientName} · {row.location}</p>
          <div className="progress-row" style={{ marginTop: 16 }}><div><span className="muted">Progresso</span><strong>{row.progressLabel}</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: row.progressLabel }} /></div></div>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "18px 0" }}>
            <div><dt className="muted">Etapa atual</dt><dd>{row.currentTitle}</dd></div>
            <div><dt className="muted">Responsável</dt><dd>{row.responsible}</dd></div>
            <div><dt className="muted">Período</dt><dd>{row.currentPeriod}</dd></div>
            <div><dt className="muted">Próxima tarefa</dt><dd>{row.nextTitle}</dd></div>
          </dl>
          <Link className="button button-secondary" href={`/app/obras/${row.id}/cronograma`}>Abrir cronograma</Link>
        </article>
      ))}
    </div>
  );
}

function CalendarView({
  items
}: {
  items: Array<{ id: string; date: string; dateLabel: string; title: string; description: string; href: string; status: string; statusClass: string }>;
}) {
  if (!items.length) return <div className="card card-pad"><strong>Nenhuma data disponível.</strong><p className="muted">Cadastre prazos ou marcos para montar o calendário.</p></div>;

  return (
    <div className="card card-pad">
      <h2>Próximas datas do portfólio</h2>
      <div className="timeline" style={{ marginTop: 14 }}>
        {items.map((item) => (
          <Link href={item.href} key={item.id} style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr) auto", alignItems: "center", gap: 16, padding: "13px 0", borderBottom: "1px solid var(--border)", color: "inherit" }}>
            <time dateTime={item.date} className="mono">{item.dateLabel}</time>
            <span><strong>{item.title}</strong><br /><small className="muted">{item.description}</small></span>
            <span className={item.statusClass}>{item.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
