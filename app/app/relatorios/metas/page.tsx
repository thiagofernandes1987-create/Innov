import { ReportTargetForm } from "@/components/reports/report-action-forms";
import { ReportNavigation } from "@/components/reports/report-navigation";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { formatReportNumber } from "@/lib/reports/metrics";
import { loadReportDashboard } from "@/lib/reports/server";

export const dynamic = "force-dynamic";

export default async function ReportTargetsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const query = await searchParams;
  const context = await requireCapability("relatorios", "read");
  const canManage = await hasCapability("relatorios", "manage", null, context);
  const { dashboard } = await loadReportDashboard({});
  const [{ data: metrics, error: metricsError }, { data: targets, error: targetsError }] = await Promise.all([
    context.supabase.from("report_metric_definitions").select("metric_key,name,unit,category,sensitive").eq("organization_id", context.organizationId).eq("active", true).order("display_order"),
    context.supabase.from("report_targets").select("id,project_id,metric_key,comparison,warning_value,critical_value,updated_at").eq("organization_id", context.organizationId).eq("active", true).order("metric_key")
  ]);
  const projectName = new Map(dashboard.projects.map(project => [project.project_id, `${project.code} · ${project.name}`]));
  const projectOptions = dashboard.projects.map(project => ({ id: project.project_id, label: `${project.code} · ${project.name}` }));
  const metricOptions = (metrics ?? []).map(metric => ({ key: metric.metric_key, label: `${metric.name} · ${metric.category}` }));

  return <main className="content reports-app">
    <section className="page-heading"><div><span className="badge">RELATÓRIOS · CONFIGURAÇÃO</span><h1>Metas e alertas</h1><p>Defina faixas gerais ou específicas por obra para classificação de indicadores.</p></div></section>
    <ReportNavigation/>
    {query.error && <div className="validation blocking">{query.error}</div>}
    {query.saved && <div className="validation success">Meta salva com sucesso.</div>}
    {metricsError && <div className="validation blocking">Não foi possível carregar as métricas agora.</div>}
    {targetsError && <div className="validation blocking">Não foi possível carregar as metas agora.</div>}
    {canManage && !metricsError && <ReportTargetForm projects={projectOptions} metrics={metricOptions}/>} 
    <section className="card card-pad report-table-wrap">
      <table className="data-table"><thead><tr><th>Métrica</th><th>Escopo</th><th>Regra</th><th>Atenção</th><th>Crítico</th><th>Atualização</th></tr></thead><tbody>{(targets ?? []).map(target => { const metric = (metrics ?? []).find(item => item.metric_key === target.metric_key); const warning = target.warning_value === null ? null : Number(target.warning_value); const critical = target.critical_value === null ? null : Number(target.critical_value); return <tr key={target.id}><td><strong>{metric?.name ?? target.metric_key}</strong><small>{metric?.category ?? ""}{metric?.sensitive ? " · sensível" : ""}</small></td><td>{target.project_id ? projectName.get(target.project_id) ?? "Obra restrita" : "Todas as obras"}</td><td>{target.comparison === "MIN" ? "mínimo" : "máximo"}</td><td>{formatReportNumber(warning)}</td><td>{formatReportNumber(critical)}</td><td>{new Date(target.updated_at).toLocaleString("pt-BR")}</td></tr>; })}</tbody></table>
      {!targetsError && !targets?.length && <div className="empty-state"><h3>Nenhuma meta configurada</h3><p>Os indicadores serão exibidos sem classificação até que uma meta seja definida.</p></div>}
    </section>
  </main>;
}
