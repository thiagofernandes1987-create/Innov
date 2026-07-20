import{createFinanceMeasurement}from"@/app/actions/operational-finance";
import{MeasurementItemsBuilder}from"@/components/finance/measurement-items-builder";
import{requireCapability}from"@/lib/authorization";

export const dynamic="force-dynamic";

export default async function NewFinanceMeasurementPage(){
 const context=await requireCapability("financeiro","create");
 const[{data:projects},{data:contracts}]=await Promise.all([
  context.supabase.from("projects").select("id,code,name").eq("organization_id",context.organizationId).is("archived_at",null).order("name"),
  context.supabase.from("contracts").select("id,code,title,project_id,status").eq("organization_id",context.organizationId).not("status","in","(CANCELED,TERMINATED)").order("created_at",{ascending:false})
 ]);
 return <main className="content finance-app"><section className="page-heading"><div><span className="badge">NOVA MEDIÇÃO</span><h1>Boletim financeiro da obra</h1><p>Registre o executado no período, retenções, deduções e vencimento do recebível.</p></div></section><form action={createFinanceMeasurement} className="finance-form-stack"><section className="card card-pad"><div className="form-grid form-grid-2"><label>Obra<select required name="projectId" defaultValue=""><option value="" disabled>Selecione</option>{(projects??[]).map(project=><option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label><label>Contrato<select required name="contractId" defaultValue=""><option value="" disabled>Selecione</option>{(contracts??[]).map(contract=><option key={contract.id} value={contract.id}>{contract.code} · {contract.title}</option>)}</select></label><label>Início do período<input required name="periodStart" type="date"/></label><label>Fim do período<input required name="periodEnd" type="date"/></label><label>Vencimento do recebível<input required name="dueDate" type="date"/></label><label>Retenção<input name="retentionAmount" min="0" step="0.01" type="number" defaultValue="0"/></label><label>Deduções<input name="deductionAmount" min="0" step="0.01" type="number" defaultValue="0"/></label></div><label>Descrição<textarea name="description" rows={4} placeholder="Escopo medido, referência da etapa e observações."/></label></section><MeasurementItemsBuilder/><button className="button button-primary button-large" type="submit">Salvar medição</button></form></main>;
}
