import { notFound } from "next/navigation";
import { requireClientContext } from "@/lib/auth";
import { formatDate, formatPercent, statusBadge, taskStatusLabels } from "@/lib/stage12";

export default async function ClientProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, client } = await requireClientContext();
  const [projectResult, tasksResult, milestonesResult, snapshotsResult, logsResult, mediaResult, documentsResult] = await Promise.all([
    supabase.from("projects").select("id,code,name,status,description,address_line,city,state,planned_start,planned_end,actual_start,progress").eq("id", id).eq("client_id", client.id).not("client_released_at", "is", null).maybeSingle(),
    supabase.from("project_tasks").select("id,code,title,status,progress,planned_start,planned_end").eq("project_id", id).eq("client_visible", true).neq("status", "CANCELED").order("planned_start"),
    supabase.from("project_milestones").select("id,code,title,planned_date,actual_date,completed").eq("project_id", id).eq("client_visible", true).order("planned_date"),
    supabase.from("project_progress_snapshots").select("snapshot_date,planned_progress,actual_progress").eq("project_id", id).order("snapshot_date"),
    supabase.from("daily_logs").select("id,log_date,summary,executed_activities,status").eq("project_id", id).eq("client_visible", true).eq("status", "APPROVED").order("log_date", { ascending: false }).limit(10),
    supabase.from("daily_log_media").select("id,storage_path,file_name,mime_type,caption,captured_at").eq("project_id", id).eq("client_visible", true).order("created_at", { ascending: false }).limit(12),
    supabase.from("project_documents").select("id,code,title,discipline,status").eq("project_id", id).eq("client_visible", true).eq("status", "RELEASED").order("discipline")
  ]);
  const project = projectResult.data;
  if (!project) notFound();
  const paths = (mediaResult.data ?? []).map((media) => media.storage_path);
  const { data: signed } = paths.length ? await supabase.storage.from("daily-log-media").createSignedUrls(paths, 900) : { data: [] };
  const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  const latest = snapshotsResult.data?.at(-1);

  return (
    <main className="content">
      <section className="project-hero">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 22, flexWrap: "wrap" }}>
          <div><span className="badge">{project.code}</span><h1 style={{ marginTop: 14 }}>{project.name}</h1><p className="muted">{project.description || "Acompanhamento da execução pela Innovar."}</p></div>
          <div className="client-progress-ring" style={{ "--progress": formatPercent(project.progress) } as React.CSSProperties}><strong>{formatPercent(project.progress)}</strong></div>
        </div>
        <div className="project-meta"><span><strong>Status:</strong> {project.status}</span><span><strong>Período:</strong> {formatDate(project.planned_start)} → {formatDate(project.planned_end)}</span><span><strong>Local:</strong> {project.address_line || [project.city, project.state].filter(Boolean).join(" / ") || "—"}</span></div>
      </section>

      <section className="grid grid-kpi">
        <article className="card kpi"><small>PROGRESSO REAL</small><strong>{formatPercent(latest?.actual_progress ?? project.progress)}</strong></article>
        <article className="card kpi"><small>PROGRESSO PREVISTO</small><strong>{formatPercent(latest?.planned_progress)}</strong></article>
        <article className="card kpi"><small>MARCOS CONCLUÍDOS</small><strong>{(milestonesResult.data ?? []).filter((item) => item.completed).length}/{milestonesResult.data?.length ?? 0}</strong></article>
        <article className="card kpi"><small>DOCUMENTOS</small><strong>{documentsResult.data?.length ?? 0}</strong></article>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <h2>Cronograma liberado</h2>
        <p className="muted">Somente atividades autorizadas pela Innovar aparecem aqui.</p>
        <div className="table-wrap"><table><thead><tr><th>Atividade</th><th>Status</th><th>Progresso</th><th>Período</th></tr></thead><tbody>{(tasksResult.data ?? []).map((task) => <tr key={task.id}><td><span className="mono">{task.code}</span><br /><strong>{task.title}</strong></td><td><span className={statusBadge(task.status)}>{taskStatusLabels[task.status] ?? task.status}</span></td><td>{formatPercent(task.progress)}</td><td>{formatDate(task.planned_start)} → {formatDate(task.planned_end)}</td></tr>)}{!tasksResult.data?.length ? <tr><td colSpan={4}>Nenhuma atividade foi liberada.</td></tr> : null}</tbody></table></div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", marginTop: 22 }}>
        <article className="card card-pad"><h2>Marcos</h2><div style={{ marginTop: 14 }}>{(milestonesResult.data ?? []).map((milestone) => <div key={milestone.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)" }}><span><strong>{milestone.code}</strong> · {milestone.title}</span><span className={milestone.completed ? "badge badge-success" : "badge"}>{formatDate(milestone.actual_date || milestone.planned_date)}</span></div>)}{!milestonesResult.data?.length ? <p className="muted">Nenhum marco liberado.</p> : null}</div></article>
        <article className="card card-pad"><h2>Atualizações de campo</h2><div style={{ marginTop: 14 }}>{(logsResult.data ?? []).map((log) => <div key={log.id} style={{ padding: "11px 0", borderBottom: "1px solid var(--border)" }}><strong>{formatDate(log.log_date)}</strong><p className="muted">{log.summary || log.executed_activities || "Atualização da obra"}</p></div>)}{!logsResult.data?.length ? <p className="muted">Nenhum diário foi liberado.</p> : null}</div></article>
      </section>

      <section style={{ marginTop: 22 }}><h2>Fotos e vídeos liberados</h2><div className="media-grid" style={{ marginTop: 14 }}>{(mediaResult.data ?? []).map((media) => { const url = signedByPath.get(media.storage_path); const image = media.mime_type.startsWith("image/"); return <article className="media-card" key={media.id}><a href={url ?? "#"} target="_blank" rel="noreferrer"><div className="media-preview">{image && url ? <img src={url} alt={media.caption || media.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <strong>{media.mime_type.startsWith("video/") ? "Vídeo" : "Arquivo"}</strong>}</div></a><div className="card-pad"><strong>{media.file_name}</strong><p className="muted">{media.caption || "Sem legenda"}</p></div></article>; })}{!mediaResult.data?.length ? <p className="muted">Nenhuma mídia liberada.</p> : null}</div></section>
    </main>
  );
}
