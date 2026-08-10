import { assignProfileToUser, revokeProfileFromUser, setUserCapabilityOverride } from "@/app/actions/access-control";
import { requireAccessAdministration } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";

const capabilityOptions=["create","read","update","delete","approve","release_to_client","sign","export","manage","view_sensitive_financials","assign_users","configure"];

function AccessPageHeading(){
  return <section className="page-heading"><div><span className="badge">USUÁRIOS E ESCOPO</span><h1>Atribuição de acessos</h1><p>Um usuário pode possuir vários perfis e exceções específicas por aplicativo ou obra.</p></div></section>;
}

function AccessDataFailure(){
  return <main className="content"><AccessPageHeading/><div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div></main>;
}

export default async function UsersAccessPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const context=await requireAccessAdministration();
  const params=await searchParams;
  const[membershipsResult,profilesResult,assignmentsResult,modulesResult]=await Promise.all([
    context.supabase.from("organization_memberships").select("id,user_id,role,access_profile_id,active").eq("organization_id",context.organizationId).eq("active",true),
    context.supabase.from("access_profiles").select("id,name,code,base_role,active").eq("organization_id",context.organizationId).eq("active",true).order("name"),
    context.supabase.from("membership_access_profiles").select("id,membership_id,profile_id,scope_type,scope_id,active,starts_at,ends_at").eq("organization_id",context.organizationId).eq("active",true),
    context.supabase.from("app_modules").select("key,name,display_order").eq("active",true).order("display_order")
  ]);
  const firstError=membershipsResult.error??profilesResult.error??assignmentsResult.error??modulesResult.error;
  if(firstError){reportDataAccessError("access.users.bootstrap",firstError);return <AccessDataFailure/>;}
  const memberships=membershipsResult.data??[];
  const profiles=profilesResult.data??[];
  const assignments=assignmentsResult.data??[];
  const modules=modulesResult.data??[];
  const ids=memberships.map(item=>item.user_id);
  const identityResult=ids.length?await context.supabase.from("profiles").select("id,email,full_name").in("id",ids):{data:[],error:null};
  if(identityResult.error){reportDataAccessError("access.users.identities",identityResult.error);return <AccessDataFailure/>;}
  const identities=new Map((identityResult.data??[]).map(item=>[item.id,item]));
  const profileById=new Map(profiles.map(item=>[item.id,item]));

  return <main className="content">
    <AccessPageHeading/>
    {params.error&&<p className="alert alert-danger">{params.error}</p>}
    <div style={{display:"grid",gap:20}}>{memberships.map(member=>{
      const identity=identities.get(member.user_id);
      const userAssignments=assignments.filter(item=>item.membership_id===member.id);
      const primary=member.access_profile_id?profileById.get(member.access_profile_id):undefined;
      return <section className="card" key={member.user_id}>
        <div style={{display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}>
          <div><span className="badge">{String(member.role)}</span><h2>{identity?.full_name||identity?.email||member.user_id.slice(0,8)}</h2><p>{identity?.email||member.user_id}</p></div>
          <div style={{minWidth:280}}><strong>Perfis ativos</strong><p>{[primary?.name,...userAssignments.map(item=>profileById.get(item.profile_id)?.name)].filter(Boolean).filter((name,index,list)=>list.indexOf(name)===index).join(", ")||"Nenhum perfil configurável"}</p>{userAssignments.map(item=><div key={item.id} style={{display:"grid",gap:8,marginTop:10}}><small>{profileById.get(item.profile_id)?.name}: {item.scope_type}{item.scope_id?` · ${item.scope_id.slice(0,8)}`:""}</small><form action={revokeProfileFromUser} style={{display:"flex",gap:8,flexWrap:"wrap"}}><input type="hidden" name="assignmentId" value={item.id}/><input name="reason" required placeholder="Justificativa da revogação" aria-label={`Justificativa para revogar ${profileById.get(item.profile_id)?.name||"perfil"}`}/><button className="button button-secondary" type="submit">Revogar perfil</button></form></div>)}</div>
        </div>
        <div className="two-column" style={{marginTop:20}}>
          <form action={assignProfileToUser} className="card" style={{background:"var(--surface-soft)"}}>
            <h3>Atribuir perfil</h3><input type="hidden" name="userId" value={member.user_id}/>
            <label>Perfil<select name="profileId" required>{profiles.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
            <label>Escopo<select name="scopeType" defaultValue="ORGANIZATION"><option value="ORGANIZATION">Toda a organização</option><option value="CLIENT">Cliente específico</option><option value="PROJECT">Obra específica</option></select></label>
            <label>ID do cliente ou obra<input name="scopeId" placeholder="Obrigatório no escopo específico"/></label>
            <label>Justificativa<input name="reason" required defaultValue="Atribuição administrativa"/></label>
            <button className="button button-primary" type="submit">Atribuir perfil</button>
          </form>
          <form action={setUserCapabilityOverride} className="card" style={{background:"var(--surface-soft)"}}>
            <h3>Exceção individual</h3><input type="hidden" name="userId" value={member.user_id}/>
            <label>Aplicativo<select name="applicationKey">{modules.map(module=><option key={module.key} value={module.key}>{module.name}</option>)}</select></label>
            <label>Capacidade<select name="capabilityKey">{capabilityOptions.map(capability=><option key={capability} value={capability}>{capability}</option>)}</select></label>
            <label>Efeito<select name="effect"><option value="DENY">Negar</option><option value="ALLOW">Conceder</option></select></label>
            <label>Escopo<select name="scopeType"><option value="ORGANIZATION">Organização</option><option value="PROJECT">Obra específica</option></select></label>
            <label>ID da obra<input name="scopeId" placeholder="Obrigatório para obra específica"/></label>
            <label>Justificativa<input name="reason" required/></label>
            <button className="button button-secondary" type="submit">Salvar exceção</button>
          </form>
        </div>
      </section>;
    })}</div>
  </main>;
}
