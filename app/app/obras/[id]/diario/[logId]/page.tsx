import Image from "next/image";
import { notFound } from "next/navigation";
import {
  addDailyLogActivity,
  decideDailyLog,
  submitDailyLog,
  updateDailyLog,
  uploadDailyLogMedia
} from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { dailyLogStatusLabels, formatDate, formatPercent, statusBadge } from "@/lib/stage12";

export default async function DailyLogDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string; logId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, logId } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId, role } = await requireOrganizationContext();
  const [projectResult, logResult, activitiesResult, mediaResult, tasksResult] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("daily_logs").select("*").eq("id", logId).eq("project_id", id).maybeSingle(),
    supabase.from("daily_log_activities").select("id,description,unit,executed_quantity,progress_before,progress_after,project_tasks(code,title)").eq("daily_log_id", logId).order("created_at"),
    supabase.from("daily_log_media").select("id,storage_path,file_name,mime_type,size_bytes,caption,captured_at,client_visible").eq("daily_log_id", logId).order("created_at", { ascending: false }),
    supabase.from("project_tasks").select("id,code,title,status,progress").eq("project_id", id).neq("status", "CANCELED").order("sequence")
  ]);
  if (!projectResult.data || !logResult.data) notFound();
  const project = projectResult.data;
  const log = logResult.data;
  const editable = ["DRAFT", "REJECTED"].includes(log.status);
  const canApprove = ["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "GESTOR_OBRAS", "ENGENHEIRO"].includes(role);
  const paths = (mediaResult.data ?? []).map((media) => media.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("daily-log-media").createSignedUrls(paths, 900)
    : { data: [] };
  const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Diário de {formatDate(log.log_date)}</h1>
          <p className="muted">Turno {log.shift} · {log.weather || "clima não informado"}</p>
        </div>
        <span className={statusBadge(log.status)}>{dailyLogStatusLabels[log.status] ?? log.status}</span>
      </div>

      {pageError ? <div className="validation blocking">{pageError}</div> : null}
      {log.rejection_reason ? <div className="validation blocking"><strong>Motivo da rejeição:</strong> {log.rejection_reason}</div> : null}

      <section className="card card-pad">
        <form action={updateDailyLog} className="field-form">
          <input type="hidden" name="projectId" value={id} />
          <input type="hidden" name="dailyLogId" value={logId} />
          <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0 }} className="field-form">
            <div className="field-grid">
              <label>Clima<input name="weather" defaultValue={log.weather ?? ""} /></label>
              <label>Temperatura mínima<input type="number" step="0.1" name="minTemperature" defaultValue={log.min_temperature ?? ""} /></label>
              <label>Temperatura máxima<input type="number" step="0.1" name="maxTemperature" defaultValue={log.max_temperature ?? ""} /></label>
              <label className="span-2">Resumo<textarea name="summary" rows={3} defaultValue={log.summary ?? ""} /></label>
              <label className="span-2">Atividades previstas<textarea name="plannedActivities" rows={3} defaultValue={log.planned_activities ?? ""} /></label>
              <label className="span-2">Atividades executadas<textarea name="executedActivities" rows={4} defaultValue={log.executed_activities ?? ""} /></label>
              <label className="span-2">Ocorrências<textarea name="occurrences" rows={3} defaultValue={log.occurrences ?? ""} /></label>
              <label>Segurança<textarea name="safetyNotes" rows={3} defaultValue={log.safety_notes ?? ""} /></label>
              <label>Qualidade<textarea name="qualityNotes" rows={3} defaultValue={log.quality_notes ?? ""} /></label>
              <label className="span-2">Atrasos e interferências<textarea name="delayNotes" rows={3} defaultValue={log.delay_notes ?? ""} /></label>
            </div>
            {editable ? <button className="button button-secondary" type="submit">Salvar rascunho</button> : null}
          </fieldset>
        </form>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", marginTop: 22 }}>
        <article className="card card-pad">
          <h2>Atividades vinculadas</h2>
          <div style={{ margin: "14px 0 20px" }}>
            {(activitiesResult.data ?? []).map((activity) => {
              const task = Array.isArray(activity.project_tasks) ? activity.project_tasks[0] : activity.project_tasks;
              return <div key={activity.id} style={{ padding: "11px 0", borderBottom: "1px solid var(--border)" }}><strong>{task?.code ? `${task.code} · ` : ""}{activity.description}</strong><br /><span className="muted">{activity.executed_quantity ?? "—"} {activity.unit ?? ""} · {activity.progress_after == null ? "sem avanço" : `${formatPercent(activity.progress_before)} → ${formatPercent(activity.progress_after)}`}</span></div>;
            })}
            {!activitiesResult.data?.length ? <p className="muted">Nenhuma atividade detalhada.</p> : null}
          </div>
          {editable ? <form action={addDailyLogActivity} className="field-form">
            <input type="hidden" name="projectId" value={id} /><input type="hidden" name="dailyLogId" value={logId} />
            <label>Tarefa<select name="taskId"><option value="">Sem vínculo</option>{(tasksResult.data ?? []).map((task) => <option key={task.id} value={task.id}>{task.code} · {task.title}</option>)}</select></label>
            <label>Descrição<input name="description" required /></label>
            <div className="field-grid"><label>Quantidade<input type="number" step="0.01" name="executedQuantity" /></label><label>Unidade<input name="unit" /></label><label>Progresso anterior (%)<input type="number" min="0" max="100" name="progressBefore" /></label><label>Progresso final (%)<input type="number" min="0" max="100" name="progressAfter" /></label></div>
            <button className="button button-secondary" type="submit">Adicionar atividade</button>
          </form> : null}
        </article>

        <article className="card card-pad">
          <h2>Fotos, vídeos e documentos</h2>
          <p className="muted">Arquivos privados com URL assinada de curta duração.</p>
          {editable ? <form action={uploadDailyLogMedia} className="field-form" encType="multipart/form-data">
            <input type="hidden" name="projectId" value={id} /><input type="hidden" name="dailyLogId" value={logId} />
            <label>Arquivo<input type="file" name="file" accept="image/*,video/mp4,video/quicktime,application/pdf" required /></label>
            <label>Legenda<input name="caption" /></label>
            <label>Capturado em<input type="datetime-local" name="capturedAt" /></label>
            <label><span><input style={{ width: "auto" }} type="checkbox" name="clientVisible" /> Liberar ao cliente após aprovação</span></label>
            <button className="button button-secondary" type="submit">Enviar evidência</button>
          </form> : null}
        </article>
      </section>

      <section className="media-grid" style={{ marginTop: 22 }}>
        {(mediaResult.data ?? []).map((media) => {
          const signedUrl = signedByPath.get(media.storage_path);
          const image = media.mime_type.startsWith("image/");
          return <article className="media-card" key={media.id}><a href={signedUrl ?? "#"} target="_blank" rel="noreferrer"><div className="media-preview" style={{ position:"relative" }}>{image && signedUrl ? <Image src={signedUrl} alt={media.caption || media.file_name} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized style={{ objectFit:"cover" }} /> : <strong>{media.mime_type.startsWith("video/") ? "Vídeo" : "Documento"}</strong>}</div></a><div className="card-pad"><strong>{media.file_name}</strong><p className="muted">{media.caption || "Sem legenda"}</p>{media.client_visible ? <span className="badge badge-success">Cliente</span> : <span className="badge">Interno</span>}</div></article>;
        })}
      </section>

      <section className="field-actions" style={{ marginTop: 24 }}>
        {editable ? <form action={submitDailyLog}><input type="hidden" name="projectId" value={id} /><input type="hidden" name="dailyLogId" value={logId} /><button className="button button-primary" type="submit">Enviar para aprovação</button></form> : null}
        {canApprove && log.status === "SUBMITTED" ? <>
          <form action={decideDailyLog} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input type="hidden" name="projectId" value={id} /><input type="hidden" name="dailyLogId" value={logId} /><input type="hidden" name="decision" value="APPROVE" /><label><span><input style={{ width: "auto" }} type="checkbox" name="releaseClient" defaultChecked /> Liberar no portal</span></label><button className="button button-primary" type="submit">Aprovar diário</button></form>
          <form action={decideDailyLog} style={{ display: "flex", gap: 8, flex: 1 }}><input type="hidden" name="projectId" value={id} /><input type="hidden" name="dailyLogId" value={logId} /><input type="hidden" name="decision" value="REJECT" /><input name="reason" placeholder="Motivo obrigatório" required /><button className="button button-secondary" type="submit">Rejeitar</button></form>
        </> : null}
      </section>
    </main>
  );
}
