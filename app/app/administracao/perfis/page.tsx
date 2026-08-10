import { createAccessProfile, setProfileAccessLevel } from "@/app/actions/access-control";
import { requireAccessAdministration } from "@/lib/authorization";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { toUiAccessLevel, type ModuleAccessLevel } from "@/lib/modules/registry";

export default async function ProfilesAdminPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const context=await requireAccessAdministration();
  const params=await searchParams;
  const[profilesResult,modulesResult,permissionsResult]=await Promise.all([
    context.supabase.from("access_profiles").select("id,code,name,description,base_role,system,active").eq("organization_id",context.organizationId).eq("active",true).order("name"),
    context.supabase.from("app_modules").select("id,key,name,category,display_order").eq("active",true).order("display_order"),
    context.supabase.from("profile_module_permissions").select("profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive").eq("organization_id",context.organizationId)
  ]);
  const firstError=profilesResult.error??modulesResult.error??permissionsResult.error;
  if(firstError){reportDataAccessError("administration.profiles.load",firstError);throw new Error("Não foi possível carregar os perfis de acesso.");}
  const profiles=profilesResult.data??[];
  const modules=modulesResult.data??[];
  const permissions=permissionsResult.data??[];
  const permissionByPair=new Map(permissions.map(permission=>[`${permission.profile_id}:${permission.module_id}`,permission]));

  return <main className="content">
    <section className="page-heading"><div><span className="badge">PERFIS PLUG-AND-PLAY</span><h1>Perfis e níveis por aplicativo</h1><p>Perfis são conjuntos reutilizáveis de capacidades. Um usuário pode receber vários perfis.</p></div></section>
    {params.error&&<p className="alert alert-danger">{params.error}</p>}
    <section className="card">
      <h2>Novo perfil</h2>
      <form action={createAccessProfile} className="form-grid">
        <label>Identificador<input name="key" placeholder="supervisao-operacional" required/></label>
        <label>Nome<input name="name" placeholder="Supervisão Operacional" required/></label>
        <label className="full">Descrição<input name="description" placeholder="Responsabilidades e finalidade do perfil"/></label>
        <div className="full"><button className="button button-primary" type="submit">Criar perfil</button></div>
      </form>
    </section>
    <section className="card" style={{marginTop:24,overflowX:"auto"}}>
      <table className="data-table" style={{minWidth:1150}}>
        <thead><tr><th>Perfil</th>{modules.map(module=><th key={module.id}>{module.name}</th>)}</tr></thead>
        <tbody>{profiles.map(profile=><tr key={profile.id}>
          <td><strong>{profile.name}</strong><small style={{display:"block"}}>{profile.description}</small>{profile.system&&<span className="badge">PADRÃO</span>}{profile.base_role&&<small style={{display:"block"}}>Base: {profile.base_role}</small>}</td>
          {modules.map(module=>{
            const permission=permissionByPair.get(`${profile.id}:${module.id}`);
            const level=(permission?toUiAccessLevel(String(permission.access_level)):"NONE") as ModuleAccessLevel;
            const extras=[permission?.can_approve&&"aprovar",permission?.can_release&&"liberar",permission?.can_sign&&"assinar",permission?.can_administer&&"administrar",permission?.can_view_sensitive&&"sensível"].filter(Boolean).join(", ");
            return <td key={module.id}>
              <form action={setProfileAccessLevel}>
                <input type="hidden" name="profileId" value={profile.id}/><input type="hidden" name="applicationKey" value={module.key}/><input type="hidden" name="reason" value="Atualização da matriz de perfil"/>
                <select name="level" defaultValue={level} aria-label={`${profile.name}: ${module.name}`}>
                  <option value="NONE">Sem acesso</option><option value="READ">Leitura</option><option value="READ_WRITE">Leitura + edição</option><option value="FULL">Completo</option>
                </select>
                {extras&&<small style={{display:"block",marginTop:4}}>{extras}</small>}
                <button className="button button-secondary" style={{marginTop:6}} type="submit">Aplicar</button>
              </form>
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </section>
  </main>;
}
