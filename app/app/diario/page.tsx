import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { dailyLogStatusLabels, formatDate, statusBadge } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function AllDailyLogsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("id,project_id,log_date,shift,status,weather,summary,occurrences,client_visible,projects(code,name),daily_log_media(count)")
    .eq("organization_id", organizationId)
    .order("log_date", { ascending: false })
    .limit(100);

  reportDataAccessError("all-daily-logs.logs", error);

  const loadFailed = Boolean(error);
  const logs = data ?? [];
  const submitted = logs.filter((log) => log.status === "SUBMITTED").length;
  const approved = logs.filter((log) => log.status === "APPROVED").length;
  const withOccurrences = logs.filter((log) => Boolean(log.occurrences)).length;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">CAMPO</span>
          <h1>Diário de obras</h1>
          <p className="muted">Registros recentes de todas as obras e fila de aprovação.</p>
        </div>
      </div>

      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      {!loadFailed ? (
        <>
          <section className="grid grid-kpi">
            <article className="card kpi"><small>REGISTROS</small><strong>{logs.length}</strong></article>
            <article className="card kpi"><small>AGUARDANDO APROVAÇÃO</small><strong>{submitted}</strong></article>
            <article className="card kpi"><small>APROVADOS</small><strong>{approved}</strong></article>
            <article className="card kpi"><small>COM OCORRÊNCIAS</small><strong>{withOccurrences}</strong></article>
          </section>

          <section className="card table-wrap" style={{ marginTop: 22 }}>
            <table>
              <thead><tr><th>Data</th><th>Obra</th><th>Status</th><th>Clima</th><th>Resumo</th><th>Mídias</th><th>Portal</th></tr></thead>
              <tbody>
                {logs.map((log) => {
                  const project = singleRelation(log.projects);
                  const mediaCount = Array.isArray(log.daily_log_media) ? Number(log.daily_log_media[0]?.count ?? 0) : 0;
                  return (
                    <tr key={log.id}>
                      <td><Link href={`/app/obras/${log.project_id}/diario/${log.id}`}><strong>{formatDate(log.log_date)}</strong></Link></td>
                      <td>{project?.code || "—"}<br /><span className="muted">{project?.name || ""}</span></td>
                      <td><span className={statusBadge(log.status)}>{dailyLogStatusLabels[log.status] ?? log.status}</span></td>
                      <td>{log.weather || "—"}</td>
                      <td style={{ whiteSpace: "normal", minWidth: 260 }}>{log.summary || "—"}</td>
                      <td>{mediaCount}</td>
                      <td>{log.client_visible ? <span className="badge badge-success">Liberado</span> : <span className="badge">Interno</span>}</td>
                    </tr>
                  );
                })}
                {!logs.length ? <tr><td colSpan={7}>Nenhum diário registrado.</td></tr> : null}
              </tbody>
            </table>
          </section>
        </>
      ) : (
        <section className="card card-pad"><strong>Diários temporariamente indisponíveis.</strong><p className="muted">Recarregue a tela antes de concluir que não há registros ou aprovações pendentes.</p></section>
      )}
    </main>
  );
}
