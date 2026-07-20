import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";
import { formatDate, formatPercent, statusBadge, taskStatusLabels } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function AllTasksPage() {
  const { supabase, organizationId, userId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("project_tasks")
    .select("id,project_id,code,title,status,priority,progress,planned_start,planned_end,responsible_id,blocked_reason,projects(code,name)")
    .eq("organization_id", organizationId)
    .neq("status", "CANCELED")
    .order("planned_end", { ascending: true, nullsFirst: false });

  const tasks = data ?? [];
  const myTasks = tasks.filter((task) => task.responsible_id === userId);
  const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
  const overdue = tasks.filter((task) => task.planned_end && new Date(`${task.planned_end}T23:59:59`) < new Date() && task.status !== "COMPLETED").length;

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">EXECUÇÃO</span><h1>Tarefas</h1><p className="muted">Pendências de todas as obras, com foco em responsabilidade, prazo e bloqueios.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="grid grid-kpi"><article className="card kpi"><small>TOTAL ABERTO</small><strong>{tasks.filter((task) => task.status !== "COMPLETED").length}</strong></article><article className="card kpi"><small>MINHAS TAREFAS</small><strong>{myTasks.length}</strong></article><article className="card kpi"><small>ATRASADAS</small><strong>{overdue}</strong></article><article className="card kpi"><small>BLOQUEADAS</small><strong>{blocked}</strong></article></section>
      <section className="card table-wrap" style={{ marginTop: 22 }}><table><thead><tr><th>Obra</th><th>Tarefa</th><th>Status</th><th>Prioridade</th><th>Progresso</th><th>Prazo</th><th>Responsável</th></tr></thead><tbody>{tasks.map((task) => { const project = singleRelation(task.projects); return <tr key={task.id}><td><Link href={`/app/obras/${task.project_id}/tarefas`}><strong>{project?.code || "—"}</strong><br /><span className="muted">{project?.name || ""}</span></Link></td><td><strong>{task.code}</strong><br /><span className="muted">{task.title}</span>{task.blocked_reason ? <div className="validation blocking">{task.blocked_reason}</div> : null}</td><td><span className={statusBadge(task.status)}>{taskStatusLabels[task.status] ?? task.status}</span></td><td><span className={task.priority === "CRITICAL" ? "badge badge-danger" : task.priority === "HIGH" ? "badge badge-warning" : "badge"}>{task.priority}</span></td><td>{formatPercent(task.progress)}</td><td>{formatDate(task.planned_start)} → {formatDate(task.planned_end)}</td><td>{task.responsible_id === userId ? <span className="badge badge-success">Você</span> : task.responsible_id ? task.responsible_id.slice(0, 8) : "—"}</td></tr>; })}{!tasks.length ? <tr><td colSpan={7}>Nenhuma tarefa cadastrada.</td></tr> : null}</tbody></table></section>
    </main>
  );
}
