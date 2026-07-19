import { requireOrganizationContext } from "@/lib/auth";

export default async function SignaturesPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("signature_envelopes")
    .select(`
      id, provider, status, external_id, sent_at, completed_at, created_at,
      contract_versions(contract_id,version_number),
      amendment_versions(amendment_id,version_number),
      signature_signers(id,name,email,role_label,signing_order,status,viewed_at,signed_at)
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">ASSINATURA ELETRÔNICA</span>
          <h1>Envelopes e signatários</h1>
          <p className="muted">O provider SANDBOX é exclusivo para homologação e não representa assinatura jurídica real.</p>
        </div>
      </div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="grid">
        {(data ?? []).map((envelope) => {
          const signers = (envelope.signature_signers ?? []) as Array<{
            id: string; name: string; email: string; role_label: string | null;
            signing_order: number; status: string; viewed_at: string | null; signed_at: string | null;
          }>;
          return (
            <article key={envelope.id} className="card card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                <div>
                  <span className={envelope.provider === "SANDBOX" ? "badge badge-warning" : "badge"}>{envelope.provider}</span>
                  <h2 style={{ marginTop: 12 }}>Envelope {String(envelope.id).slice(0, 8)}</h2>
                  <p className="muted">Criado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(envelope.created_at))}</p>
                </div>
                <span className={envelope.status === "COMPLETED" ? "badge badge-success" : envelope.status === "ERROR" ? "badge badge-danger" : "badge"}>{envelope.status}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Ordem</th><th>Signatário</th><th>Papel</th><th>Status</th><th>Visualização</th><th>Assinatura</th></tr></thead>
                  <tbody>
                    {signers.map((signer) => <tr key={signer.id}>
                      <td className="mono">{signer.signing_order}</td>
                      <td><strong>{signer.name}</strong><br /><span className="muted">{signer.email}</span></td>
                      <td>{signer.role_label ?? "—"}</td>
                      <td><span className="badge">{signer.status}</span></td>
                      <td>{signer.viewed_at ? "Registrada" : "—"}</td>
                      <td>{signer.signed_at ? "Registrada" : "—"}</td>
                    </tr>)}
                    {!signers.length ? <tr><td colSpan={6}>Nenhum signatário cadastrado.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
        {!data?.length ? <section className="card card-pad"><strong>Nenhum envelope criado.</strong><p className="muted">A criação exige documento congelado, signatários, idempotency key e MFA AAL2.</p></section> : null}
      </section>
    </main>
  );
}
