import { uploadProjectDocument } from "@/app/actions/projects";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireCapability } from "@/lib/authorization";

export default async function NewGlobalDocumentPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const context = await requireCapability("documentos", "create");
  const { data: projects } = await context.supabase
    .from("projects")
    .select("id,code,name,status")
    .eq("organization_id", context.organizationId)
    .is("archived_at", null)
    .order("name");

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Enviar documento"
        primaryAction={<button className="button button-primary" type="submit" form="document-form">Enviar arquivo</button>}
      />
      <p className="workspace-intro">
        Todo arquivo pertence a uma obra, recebe código, disciplina, categoria, versão e hash antes de poder ser liberado.
      </p>
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      <form id="document-form" action={uploadProjectDocument} encType="multipart/form-data" className="card card-pad field-form">
        <input type="hidden" name="returnPath" value="/app/documentos" />
        <div className="field-grid">
          <label className="span-2">Obra
            <select name="projectId" required defaultValue="">
              <option value="" disabled>Selecione a obra</option>
              {(projects ?? []).map(project => (
                <option key={project.id} value={project.id}>{project.code} · {project.name}</option>
              ))}
            </select>
          </label>
          <label>Código<input name="code" required placeholder="ARQ-PE-001" /></label>
          <label>Disciplina<input name="discipline" required placeholder="Arquitetura" /></label>
          <label className="span-2">Título<input name="title" required placeholder="Projeto executivo — pavimento térreo" /></label>
          <label>Categoria<input name="category" required placeholder="Projeto executivo" /></label>
          <label>Resumo da alteração<input name="changeSummary" placeholder="Emissão inicial" /></label>
          <label className="span-2 signature-dropzone">Arquivo
            <input name="file" type="file" required />
            <small>Até 50 MB. Um novo envio com o mesmo código cria uma nova versão.</small>
          </label>
        </div>
      </form>
    </main>
  );
}
