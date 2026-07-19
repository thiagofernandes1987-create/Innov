import { requireClientContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ClientBudgetsPage() {
  const { supabase, client } = await requireClientContext();

  const [{ data: proposals }, { data: contracts }] = await Promise.all([
    supabase
      .from("proposals")
      .select(`
        id, code, status, valid_until, client_released_at,
        proposal_versions!proposals_current_version_fk(
          id, version_number, title, commercial_summary, sale_price,
          payment_terms, deadline_text, warranty_text, client_released_at
        )
      `)
      .eq("client_id", client.id)
      .not("client_released_at", "is", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, code, title, status, consolidated_value, starts_at, ends_at, client_released_at")
      .eq("client_id", client.id)
      .not("client_released_at", "is", null)
      .order("updated_at", { ascending: false })
  ]);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">ÁREA COMERCIAL</span>
          <h1>Orçamentos e propostas</h1>
          <p className="muted">Somente versões liberadas pela Innovar são apresentadas aqui.</p>
        </div>
      </div>

      <section className="card">
        <div className="card-pad">
          <h2>Propostas disponíveis</h2>
          <p className="muted">Custos internos, BDI, markup, margem, lucro e ROI não fazem parte desta visualização.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Proposta</th><th>Versão</th><th>Status</th><th>Preço comercial</th><th>Validade</th></tr></thead>
            <tbody>
              {(proposals ?? []).map((proposal) => {
                const version = singleRelation(proposal.proposal_versions);
                return (
                  <tr key={proposal.id}>
                    <td><strong>{proposal.code}</strong><br /><span className="muted">{version?.title ?? "Proposta comercial"}</span></td>
                    <td className="mono">V{version?.version_number ?? "—"}</td>
                    <td><span className="badge">{proposal.status}</span></td>
                    <td className="mono"><strong>{formatCurrency(Number(version?.sale_price ?? 0))}</strong></td>
                    <td>{proposal.valid_until ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${proposal.valid_until}T12:00:00`)) : "—"}</td>
                  </tr>
                );
              })}
              {!proposals?.length ? <tr><td colSpan={5}>Nenhuma proposta foi liberada para este cliente.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: 22 }}>
        <div className="card-pad"><h2>Contratos relacionados</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Contrato</th><th>Status</th><th>Valor consolidado</th><th>Período</th></tr></thead>
            <tbody>
              {(contracts ?? []).map((contract) => (
                <tr key={contract.id}>
                  <td><strong>{contract.code}</strong><br /><span className="muted">{contract.title}</span></td>
                  <td><span className="badge">{contract.status}</span></td>
                  <td className="mono">{formatCurrency(Number(contract.consolidated_value))}</td>
                  <td>{contract.starts_at ?? "—"} → {contract.ends_at ?? "—"}</td>
                </tr>
              ))}
              {!contracts?.length ? <tr><td colSpan={4}>Nenhum contrato liberado.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
