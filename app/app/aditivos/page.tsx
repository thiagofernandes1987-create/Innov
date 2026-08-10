import Link from "next/link";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireOrganizationContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { singleRelation } from "@/lib/supabase/relations";

export default async function AmendmentsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("amendments")
    .select("id, code, status, reason, value_delta, days_delta, new_end_date, client_released_at, contracts(code,title)")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) reportDataAccessError("amendments.page.load", error);

  return (
    <main className="content">
      <BarraDeTrabalho title="Aditivos" primaryAction={<Link className="button button-primary" href="/app/aditivos/novo">Novo aditivo</Link>} />
      <p className="workspace-intro">Impactos de escopo, valor e prazo registrados antes da execução, preservando o contrato original.</p>
      {error ? <div className="validation blocking">Não foi possível carregar os aditivos.</div> : null}
      <section className="card table-wrap">
        <table>
          <thead><tr><th>Aditivo</th><th>Contrato</th><th>Motivo</th><th>Status</th><th>Valor</th><th>Prazo</th><th>Nova data</th><th>Portal</th></tr></thead>
          <tbody>
            {(data ?? []).map((amendment) => {
              const contract = singleRelation(amendment.contracts);
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
