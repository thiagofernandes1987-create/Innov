import Link from "next/link";
import { decideFlexibleProposalDiscount } from "@/app/actions/flexible-workflows";
import { SmartSearchBar } from "@/components/busca/smart-search-bar";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireOrganizationContext } from "@/lib/auth";
import { formatCurrency, formatPercent } from "@/lib/domain";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ProposalsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; pricingMode?: string; city?: string; error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("proposals")
    .select(`
      id, code, status, valid_until, client_released_at, updated_at,
      clients(legal_name,trade_name,email,phone,city),
      proposal_versions!proposals_current_version_fk(
        id,version_number,title,pricing_mode,base_price,discount_rate,
        discount_amount,discount_status,sale_price,document_sha256,frozen_at
      )
    `)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  const normalizedQuery = String(query.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const proposals = (data ?? []).filter((proposal) => {
    const version = singleRelation(proposal.proposal_versions);
    const client = singleRelation(proposal.clients);
    const searchable = [
      proposal.code,
      version?.title,
      client?.legal_name,
      client?.trade_name,
      client?.email,
      client?.phone,
      client?.city
    ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");

    if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
    if (query.status && proposal.status !== query.status) return false;
    if (query.pricingMode && version?.pricing_mode !== query.pricingMode) return false;
    if (query.city && !String(client?.city ?? "").toLocaleLowerCase("pt-BR").includes(query.city.toLocaleLowerCase("pt-BR"))) return false;
    return true;
  });

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Propostas"
        primaryAction={<Link className="button button-primary" href="/app/propostas/nova">Nova proposta</Link>}
        meta={<span className="pipeline-contagem">{proposals.length} proposta(s)</span>}
      />
      <SmartSearchBar
        initialQuery={query.q}
        initialFilters={query}
        placeholder="Buscar por código, cliente, contato, e-mail, telefone ou cidade..."
        filters={[
          {
            name: "status",
            label: "Situação",
            type: "select",
            options: [
              { value: "DRAFT", label: "Rascunho" },
              { value: "INTERNAL_REVIEW", label: "Revisão interna" },
              { value: "APPROVED", label: "Aprovada" },
              { value: "SENT", label: "Enviada" },
              { value: "ACCEPTED", label: "Aceita" },
              { value: "REJECTED", label: "Rejeitada" }
            ]
          },
          {
            name: "pricingMode",
            label: "Precificação",
            type: "select",
            options: [
              { value: "BUDGET", label: "Por orçamento" },
              { value: "FIXED", label: "Valor fixo" }
            ]
          },
          { name: "city", label: "Cidade", placeholder: "Taubaté" }
        ]}
      />
      <p className="workspace-intro">Propostas podem nascer de orçamento calculado ou de valor fixo, com desconto e alçada auditável.</p>
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      {error ? <div className="validation blocking" role="alert">{error.message}</div> : null}
      <section className="card table-wrap" style={{ marginTop: 18 }}>
        <table>
          <thead><tr><th>Código</th><th>Cliente</th><th>Origem</th><th>Status</th><th>Valor base</th><th>Desconto</th><th>Valor final</th><th>Documento</th><th>Ação</th></tr></thead>
          <tbody>
            {proposals.map((proposal) => {
              const version = singleRelation(proposal.proposal_versions);
              const client = singleRelation(proposal.clients);
              const discountRate = Number(version?.discount_rate ?? 0);
              return <tr key={proposal.id}>
                <td><strong>{proposal.code}</strong><br /><span className="muted">{version?.title ?? "—"}</span></td>
                <td>{client?.trade_name || client?.legal_name || "—"}<br /><small className="muted">{client?.city || client?.email || "—"}</small></td>
                <td><span className="badge">{version?.pricing_mode === "FIXED" ? "Valor fixo" : "Orçamento"}</span></td>
                <td><span className={proposal.status === "INTERNAL_REVIEW" ? "badge badge-warning" : "badge"}>{proposal.status}</span></td>
                <td className="mono">{formatCurrency(Number(version?.base_price ?? 0))}</td>
                <td>
                  <strong className="mono">{formatPercent(discountRate)}</strong><br />
                  <small className={version?.discount_status === "PENDING" ? "badge badge-warning" : "muted"}>{version?.discount_status ?? "—"}</small>
                </td>
                <td className="mono"><strong>{formatCurrency(Number(version?.sale_price ?? 0))}</strong></td>
                <td>{version?.document_sha256 ? <span className="badge badge-success">PDF com hash</span> : <span className="badge badge-warning">Rascunho sem PDF</span>}</td>
                <td>
                  {version?.discount_status === "PENDING" ? (
                    <form action={decideFlexibleProposalDiscount} className="proposal-approval-form">
                      <input type="hidden" name="proposalVersionId" value={version.id} />
                      <label>Comentário<input name="comment" required placeholder="Decisão da diretoria" /></label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="button button-primary button-compact" name="decision" value="APPROVED">Aprovar</button>
                        <button className="button button-secondary button-compact" name="decision" value="REJECTED">Rejeitar</button>
                      </div>
                    </form>
                  ) : proposal.client_released_at ? <span className="badge badge-success">Liberada ao cliente</span> : <span className="muted">Sem ação pendente</span>}
                </td>
              </tr>;
            })}
            {!proposals.length ? <tr><td colSpan={9}>Nenhuma proposta encontrada com os filtros informados.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
