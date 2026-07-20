import { createAdvancedSignatureDocument } from "@/app/actions/advanced-signatures";
import { requireCapability } from "@/lib/authorization";

export default async function NewAdvancedSignatureDocument({searchParams}:{searchParams:Promise<{error?:string}>}){
  const query=await searchParams;
  const context=await requireCapability("assinaturas","create");
  const[{data:clients},{data:projects}]=await Promise.all([
    context.supabase.from("clients").select("id,legal_name,trade_name,email,status").eq("organization_id",context.organizationId).neq("status","ARCHIVED").order("legal_name"),
    context.supabase.from("projects").select("id,client_id,code,name,status").eq("organization_id",context.organizationId).order("name")
  ]);

  return <main className="content">
    <section className="page-heading"><div><span className="badge">ASSINATURA AVANÇADA</span><h1>Novo documento</h1><p>Envie um PDF ou DOCX. O original será preservado e autenticado antes de qualquer transformação.</p></div></section>
    {query.error&&<div className="validation blocking" role="alert">{query.error}</div>}
    <section className="card card-pad signature-upload-card">
      <form action={createAdvancedSignatureDocument} encType="multipart/form-data" className="field-form">
        <div className="field-grid">
          <label>Título do documento<input name="title" required placeholder="Contrato de prestação de serviços"/></label>
          <label>Categoria<select name="category" defaultValue="CONTRATO"><option value="CONTRATO">Contrato</option><option value="ADITIVO">Aditivo</option><option value="TERMO">Termo</option><option value="AUTORIZACAO">Autorização</option><option value="LAUDO">Laudo</option><option value="OUTRO">Outro</option></select></label>
          <label>Cliente<select name="clientId"><option value="">Sem cliente vinculado</option>{(clients??[]).map(client=><option key={client.id} value={client.id}>{client.legal_name||client.trade_name||client.email}</option>)}</select></label>
          <label>Obra<select name="projectId"><option value="">Sem obra vinculada</option>{(projects??[]).map(project=><option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label>
          <label className="span-2 signature-dropzone">Arquivo PDF ou DOCX<input type="file" name="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required/><small>Limite de 50 MB. PDFs criptografados não são aceitos.</small></label>
        </div>
        <div className="validation"><strong>Tratamento por formato</strong><br/>PDF: entra imediatamente no editor. DOCX: o original é preservado e um job de conversão gera a representação PDF antes do layout.</div>
        <button className="button button-primary" type="submit">Enviar e autenticar documento</button>
      </form>
    </section>
  </main>;
}
