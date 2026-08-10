import { requireClientContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { statusBadge } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ClientDocumentsPage() {
  const { supabase } = await requireClientContext();
  const { data, error } = await supabase
    .from("project_document_versions")
    .select("id,project_id,version_number,status,storage_path,file_name,mime_type,size_bytes,sha256,change_summary,client_released_at,project_documents!project_document_versions_document_id_fkey(code,title,discipline,category),projects(code,name)")
    .not("client_released_at", "is", null)
    .eq("status", "RELEASED")
    .order("client_released_at", { ascending: false });

  const paths = (data ?? []).map((version) => version.storage_path);
  const { data: signed, error: signedError } = paths.length ? await supabase.storage.from("project-documents").createSignedUrls(paths, 900) : { data: [], error: null };
  if (error) reportDataAccessError("client-documents.page.load", error);
  if (signedError) reportDataAccessError("client-documents.page.sign-urls", signedError);
  const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">ARQUIVOS AUTORIZADOS</span><h1>Documentos</h1><p className="muted">Versões aprovadas e liberadas pela equipe Innovar.</p></div></div>
      {error ? <div className="validation blocking">Não foi possível carregar os documentos.</div> : null}
      {signedError ? <div className="validation blocking">Alguns arquivos não puderam ser preparados para download.</div> : null}
      <section className="card table-wrap">
        <table><thead><tr><th>Obra</th><th>Documento</th><th>Disciplina</th><th>Versão</th><th>Status</th><th>Arquivo</th></tr></thead><tbody>
          {(data ?? []).map((version) => {
            const document = singleRelation(version.project_documents);
            const project = singleRelation(version.projects);
            return <tr key={version.id}><td><strong>{project?.code || "—"}</strong><br /><span className="muted">{project?.name || ""}</span></td><td><span className="mono">{document?.code || "—"}</span><br /><strong>{document?.title || version.file_name}</strong><br /><span className="muted">{version.change_summary || ""}</span></td><td>{document?.discipline || "—"}<br /><span className="muted">{document?.category || ""}</span></td><td className="mono">V{version.version_number}</td><td><span className={statusBadge(version.status)}>{version.status}</span></td><td><a className="button button-secondary" href={signedByPath.get(version.storage_path) ?? "#"} target="_blank" rel="noreferrer">Baixar arquivo</a><br /><span className="muted">{Math.round(Number(version.size_bytes) / 1024)} KB</span></td></tr>;
          })}
          {!data?.length ? <tr><td colSpan={6}>Nenhum documento foi liberado.</td></tr> : null}
        </tbody></table>
      </section>
      <div className="validation" style={{ marginTop: 20 }}>Os links são temporários e expiram automaticamente. Uma nova URL é gerada a cada acesso autorizado.</div>
    </main>
  );
}
