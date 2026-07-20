import { setApplicationState } from "@/app/actions/access-control";
import { requireAccessAdministration } from "@/lib/authorization";

type ModuleRow={
  id:string;
  key:string;
  name:string;
  description:string;
  category:string;
  display_order:number;
  version:string;
  is_core:boolean;
  default_enabled:boolean;
};

export default async function ApplicationsAdminPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const context=await requireAccessAdministration();
  const params=await searchParams;
  const[modulesResult,installedResult,dependenciesResult]=await Promise.all([
    context.supabase.from("app_modules").select("id,key,name,description,category,display_order,version,is_core,default_enabled").eq("active",true).order("display_order"),
    context.supabase.from("organization_modules").select("module_id,status,enabled_at,disabled_at,archived_at,installed_version").eq("organization_id",context.organizationId),
    context.supabase.from("app_module_dependencies").select("module_id,depends_on_module_id,required")
  ]);
  const firstError=modulesResult.error??installedResult.error??dependenciesResult.error;
  if(firstError)throw new Error(firstError.message);

  const modules=(modulesResult.data??[]) as ModuleRow[];
  const installedByModule=new Map((installedResult.data??[]).map(row=>[row.module_id,row]));
  const moduleById=new Map(modules.map(module=>[module.id,module]));
  const dependenciesByModule=new Map<string,string[]>();
  for(const relation of dependenciesResult.data??[]){
    if(!relation.required)continue;
    const dependency=moduleById.get(relation.depends_on_module_id);
    if(!dependency)continue;
    const current=dependenciesByModule.get(relation.module_id)??[];
    current.push(dependency.name);
    dependenciesByModule.set(relation.module_id,current);
  }

  return <main className="content">
    <section className="page-heading"><div><span className="badge">CATÁLOGO</span><h1>Aplicativos da organização</h1><p>Desabilitar remove o módulo do menu e bloqueia suas rotas, sem apagar o histórico.</p></div></section>
    {params.error&&<p className="alert alert-danger">{params.error}</p>}
    <section className="card" style={{overflowX:"auto"}}>
      <table className="data-table">
        <thead><tr><th>Aplicativo</th><th>Categoria</th><th>Dependências</th><th>Versão</th><th>Estado</th><th>Alterar</th></tr></thead>
        <tbody>{modules.map(module=>{
          const installed=installedByModule.get(module.id);
          const status=String(installed?.status??(module.default_enabled||module.is_core?"ENABLED":"DISABLED"));
          return <tr key={module.key}>
            <td><strong>{module.name}</strong><small style={{display:"block"}}>{module.description}</small>{module.is_core&&<span className="badge">NÚCLEO</span>}</td>
            <td>{module.category}</td>
            <td>{dependenciesByModule.get(module.id)?.join(", ")||"—"}</td>
            <td>{installed?.installed_version??module.version}</td>
            <td><span className="badge">{status}</span></td>
            <td><form action={setApplicationState} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <input type="hidden" name="applicationKey" value={module.key}/>
              <select name="state" defaultValue={status} disabled={module.is_core}>
                <option value="ENABLED">Habilitado</option><option value="DISABLED">Desabilitado</option><option value="ARCHIVED">Arquivado</option>
              </select>
              <input name="reason" placeholder="Justificativa" required disabled={module.is_core}/>
              <button className="button button-secondary" type="submit" disabled={module.is_core}>Salvar</button>
            </form></td>
          </tr>;
        })}</tbody>
      </table>
    </section>
  </main>;
}
