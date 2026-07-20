import Link from "next/link";
import { notFound } from "next/navigation";
import { createDailyLog } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { dailyLogStatusLabels, formatDate, statusBadge } from "@/lib/stage12";

export default async function DailyLogsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const [{ data: project }, { data: logs, error }] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("daily_logs").select("id,log_date,shift,status,weather,summary,occurrences,client_visible,created_at,daily_log_media(count)").eq("project_id", id).order("log_date", { ascending: false })
  ]);
  if (!project) notFound();

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Diário de obra</h1>
          <p className="muted">Registro diário de produção, clima, ocorrências, segurança, qualidade e evidências.</p>
        </div>
      </div>

      {pageError ? <div className="validation blocking">{pageError}</div> : null}
      {error ? <div className="validation blocking">{error.message}</div> : null}

      <div className="split-layout">
        <section className="card table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Turno</th><th>Status</th><th>Clima</th><th>Resumo</th><th>Mídias</th><th>Portal</th></tr></thead>
            <tbody>
              {(logs ?? []).map((log) => {
                const mediaCount = Array.isArray(log.daily_log_media) ? Number(log.daily_log_media[0]?.count ?? 0) : 0;
                return (
                  <tr key={log.id}>
                    <td><Link href={`/app/obras/${id}/diario/${log.id}`}><strong>{formatDate(log.log_date)}</strong></Link></td>
                    <td>{log.shift}</td>
                    <td><span className={statusBadge(log.status)}>{dailyLogStatusLabels[log.status] ?? log.status}</span></td>
                    <td>{log.weather || "—"}</td>
                    <td style={{ maxWidth: 320, whiteSpace: "normal" }}>{log.summary || "—"}</td>
                    <td>{mediaCount}</td>
                    <td>{log.client_visible ? <span className="badge badge-success">Liberado</span> : <span className="badge">Interno</span>}</td>
                  </tr>
                );
              })}
              {!logs?.length ? <tr><td colSpan={7}>Nenhum diário registrado.</td></tr> : null}
            </tbody>
          </table>
        </section>

        <aside className="card form-card">
          <h2>Novo diário</h2>
          <p className="muted">Formulário otimizado para preenchimento em campo.</p>
          <form action={createDailyLog}>
            <input type="hidden" name="projectId" value={id} />
            <div className="field-grid">
              <label>Data<input type="date" name="logDate" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
              <label>Turno<select name="shift" defaultValue="DAY"><option value="DAY">Diurno</option><option value="NIGHT">Noturno</option><option value="EXTRA">Extraordinário</option></select></label>
              <label>Clima<select name="weather"><option value="">Não informado</option><option value="Ensolarado">Ensolarado</option><option value="Parcialmente nublado">Parcialmente nublado</option><option value="Nublado">Nublado</option><option value="Chuva leve">Chuva leve</option><option value="Chuva forte">Chuva forte</option><option value="Neblina">Neblina</option></select></label>
              <label>Temperatura mínima<input type="number" step="0.1" name="minTemperature" /></label>
              <label>Temperatura máxima<input type="number" step="0.1" name="maxTemperature" /></label>
            </div>
            <label>Resumo do dia<textarea name="summary" rows={3} /></label>
            <label>Atividades previstas<textarea name="plannedActivities" rows={3} /></label>
            <label>Atividades executadas<textarea name="executedActivities" rows={4} /></label>
            <label>Ocorrências<textarea name="occurrences" rows={3} /></label>
            <button className="button button-primary" type="submit">Criar e continuar preenchimento</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
