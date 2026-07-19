import { requireOrganizationContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";

export default async function ProposalsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("proposals")
    .select(`
      id, code, status, valid_until, client_released_at, updated_at,
      clients(legal_name),
      proposal_versions!proposals_current_version_fk(version_number,title,sale_price,document_sha256,frozen_at)
    `)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">COMERCIAL</span><h1>Propostas</h1><p className="muted">Documentos versionados derivados de orçamentos aprovados.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="card table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Cliente</th><th>Versão</th><th>Status</th><th>Preço</th><th>Documento</th><th>Cliente</th></tr></thead>
          <tbody>
            {(data ?? []).map((proposal) => {
              const version = proposal.proposal_versions as { version_number: number; title: string; sale_price: number; document_sha256: string | null; frozen_at: string | null } | null;
              const client = proposal.clients as { legal_name: string } | null;
              return <tr key={proposal.id}>
                <td><strong>{proposal.code}</strong><br /><span className="muted">{version?.title ?? "—"}</span></td>
                <td>{client?.legal_name ?? "—"}</td>
                <td className="mono">V{version?.version_number ?? "—"}</td>
                <td><span className="badge">{proposal.status}</span></td>
                <td className="mono">{formatCurrency(Number(version?.sale_price ?? 0))}</td>
                <td>{version?.document_sha256 ? <span className="badge badge-success">PDF com hash</span> : <span className="badge badge-warning">Pendente</span>}</td>
                <td>{proposal.client_released_at ? <span className="badge badge-success">Liberada</span> : <span className="badge">Interna</span>}</td>
              </tr>;
            })}
            {!data?.length ? <tr><td colSpan={7}>Nenhuma proposta cadastrada.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
