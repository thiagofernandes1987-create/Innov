import { setApplicationState } from "@/app/actions/access-control";
import { requireAccessAdministration } from "@/lib/authorization";

type ApplicationRow = { key:string; name:string; description:string; category:string; sort_order:number; dependencies:string[] };
type OrganizationApplicationRow = { state:string; enabled_at:string|null; disabled_at:string|null; application:ApplicationRow };

export default async function ApplicationsAdminPage({ searchParams }: { searchParams: Promise<{ error?:string }> }) {
  const context = await requireAccessAdministration();
  const params = await searchParams;
  const { data, error } = await context.supabase
    .from("organization_applications")
    .select("state,enabled_at,disabled_at,applications!inner(key,name,description,category,sort_order,dependencies)")
    .eq("organization_id", context.organizationId);
  if (error) throw new Error(error.message);

  const rows: OrganizationApplicationRow[] = (data ?? []).flatMap((row) => {
    const relation = Array.isArray(row.applications) ? row.applications[0] : row.applications;
    if (!relation) return [];
    return [{
      state: String(row.state),
      enabled_at: row.enabled_at,
      disabled_at: row.disabled_at,
      application: relation as ApplicationRow
    }];
  }).sort((a,b) => a.application.sort_order-b.application.sort_order);

  return (
    <main className="content">
      <section className="page-heading"><div><span className="badge">CATÁLOGO</span><h1>Aplicativos da organização</h1><p>Desabilitar remove o módulo do menu e bloqueia suas rotas, sem apagar o histórico.</p></div></section>
      {params.error && <p className="alert alert-danger">{params.error}</p>}
      <section className="card" style={{ overflowX:"auto" }}>
        <table className="data-table">
          <thead><tr><th>Aplicativo</th><th>Categoria</th><th>Dependências</th><th>Estado</th><th>Alterar</th></tr></thead>
          <tbody>{rows.map(row => (
            <tr key={row.application.key}>
              <td><strong>{row.application.name}</strong><small style={{ display:"block" }}>{row.application.description}</small></td>
              <td>{row.application.category}</td>
              <td>{row.application.dependencies?.length ? row.application.dependencies.join(", ") : "—"}</td>
              <td><span className="badge">{row.state}</span></td>
              <td>
                <form action={setApplicationState} style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <input type="hidden" name="applicationKey" value={row.application.key}/>
                  <select name="state" defaultValue={row.state}>
                    <option value="ENABLED">Habilitado</option><option value="DISABLED">Desabilitado</option><option value="MAINTENANCE">Manutenção</option><option value="DEPRECATED">Obsoleto</option><option value="ARCHIVED">Arquivado</option>
                  </select>
                  <input name="reason" placeholder="Justificativa" required/>
                  <button className="button button-secondary" type="submit">Salvar</button>
                </form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </main>
  );
}
