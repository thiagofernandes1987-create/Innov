import Link from "next/link";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireOrganizationContext } from "@/lib/auth";
import { formatDate, formatPercent } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

/**
 * Situação do prazo, em três estados — o "dentro do prazo, prestes a expirar ou
 * atrasado" do print do planejamento.
 *
 * A régua dos sete dias não é arbitrária: é o intervalo em que ainda dá para
 * remanejar equipe ou antecipar material. Menos que isso, o aviso chega junto
 * com o problema.
 */
function prazoDaObra(plannedEnd: string | null, overdue: number) {
  if (overdue > 0) return <span className="badge badge-danger">Atrasada</span>;
  if (!plannedEnd) return <span className="muted">Sem prazo</span>;
  const dias = Math.round((new Date(`${plannedEnd}T12:00:00`).getTime() - Date.now()) / 86400000);
  if (dias < 0) return <span className="badge badge-danger">Vencida há {Math.abs(dias)} d</span>;
  if (dias <= 7) return <span className="badge badge-warning">Vence em {dias} d</span>;
  return <span className="badge badge-success">No prazo</span>;
}

function diferencaDias(inicio: string | null, fim: string | null): number | null {
  if (!inicio || !fim) return null;
  return Math.round(
    (new Date(`${fim}T12:00:00`).getTime() - new Date(`${inicio}T12:00:00`).getTime()) / 86_400_000
  );
}

export default async function PlanningPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const [{ data: projects, error }, { data: milestones }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,name,status,progress,planned_start,planned_end,clients(legal_name,trade_name),project_tasks(id,title,status,planned_start,planned_end,responsible_id)")
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

  const rowsBase = (projects ?? []).map((project) => {
    const tasks = [...(project.project_tasks ?? [])].sort((a, b) =>
      String(a.planned_start ?? "9999-12-31").localeCompare(String(b.planned_start ?? "9999-12-31"))
    );
    const overdue = tasks.filter((task) => task.planned_end && new Date(`${task.planned_end}T23:59:59`) < new Date() && task.status !== "COMPLETED").length;
    const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
    const abertas = tasks.filter(task => !["COMPLETED", "CANCELED"].includes(task.status));
    const atual = abertas.find(task => ["IN_PROGRESS", "BLOCKED"].includes(task.status)) ?? abertas[0] ?? null;
    const indiceAtual = atual ? abertas.findIndex(task => task.id === atual.id) : -1;
    const proxima = indiceAtual >= 0 ? (abertas[indiceAtual + 1] ?? null) : null;
    const terminoMaisTarde = tasks
      .map(task => task.planned_end)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null;
    return {
      ...project,
      client: singleRelation(project.clients),
      overdue,
      blocked,
      atual,
      proxima,
      folga: diferencaDias(terminoMaisTarde, project.planned_end)
    };
  });
  const responsibleIds = [...new Set(rowsBase.map(row => row.atual?.responsible_id).filter((id): id is string => Boolean(id)))];
  const profilesResult = responsibleIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", responsibleIds)
    : { data: [], error: null };
  const profileById = new Map((profilesResult.data ?? []).map(profile => [
    profile.id,
    profile.full_name || profile.email || profile.id.slice(0, 8)
  ]));
  const rows = rowsBase.map(row => ({
    ...row,
    responsavel: row.atual?.responsible_id
      ? (profileById.get(row.atual.responsible_id) ?? "Não identificado")
      : "Não atribuído"
  }));

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Planejamento"
        primaryAction={<Link className="button button-primary barra-controle-novo" href="/app/obras/novo">Nova obra</Link>}
        meta={<span className="pipeline-contagem">{rows.length} obra(s)</span>}
      />
      <p className="workspace-intro">Prazo, etapa, responsabilidade e próxima ação por obra. O código abre a mesa de cronograma.</p>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="card table-wrap">
        <table><thead><tr><th>Obra</th><th>Cliente</th><th>Etapa atual</th><th>Datas da etapa</th><th>Responsável</th><th>Progresso</th><th>Folga</th><th>Situação</th><th>Próxima tarefa</th></tr></thead><tbody>
          {rows.map((project) => <tr key={project.id}><td><Link href={`/app/obras/${project.id}/cronograma`}><strong>{project.code}</strong><br /><span className="muted">{project.name}</span></Link></td><td>{project.client?.trade_name || project.client?.legal_name || "—"}</td><td><strong>{project.atual?.title ?? "Sem tarefa aberta"}</strong><small>{project.atual?.status ?? project.status}</small></td><td>{project.atual ? `${formatDate(project.atual.planned_start)} → ${formatDate(project.atual.planned_end)}` : "—"}</td><td>{project.responsavel}</td><td style={{ minWidth: 150 }}><div className="progress-row"><div><span>{formatPercent(project.progress)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(project.progress) }} /></div></div></td><td>{project.folga === null ? "—" : project.folga >= 0 ? `${project.folga} d` : <span className="badge badge-danger">{project.folga} d</span>}</td><td>{prazoDaObra(project.planned_end, project.overdue)}{project.blocked ? <small>{project.blocked} bloqueada(s)</small> : null}</td><td>{project.proxima?.title ?? "—"}</td></tr>)}
          {!rows.length ? <tr><td colSpan={9}>Nenhuma obra no portfólio.</td></tr> : null}
        </tbody></table>
      </section>
      <section className="card card-pad" style={{ marginTop: 22 }}><h2>Próximos marcos</h2><div className="timeline" style={{ marginTop: 14 }}>{(milestones ?? []).map((milestone) => { const project = singleRelation(milestone.projects); return <div key={milestone.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)" }}><span><strong>{project?.code || "—"}</strong> · {milestone.title}</span><span className={milestone.completed ? "badge badge-success" : "badge"}>{formatDate(milestone.planned_date)}</span></div>; })}{!milestones?.length ? <p className="muted">Nenhum marco futuro cadastrado.</p> : null}</div></section>
    </main>
  );
}
