import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { parseQualityFormSchema } from "@/lib/quality/forms";

export const dynamic="force-dynamic";
function valueLabel(value:unknown){if(value===null||value===undefined||value==="")return "—";if(typeof value==="boolean")return value?"Sim":"Não";if(typeof value==="object")return null;return String(value);}
export default async function QualityResponseDetail({params}:{params:Promise<{id:string}>}){
  const{id}=await params;const context=await requireCapability("qualidade","read");
  const{data:response,error}=await context.supabase.from("quality_form_responses").select("*").eq("id",id).eq("organization_id",context.organizationId).single();if(error||!response)notFound();
  const[{data:assignment},{data:version},{data:answers}]=await Promise.all([
    context.supabase.from("quality_form_assignments").select("title,instructions").eq("id",response.assignment_id).single(),
    context.supabase.from("quality_form_versions").select("schema_json,version_number,quality_form_templates(title,kind)").eq("id",response.template_version_id).single(),
    context.supabase.from("quality_form_answers").select("*").eq("response_id",id).order("created_at")
  ]);if(!version)notFound();const schema=parseQualityFormSchema(version.schema_json);const byKey=new Map((answers??[]).map((answer:any)=>[answer.field_key,answer]));const template=Array.isArray((version as any).quality_form_templates)?(version as any).quality_form_templates[0]:(version as any).quality_form_templates;
  return <main className="content quality-app"><Link className="back-link" href={`/app/qualidade/preenchimentos/${response.assignment_id}`}>← {assignment?.title??"Preenchimento"}</Link><section className="page-heading"><div><span className="badge">{template?.kind??schema.kind} · V{version.version_number}</span><h1>Resposta de {response.respondent_name||response.respondent_email||"usuário interno"}</h1><p>Enviada em {response.submitted_at?new Date(response.submitted_at).toLocaleString("pt-BR"):"rascunho"}</p></div><div><span className="badge">{response.status}</span><strong className="quality-score">{response.score==null?"—":Number(response.score).toFixed(1)}</strong></div></section>
  <section className="card card-pad quality-answer-sheet">{schema.fields.map(field=>{const answer:any=byKey.get(field.key);const value=answer?.value_json;return <article key={field.key}><header><span className="badge">{field.type}</span><h2>{field.label}</h2></header>{answer?.file_storage_path?<a className="button button-secondary" href={`/api/qualidade/anexos/${answer.id}`} target="_blank">Abrir {answer.file_name}</a>:typeof value==="object"&&value?<div className="quality-checklist-answer">{Object.entries(value).map(([key,status])=><div key={key}><span>{field.items?.find(item=>item.key===key)?.label??key}</span><strong className={status==="NONCONFORMING"?"quality-nonconforming":""}>{String(status)}</strong></div>)}</div>:<p>{valueLabel(value)}</p>}</article>})}</section>
  <section className="card card-pad"><h2>Revisão</h2><dl className="quality-meta-list"><div><dt>Resultado</dt><dd>{response.result??"—"}</dd></div><div><dt>Status</dt><dd>{response.status}</dd></div><div><dt>Revisado em</dt><dd>{response.reviewed_at?new Date(response.reviewed_at).toLocaleString("pt-BR"):"—"}</dd></div><div><dt>Comentário</dt><dd>{response.review_comment??"—"}</dd></div></dl></section></main>;
}
