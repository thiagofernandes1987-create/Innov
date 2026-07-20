import { assignProfileToUser, setUserCapabilityOverride } from "@/app/actions/access-control";
import { requireAccessAdministration } from "@/lib/authorization";

const capabilityOptions=["create","read","update","delete","approve","release_to_client","sign","export","manage","view_sensitive_financials","assign_users","configure"];

export default async function UsersAccessPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const context=await requireAccessAdministration(); const params=await searchParams;
  const [membershipsResult,profilesResult,assignmentsResult,appsResult]=await Promise.all([
    context.supabase.from("organization_memberships").select("user_id,role,active").eq("organization_id",context.organizationId).eq("active",true),
    context.supabase.from("access_profiles").select("id,name,key,status").eq("organization_id",context.organizationId).eq("status","ACTIVE").order("name"),
    context.supabase.from("user_profile_assignments").select("id,user_id,profile_id,scope_type,scope_id,active").eq("organization_id",context.organizationId).eq("active",true),
    context.supabase.from("applications").select("key,name,sort_order").order("sort_order")
  ]);
  const firstError=membershipsResult.error??profilesResult.error??assignmentsResult.error??appsResult.error;if(firstError)throw new Error(firstError.message);
  const memberships=membershipsResult.data??[];const profiles=profilesResult.data??[];const assignments=assignmentsResult.data??[];const apps=appsResult.data??[];
  const ids=memberships.map(item=>item.user_id);const identityResult=ids.length?await context.supabase.from("profiles").select("id,email,full_name").in("id",ids):{data:[],error:null};
  const identities=new Map((identityResult.data??[]).map(item=>[item.id,item]));const profileById=new Map(profiles.map(item=>[item.id,item]));

  return <main className="content">
    <section className="page-heading"><div><span className="badge">USUÁRIOS E ESCOPO</span><h1>Atribuição de acessos</h1><p>Um usuário pode possuir vários perfis e exceções específicas por aplicativo, cliente ou obra.</p></div></section>
    {params.error&&<p className="alert alert-danger">{params.error}</p>}
    <div style={{display:"grid",gap:20}}>{memberships.map(member=>{const identity=identities.get(member.user_id);const userAssignments=assignments.filter(item=>item.user_id===member.user_id);return <section className="card" key={member.user_id}>
      <div style={{display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}><div><span className="badge">{String(member.role)}</span><h2>{identity?.full_name||identity?.email||member.user_id.slice(0,8)}</h2><p>{identity?.email||member.user_id}</p></div><div><strong>Perfis ativos</strong><p>{userAssignments.map(item=>profileById.get(item.profile_id)?.name).filter(Boolean).join(", ")||"Nenhum perfil configurável"}</p></div></div>
      <div className="two-column" style={{marginTop:20}}>
        <form action={assignProfileToUser} className="card" style={{background:"var(--surface-soft)"}}>
          <h3>Atribuir perfil</h3><input type="hidden" name="userId" value={member.user_id}/>
          <label>Perfil<select name="profileId" required>{profiles.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
          <label>Escopo<select name="scopeType" defaultValue="ORGANIZATION"><option value="ORGANIZATION">Toda a organização</option><option value="CLIENT">Cliente específico</option><option value="PROJECT">Obra específica</option></select></label>
          <label>ID do cliente ou obra<input name="scopeId" placeholder="Opcional no escopo da organização"/></label><label>Justificativa<input name="reason" required defaultValue="Atribuição administrativa"/></label>
          <button className="button button-primary" type="submit">Atribuir perfil</button>
        </form>
        <form action={setUserCapabilityOverride} className="card" style={{background:"var(--surface-soft)"}}>
          <h3>Exceção individual</h3><input type="hidden" name="userId" value={member.user_id}/>
          <label>Aplicativo<select name="applicationKey">{apps.map(app=><option key={app.key} value={app.key}>{app.name}</option>)}</select></label>
          <label>Capacidade<select name="capabilityKey">{capabilityOptions.map(cap=><option key={cap} value={cap}>{cap}</option>)}</select></label>
          <label>Efeito<select name="effect"><option value="DENY">Negar</option><option value="ALLOW">Conceder</option></select></label>
          <label>Escopo<select name="scopeType"><option value="ORGANIZATION">Organização</option><option value="CLIENT">Cliente</option><option value="PROJECT">Obra</option></select></label>
          <label>ID do escopo<input name="scopeId" placeholder="Opcional para organização"/></label><label>Justificativa<input name="reason" required/></label>
          <button className="button button-secondary" type="submit">Salvar exceção</button>
        </form>
      </div>
    </section>})}</div>
  </main>;
}
