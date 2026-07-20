import { notFound } from "next/navigation";
import { submitPublicQualityForm } from "@/app/actions/quality";
import { QualityFormRenderer } from "@/components/quality/quality-form-renderer";
import { isIsoExpired, relationFrom, type QualityTemplateSummary } from "@/lib/quality/database";
import { parseQualityFormSchema } from "@/lib/quality/forms";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/signatures/crypto";

export const dynamic="force-dynamic";
export default async function PublicQualityForm({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{error?:string;submitted?:string}>}){
  const{token}=await params;const query=await searchParams;const admin=createSupabaseAdminClient();
  const{data:link,error}=await admin.from("quality_public_links").select("*").eq("token_sha256",sha256(token)).single();
  if(error||!link||link.revoked_at||isIsoExpired(link.expires_at))notFound();
  const{data:assignment}=await admin.from("quality_form_assignments").select("*").eq("id",link.assignment_id).single();if(!assignment)notFound();
  const{data:version}=await admin.from("quality_form_versions").select("schema_json,quality_form_templates(title,description,kind)").eq("id",assignment.template_version_id).single();if(!version)notFound();
  const template=relationFrom<QualityTemplateSummary>(version,"quality_form_templates");const schema=parseQualityFormSchema(version.schema_json);
  if(query.submitted==="1")return <main className="public-quality-shell"><section className="card card-pad quality-public-success"><span className="badge badge-success">RESPOSTA ENVIADA</span><h1>Obrigado pela participação</h1><p>Seu formulário foi recebido e armazenado com segurança.</p></section></main>;
  return <main className="public-quality-shell"><header className="public-quality-header"><div><strong>INNOVAR</strong><small>Qualidade e relacionamento</small></div><span className="badge">{template?.kind??schema.kind}</span></header>{query.error&&<div className="validation blocking">{query.error}</div>}<QualityFormRenderer schema={schema} action={submitPublicQualityForm} hidden={{token}} title={assignment.title} description={assignment.instructions||template?.description} showRespondent submitLabel="Enviar resposta"/><footer className="public-quality-footer">As respostas são utilizadas exclusivamente para o processo informado. Arquivos são privados e auditados.</footer></main>;
}
