import {createProcurementRequest} from "@/app/actions/procurement";
import {RequestItemsBuilder} from "@/components/procurement/request-items-builder";
import {requireCapability} from "@/lib/authorization";

export const dynamic="force-dynamic";

export default async function NewProcurementRequestPage(){
  const context=await requireCapability("compras","create");
  const{data:projects}=await context.supabase.from("projects").select("id,code,name,status").eq("organization_id",context.organizationId).is("archived_at",null).order("name");
  return <main className="content procurement-app"><section className="page-heading"><div><span className="badge">NOVA SOLICITAÇÃO</span><h1>Demanda de compra</h1><p>Descreva a necessidade da obra antes de convidar fornecedores.</p></div></section><form action={createProcurementRequest} className="procurement-form-stack"><section className="card card-pad"><div className="form-grid form-grid-2"><label>Obra<select required name="projectId" defaultValue=""><option value="" disabled>Selecione a obra</option>{(projects??[]).map(project=><option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label><label>Título<input required name="title" placeholder="Ex.: Materiais para alvenaria do térreo"/></label><label>Prioridade<select name="priority" defaultValue="NORMAL"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></label><label>Necessário até<input name="neededBy" type="date"/></label><label>Centro de custo<input name="costCenter" placeholder="Opcional"/></label></div><label>Descrição<textarea name="description" rows={4} placeholder="Contexto, local de aplicação e restrições."/></label></section><RequestItemsBuilder/><div className="page-actions"><button className="button button-primary button-large" type="submit">Salvar solicitação</button></div></form></main>;
}
