import { notFound } from "next/navigation";
import { releaseProjectDocument, uploadProjectDocument } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { statusBadge } from "@/lib/stage12";

export default async function ProjectDocumentsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const [{ data: project }, { data: documents, error }] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("project_documents").select("id,code,title,discipline,category,status,current_version_id,client_visible,project_document_versions(id,version_number,status,storage_path,file_name,mime_type,size_bytes,sha256,change_summary,client_released_at,created_at)").eq("project_id", id).order("discipline").order("code")
  ]);
  if (!project) notFound();

  const paths = (documents ?? []).flatMap((document) => document.project_document_versions ?? []).map((version) => version.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("project-documents").createSignedUrls(paths, 900)
    : { data: [] };
  const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Documentos</h1>
          <p className="muted">Disciplinas, revisões, aprovação, hash e versões liberadas ao cliente.</p>
        </div>
      </div>

      {pageError ? <div className="validation blocking">{pageError}</div> : null}
      {error ? <div className="validation blocking">{error.message}</div> : null}

      <div className="split-layout">
        <section className="grid">
          {(documents ?? []).map((document) => {
            const versions = [...(document.project_document_versions ?? [])].sort((a, b) => b.version_number - a.version_number);
            return (
              <article className="card" key={document.id}>
                <div className="card-pad" style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <span className="mono muted">{document.code}</span>
                    <h2>{document.title}</h2>
                    <p className="muted">{document.discipline} · {document.category}</p>
                  </div>
                  <div><span className={statusBadge(document.status)}>{document.status}</span>{document.client_visible ? <span className="badge badge-success" style={{ marginLeft: 7 }}>Portal</span> : null}</div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Versão</th><th>Arquivo</th><th>Status</th><th>Hash</th><th>Alteração</th><th>Ação</th></tr></thead>
                    <tbody>
                      {versions.map((version) => (
                        <tr key={version.id}>
                          <td className="mono">V{version.version_number}</td>
                          <td><a href={signedByPath.get(version.storage_path) ?? "#"} target="_blank" rel="noreferrer"><strong>{version.file_name}</strong></a><br /><span className="muted">{Math.round(Number(version.size_bytes) / 1024)} KB</span></td>
                          <td><span className={statusBadge(version.status)}>{version.status}</span></td>
                          <td className="mono" title={version.sha256 ?? ""}>{version.sha256 ? `${version.sha256.slice(0, 12)}…` : "—"}</td>
                          <td style={{ whiteSpace: "normal", minWidth: 180 }}>{version.change_summary || "—"}</td>
                          <td>{version.status === "RELEASED" ? <span className="badge badge-success">Liberada</span> : <form action={releaseProjectDocument}><input type="hidden" name="projectId" value={id} /><input type="hidden" name="versionId" value={version.id} /><button className="button button-secondary" type="submit">Aprovar e liberar</button></form>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
          {!documents?.length ? <section className="card card-pad"><strong>Nenhum documento cadastrado.</strong><p className="muted">Envie a primeira versão de um documento para iniciar o controle.</p></section> : null}
        </section>

        <aside className="card form-card">
          <h2>Enviar documento</h2>
          <p className="muted">Usar o mesmo código cria uma nova versão do documento existente.</p>
          <form action={uploadProjectDocument} encType="multipart/form-data">
            <input type="hidden" name="projectId" value={id} />
            <label>Código<input name="code" placeholder="ARQ-PLB-001" required /></label>
            <label>Título<input name="title" placeholder="Planta baixa térreo" required /></label>
            <label>Disciplina<select name="discipline" required><option value="Arquitetura">Arquitetura</option><option value="Estrutural">Estrutural</option><option value="Elétrica">Elétrica</option><option value="Hidráulica">Hidráulica</option><option value="Climatização">Climatização</option><option value="Interiores">Interiores</option><option value="Planejamento">Planejamento</option><option value="Qualidade">Qualidade</option><option value="Administrativo">Administrativo</option></select></label>
            <label>Categoria<select name="category" required><option value="Projeto">Projeto</option><option value="Memorial">Memorial</option><option value="Especificação">Especificação</option><option value="Relatório">Relatório</option><option value="Manual">Manual</option><option value="Checklist">Checklist</option><option value="Outro">Outro</option></select></label>
            <label>Resumo da alteração<textarea name="changeSummary" rows={3} /></label>
            <label>Arquivo<input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp,.docx,.xlsx" required /></label>
            <button className="button button-primary" type="submit">Enviar versão privada</button>
          </form>
          <div className="validation">A liberação exige SHA-256 e torna a versão imutável.</div>
        </aside>
      </div>
    </main>
  );
}
