import Link from "next/link";
import { requireClientContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";

function dateTime(value:string|null){return value?new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";}
function relation<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]??null:value??null;}

export default async function ClientSignaturesPage(){
  const{supabase}=await requireClientContext();
  const{data,error}=await supabase.from("signature_envelopes").select(`
    id,provider,status,sent_at,completed_at,created_at,client_copy_sent_at,
    document_version_id,contract_version_id,amendment_version_id,
    final_document_sha256,evidence_sha256,
    signature_signers(id,name,legal_name,email,role_label,signing_order,status,viewed_at,signed_at,copy_sent_at),
    signature_document_versions!signature_envelopes_document_version_id_fkey(
      id,version_number,final_pdf_sha256,audit_artifact_sha256,client_released_at,
      signature_documents!signature_document_versions_document_id_fkey(id,title,category,status,projects(code,name))
    )
  `).order("created_at",{ascending:false});
  if(error)reportDataAccessError("client-signatures.page.load",error);

  return <main className="content">
    <div className="page-head"><div><span className="badge">ASSINATURAS</span><h1>Documentos assinados</h1><p className="muted">Envelopes vinculados aos seus documentos e cópias liberadas pela Innovar.</p></div></div>
    {error&&<div className="validation blocking" role="alert">Não foi possível carregar as assinaturas.</div>}
    <section className="grid">
      {(data??[]).map(envelope=>{
        const version=relation(envelope.signature_document_versions);
        const document=relation(version?.signature_documents);
        const project=relation(document?.projects);
        const signers=envelope.signature_signers??[];
        const advanced=Boolean(envelope.document_version_id);
        return <article key={envelope.id} className="card card-pad">
          <div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}><div><span className={envelope.provider==="SANDBOX"?"badge badge-warning":"badge"}>{envelope.provider}</span><h2 style={{marginTop:12}}>{document?.title||`Envelope ${String(envelope.id).slice(0,8)}`}</h2><p className="muted">{document?.category||"Documento contratual"}{project?` · ${project.code} ${project.name}`:""}</p><p className="muted">Enviado em {dateTime(envelope.sent_at)} · concluído em {dateTime(envelope.completed_at)}</p></div><span className={envelope.status==="COMPLETED"?"badge badge-success":"badge"}>{envelope.status}</span></div>
          {envelope.provider==="SANDBOX"&&<div className="validation">Ambiente de homologação: esta simulação não possui validade jurídica externa.</div>}
          <div className="table-wrap" style={{marginTop:16}}><table><thead><tr><th>Ordem</th><th>Signatário</th><th>Papel</th><th>Status</th><th>Assinado</th></tr></thead><tbody>{signers.map(signer=><tr key={signer.id}><td className="mono">{signer.signing_order}</td><td><strong>{signer.legal_name||signer.name}</strong><br/><span className="muted">{signer.email}</span></td><td>{signer.role_label??"—"}</td><td><span className="badge">{signer.status}</span></td><td>{dateTime(signer.signed_at)}</td></tr>)}{!signers.length&&<tr><td colSpan={5}>Nenhum signatário disponível.</td></tr>}</tbody></table></div>
          {advanced&&envelope.status==="COMPLETED"&&version?.client_released_at&&<div style={{marginTop:18,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}><Link className="button button-primary" href={`/api/documents/signatures/${envelope.id}`}>Baixar PDF assinado</Link><span className="signature-hash"><code>PDF {envelope.final_document_sha256?.slice(0,18)}…</code><code>Evidência {envelope.evidence_sha256?.slice(0,18)}…</code></span></div>}
        </article>;
      })}
      {!data?.length&&<section className="card card-pad"><strong>Nenhuma assinatura disponível.</strong><p className="muted">As cópias aparecerão depois da conclusão e liberação pela Innovar.</p></section>}
    </section>
  </main>;
}
