import Link from "next/link";
import { notFound } from "next/navigation";
import { submitClientQualityForm } from "@/app/actions/quality";
import { QualityFormRenderer } from "@/components/quality/quality-form-renderer";
import { requireClientContext } from "@/lib/auth";
import { relationFrom, type QualityTemplateSummary } from "@/lib/quality/database";
import { parseQualityFormSchema } from "@/lib/quality/forms";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic="force-dynamic";
export default async function ClientFormDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;submitted?:string}>}){
  const{id}=await params;const query=await searchParams;const{client}=await requireClientContext();const admin=createSupabaseAdminClient();
  const{data:assignment,error}=await admin.from("quality_form_assignments").select("*").eq("id",id).eq("client_id",client.id).single();if(error||!assignment)notFound();
  const{data:version}=await admin.from("quality_form_versions").select("schema_json,version_number,quality_form_templates!quality_form_versions_template_id_fkey(title,description,kind)").eq("id",assignment.template_version_id).single();if(!version)notFound();
  const schema=parseQualityFormSchema(version.schema_json);const template=relationFrom<QualityTemplateSummary>(version,"quality_form_templates");
  const completed=assignment.status==="COMPLETED"||assignment.responses_count>=assignment.max_responses;
  return <main className="content quality-app"><Link className="back-link" href="/cliente/formularios">← Formulários</Link>{query.error&&<div className="validation blocking">{query.error}</div>}{query.submitted==="1"||completed?<section className="card card-pad quality-public-success"><span className="badge badge-success">CONCLUÍDO</span><h1>{assignment.title}</h1><p>Sua resposta foi recebida. Obrigado pela participação.</p></section>:<QualityFormRenderer schema={schema} action={submitClientQualityForm} hidden={{assignmentId:id}} title={assignment.title} description={assignment.instructions||template?.description} submitLabel="Enviar resposta"/>}</main>;
}
