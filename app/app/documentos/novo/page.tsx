import { uploadProjectDocument } from "@/app/actions/projects";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { CampoComSugestao } from "@/components/comum/campo-com-sugestao";
import { requireCapability } from "@/lib/authorization";
import { padroesDoEscopo } from "@/lib/sugestoes/escopos";
import { ESCOPOS, sugestoesDoEscopo } from "@/lib/sugestoes/servidor";

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

  // Vocabulário de disciplina da organização. Carregado no servidor porque a
  // leitura passa pela RLS: quem não tem acesso não recebe catálogo nenhum.
  const sugestoesDeDisciplina = await sugestoesDoEscopo(
    context.supabase,
    context.organizationId,
    ESCOPOS.disciplina,
    { padroes: padroesDoEscopo(ESCOPOS.disciplina) }
  );

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
          <label>Disciplina
            <CampoComSugestao name="discipline" sugestoes={sugestoesDeDisciplina} required placeholder="Arquitetura" />
          </label>
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
