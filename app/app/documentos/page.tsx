import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";
import { statusBadge } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function AllDocumentsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("project_documents")
    .select("id,project_id,code,title,discipline,category,status,client_visible,updated_at,projects(code,name),project_document_versions(count)")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  const documents = data ?? [];
  const released = documents.filter((document) => document.status === "RELEASED").length;
  const review = documents.filter((document) => document.status === "REVIEW").length;
  const client = documents.filter((document) => document.client_visible).length;

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">GESTÃO DOCUMENTAL</span><h1>Documentos</h1><p className="muted">Controle de disciplinas, versões e conteúdo liberado em todas as obras.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="grid grid-kpi"><article className="card kpi"><small>DOCUMENTOS</small><strong>{documents.length}</strong></article><article className="card kpi"><small>EM REVISÃO</small><strong>{review}</strong></article><article className="card kpi"><small>LIBERADOS</small><strong>{released}</strong></article><article className="card kpi"><small>NO PORTAL</small><strong>{client}</strong></article></section>
      <section className="card table-wrap" style={{ marginTop: 22 }}><table><thead><tr><th>Obra</th><th>Documento</th><th>Disciplina</th><th>Categoria</th><th>Versões</th><th>Status</th><th>Portal</th></tr></thead><tbody>{documents.map((document) => { const project = singleRelation(document.projects); const count = Array.isArray(document.project_document_versions) ? Number(document.project_document_versions[0]?.count ?? 0) : 0; return <tr key={document.id}><td><Link href={`/app/obras/${document.project_id}/documentos`}><strong>{project?.code || "—"}</strong><br /><span className="muted">{project?.name || ""}</span></Link></td><td><span className="mono">{document.code}</span><br /><strong>{document.title}</strong></td><td>{document.discipline}</td><td>{document.category}</td><td>{count}</td><td><span className={statusBadge(document.status)}>{document.status}</span></td><td>{document.client_visible ? <span className="badge badge-success">Liberado</span> : <span className="badge">Interno</span>}</td></tr>; })}{!documents.length ? <tr><td colSpan={7}>Nenhum documento cadastrado.</td></tr> : null}</tbody></table></section>
    </main>
  );
}
