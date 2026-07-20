import { createAccessProfile, setProfileAccessLevel } from "@/app/actions/access-control";
import { requireAccessAdministration } from "@/lib/authorization";
import type { ModuleAccessLevel } from "@/lib/modules/registry";

function levelFor(keys: Set<string>): ModuleAccessLevel {
  if (keys.has("delete") || keys.has("manage") || keys.has("configure")) return "FULL";
  if (keys.has("update") || keys.has("create")) return "READ_WRITE";
  if (keys.has("read")) return "READ";
  return "NONE";
}

export default async function ProfilesAdminPage({ searchParams }: { searchParams: Promise<{ error?:string }> }) {
  const context = await requireAccessAdministration();
  const params=await searchParams;
  const [profilesResult,appsResult,capsResult,grantsResult]=await Promise.all([
    context.supabase.from("access_profiles").select("id,key,name,description,status,is_system").eq("organization_id",context.organizationId).order("name"),
    context.supabase.from("applications").select("id,key,name,category,sort_order").order("sort_order"),
    context.supabase.from("application_capabilities").select("id,application_id,key"),
    context.supabase.from("profile_capabilities").select("profile_id,capability_id,effect")
  ]);
  const firstError=profilesResult.error??appsResult.error??capsResult.error??grantsResult.error;
  if(firstError)throw new Error(firstError.message);
  const profiles=profilesResult.data??[]; const applications=appsResult.data??[]; const capabilities=capsResult.data??[]; const grants=grantsResult.data??[];
  const capById=new Map(capabilities.map(cap=>[cap.id,cap]));
  const levels=new Map<string,ModuleAccessLevel>();
  for(const profile of profiles){for(const app of applications){const keys=new Set<string>();for(const grant of grants){if(grant.profile_id!==profile.id||grant.effect!=="ALLOW")continue;const cap=capById.get(grant.capability_id);if(cap?.application_id===app.id)keys.add(cap.key);}levels.set(`${profile.id}:${app.key}`,levelFor(keys));}}

  return <main className="content">
    <section className="page-heading"><div><span className="badge">PERFIS PLUG-AND-PLAY</span><h1>Perfis e níveis por aplicativo</h1><p>Perfis são conjuntos reutilizáveis de capacidades. Nomes podem mudar sem alterar as regras de negócio.</p></div></section>
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
    <section className="card" style={{ marginTop:24, overflowX:"auto" }}>
      <table className="data-table" style={{ minWidth:1050 }}>
        <thead><tr><th>Perfil</th>{applications.map(app=><th key={app.id}>{app.name}</th>)}</tr></thead>
        <tbody>{profiles.map(profile=><tr key={profile.id}>
          <td><strong>{profile.name}</strong><small style={{ display:"block" }}>{profile.description}</small>{profile.is_system&&<span className="badge">PADRÃO</span>}</td>
          {applications.map(app=><td key={app.id}>
            <form action={setProfileAccessLevel}>
              <input type="hidden" name="profileId" value={profile.id}/><input type="hidden" name="applicationKey" value={app.key}/><input type="hidden" name="reason" value="Atualização da matriz de perfil"/>
              <select name="level" defaultValue={levels.get(`${profile.id}:${app.key}`)??"NONE"} aria-label={`${profile.name}: ${app.name}`}>
                <option value="NONE">Sem acesso</option><option value="READ">Leitura</option><option value="READ_WRITE">Leitura + edição</option><option value="FULL">Completo</option>
              </select>
              <button className="button button-secondary" style={{ marginTop:6 }} type="submit">Aplicar</button>
            </form>
          </td>)}
        </tr>)}</tbody>
      </table>
    </section>
  </main>;
}
