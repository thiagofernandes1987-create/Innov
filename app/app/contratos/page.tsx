import { requireOrganizationContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";

export default async function ContractsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("contracts")
    .select("id, code, title, status, original_value, amendment_value, consolidated_value, starts_at, ends_at, client_released_at, clients(legal_name)")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">CONTRATUAL</span><h1>Contratos</h1><p className="muted">Versões, valores consolidados, aditivos e assinatura eletrônica.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="card table-wrap">
        <table>
          <thead><tr><th>Contrato</th><th>Cliente</th><th>Status</th><th>Original</th><th>Aditivos</th><th>Consolidado</th><th>Período</th><th>Portal</th></tr></thead>
          <tbody>
            {(data ?? []).map((contract) => {
              const client = contract.clients as { legal_name: string } | null;
              return <tr key={contract.id}>
                <td><strong>{contract.code}</strong><br /><span className="muted">{contract.title}</span></td>
                <td>{client?.legal_name ?? "—"}</td>
                <td><span className="badge">{contract.status}</span></td>
                <td className="mono">{formatCurrency(Number(contract.original_value))}</td>
                <td className="mono">{formatCurrency(Number(contract.amendment_value))}</td>
                <td className="mono"><strong>{formatCurrency(Number(contract.consolidated_value))}</strong></td>
                <td>{contract.starts_at ?? "—"} → {contract.ends_at ?? "—"}</td>
                <td>{contract.client_released_at ? <span className="badge badge-success">Liberado</span> : <span className="badge">Interno</span>}</td>
              </tr>;
            })}
            {!data?.length ? <tr><td colSpan={8}>Nenhum contrato cadastrado.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
