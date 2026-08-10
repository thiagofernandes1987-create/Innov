import { requireClientContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ClientAmendmentsPage() {
  const { supabase, client } = await requireClientContext();
  const { data, error } = await supabase
    .from("amendments")
    .select(`
      id, code, status, reason, scope_delta, value_delta, days_delta,
      new_end_date, client_released_at,
      contracts!inner(id, code, title, client_id),
      amendment_versions!amendments_current_version_fk(
        id, version_number, status, document_path, document_sha256, client_released_at
      )
    `)
    .eq("contracts.client_id", client.id)
    .not("client_released_at", "is", null)
    .order("updated_at", { ascending: false });

  if (error) reportDataAccessError("client-amendments.page.load", error);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">ALTERAÇÕES CONTRATUAIS</span>
          <h1>Aditivos</h1>
          <p className="muted">Alterações de escopo, valor e prazo formalmente liberadas.</p>
        </div>
      </div>

      {error ? <div className="validation blocking" role="alert">Não foi possível carregar os aditivos.</div> : null}

      <section className="grid">
        {(data ?? []).map((amendment) => {
          const contract = singleRelation(amendment.contracts);
          const version = singleRelation(amendment.amendment_versions);

          return (
            <article key={amendment.id} className="card card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                <div>
                  <span className="badge">{amendment.code} · V{version?.version_number ?? "—"}</span>
                  <h2 style={{ marginTop: 12 }}>{amendment.reason}</h2>
                  <p className="muted">Contrato {contract?.code ?? "—"} · {contract?.title ?? ""}</p>
                </div>
                <span className="badge badge-warning">{amendment.status}</span>
              </div>
              {amendment.scope_delta ? <p>{amendment.scope_delta}</p> : null}
              <div className="grid grid-kpi" style={{ marginTop: 18 }}>
                <div className="card kpi"><small>ALTERAÇÃO DE VALOR</small><strong>{formatCurrency(Number(amendment.value_delta))}</strong></div>
                <div className="card kpi"><small>ALTERAÇÃO DE PRAZO</small><strong>{Number(amendment.days_delta)} dias</strong></div>
                <div className="card kpi"><small>NOVA DATA FINAL</small><strong style={{ fontSize: 19 }}>{amendment.new_end_date ?? "—"}</strong></div>
                <div className="card kpi"><small>DOCUMENTO</small><strong style={{ fontSize: 19 }}>{version?.document_path && version?.client_released_at ? "Disponível" : "Em preparação"}</strong></div>
              </div>
            </article>
          );
        })}
        {!data?.length ? <section className="card card-pad"><strong>Nenhum aditivo liberado.</strong><p className="muted">O contrato original permanece preservado mesmo quando novos aditivos são assinados.</p></section> : null}
      </section>
    </main>
  );
}
