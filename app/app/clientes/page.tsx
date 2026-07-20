import Link from "next/link";
import { requireModulePermission } from "@/lib/auth";
import { formatPercent } from "@/lib/stage12";

const openStatuses = new Set(["PLANNING", "ACTIVE", "IN_PROGRESS", "ON_HOLD"]);

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const filters = await searchParams;
  const { supabase, organizationId, moduleAccess } = await requireModulePermission("clientes", "READ");
  let query = supabase
    .from("clients")
    .select("id,type,legal_name,trade_name,tax_id,email,phone,status,city,state,created_at,projects(id,status,progress,planned_end,archived_at)")
    .eq("organization_id", organizationId)
    .order("legal_name");

  if (filters.status && filters.status !== "ALL") query = query.eq("status", filters.status);
  if (filters.q) query = query.or(`legal_name.ilike.%${filters.q}%,trade_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);

  const { data, error } = await query;
  const clients = data ?? [];
  const allProjects = clients.flatMap((client) => client.projects ?? []);
  const openProjects = allProjects.filter((project) => openStatuses.has(project.status));
  const completedProjects = allProjects.filter((project) => ["COMPLETED", "ARCHIVED"].includes(project.status));

  return (
    <main className="content">
      <div className="page-head">
        <div><span className="badge">CLIENTE 1:N OBRAS</span><h1>Clientes</h1><p className="muted">Cadastro, contatos e obras abertas ou concluídas.</p></div>
        {moduleAccess?.access_level !== "READ" ? <Link className="button button-primary" href="/app/clientes/novo">Novo cliente</Link> : null}
      </div>
      {error ? <div className="validation blocking">{error.message}</div> : null}

      <section className="grid grid-kpi">
        <article className="card kpi"><small>CLIENTES ATIVOS</small><strong>{clients.filter((client) => client.status === "ACTIVE").length}</strong></article>
        <article className="card kpi"><small>OBRAS EM ABERTO</small><strong>{openProjects.length}</strong></article>
        <article className="card kpi"><small>OBRAS CONCLUÍDAS</small><strong>{completedProjects.length}</strong></article>
        <article className="card kpi"><small>TOTAL DE OBRAS</small><strong>{allProjects.length}</strong></article>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ flex: 1, minWidth: 240 }}>Buscar<input name="q" defaultValue={filters.q ?? ""} placeholder="Nome, empresa ou e-mail" /></label>
          <label>Status<select name="status" defaultValue={filters.status ?? "ALL"}><option value="ALL">Todos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option><option value="ARCHIVED">Arquivados</option></select></label>
          <button className="button button-secondary" type="submit">Filtrar</button>
        </form>
      </section>

      <section className="card table-wrap" style={{ marginTop: 22 }}>
        <table>
          <thead><tr><th>Cliente</th><th>Contato</th><th>Status</th><th>Abertas</th><th>Concluídas</th><th>Progresso médio</th><th>Local</th></tr></thead>
          <tbody>
            {clients.map((client) => {
              const projects = client.projects ?? [];
              const open = projects.filter((project) => openStatuses.has(project.status));
              const completed = projects.filter((project) => ["COMPLETED", "ARCHIVED"].includes(project.status));
              const average = open.length ? open.reduce((sum, project) => sum + Number(project.progress), 0) / open.length : 0;
              return <tr key={client.id}>
                <td><Link href={`/app/clientes/${client.id}`}><strong>{client.trade_name || client.legal_name}</strong><br /><span className="muted">{client.trade_name ? client.legal_name : client.type === "COMPANY" ? "Pessoa jurídica" : "Pessoa física"}</span></Link></td>
                <td>{client.email || "—"}<br /><span className="muted">{client.phone || ""}</span></td>
                <td><span className={client.status === "ACTIVE" ? "badge badge-success" : "badge"}>{client.status}</span></td>
                <td><strong>{open.length}</strong></td><td>{completed.length}</td><td>{formatPercent(average)}</td>
                <td>{[client.city, client.state].filter(Boolean).join(" / ") || "—"}</td>
              </tr>;
            })}
            {!clients.length ? <tr><td colSpan={7}>Nenhum cliente encontrado.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
