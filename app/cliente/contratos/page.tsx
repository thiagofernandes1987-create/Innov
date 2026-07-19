import { requireClientContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ClientContractsPage() {
  const { supabase, client } = await requireClientContext();
  const { data, error } = await supabase
    .from("contracts")
    .select(`
      id, code, title, status, consolidated_value, starts_at, ends_at, client_released_at,
      contract_versions!contracts_current_version_fk(
        id, version_number, value, currency, document_path, document_sha256,
        status, client_released_at
      )
    `)
    .eq("client_id", client.id)
    .not("client_released_at", "is", null)
    .order("updated_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">DOCUMENTOS CONTRATUAIS</span>
          <h1>Contratos</h1>
          <p className="muted">Somente contratos e versões liberados para sua conta.</p>
        </div>
      </div>

      {error ? <div className="validation blocking" role="alert">{error.message}</div> : null}

      <section className="card table-wrap">
        <table>
          <thead>
            <tr><th>Contrato</th><th>Versão</th><th>Status</th><th>Valor consolidado</th><th>Período</th><th>Documento</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((contract) => {
              const version = singleRelation(contract.contract_versions);

              return (
                <tr key={contract.id}>
                  <td><strong>{contract.code}</strong><br /><span className="muted">{contract.title}</span></td>
                  <td className="mono">V{version?.version_number ?? "—"}</td>
                  <td><span className="badge">{contract.status}</span></td>
                  <td className="mono"><strong>{formatCurrency(Number(contract.consolidated_value))}</strong></td>
                  <td>{contract.starts_at ?? "—"} → {contract.ends_at ?? "—"}</td>
                  <td>{version?.document_path && version?.client_released_at ? <span className="badge badge-success">Disponível</span> : <span className="badge badge-warning">Em preparação</span>}</td>
                </tr>
              );
            })}
            {!data?.length ? <tr><td colSpan={6}>Nenhum contrato foi liberado para esta conta.</td></tr> : null}
          </tbody>
        </table>
      </section>

      <div className="validation" style={{ marginTop: 20 }}>
        Os arquivos ficam em armazenamento privado e deverão ser baixados por URL assinada de curta duração.
      </div>
    </main>
  );
}
