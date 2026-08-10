import { notFound } from "next/navigation";
import { completePublicSignatureField, finishPublicSignature } from "@/app/actions/public-signing";
import { SignaturePad } from "@/components/signatures/signature-pad";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/signatures/crypto";

const typeLabels:Record<string,string>={
  SIGNATURE:"Assinatura",INITIALS:"Rubrica",DATE:"Data",FULL_NAME:"Nome completo",
  TEXT:"Texto",CHECKBOX:"Confirmação",PHOTO:"Fotografia",ATTACHMENT:"Documento anexo"
};

export default async function PublicSigningPage({
  params,searchParams
}:{
  params:Promise<{token:string}>;
  searchParams:Promise<{error?:string;saved?:string;completed?:string}>;
}){
  const{token}=await params;const query=await searchParams;
  if(query.completed==="1")return <main className="public-signing-shell"><section className="card card-pad signature-success"><span className="badge badge-success">CONCLUÍDO</span><h1>Assinatura registrada</h1><p>Sua participação foi concluída. A Innovar finalizará o PDF e disponibilizará a cópia conforme o fluxo configurado.</p></section></main>;

  const admin=createSupabaseAdminClient();const tokenHash=sha256(token);
  const[{data:context,error:contextError},{data:fields,error:fieldsError}]=await Promise.all([
    admin.rpc("get_advanced_signing_context",{p_token_sha256:tokenHash}),
    admin.rpc("list_advanced_signer_fields",{p_token_sha256:tokenHash})
  ]);
  const signing=Array.isArray(context)?context[0]:null;
  if(contextError)reportDataAccessError("public-signing.context.load",contextError);
  if(fieldsError)reportDataAccessError("public-signing.fields.load",fieldsError);
  if(contextError||fieldsError||!signing||!Array.isArray(fields))notFound();
  const{data:signed,error:signedError}=await admin.storage.from("signature-artifacts").createSignedUrl(signing.rendered_pdf_path,900);
  if(signedError)reportDataAccessError("public-signing.document-url",signedError);
  if(signedError||!signed?.signedUrl)throw new Error("Documento indisponível.");
  const pending=fields.filter(field=>!field.completed);

  return <main className="public-signing-shell">
    <header className="public-signing-header"><div><strong>INNOVAR</strong><small>Assinatura segura de documento</small></div><span className="badge">Expira em {new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(signing.expires_at))}</span></header>
    <section className="page-heading"><div><span className="badge">DOCUMENTO PARA ASSINATURA</span><h1>{signing.document_title}</h1><p>Signatário: <strong>{signing.signer_legal_name||signing.signer_name}</strong> · {signing.signer_email}</p></div></section>
    {query.error&&<div className="validation blocking" role="alert">{query.error}</div>}
    {query.saved&&<div className="validation">Campo salvo e autenticado.</div>}
    <div className="signing-layout">
      <section className="card signing-document"><iframe title={`Documento ${signing.document_title}`} src={signed.signedUrl}/><footer><span>SHA-256</span><code>{signing.rendered_pdf_sha256}</code></footer></section>
      <aside className="signing-fields">
        {fields.map(field=><article className={`card card-pad ${field.completed?"field-completed":""}`} key={field.field_id}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><span className="badge">{typeLabels[field.field_type]??field.field_type}</span><h2>{field.label||typeLabels[field.field_type]||"Campo"}</h2><p className="muted">Página {field.page_number} · ordem {field.signing_order}{field.required?" · obrigatório":""}</p></div>{field.completed&&<span className="badge badge-success">Salvo</span>}</div>
          {!field.completed&&<form action={completePublicSignatureField} encType="multipart/form-data" className="field-form">
            <input type="hidden" name="token" value={token}/><input type="hidden" name="fieldId" value={field.field_id}/>
            {field.field_type==="SIGNATURE"&&<SignaturePad label="Desenhe sua assinatura"/>}
            {field.field_type==="INITIALS"&&<SignaturePad label="Desenhe sua rubrica"/>}
            {field.field_type==="DATE"&&<label>Data<input type="date" name="textValue" defaultValue={new Date().toISOString().slice(0,10)} required/></label>}
            {field.field_type==="FULL_NAME"&&<label>Nome completo<input name="textValue" defaultValue={signing.signer_legal_name||signing.signer_name} required/></label>}
            {field.field_type==="TEXT"&&<label>{field.placeholder||"Texto"}<textarea name="textValue" rows={3} required={field.required}/></label>}
            {field.field_type==="CHECKBOX"&&<label><span><input type="checkbox" name="booleanValue" required={field.required} style={{width:"auto"}}/> Confirmo e concordo</span></label>}
            {field.field_type==="PHOTO"&&<label>Tirar foto ou escolher imagem<input type="file" name="file" accept="image/*" capture="environment" required={field.required}/></label>}
            {field.field_type==="ATTACHMENT"&&<label>Anexar documento<input type="file" name="file" accept="image/*,application/pdf,.docx" capture="environment" required={field.required}/></label>}
            <button className="button button-primary" type="submit">Salvar campo</button>
          </form>}
        </article>)}
        {!fields.length&&<section className="card card-pad"><strong>Nenhum campo foi atribuído.</strong></section>}
        <form action={finishPublicSignature} className="card card-pad"><input type="hidden" name="token" value={token}/><h2>Concluir participação</h2><p className="muted">Todos os campos obrigatórios precisam estar salvos. A conclusão registra uma evidência criptográfica do conjunto preenchido.</p><button className="button button-primary" disabled={pending.some(field=>field.required)}>Concluir assinatura</button></form>
      </aside>
    </div>
  </main>;
}
