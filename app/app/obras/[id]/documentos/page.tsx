import { notFound } from "next/navigation";
import { releaseProjectDocument, uploadProjectDocument } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { CampoComSugestao } from "@/components/comum/campo-com-sugestao";
import { padroesDoEscopo } from "@/lib/sugestoes/escopos";
import { ESCOPOS, sugestoesDoEscopo } from "@/lib/sugestoes/servidor";
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
  const [projectResult, documentsResult] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("project_documents").select("id,code,title,discipline,category,status,current_version_id,client_visible").eq("project_id", id).order("discipline").order("code")
  ]);

  reportDataAccessError("project-documents.project", projectResult.error);
  reportDataAccessError("project-documents.collection", documentsResult.error);

  if (projectResult.error) {
    return (
      <main className="content">
        <ProjectNav projectId={id} />
        <h1>Documentos</h1>
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      </main>
    );
  }

  const project = projectResult.data;
  if (!project) notFound();

  const documents = documentsResult.data ?? [];
  const sugestoesDeDisciplina = await sugestoesDoEscopo(supabase, organizationId, ESCOPOS.disciplina, {
    padroes: padroesDoEscopo(ESCOPOS.disciplina)
  });
  const documentIds = documents.map((document) => document.id);
  const versionsResult = documentIds.length
    ? await supabase
      .from("project_document_versions")
      .select("id,document_id,version_number,status,storage_path,file_name,mime_type,size_bytes,sha256,change_summary,client_released_at,created_at")
      .eq("organization_id", organizationId)
      .in("document_id", documentIds)
      .order("version_number", { ascending: false })
    : { data: [], error: null };

  reportDataAccessError("project-documents.versions", versionsResult.error);

  const versions = versionsResult.data ?? [];
  const paths = versions.map((version) => version.storage_path).filter((path): path is string => Boolean(path));
  const signedResult = paths.length
    ? await supabase.storage.from("project-documents").createSignedUrls(paths, 900)
    : { data: [], error: null };

  reportDataAccessError("project-documents.signed-urls", signedResult.error);

  const versionsByDocument = new Map<string, typeof versions>();
  for (const version of versions) {
    versionsByDocument.set(version.document_id, [...(versionsByDocument.get(version.document_id) ?? []), version]);
  }
  const signedByPath = new Map((signedResult.data ?? []).map((item) => [item.path, item.signedUrl]));
  const documentsLoadFailed = Boolean(documentsResult.error || versionsResult.error);
  const signedUrlsLoadFailed = Boolean(signedResult.error);

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

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {documentsLoadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}
      {!documentsLoadFailed && signedUrlsLoadFailed ? <div className="validation" role="alert">Os documentos foram carregados, mas os links temporários estão indisponíveis. Tente novamente antes de baixar arquivos.</div> : null}

      <div className="split-layout">
        <section className="grid">
          {!documentsLoadFailed ? (
            <>
              {documents.map((document) => {
                const documentVersions = versionsByDocument.get(document.id) ?? [];
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
                          {documentVersions.map((version) => {
                            const signedUrl = version.storage_path ? signedByPath.get(version.storage_path) : null;
                            return (
                              <tr key={version.id}>
                                <td className="mono">V{version.version_number}</td>
                                <td>{signedUrl ? <a href={signedUrl} target="_blank" rel="noreferrer"><strong>{version.file_name}</strong></a> : <strong>{version.file_name}</strong>}<br /><span className="muted">{Math.round(Number(version.size_bytes) / 1024)} KB{!signedUrl ? " · link indisponível" : ""}</span></td>
                                <td><span className={statusBadge(version.status)}>{version.status}</span></td>
                                <td className="mono" title={version.sha256 ?? ""}>{version.sha256 ? `${version.sha256.slice(0, 12)}…` : "—"}</td>
                                <td style={{ whiteSpace: "normal", minWidth: 180 }}>{version.change_summary || "—"}</td>
                                <td>{version.status === "RELEASED" ? <span className="badge badge-success">Liberada</span> : <form action={releaseProjectDocument}><input type="hidden" name="projectId" value={id} /><input type="hidden" name="versionId" value={version.id} /><button className="button button-secondary" type="submit">Aprovar e liberar</button></form>}</td>
                              </tr>
                            );
                          })}
                          {!documentVersions.length ? <tr><td colSpan={6}>Nenhuma versão cadastrada.</td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </article>
                );
              })}
              {!documents.length ? <section className="card card-pad"><strong>Nenhum documento cadastrado.</strong><p className="muted">Envie a primeira versão de um documento para iniciar o controle.</p></section> : null}
            </>
          ) : <section className="card card-pad"><strong>Documentos temporariamente indisponíveis.</strong><p className="muted">Não conclua que não existem revisões ou liberações até a coleção ser recarregada.</p></section>}
        </section>

        <aside className="card form-card">
          <h2>Enviar documento</h2>
          <p className="muted">Usar o mesmo código cria uma nova versão do documento existente.</p>
          <form action={uploadProjectDocument} encType="multipart/form-data">
            <input type="hidden" name="projectId" value={id} />
            <label>Código<input name="code" placeholder="ARQ-PLB-001" required /></label>
            <label>Título<input name="title" placeholder="Planta baixa térreo" required /></label>
            {/* Era `select` de nove disciplinas fixas — lista fechada, que a diretriz
                proíbe pelo motivo que aparece aqui inteiro: quem precisa de
                "Paisagismo" ou "Impermeabilização" escolhia a mais parecida, e o
                documento ficava classificado errado com aparência de arrumado.
                As nove viraram sugestão padrão; qualquer outra disciplina passa. */}
            <label>Disciplina
              <CampoComSugestao name="discipline" sugestoes={sugestoesDeDisciplina} required placeholder="Arquitetura" />
            </label>
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
