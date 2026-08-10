import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  addAdvancedSignatureField,
  createAdvancedEnvelope,
  finalizeAdvancedEnvelope,
  freezeAdvancedSignatureLayout,
  queueAdvancedSignatureCopy
} from "@/app/actions/advanced-signatures";
import { requireCapability } from "@/lib/authorization";
import { reportDataAccessError } from "@/lib/errors/data-access";

const fieldLabels:Record<string,string>={SIGNATURE:"Assinatura",INITIALS:"Rubrica",DATE:"Data",FULL_NAME:"Nome completo",TEXT:"Texto",CHECKBOX:"Checkbox",PHOTO:"Foto",ATTACHMENT:"Anexo"};
function relation<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]??null:value??null;}
function formatDate(value:string|null){return value?new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";}

export default async function AdvancedSignatureDocumentPage({
  params,searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{error?:string;envelope?:string;links?:string}>;
}){
  const{id}=await params;const query=await searchParams;
  const context=await requireCapability("assinaturas","read");
  const{data:document,error:documentError}=await context.supabase.from("signature_documents")
    .select("id,title,category,status,client_id,project_id,current_version_id,updated_at,clients(id,user_id,legal_name,trade_name,email),projects(id,code,name)")
    .eq("id",id).eq("organization_id",context.organizationId).maybeSingle();
  if(documentError){reportDataAccessError("signatures.document.load",documentError);throw new Error("Não foi possível carregar o documento de assinatura.");}if(!document)notFound();
  const client=relation(document.clients);const project=relation(document.projects);
  const{data:version,error:versionError}=await context.supabase.from("signature_document_versions").select("*").eq("id",document.current_version_id).single();
  if(versionError){reportDataAccessError("signatures.version.load",versionError);throw new Error("Não foi possível carregar a versão do documento.");}
  const[{data:envelopes,error:envelopesError},{data:job,error:jobError},{data:deliveries,error:deliveriesError}]=await Promise.all([
    context.supabase.from("signature_envelopes").select("id,provider,status,sent_at,completed_at,final_document_path,final_document_sha256,audit_artifact_path,evidence_sha256,client_copy_sent_at,signature_signers(id,user_id,name,legal_name,email,initials,role_label,signing_order,status,viewed_at,signed_at,copy_sent_at)").eq("document_version_id",version.id).order("created_at",{ascending:false}),
    context.supabase.from("signature_conversion_jobs").select("id,status,provider,attempts,next_attempt_at,completed_at").eq("document_version_id",version.id).maybeSingle(),
    context.supabase.from("signature_delivery_events").select("id,envelope_id,recipient_email,channel,status,attempts,sent_at,delivered_at,created_at").eq("organization_id",context.organizationId).order("created_at",{ascending:false})
  ]);
  if(envelopesError){reportDataAccessError("signatures.envelopes.load",envelopesError);throw new Error("Não foi possível carregar os envelopes de assinatura.");}
  if(jobError)reportDataAccessError("signatures.conversion-job.load",jobError);
  if(deliveriesError)reportDataAccessError("signatures.deliveries.load",deliveriesError);
  const envelope=envelopes?.[0]??null;
  const[{data:fields},{data:values},{data:evidence}]=await Promise.all([
    context.supabase.from("signature_fields").select("id,signer_id,field_type,page_number,x_ratio,y_ratio,width_ratio,height_ratio,label,placeholder,required,signing_order,created_at").eq("document_version_id",version.id).order("signing_order"),
    context.supabase.from("signature_field_values").select("field_id,text_value,boolean_value,file_name,file_mime_type,file_sha256,value_sha256,completed_at").in("field_id",(await context.supabase.from("signature_fields").select("id").eq("document_version_id",version.id)).data?.map(item=>item.id)??[]),
    envelope?context.supabase.from("signature_evidence_records").select("id,signer_id,event_type,document_sha256,payload_sha256,occurred_at").eq("envelope_id",envelope.id).order("occurred_at"):{data:[],error:null}
  ]);
  const valueByField=new Map((values??[]).map(value=>[value.field_id,value]));
  const signerById=new Map((envelope?.signature_signers??[]).map(signer=>[signer.id,signer]));
  const cookieStore=await cookies();
  let oneTimeLinks:Array<{name:string;email:string;url:string}>=[];
  if(query.links==="1"&&query.envelope){try{oneTimeLinks=JSON.parse(cookieStore.get(`signature-links-${query.envelope}`)?.value??"[]");}catch{oneTimeLinks=[];}}
  const{data:renderedUrl}=version.rendered_pdf_path?await context.supabase.storage.from("signature-artifacts").createSignedUrl(version.rendered_pdf_path,900):{data:null};
  const{data:finalUrl}=envelope?.final_document_path?await context.supabase.storage.from("signature-artifacts").createSignedUrl(envelope.final_document_path,900):{data:null};
  const allSignersComplete=Boolean(envelope?.signature_signers?.length)&&envelope!.signature_signers.every(signer=>signer.status==="COMPLETED");

  return <main className="content">
    <Link className="back-link" href="/app/assinaturas">← Assinaturas</Link>
    <section className="page-heading"><div><span className="badge">{document.category} · V{version.version_number}</span><h1>{document.title}</h1><p>{client?.legal_name||client?.trade_name||"Sem cliente"}{project?` · ${project.code} ${project.name}`:""}</p></div><span className={document.status==="COMPLETED"?"badge badge-success":version.conversion_status==="FAILED"?"badge badge-danger":"badge"}>{document.status}</span></section>
    {query.error&&<div className="validation blocking" role="alert">{query.error}</div>}
    {oneTimeLinks.length>0&&<section className="card card-pad one-time-links"><span className="badge badge-warning">EXIBIÇÃO ÚNICA · 10 MINUTOS</span><h2>Links dos signatários</h2><p className="muted">Copie e envie por um canal seguro. Os tokens não são armazenados em texto puro.</p>{oneTimeLinks.map(link=><div key={link.url} className="signing-link-row"><div><strong>{link.name}</strong><small>{link.email}</small></div><code>{link.url}</code></div>)}</section>}

    <section className="signature-summary-grid">
      <article className="card card-pad"><small>FORMATO ORIGINAL</small><strong>{version.source_format}</strong><span>{version.original_file_name}</span></article>
      <article className="card card-pad"><small>CONVERSÃO</small><strong>{version.conversion_status}</strong><span>{job?`${job.provider} · tentativa ${job.attempts}`:"PDF pronto"}</span></article>
      <article className="card card-pad"><small>PÁGINAS</small><strong>{version.page_count??"—"}</strong><span>{version.layout_frozen_at?"Layout congelado":"Layout editável"}</span></article>
      <article className="card card-pad"><small>SHA-256 ORIGINAL</small><code>{version.original_sha256}</code></article>
    </section>
    {job?.status==="FAILED"&&<div className="validation blocking">Conversão DOCX: falha registrada. Tente novamente ou acione o suporte.</div>}

    <div className="signature-workspace">
      <section className="card signature-pdf-panel">
        {renderedUrl?.signedUrl?<iframe title={`PDF de ${document.title}`} src={renderedUrl.signedUrl}/>:<div className="empty-state"><h2>Aguardando PDF renderizado</h2><p>O DOCX foi preservado. O editor será liberado quando o worker concluir a conversão.</p></div>}
        <footer><span>SHA-256 renderizado</span><code>{version.rendered_pdf_sha256??"aguardando conversão"}</code></footer>
      </section>
      <aside className="signature-controls">
        {!envelope&&version.conversion_status==="READY"&&<section className="card card-pad"><h2>Criar envelope</h2><p className="muted">MFA AAL2 é obrigatório. Até quatro signatários podem ser adicionados nesta versão.</p><form action={createAdvancedEnvelope} className="field-form"><input type="hidden" name="documentId" value={id}/><input type="hidden" name="versionId" value={version.id}/><input type="hidden" name="projectId" value={document.project_id??""}/><label>Provedor<select name="provider" defaultValue="SANDBOX"><option value="SANDBOX">Sandbox</option><option value="CLICKSIGN">Clicksign</option><option value="ZAPSIGN">ZapSign</option><option value="DOCUSIGN">DocuSign</option></select></label>{[1,2,3].map(index=><fieldset key={index} className="signer-fieldset"><legend>Signatário {index}{index>1?" (opcional)":""}</legend><label>Nome<input name={`signerName${index}`} required={index===1}/></label><label>Nome completo jurídico<input name={`signerLegalName${index}`} required={index===1}/></label><label>E-mail<input type="email" name={`signerEmail${index}`} required={index===1}/></label><div className="field-grid"><label>Rubrica<input name={`signerInitials${index}`} maxLength={8}/></label><label>Papel<input name={`signerRole${index}`} placeholder="Contratante"/></label></div></fieldset>)}<button className="button button-primary">Criar envelope e links</button></form></section>}

        {envelope&&<><section className="card card-pad"><div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><span className={envelope.provider==="SANDBOX"?"badge badge-warning":"badge"}>{envelope.provider}</span><h2>Envelope {envelope.id.slice(0,8)}</h2></div><span className={envelope.status==="COMPLETED"?"badge badge-success":"badge"}>{envelope.status}</span></div><ul className="compact-list">{envelope.signature_signers.map(signer=><li key={signer.id}><strong>{signer.legal_name||signer.name}</strong><small>{signer.email} · {signer.status}{signer.signed_at?` · ${formatDate(signer.signed_at)}`:""}</small></li>)}</ul></section>
        {envelope.status==="DRAFT"&&version.layout_frozen_at===null&&<section className="card card-pad"><h2>Adicionar campo ao layout</h2><form action={addAdvancedSignatureField} className="field-form"><input type="hidden" name="documentId" value={id}/><input type="hidden" name="projectId" value={document.project_id??""}/><input type="hidden" name="envelopeId" value={envelope.id}/><label>Signatário<select name="signerId" required><option value="">Selecione</option>{envelope.signature_signers.map(signer=><option key={signer.id} value={signer.id}>{signer.signing_order}. {signer.legal_name||signer.name}</option>)}</select></label><label>Tipo<select name="fieldType" defaultValue="SIGNATURE">{Object.entries(fieldLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><div className="field-grid"><label>Página<input type="number" name="pageNumber" min="1" max={version.page_count??1} defaultValue="1" required/></label><label>Ordem<input type="number" name="signingOrder" min="1" defaultValue="1" required/></label><label>X (%)<input type="number" name="xPercent" min="0" max="95" step="0.1" defaultValue="10" required/></label><label>Y (%)<input type="number" name="yPercent" min="0" max="95" step="0.1" defaultValue="70" required/></label><label>Largura (%)<input type="number" name="widthPercent" min="1" max="100" step="0.1" defaultValue="35" required/></label><label>Altura (%)<input type="number" name="heightPercent" min="1" max="100" step="0.1" defaultValue="8" required/></label></div><label>Rótulo<input name="label"/></label><label>Placeholder<input name="placeholder"/></label><label><span><input type="checkbox" name="required" defaultChecked style={{width:"auto"}}/> Campo obrigatório</span></label><button className="button button-secondary">Adicionar campo</button></form></section>}
        {envelope.status==="DRAFT"&&<form action={freezeAdvancedSignatureLayout} className="card card-pad"><input type="hidden" name="documentId" value={id}/><input type="hidden" name="projectId" value={document.project_id??""}/><input type="hidden" name="envelopeId" value={envelope.id}/><h2>Congelar e enviar</h2><p className="muted">Depois do congelamento, posições, arquivo renderizado e quantidade de páginas tornam-se imutáveis.</p><button className="button button-primary">Congelar layout</button></form>}
        {allSignersComplete&&envelope.status!=="COMPLETED"&&<form action={finalizeAdvancedEnvelope} className="card card-pad"><input type="hidden" name="documentId" value={id}/><input type="hidden" name="projectId" value={document.project_id??""}/><input type="hidden" name="envelopeId" value={envelope.id}/><h2>Gerar documento final</h2><p className="muted">Insere os valores no PDF, gera o artefato de auditoria e autentica ambos por SHA-256.</p><button className="button button-primary">Finalizar PDF assinado</button></form>}
        {envelope.status==="COMPLETED"&&<form action={queueAdvancedSignatureCopy} className="card card-pad"><input type="hidden" name="documentId" value={id}/><input type="hidden" name="projectId" value={document.project_id??""}/><input type="hidden" name="envelopeId" value={envelope.id}/><input type="hidden" name="recipientUserId" value={client?.user_id??""}/><h2>Enviar cópia</h2><label>E-mail<input type="email" name="recipientEmail" defaultValue={client?.email??envelope.signature_signers[0]?.email??""} required/></label><label>Canal<select name="channel"><option value="PORTAL">Portal do cliente</option><option value="EMAIL">E-mail / webhook</option></select></label><button className="button button-secondary">Preparar e enviar cópia</button></form>}</>}
      </aside>
    </div>

    <section className="card card-pad" style={{marginTop:24}}><h2>Campos do layout</h2><div className="table-wrap"><table><thead><tr><th>Ordem</th><th>Signatário</th><th>Tipo</th><th>Página</th><th>Posição</th><th>Obrigatório</th><th>Valor</th></tr></thead><tbody>{(fields??[]).map(field=>{const signer=field.signer_id?signerById.get(field.signer_id):null;const value=valueByField.get(field.id);return <tr key={field.id}><td>{field.signing_order}</td><td>{signer?.legal_name||signer?.name||"—"}</td><td>{fieldLabels[field.field_type]??field.field_type}</td><td>{field.page_number}</td><td className="mono">{(Number(field.x_ratio)*100).toFixed(1)}%, {(Number(field.y_ratio)*100).toFixed(1)}% · {(Number(field.width_ratio)*100).toFixed(1)}×{(Number(field.height_ratio)*100).toFixed(1)}%</td><td>{field.required?"Sim":"Não"}</td><td>{value?<span className="badge badge-success">SHA {value.value_sha256.slice(0,10)}…</span>:"Pendente"}</td></tr>})}{!fields?.length&&<tr><td colSpan={7}>Nenhum campo posicionado.</td></tr>}</tbody></table></div></section>

    {envelope&&<section className="grid" style={{marginTop:24}}><article className="card card-pad"><h2>Evidências</h2><ul className="compact-list">{(evidence??[]).map(event=><li key={event.id}><strong>{event.event_type}</strong><small>{formatDate(event.occurred_at)} · {event.payload_sha256.slice(0,16)}…</small></li>)}{!evidence?.length&&<li>Nenhuma evidência registrada.</li>}</ul></article><article className="card card-pad"><h2>Entregas</h2><ul className="compact-list">{(deliveries??[]).filter(delivery=>delivery.envelope_id===envelope.id).map(delivery=><li key={delivery.id}><strong>{delivery.channel} · {delivery.status}</strong><small>{delivery.recipient_email} · tentativas {delivery.attempts}</small></li>)}{!(deliveries??[]).some(delivery=>delivery.envelope_id===envelope.id)&&<li>Nenhuma cópia enviada.</li>}</ul></article></section>}
    {finalUrl?.signedUrl&&<section className="card card-pad" style={{marginTop:24}}><span className="badge badge-success">DOCUMENTO FINAL</span><h2>PDF assinado e imutável</h2><p><a className="button button-primary" href={finalUrl.signedUrl} target="_blank" rel="noreferrer">Baixar cópia autenticada</a></p><code>{envelope?.final_document_sha256}</code></section>}
  </main>;
}
