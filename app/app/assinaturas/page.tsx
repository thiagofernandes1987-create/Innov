import Link from "next/link";
import { requireCapability } from "@/lib/authorization";

function dateTime(value:string|null){return value?new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";}

export default async function SignaturesPage(){
  const context=await requireCapability("assinaturas","read");
  const[{data:documents,error:documentsError},{data:envelopes,error:envelopesError},{data:jobs}]=await Promise.all([
    context.supabase.from("signature_documents").select("id,title,category,status,client_id,project_id,updated_at,current_version_id,clients(legal_name,trade_name),projects(code,name),signature_document_versions!signature_documents_current_version_id_fkey(source_format,conversion_status,page_count,original_sha256,completed_at)").eq("organization_id",context.organizationId).order("updated_at",{ascending:false}),
    context.supabase.from("signature_envelopes").select("id,provider,status,document_version_id,contract_version_id,amendment_version_id,sent_at,completed_at,created_at,client_copy_sent_at,signature_signers(id,name,email,role_label,signing_order,status,viewed_at,signed_at)").eq("organization_id",context.organizationId).order("created_at",{ascending:false}).limit(20),
    context.supabase.from("signature_conversion_jobs").select("document_version_id,status,attempts,last_error,next_attempt_at").eq("organization_id",context.organizationId)
  ]);
  const error=documentsError??envelopesError;
  const jobsByVersion=new Map((jobs??[]).map(job=>[job.document_version_id,job]));
  const completed=(documents??[]).filter(document=>document.status==="COMPLETED").length;
  const pending=(documents??[]).filter(document=>!["COMPLETED","CANCELED","ARCHIVED"].includes(document.status)).length;

  return <main className="content">
    <section className="page-heading"><div><span className="badge">APLICATIVO DE ASSINATURAS</span><h1>Documentos e envelopes</h1><p>PDF/DOCX, campos posicionáveis, evidências, hashes e entrega de cópia.</p></div><Link className="button button-primary" href="/app/assinaturas/novo">Novo documento</Link></section>
    {error&&<div className="validation blocking">{error.message}</div>}
    <section className="stats-grid"><article className="card"><small>DOCUMENTOS</small><strong>{documents?.length??0}</strong><span>no módulo</span></article><article className="card"><small>EM ANDAMENTO</small><strong>{pending}</strong><span>aguardando layout ou assinatura</span></article><article className="card"><small>CONCLUÍDOS</small><strong>{completed}</strong><span>PDF final imutável</span></article></section>

    <section style={{marginTop:28}}><div className="section-heading"><div><span className="eyebrow">DOCUMENTOS</span><h2>Assinatura avançada</h2></div></div><div className="grid">
      {(documents??[]).map(document=>{
        const client=Array.isArray(document.clients)?document.clients[0]:document.clients;
        const project=Array.isArray(document.projects)?document.projects[0]:document.projects;
        const version=Array.isArray(document.signature_document_versions)?document.signature_document_versions[0]:document.signature_document_versions;
        const job=version?jobsByVersion.get(document.current_version_id):undefined;
        return <Link key={document.id} href={`/app/assinaturas/documentos/${document.id}`} className="card card-pad signature-document-card" style={{textDecoration:"none",color:"inherit"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span className="badge">{document.category}</span><span className={document.status==="COMPLETED"?"badge badge-success":version?.conversion_status==="FAILED"?"badge badge-danger":"badge"}>{document.status}</span></div>
          <h2>{document.title}</h2><p className="muted">{client?.legal_name||client?.trade_name||"Sem cliente"}{project?` · ${project.code} ${project.name}`:""}</p>
          <div className="signature-hash"><span>{version?.source_format||"—"} · {version?.page_count??"—"} pág.</span><code>{version?.original_sha256?.slice(0,16)}…</code></div>
          {job&&<small className="muted">Conversão: {job.status} · tentativa {job.attempts}{job.last_error?` · ${job.last_error}`:""}</small>}
        </Link>;
      })}
      {!documents?.length&&<article className="card card-pad"><strong>Nenhum documento enviado.</strong><p className="muted">Comece com um PDF ou DOCX.</p></article>}
    </div></section>

    <section style={{marginTop:32}}><div className="section-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Envelopes recentes</h2></div></div><div className="grid">
      {(envelopes??[]).map(envelope=>{const signers=envelope.signature_signers??[];return <article key={envelope.id} className="card card-pad"><div style={{display:"flex",justifyContent:"space-between",gap:18}}><div><span className={envelope.provider==="SANDBOX"?"badge badge-warning":"badge"}>{envelope.provider}</span><h3>Envelope {envelope.id.slice(0,8)}</h3><p className="muted">Criado em {dateTime(envelope.created_at)}</p></div><span className={envelope.status==="COMPLETED"?"badge badge-success":"badge"}>{envelope.status}</span></div><ul className="compact-list">{signers.map(signer=><li key={signer.id}><strong>{signer.name}</strong><small>{signer.email} · {signer.status}</small></li>)}</ul>{envelope.client_copy_sent_at&&<span className="badge badge-success">Cópia enviada</span>}</article>})}
    </div></section>
  </main>;
}
