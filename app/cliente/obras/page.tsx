import Link from "next/link";
import { requireClientContext } from "@/lib/auth";
import { formatDate, formatPercent, statusBadge } from "@/lib/stage12";

export default async function ClientProjectsPage() {
  const { supabase, client } = await requireClientContext();
  const { data, error } = await supabase
    .from("projects")
    .select("id,code,name,status,description,address_line,city,state,planned_start,planned_end,progress")
    .eq("client_id", client.id)
    .not("client_released_at", "is", null)
    .order("updated_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head">
        <div><span className="badge">PORTFÓLIO</span><h1>Minhas obras</h1><p className="muted">Obras liberadas para sua conta.</p></div>
      </div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))" }}>
        {(data ?? []).map((project) => (
          <article className="card card-pad" key={project.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div><span className="mono muted">{project.code}</span><h2>{project.name}</h2></div>
              <span className={statusBadge(project.status)}>{project.status}</span>
            </div>
            <p className="muted">{project.description || "Acompanhamento da obra pela Innovar."}</p>
            <p>{project.address_line || [project.city, project.state].filter(Boolean).join(" / ") || "Local não informado"}</p>
            <div className="progress-row">
              <div><strong>Progresso</strong><span>{formatPercent(project.progress)}</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(project.progress) }} /></div>
            </div>
            <p className="muted">{formatDate(project.planned_start)} → {formatDate(project.planned_end)}</p>
            <Link className="button button-primary" href={`/cliente/obras/${project.id}`}>Abrir acompanhamento</Link>
          </article>
        ))}
        {!data?.length ? <article className="card card-pad"><strong>Nenhuma obra liberada.</strong></article> : null}
      </section>
    </main>
  );
}
