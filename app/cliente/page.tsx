import Link from "next/link";
import { requireClientContext } from "@/lib/auth";
import { formatDate, formatPercent, statusBadge } from "@/lib/stage12";

export default async function ClientHomePage() {
  const { supabase, client } = await requireClientContext();
  const [projectsResult, logsResult, documentsResult, contractsResult] = await Promise.all([
    supabase.from("projects").select("id,code,name,status,progress,planned_start,planned_end,city,state").eq("client_id", client.id).not("client_released_at", "is", null).order("updated_at", { ascending: false }),
    supabase.from("daily_logs").select("id,project_id,log_date,summary,status").eq("client_visible", true).eq("status", "APPROVED").order("log_date", { ascending: false }).limit(5),
    supabase.from("project_documents").select("id").eq("client_visible", true).eq("status", "RELEASED"),
    supabase.from("contracts").select("id,status").eq("client_id", client.id).not("client_released_at", "is", null)
  ]);
  const projects = projectsResult.data ?? [];
  const average = projects.length ? projects.reduce((total, project) => total + Number(project.progress), 0) / projects.length : 0;

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">ACOMPANHAMENTO</span><h1>Olá, {client.trade_name || client.legal_name}</h1><p className="muted">Acompanhe o que foi liberado pela equipe Innovar.</p></div></div>
      {projectsResult.error ? <div className="validation blocking">{projectsResult.error.message}</div> : null}
      <section className="grid grid-kpi"><article className="card kpi"><small>OBRAS VISÍVEIS</small><strong>{projects.length}</strong></article><article className="card kpi"><small>PROGRESSO MÉDIO</small><strong>{formatPercent(average)}</strong></article><article className="card kpi"><small>DOCUMENTOS LIBERADOS</small><strong>{documentsResult.data?.length ?? 0}</strong></article><article className="card kpi"><small>CONTRATOS</small><strong>{contractsResult.data?.length ?? 0}</strong></article></section>
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", marginTop: 22 }}>
        {projects.map((project) => <article className="card card-pad" key={project.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><div><span className="mono muted">{project.code}</span><h2>{project.name}</h2><p className="muted">{[project.city, project.state].filter(Boolean).join(" / ")}</p></div><span className={statusBadge(project.status)}>{project.status}</span></div><div className="progress-row" style={{ marginTop: 18 }}><div><strong>Progresso</strong><span>{formatPercent(project.progress)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(project.progress) }} /></div></div><p className="muted">{formatDate(project.planned_start)} → {formatDate(project.planned_end)}</p><Link className="button button-primary" href={`/cliente/obras/${project.id}`}>Acompanhar obra</Link></article>)}
        {!projects.length ? <article className="card card-pad"><strong>Nenhuma obra foi liberada.</strong><p className="muted">Quando uma obra for liberada pela Innovar, ela aparecerá aqui.</p></article> : null}
      </section>
      <section className="card card-pad" style={{ marginTop: 22 }}><h2>Atualizações recentes</h2><div style={{ marginTop: 14 }}>{(logsResult.data ?? []).map((log) => <div key={log.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)" }}><span><strong>{formatDate(log.log_date)}</strong><br /><span className="muted">{log.summary || "Atualização da obra"}</span></span><span className="badge badge-success">Aprovado</span></div>)}{!logsResult.data?.length ? <p className="muted">Nenhuma atualização liberada.</p> : null}</div></section>
    </main>
  );
}
