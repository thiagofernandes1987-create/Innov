import Link from "next/link";
import { requireCapability } from "@/lib/authorization";
import { relationFrom, type QualityTemplateSummary, type QualityVersionSummary } from "@/lib/quality/database";

export const dynamic="force-dynamic";
export default async function QualityAssignments(){
  const context=await requireCapability("qualidade","read");
  const{data:assignments}=await context.supabase.from("quality_form_assignments").select("*,quality_form_versions(template_id,quality_form_templates(title,kind))").eq("organization_id",context.organizationId).order("created_at",{ascending:false});
  return <main className="content quality-app"><Link className="back-link" href="/app/qualidade">← Qualidade</Link><section className="page-heading"><div><span className="badge">PREENCHIMENTOS</span><h1>Inspeções e respostas</h1><p>Acompanhe FVS, FVM, formulários internos e pesquisas enviadas.</p></div></section><section className="card quality-table-card"><table className="data-table"><thead><tr><th>Formulário</th><th>Tipo</th><th>Status</th><th>Respostas</th><th>Prazo</th><th></th></tr></thead><tbody>{(assignments??[]).map(assignment=>{const version=relationFrom<QualityVersionSummary>(assignment,"quality_form_versions");const template=version?relationFrom<QualityTemplateSummary>(version,"quality_form_templates"):null;return <tr key={assignment.id}><td><strong>{assignment.title}</strong><small>{assignment.instructions}</small></td><td>{template?.kind??"FORM"}</td><td><span className="badge">{assignment.status}</span></td><td>{assignment.responses_count}/{assignment.max_responses}</td><td>{assignment.due_at?new Date(assignment.due_at).toLocaleDateString("pt-BR"):"—"}</td><td><Link href={`/app/qualidade/preenchimentos/${assignment.id}`}>Abrir →</Link></td></tr>})}{!assignments?.length&&<tr><td colSpan={6}><div className="empty-state"><h2>Nenhum preenchimento</h2><p>Distribua um modelo no catálogo de formulários.</p></div></td></tr>}</tbody></table></section></main>;
}
