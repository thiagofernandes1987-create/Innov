import { requireOrganizationContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";

export default async function AmendmentsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("amendments")
    .select("id, code, status, reason, value_delta, days_delta, new_end_date, client_released_at, contracts(code,title)")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">ALTERAÇÕES CONTRATUAIS</span><h1>Aditivos</h1><p className="muted">Impactos de escopo, valor e prazo preservando o contrato original.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="card table-wrap">
        <table>
          <thead><tr><th>Aditivo</th><th>Contrato</th><th>Motivo</th><th>Status</th><th>Valor</th><th>Prazo</th><th>Nova data</th><th>Portal</th></tr></thead>
          <tbody>
            {(data ?? []).map((amendment) => {
              const contract = amendment.contracts as { code: string; title: string } | null;
              return <tr key={amendment.id}>
                <td><strong>{amendment.code}</strong></td>
                <td>{contract?.code ?? "—"}<br /><span className="muted">{contract?.title ?? ""}</span></td>
                <td>{amendment.reason}</td>
                <td><span className="badge">{amendment.status}</span></td>
                <td className="mono">{formatCurrency(Number(amendment.value_delta))}</td>
                <td className="mono">{Number(amendment.days_delta)} dias</td>
                <td>{amendment.new_end_date ?? "—"}</td>
                <td>{amendment.client_released_at ? <span className="badge badge-success">Liberado</span> : <span className="badge">Interno</span>}</td>
              </tr>;
            })}
            {!data?.length ? <tr><td colSpan={8}>Nenhum aditivo cadastrado.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
