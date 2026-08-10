import { ReportSnapshotForm } from "@/components/reports/report-action-forms";
import { ReportNavigation } from "@/components/reports/report-navigation";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { formatReportNumber, normalizeReportDashboard } from "@/lib/reports/metrics";
import { defaultReportPeriod, loadReportDashboard } from "@/lib/reports/server";

export const dynamic = "force-dynamic";

export default async function ReportSnapshotsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const query = await searchParams;
  const context = await requireCapability("relatorios", "read");
  const canCreate = await hasCapability("relatorios", "update", null, context);
  const { dashboard } = await loadReportDashboard({});
  const defaults = defaultReportPeriod();
  const [{ data: snapshots, error: snapshotsError }, { data: views, error: viewsError }] = await Promise.all([
    context.supabase.from("report_snapshots").select("id,project_id,saved_view_id,kind,period_start,period_end,metrics,source_sha256,status,generated_at,created_at").eq("organization_id", context.organizationId).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("report_saved_views").select("id,name,kind,project_id").eq("organization_id", context.organizationId).eq("active", true).order("name")
  ]);
  const projectName = new Map(dashboard.projects.map(project => [project.project_id, `${project.code} · ${project.name}`]));
  const projectOptions = dashboard.projects.map(project => ({ id: project.project_id, label: `${project.code} · ${project.name}` }));
  const viewOptions = (views ?? []).map(view => ({ id: view.id, label: `${view.name} · ${view.kind}` }));

  return <main className="content reports-app">
    <section className="page-heading"><div><span className="badge">RELATÓRIOS · EVIDÊNCIA</span><h1>Snapshots de indicadores</h1><p>Registros imutáveis do estado dos indicadores em um período específico.</p></div></section>
    <ReportNavigation/>
    {query.error && <div className="validation blocking">{query.error}</div>}
    {query.created && <div className="validation success">Snapshot concluído e registrado.</div>}
    {snapshotsError && <div className="validation blocking">Não foi possível carregar os snapshots agora.</div>}
    {viewsError && <div className="validation blocking">Os relatórios salvos estão indisponíveis; ainda é possível gerar um snapshot sem visão salva.</div>}
    {canCreate && <ReportSnapshotForm projects={projectOptions} views={viewsError ? [] : viewOptions} defaults={defaults}/>} 
    <section className="report-snapshot-list">
      {(snapshots ?? []).map(snapshot => { let summary: { projects: number; progress: number; receivable: number | null } | null = null; if (snapshot.status === "COMPLETED") { const data = normalizeReportDashboard(snapshot.metrics); summary = { projects: data.executive.activeProjects, progress: data.executive.averageProgress, receivable: data.executive.receivableOpen }; } return <article className="card card-pad report-snapshot" key={snapshot.id}><header><div><span className="eyebrow">{snapshot.kind} · {snapshot.status}</span><h2>{snapshot.project_id ? projectName.get(snapshot.project_id) ?? "Obra autorizada" : "Visão consolidada"}</h2></div><span className="badge">{new Date(snapshot.created_at).toLocaleString("pt-BR")}</span></header><p>Período: {new Date(`${snapshot.period_start}T12:00:00`).toLocaleDateString("pt-BR")} a {new Date(`${snapshot.period_end}T12:00:00`).toLocaleDateString("pt-BR")}.</p>{summary && <dl className="detail-list"><div><dt>Obras</dt><dd>{summary.projects}</dd></div><div><dt>Progresso médio</dt><dd>{formatReportNumber(summary.progress, "percent")}</dd></div><div><dt>A receber</dt><dd>{formatReportNumber(summary.receivable, "currency")}</dd></div><div><dt>Hash</dt><dd><code>{snapshot.source_sha256?.slice(0, 16)}…</code></dd></div></dl>}{snapshot.status === "FAILED" && <div className="validation blocking">A geração não foi concluída. Consulte o registro técnico interno.</div>}<small>{snapshot.status === "COMPLETED" ? "Imutável após a conclusão." : "Registro de processamento."}</small></article>; })}
      {!snapshotsError && !snapshots?.length && <div className="empty-state"><h3>Nenhum snapshot</h3><p>Gere o primeiro registro imutável dos indicadores.</p></div>}
    </section>
  </main>;
}
