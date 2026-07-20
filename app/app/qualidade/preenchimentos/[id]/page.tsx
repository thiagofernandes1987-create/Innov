import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewQualityResponse, submitInternalQualityForm } from "@/app/actions/quality";
import { QualityFormRenderer } from "@/components/quality/quality-form-renderer";
import { requireCapability } from "@/lib/authorization";
import { relationFrom, type QualityTemplateSummary } from "@/lib/quality/database";
import { parseQualityFormSchema } from "@/lib/quality/forms";

export const dynamic="force-dynamic";
export default async function QualityAssignmentDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;submitted?:string}>}){
  const{id}=await params;const query=await searchParams;const context=await requireCapability("qualidade","read");
  const{data:assignment,error}=await context.supabase.from("quality_form_assignments").select("*").eq("id",id).eq("organization_id",context.organizationId).single();if(error||!assignment)notFound();
  const[{data:version},{data:responses}]=await Promise.all([
    context.supabase.from("quality_form_versions").select("schema_json,version_number,template_id,quality_form_templates(title,description,kind)").eq("id",assignment.template_version_id).single(),
    context.supabase.from("quality_form_responses").select("*").eq("assignment_id",id).order("created_at",{ascending:false})
  ]);if(!version)notFound();
  const schema=parseQualityFormSchema(version.schema_json);const template=relationFrom<QualityTemplateSummary>(version,"quality_form_templates");
  const open=["PENDING","OPEN"].includes(assignment.status)&&assignment.responses_count<assignment.max_responses;
  return <main className="content quality-app"><Link className="back-link" href="/app/qualidade/preenchimentos">← Preenchimentos</Link><section className="page-heading"><div><span className="badge">{template?.kind??schema.kind} · V{version.version_number}</span><h1>{assignment.title}</h1><p>{assignment.instructions||template?.description}</p></div><span className="badge">{assignment.status}</span></section>{query.error&&<div className="validation blocking">{query.error}</div>}{query.submitted&&<div className="validation">Resposta enviada com sucesso.</div>}
  <div className="quality-two-column"><section>{open?<QualityFormRenderer schema={schema} action={submitInternalQualityForm} hidden={{assignmentId:id}} title="Novo preenchimento interno" description="Preencha a ficha diretamente no navegador." submitLabel="Enviar para revisão"/>:<section className="card card-pad"><h2>Preenchimento encerrado</h2><p>O limite de respostas foi atingido ou a distribuição não está mais aberta.</p></section>}</section>
  <aside><section className="card card-pad"><span className="eyebrow">RESPOSTAS</span><h2>{responses?.length??0} registro(s)</h2><div className="quality-review-list">{(responses??[]).map(response=><article key={response.id}><Link href={`/app/qualidade/respostas/${response.id}`}><strong>{response.respondent_name||response.respondent_email||"Usuário interno"}</strong><small>{response.submitted_at?new Date(response.submitted_at).toLocaleString("pt-BR"):"Rascunho"} · pontuação {response.score??"—"}</small></Link><span className={`badge ${response.status==="APPROVED"?"badge-success":response.status==="REJECTED"?"badge-danger":""}`}>{response.status}</span>{response.status==="SUBMITTED"&&<form action={reviewQualityResponse} className="quality-review-actions"><input type="hidden" name="responseId" value={response.id}/><input type="hidden" name="assignmentId" value={id}/><input name="comment" placeholder="Comentário da revisão"/><button className="button button-primary" name="decision" value="APPROVED">Aprovar</button><button className="button button-danger" name="decision" value="REJECTED">Rejeitar</button></form>}</article>)}{!responses?.length&&<p className="muted">Ainda não há respostas.</p>}</div></section><section className="card card-pad"><h2>Distribuição</h2><dl className="quality-meta-list"><div><dt>Aberta em</dt><dd>{new Date(assignment.opens_at).toLocaleString("pt-BR")}</dd></div><div><dt>Prazo</dt><dd>{assignment.due_at?new Date(assignment.due_at).toLocaleString("pt-BR"):"Sem prazo"}</dd></div><div><dt>Limite</dt><dd>{assignment.max_responses}</dd></div><div><dt>Respondidas</dt><dd>{assignment.responses_count}</dd></div></dl></section></aside></div></main>;
}
