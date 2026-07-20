import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";
import { formatDate, formatPercent, statusBadge } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function PlanningPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const [{ data: projects, error }, { data: milestones }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,name,status,progress,planned_start,planned_end,clients(legal_name,trade_name),project_tasks(id,status,planned_end)")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("planned_start"),
    supabase
      .from("project_milestones")
      .select("id,project_id,title,planned_date,completed,projects(code,name)")
      .eq("organization_id", organizationId)
      .gte("planned_date", new Date().toISOString().slice(0, 10))
      .order("planned_date")
      .limit(12)
  ]);

  const rows = (projects ?? []).map((project) => {
    const tasks = project.project_tasks ?? [];
    const overdue = tasks.filter((task) => task.planned_end && new Date(`${task.planned_end}T23:59:59`) < new Date() && task.status !== "COMPLETED").length;
    const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
    return { ...project, client: singleRelation(project.clients), overdue, blocked };
  });

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">PORTFÓLIO</span><h1>Planejamento</h1><p className="muted">Visão consolidada de prazo, progresso, impedimentos e próximos marcos.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="card table-wrap">
        <table><thead><tr><th>Obra</th><th>Cliente</th><th>Status</th><th>Progresso</th><th>Período</th><th>Atrasadas</th><th>Bloqueadas</th></tr></thead><tbody>
          {rows.map((project) => <tr key={project.id}><td><Link href={`/app/obras/${project.id}/cronograma`}><strong>{project.code}</strong><br /><span className="muted">{project.name}</span></Link></td><td>{project.client?.trade_name || project.client?.legal_name || "—"}</td><td><span className={statusBadge(project.status)}>{project.status}</span></td><td style={{ minWidth: 160 }}><div className="progress-row"><div><span>{formatPercent(project.progress)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(project.progress) }} /></div></div></td><td>{formatDate(project.planned_start)} → {formatDate(project.planned_end)}</td><td>{project.overdue ? <span className="badge badge-danger">{project.overdue}</span> : "0"}</td><td>{project.blocked ? <span className="badge badge-warning">{project.blocked}</span> : "0"}</td></tr>)}
          {!rows.length ? <tr><td colSpan={7}>Nenhuma obra no portfólio.</td></tr> : null}
        </tbody></table>
      </section>
      <section className="card card-pad" style={{ marginTop: 22 }}><h2>Próximos marcos</h2><div className="timeline" style={{ marginTop: 14 }}>{(milestones ?? []).map((milestone) => { const project = singleRelation(milestone.projects); return <div key={milestone.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)" }}><span><strong>{project?.code || "—"}</strong> · {milestone.title}</span><span className={milestone.completed ? "badge badge-success" : "badge"}>{formatDate(milestone.planned_date)}</span></div>; })}{!milestones?.length ? <p className="muted">Nenhum marco futuro cadastrado.</p> : null}</div></section>
    </main>
  );
}
