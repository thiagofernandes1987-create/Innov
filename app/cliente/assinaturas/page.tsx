import { requireClientContext } from "@/lib/auth";

export default async function ClientSignaturesPage() {
  const { supabase } = await requireClientContext();
  const { data, error } = await supabase
    .from("signature_envelopes")
    .select(`
      id, provider, status, sent_at, completed_at, created_at,
      signature_signers(id, name, email, role_label, signing_order, status, viewed_at, signed_at)
    `)
    .order("created_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">ASSINATURAS</span>
          <h1>Acompanhar assinaturas</h1>
          <p className="muted">Somente envelopes vinculados aos seus documentos liberados são exibidos.</p>
        </div>
      </div>

      {error ? <div className="validation blocking" role="alert">{error.message}</div> : null}

      <section className="grid">
        {(data ?? []).map((envelope) => {
          const signers = (envelope.signature_signers ?? []) as Array<{
            id: string;
            name: string;
            email: string;
            role_label: string | null;
            signing_order: number;
            status: string;
            viewed_at: string | null;
            signed_at: string | null;
          }>;
          return (
            <article key={envelope.id} className="card card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <span className={envelope.provider === "SANDBOX" ? "badge badge-warning" : "badge"}>{envelope.provider}</span>
                  <h2 style={{ marginTop: 12 }}>Envelope {String(envelope.id).slice(0, 8)}</h2>
                  <p className="muted">Enviado em {envelope.sent_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(envelope.sent_at)) : "aguardando envio"}</p>
                </div>
                <span className={envelope.status === "COMPLETED" ? "badge badge-success" : "badge"}>{envelope.status}</span>
              </div>
              {envelope.provider === "SANDBOX" ? (
                <div className="validation">Ambiente de homologação: esta simulação não possui validade jurídica externa.</div>
              ) : null}
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead><tr><th>Ordem</th><th>Signatário</th><th>Papel</th><th>Status</th><th>Visualizado</th><th>Assinado</th></tr></thead>
                  <tbody>
                    {signers.map((signer) => (
                      <tr key={signer.id}>
                        <td className="mono">{signer.signing_order}</td>
                        <td><strong>{signer.name}</strong><br /><span className="muted">{signer.email}</span></td>
                        <td>{signer.role_label ?? "—"}</td>
                        <td><span className="badge">{signer.status}</span></td>
                        <td>{signer.viewed_at ? "Sim" : "—"}</td>
                        <td>{signer.signed_at ? "Sim" : "—"}</td>
                      </tr>
                    ))}
                    {!signers.length ? <tr><td colSpan={6}>Nenhum signatário disponível.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
        {!data?.length ? <section className="card card-pad"><strong>Nenhuma assinatura pendente.</strong><p className="muted">Os envelopes aparecerão depois que o documento for liberado e enviado para assinatura.</p></section> : null}
      </section>
    </main>
  );
}
