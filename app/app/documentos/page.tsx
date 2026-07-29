import Link from "next/link";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { requireOrganizationContext } from "@/lib/auth";
import { statusBadge } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function AllDocumentsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const documentsResult = await supabase
    .from("project_documents")
    .select("id,project_id,code,title,discipline,category,status,client_visible,updated_at,project:projects!project_documents_project_id_fkey(code,name)")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  const documents = documentsResult.data ?? [];
  const documentIds = documents.map((document) => document.id);
  const versionsResult = documentIds.length
    ? await supabase
      .from("project_document_versions")
      .select("document_id")
      .eq("organization_id", organizationId)
      .in("document_id", documentIds)
    : { data: [], error: null };

  reportDataAccessError("documents.collection", documentsResult.error);
  reportDataAccessError("documents.version-counts", versionsResult.error);

  const versionCountByDocument = new Map<string, number>();
  for (const version of versionsResult.data ?? []) {
    versionCountByDocument.set(
      version.document_id,
      (versionCountByDocument.get(version.document_id) ?? 0) + 1
    );
  }

  const loadFailed = Boolean(documentsResult.error || versionsResult.error);
  const released = documents.filter((document) => document.status === "RELEASED").length;
  const review = documents.filter((document) => document.status === "REVIEW").length;
  const client = documents.filter((document) => document.client_visible).length;

  return (
    <main className="content">
      <BarraDeTrabalho title="Documentos" primaryAction={<Link className="button button-primary" href="/app/documentos/novo">Enviar arquivo</Link>} />
      <p className="workspace-intro">Controle de disciplinas, versões e conteúdo liberado em todos os projetos.</p>
      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}
      <section className="grid grid-kpi"><article className="card kpi"><small>DOCUMENTOS</small><strong>{documents.length}</strong></article><article className="card kpi"><small>EM REVISÃO</small><strong>{review}</strong></article><article className="card kpi"><small>LIBERADOS</small><strong>{released}</strong></article><article className="card kpi"><small>NO PORTAL</small><strong>{client}</strong></article></section>
      <section className="card table-wrap" style={{ marginTop: 22 }}><table><thead><tr><th>Projeto</th><th>Documento</th><th>Disciplina</th><th>Categoria</th><th>Versões</th><th>Status</th><th>Portal</th></tr></thead><tbody>{documents.map((document) => { const project = singleRelation(document.project); const count = versionCountByDocument.get(document.id) ?? 0; return <tr key={document.id}><td><Link href={`/app/obras/${document.project_id}/documentos`}><strong>{project?.code || "—"}</strong><br /><span className="muted">{project?.name || ""}</span></Link></td><td><span className="mono">{document.code}</span><br /><strong>{document.title}</strong></td><td>{document.discipline}</td><td>{document.category}</td><td>{count}</td><td><span className={statusBadge(document.status)}>{document.status}</span></td><td>{document.client_visible ? <span className="badge badge-success">Liberado</span> : <span className="badge">Interno</span>}</td></tr>; })}{!documents.length && !loadFailed ? <tr><td colSpan={7}>Nenhum documento cadastrado.</td></tr> : null}</tbody></table></section>
    </main>
  );
}
