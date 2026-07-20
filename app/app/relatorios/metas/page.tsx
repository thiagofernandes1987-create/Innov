import{saveReportTarget}from"@/app/actions/reports";
import{ReportNavigation}from"@/components/reports/report-navigation";
import{hasCapability,requireCapability}from"@/lib/authorization";
import{formatReportNumber}from"@/lib/reports/metrics";
import{loadReportDashboard}from"@/lib/reports/server";

export const dynamic="force-dynamic";

export default async function ReportTargetsPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 const query=await searchParams;const context=await requireCapability("relatorios","read");const canManage=await hasCapability("relatorios","manage",null,context);const{dashboard}=await loadReportDashboard({});
 const[{data:metrics},{data:targets}]=await Promise.all([
  context.supabase.from("report_metric_definitions").select("metric_key,name,unit,category,sensitive").eq("organization_id",context.organizationId).eq("active",true).order("display_order"),
  context.supabase.from("report_targets").select("id,project_id,metric_key,comparison,warning_value,critical_value,updated_at").eq("organization_id",context.organizationId).eq("active",true).order("metric_key")
 ]);
 const projectName=new Map(dashboard.projects.map(project=>[project.project_id,`${project.code} · ${project.name}`]));
 return <main className="content reports-app"><section className="page-heading"><div><span className="badge">RELATÓRIOS · CONFIGURAÇÃO</span><h1>Metas e alertas</h1><p>Defina faixas gerais ou específicas por obra para classificação de indicadores.</p></div></section><ReportNavigation/>{query.error&&<div className="validation blocking">{query.error}</div>}
 {canManage&&<form action={saveReportTarget} className="card card-pad report-target-form"><div className="section-heading"><div><span className="eyebrow">NOVA META</span><h2>Faixa de atenção</h2></div></div><div className="form-grid form-grid-2"><label>Métrica<select name="metricKey" required><option value="">Selecione</option>{(metrics??[]).map(metric=><option value={metric.metric_key} key={metric.metric_key}>{metric.name} · {metric.category}</option>)}</select></label><label>Escopo<select name="projectId"><option value="">Todas as obras</option>{dashboard.projects.map(project=><option value={project.project_id} key={project.project_id}>{project.code} · {project.name}</option>)}</select></label><label>Regra<select name="comparison"><option value="MIN">Valor mínimo desejado</option><option value="MAX">Valor máximo desejado</option></select></label><label>Atenção<input name="warningValue" type="number" step="0.01"/></label><label>Crítico<input name="criticalValue" type="number" step="0.01"/></label></div><button className="button button-primary">Salvar meta</button></form>}
 <section className="card card-pad report-table-wrap"><table className="data-table"><thead><tr><th>Métrica</th><th>Escopo</th><th>Regra</th><th>Atenção</th><th>Crítico</th><th>Atualização</th></tr></thead><tbody>{(targets??[]).map(target=>{const metric=(metrics??[]).find(item=>item.metric_key===target.metric_key);return <tr key={target.id}><td><strong>{metric?.name??target.metric_key}</strong><small>{metric?.category??""}{metric?.sensitive?" · sensível":""}</small></td><td>{target.project_id?projectName.get(target.project_id)??"Obra restrita":"Todas as obras"}</td><td>{target.comparison==="MIN"?"mínimo":"máximo"}</td><td>{formatReportNumber(Number(target.warning_value))}</td><td>{formatReportNumber(Number(target.critical_value))}</td><td>{new Date(target.updated_at).toLocaleString("pt-BR")}</td></tr>})}</tbody></table>{!targets?.length&&<div className="empty-state"><h3>Nenhuma meta configurada</h3><p>Os indicadores serão exibidos sem classificação até que uma meta seja definida.</p></div>}</section></main>;
}
