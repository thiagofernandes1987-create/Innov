import Link from "next/link";
import { createBudget } from "@/app/actions/create-budget";
import { requireOrganizationContext } from "@/lib/auth";

type NewBudgetProps = { searchParams: Promise<{ error?: string }> };

export default async function NewBudgetPage({ searchParams }: NewBudgetProps) {
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "COMERCIAL", "ORCAMENTISTA"
  ]);
  const { data: clients } = await supabase
    .from("clients")
    .select("id, legal_name, trade_name")
    .eq("organization_id", organizationId)
    .order("legal_name");

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">NOVO ORÇAMENTO</span>
          <h1>Iniciar versão comercial</h1>
          <p className="muted">A criação abre a versão V1 em rascunho. Custos, BDI, markup, ROI e cenários são configurados no detalhe.</p>
        </div>
        <Link className="button button-secondary" href="/app/orcamentos">Cancelar</Link>
      </div>

      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}

      <section className="card card-pad" style={{ maxWidth: 760 }}>
        <form action={createBudget} className="grid">
          <label>
            Cliente
            <select name="clientId" required defaultValue="">
              <option value="" disabled>Selecione o cliente</option>
              {(clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>{client.trade_name || client.legal_name}</option>
              ))}
            </select>
          </label>
          <div className="grid" style={{ gridTemplateColumns: "180px minmax(0,1fr)" }}>
            <label>Código<input name="code" placeholder="ORC-0001" required /></label>
            <label>Título<input name="title" placeholder="Residência Alto Capivari" required /></label>
          </div>
          <label>Validade da proposta<input name="validUntil" type="date" /></label>
          <div className="validation">
            Depois de criado, o orçamento passa pelo fluxo: EAP → custos → taxa administrativa → BDI → markup → margem e ROI → cenários → validações → aprovação → proposta.
          </div>
          <button className="button button-primary" type="submit">Criar orçamento e versão V1</button>
        </form>
      </section>
    </main>
  );
}
