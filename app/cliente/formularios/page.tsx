import Link from "next/link";
import { requireClientContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic="force-dynamic";
export default async function ClientForms(){
  const{client}=await requireClientContext();const admin=createSupabaseAdminClient();
  const{data:assignments}=await admin.from("quality_form_assignments").select("*").eq("client_id",client.id).order("created_at",{ascending:false});
  const versionIds=[...new Set((assignments??[]).map(item=>item.template_version_id))];
  const{data:versions}=versionIds.length?await admin.from("quality_form_versions").select("id,version_number,template_id").in("id",versionIds):{data:[]};
  const templateIds=[...new Set((versions??[]).map(item=>item.template_id))];
  const{data:templates}=templateIds.length?await admin.from("quality_form_templates").select("id,title,kind,description").in("id",templateIds):{data:[]};
  const versionMap=new Map((versions??[]).map(item=>[item.id,item]));const templateMap=new Map((templates??[]).map(item=>[item.id,item]));
  return <main className="content quality-app"><section className="page-heading"><div><span className="badge">FORMULÁRIOS E PESQUISAS</span><h1>Participações solicitadas</h1><p>Preencha formulários, avaliações e pesquisas liberadas para sua conta.</p></div></section><section className="quality-template-grid">{(assignments??[]).map(assignment=>{const version=versionMap.get(assignment.template_version_id);const template=version?templateMap.get(version.template_id):undefined;return <Link className="card card-pad quality-template-card" href={`/cliente/formularios/${assignment.id}`} key={assignment.id}><div><span className="badge">{template?.kind??"FORM"}</span><span className={`badge ${assignment.status==="COMPLETED"?"badge-success":""}`}>{assignment.status}</span></div><h2>{assignment.title}</h2><p>{assignment.instructions||template?.description}</p><dl><div><dt>Versão</dt><dd>V{version?.version_number??1}</dd></div><div><dt>Respostas</dt><dd>{assignment.responses_count}/{assignment.max_responses}</dd></div><div><dt>Prazo</dt><dd>{assignment.due_at?new Date(assignment.due_at).toLocaleDateString("pt-BR"):"Sem prazo"}</dd></div></dl><span className="text-link">{assignment.status==="COMPLETED"?"Consultar":"Preencher agora"} →</span></Link>})}{!assignments?.length&&<div className="empty-state card card-pad"><h2>Nenhum formulário pendente</h2><p>Novas pesquisas e solicitações aparecerão aqui.</p></div>}</section></main>;
}
