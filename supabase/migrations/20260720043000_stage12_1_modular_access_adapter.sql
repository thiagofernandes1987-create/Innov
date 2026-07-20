-- Etapa 12.1 — evolução do núcleo modular existente.
-- Reutiliza app_modules, organization_modules, access_profiles e overrides homologados.

insert into public.app_modules(key,name,description,href,icon_key,display_order,active,sensitive,version,category,manifest,default_enabled,is_core)
values
('crm','CRM e Vendas','Leads, oportunidades e pipeline comercial.','/app/crm','target',10,true,false,'1.0.0','COMERCIAL','{"navigationLabel":"CRM"}',true,false),
('clientes','Clientes','Cadastro de clientes e visão multiobra.','/app/clientes','users',20,true,false,'1.0.0','COMERCIAL','{"navigationLabel":"Clientes"}',true,false),
('obras','Obras','Carteira multiobra e progresso executivo.','/app/obras','building',30,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Obras"}',true,false),
('planejamento','Planejamento','EAP, cronogramas, marcos e baselines.','/app/planejamento','calendar',40,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Planejamento"}',true,false),
('tarefas','Tarefas','Quadros de execução e responsabilidades.','/app/tarefas','check-square',50,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Tarefas"}',true,false),
('diario','Diário de Obras','Registros, atividades e evidências de campo.','/app/diario','clipboard',60,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Diário de obras"}',true,false),
('equipes','Equipes','Equipes, integrantes e recursos.','/app/equipes','hard-hat',70,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Equipes"}',true,false),
('orcamentos','Orçamentos','Custos, BDI, markup, cenários e aprovações.','/app/orcamentos','calculator',80,true,true,'1.0.0','FINANCEIRO','{"navigationLabel":"Orçamentos"}',true,false),
('propostas','Propostas','Propostas comerciais e versões liberadas.','/app/propostas','file-text',90,true,false,'1.0.0','COMERCIAL','{"navigationLabel":"Propostas"}',true,false),
('contratos','Contratos','Contratos, partes, versões e vigência.','/app/contratos','scroll',100,true,true,'1.0.0','JURIDICO','{"navigationLabel":"Contratos"}',true,false),
('aditivos','Aditivos','Alterações de valor, escopo e prazo.','/app/aditivos','file-plus',110,true,true,'1.0.0','JURIDICO','{"navigationLabel":"Aditivos"}',true,false),
('assinaturas','Assinaturas','Envelopes, signatários e evidências.','/app/assinaturas','pen-tool',120,true,true,'1.0.0','JURIDICO','{"navigationLabel":"Assinaturas"}',true,false),
('documentos','Documentos','Arquivos privados, versões e liberações.','/app/documentos','folder',130,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Documentos"}',true,false),
('qualidade','Qualidade','PO, FVS, FVM e não conformidades.','/app/qualidade','shield-check',140,true,false,'1.0.0','QUALIDADE','{"navigationLabel":"Qualidade"}',false,false),
('compras','Compras','Solicitações, cotações e pedidos.','/app/compras','shopping-cart',150,true,true,'1.0.0','SUPRIMENTOS','{"navigationLabel":"Compras"}',false,false),
('estoque','Estoque','Entradas, saídas e inventários.','/app/estoque','package',160,true,false,'1.0.0','SUPRIMENTOS','{"navigationLabel":"Estoque"}',false,false),
('financeiro','Financeiro','Contas, fluxo de caixa e conciliação.','/app/financeiro','landmark',170,true,true,'1.0.0','FINANCEIRO','{"navigationLabel":"Financeiro"}',false,false),
('sac','Pós-venda e SAC','Ocorrências e prestação de serviços.','/app/ocorrencias','headphones',180,true,false,'1.0.0','POS_VENDA','{"navigationLabel":"Pós-venda"}',true,false),
('relatorios','Relatórios','Indicadores e análises autorizadas.','/app/relatorios','bar-chart',190,true,true,'1.0.0','GERAL','{"navigationLabel":"Relatórios"}',true,false),
('auditoria','Auditoria','Eventos de segurança e alterações.','/app/auditoria','history',200,true,true,'1.0.0','NUCLEO','{"navigationLabel":"Auditoria"}',true,true),
('administracao','Administração','Aplicativos, perfis e usuários.','/app/administracao','settings',210,true,true,'1.0.0','NUCLEO','{"navigationLabel":"Administração"}',true,true)
on conflict(key) do update set
 name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,
 display_order=excluded.display_order,active=excluded.active,sensitive=excluded.sensitive,
 version=excluded.version,category=excluded.category,manifest=excluded.manifest,
 default_enabled=excluded.default_enabled,is_core=excluded.is_core,updated_at=now();

insert into public.app_module_dependencies(module_id,depends_on_module_id,minimum_version,required)
select m.id,d.id,'1.0.0',true
from (values
 ('obras','clientes'),('planejamento','obras'),('tarefas','obras'),('diario','obras'),('equipes','obras'),
 ('orcamentos','clientes'),('propostas','orcamentos'),('contratos','propostas'),('aditivos','contratos'),
 ('assinaturas','documentos'),('qualidade','obras'),('estoque','compras'),('sac','clientes')
) x(module_key,dependency_key)
join public.app_modules m on m.key=x.module_key
join public.app_modules d on d.key=x.dependency_key
on conflict(module_id,depends_on_module_id) do update set minimum_version=excluded.minimum_version,required=excluded.required;

create table if not exists public.membership_access_profiles(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 membership_id uuid not null references public.organization_memberships(id) on delete cascade,
 profile_id uuid not null references public.access_profiles(id) on delete cascade,
 scope_type text not null default 'ORGANIZATION' check(scope_type in('ORGANIZATION','CLIENT','PROJECT')),
 scope_id uuid,
 active boolean not null default true,
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 assigned_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create unique index if not exists membership_access_profiles_unique_nd
 on public.membership_access_profiles(organization_id,membership_id,profile_id,scope_type,scope_id) nulls not distinct;
create index if not exists membership_access_profiles_membership_idx
 on public.membership_access_profiles(membership_id,active,starts_at,ends_at);
create index if not exists membership_access_profiles_scope_idx
 on public.membership_access_profiles(scope_type,scope_id);

create or replace function public.ensure_organization_module_defaults(p_organization_id uuid)
returns boolean language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if not exists(select 1 from public.organizations where id=p_organization_id) then raise exception 'Organização não encontrada'; end if;
 perform public.ensure_organization_access_profiles(p_organization_id);
 update public.access_profiles set name=case base_role
  when 'COMERCIAL' then 'Vendas' when 'GESTOR_OBRAS' then 'Operacional' when 'SAC' then 'Pós-venda'
  when 'FINANCEIRO' then 'Financeiro' when 'ORCAMENTISTA' then 'Orçamentista'
  when 'ENGENHEIRO' then 'Engenharia' when 'QUALIDADE' then 'Qualidade'
  when 'DIRECAO' then 'Direção' when 'ADMINISTRADOR' then 'Administrador'
  when 'SUPER_ADMIN' then 'Superadministrador' when 'CLIENTE' then 'Cliente' else name end
 where organization_id=p_organization_id and system;
 insert into public.access_profiles(organization_id,code,name,description,base_role,system,active)
 values(p_organization_id,'usuario-comum','Usuário comum','Perfil sem módulos concedidos por padrão.',null,true,true)
 on conflict(organization_id,code) do nothing;
 insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
 select p_organization_id,m.id,case when m.default_enabled or m.is_core then 'ENABLED' else 'DISABLED' end,m.version,'{}'::jsonb,
  case when m.default_enabled or m.is_core then now() end
 from public.app_modules m where m.active
 on conflict(organization_id,module_id) do update set installed_version=excluded.installed_version,updated_at=now();
 insert into public.profile_module_permissions(
  organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive)
 select p_organization_id,ap.id,m.id,d.access_level,d.can_approve,d.can_release,d.can_sign,d.can_export,d.can_administer,d.can_view_sensitive
 from public.access_profiles ap cross join public.app_modules m
 cross join lateral public.default_role_module_permission(ap.base_role,m.key) d
 where ap.organization_id=p_organization_id and ap.base_role is not null
 on conflict(profile_id,module_id) do nothing;
 update public.organization_memberships om set access_profile_id=ap.id
 from public.access_profiles ap
 where om.organization_id=p_organization_id and ap.organization_id=om.organization_id and ap.base_role=om.role and om.access_profile_id is null;
 insert into public.membership_access_profiles(organization_id,membership_id,profile_id,scope_type,assigned_by)
 select om.organization_id,om.id,om.access_profile_id,'ORGANIZATION',om.user_id
 from public.organization_memberships om
 where om.organization_id=p_organization_id and om.access_profile_id is not null
 on conflict do nothing;
 return true;
end;$$;

create or replace function public.ensure_organization_module_defaults_trigger()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin perform public.ensure_organization_module_defaults(new.id); return new; end;$$;

drop trigger if exists organizations_initialize_modules on public.organizations;
create trigger organizations_initialize_modules after insert on public.organizations
for each row execute function public.ensure_organization_module_defaults_trigger();

create or replace function public.create_modular_access_profile(
 p_organization_id uuid,p_code text,p_name text,p_description text,p_base_role public.org_role default null)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_id uuid;
begin
 if not public.has_org_role(p_organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then raise exception 'Acesso negado'; end if;
 insert into public.access_profiles(organization_id,code,name,description,base_role,system,active,created_by)
 values(p_organization_id,lower(regexp_replace(trim(p_code),'[^a-zA-Z0-9]+','-','g')),trim(p_name),coalesce(trim(p_description),''),p_base_role,false,true,auth.uid())
 returning id into v_id;
 insert into public.permission_change_events(organization_id,actor_user_id,profile_id,action,after_data,reason)
 values(p_organization_id,auth.uid(),v_id,'CREATE_ACCESS_PROFILE',jsonb_build_object('name',p_name,'code',p_code),'Criação de perfil modular');
 return v_id;
end;$$;

create or replace function public.set_organization_module_status(
 p_organization_id uuid,p_module_key text,p_status text,p_reason text)
returns boolean language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_module public.app_modules; v_before jsonb; v_missing text[];
begin
 if not public.has_org_role(p_organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then raise exception 'Acesso negado'; end if;
 if p_status not in('ENABLED','DISABLED','ARCHIVED') then raise exception 'Estado inválido'; end if;
 select * into v_module from public.app_modules where key=lower(p_module_key) and active;
 if not found then raise exception 'Módulo não encontrado'; end if;
 if v_module.is_core and p_status<>'ENABLED' then raise exception 'Módulo de núcleo não pode ser desabilitado'; end if;
 if p_status='ENABLED' then
  select array_agg(d.key) into v_missing from public.app_module_dependencies dep
  join public.app_modules d on d.id=dep.depends_on_module_id
  left join public.organization_modules om on om.organization_id=p_organization_id and om.module_id=d.id and om.status='ENABLED'
  where dep.module_id=v_module.id and dep.required and om.id is null;
  if coalesce(array_length(v_missing,1),0)>0 then raise exception 'Dependências não habilitadas: %',array_to_string(v_missing,', '); end if;
 end if;
 select to_jsonb(x) into v_before from public.organization_modules x where x.organization_id=p_organization_id and x.module_id=v_module.id;
 insert into public.organization_modules(organization_id,module_id,status,installed_version,installed_by,enabled_at,disabled_at,archived_at)
 values(p_organization_id,v_module.id,p_status,v_module.version,auth.uid(),case when p_status='ENABLED' then now() end,case when p_status='DISABLED' then now() end,case when p_status='ARCHIVED' then now() end)
 on conflict(organization_id,module_id) do update set status=excluded.status,installed_version=excluded.installed_version,installed_by=excluded.installed_by,
 enabled_at=case when excluded.status='ENABLED' then now() else public.organization_modules.enabled_at end,
 disabled_at=case when excluded.status='DISABLED' then now() else null end,
 archived_at=case when excluded.status='ARCHIVED' then now() else null end,updated_at=now();
 insert into public.permission_change_events(organization_id,actor_user_id,module_id,action,before_data,after_data,reason)
 values(p_organization_id,auth.uid(),v_module.id,'SET_ORGANIZATION_MODULE_STATUS',v_before,jsonb_build_object('status',p_status),p_reason);
 return true;
end;$$;

create or replace function public.assign_user_access_profile(
 p_organization_id uuid,p_user_id uuid,p_profile_id uuid,p_scope_type text default 'ORGANIZATION',p_scope_id uuid default null,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_membership public.organization_memberships; v_id uuid;
begin
 if not public.has_org_role(p_organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then raise exception 'Acesso negado'; end if;
 if p_scope_type not in('ORGANIZATION','CLIENT','PROJECT') then raise exception 'Escopo inválido'; end if;
 select * into v_membership from public.organization_memberships where organization_id=p_organization_id and user_id=p_user_id and active for update;
 if not found then raise exception 'Usuário não pertence à organização'; end if;
 if not exists(select 1 from public.access_profiles where id=p_profile_id and organization_id=p_organization_id and active) then raise exception 'Perfil inválido'; end if;
 insert into public.membership_access_profiles(organization_id,membership_id,profile_id,scope_type,scope_id,assigned_by)
 values(p_organization_id,v_membership.id,p_profile_id,p_scope_type,p_scope_id,auth.uid())
 on conflict(organization_id,membership_id,profile_id,scope_type,scope_id) do update set active=true,starts_at=now(),ends_at=null,assigned_by=auth.uid()
 returning id into v_id;
 if v_membership.access_profile_id is null and p_scope_type='ORGANIZATION' then update public.organization_memberships set access_profile_id=p_profile_id where id=v_membership.id; end if;
 insert into public.permission_change_events(organization_id,actor_user_id,target_user_id,profile_id,project_id,action,after_data,reason)
 values(p_organization_id,auth.uid(),p_user_id,p_profile_id,case when p_scope_type='PROJECT' then p_scope_id end,'ASSIGN_ADDITIONAL_ACCESS_PROFILE',jsonb_build_object('scope_type',p_scope_type,'scope_id',p_scope_id),p_reason);
 return v_id;
end;$$;

create or replace function public.revoke_user_access_profile(p_assignment_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_row public.membership_access_profiles;
begin
 select * into v_row from public.membership_access_profiles where id=p_assignment_id for update;
 if not found then raise exception 'Atribuição não encontrada'; end if;
 if not public.has_org_role(v_row.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then raise exception 'Acesso negado'; end if;
 update public.membership_access_profiles set active=false,ends_at=now() where id=v_row.id;
 insert into public.permission_change_events(organization_id,actor_user_id,profile_id,project_id,action,before_data,reason)
 values(v_row.organization_id,auth.uid(),v_row.profile_id,case when v_row.scope_type='PROJECT' then v_row.scope_id end,'REVOKE_ACCESS_PROFILE',to_jsonb(v_row),p_reason);
 return true;
end;$$;

create or replace function public.effective_module_permissions(
 p_organization_id uuid,p_user_id uuid default auth.uid(),p_project_id uuid default null)
returns table(module_id uuid,module_key text,module_name text,module_description text,module_href text,icon_key text,display_order integer,sensitive boolean,access_level public.app_access_level,can_approve boolean,can_release boolean,can_sign boolean,can_export boolean,can_administer boolean,can_view_sensitive boolean,permission_source text)
language sql stable security definer set search_path=public,auth,pg_temp as $$
with authorized as(
 select 1 where p_user_id=auth.uid() or public.has_org_role(p_organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])
), membership as(
 select om.id membership_id,om.organization_id,om.user_id,om.role,coalesce(om.access_profile_id,ap.id) primary_profile_id
 from public.organization_memberships om
 left join public.access_profiles ap on ap.organization_id=om.organization_id and ap.base_role=om.role and ap.active
 where om.organization_id=p_organization_id and om.user_id=p_user_id and om.active and exists(select 1 from authorized) limit 1
), assigned_profiles as(
 select mem.primary_profile_id profile_id,'PRIMARY_PROFILE' source from membership mem where mem.primary_profile_id is not null
 union
 select map.profile_id,case when map.scope_type='PROJECT' then 'PROJECT_PROFILE' else 'ADDITIONAL_PROFILE' end
 from membership mem join public.membership_access_profiles map on map.membership_id=mem.membership_id and map.active
 where map.starts_at<=now() and(map.ends_at is null or map.ends_at>now())
 and(map.scope_type='ORGANIZATION' or(map.scope_type='PROJECT' and map.scope_id=p_project_id))
), profile_permissions as(
 select pmp.module_id,max(pmp.access_level) access_level,bool_or(pmp.can_approve) can_approve,bool_or(pmp.can_release) can_release,
 bool_or(pmp.can_sign) can_sign,bool_or(pmp.can_export) can_export,bool_or(pmp.can_administer) can_administer,bool_or(pmp.can_view_sensitive) can_view_sensitive
 from assigned_profiles ap join public.profile_module_permissions pmp on pmp.profile_id=ap.profile_id group by pmp.module_id
), base as(
 select m.id module_id,m.key module_key,m.name module_name,m.description module_description,m.href module_href,m.icon_key,m.display_order,m.sensitive,
 coalesce(pp.access_level,d.access_level) base_level,coalesce(pp.can_approve,d.can_approve) base_approve,coalesce(pp.can_release,d.can_release) base_release,
 coalesce(pp.can_sign,d.can_sign) base_sign,coalesce(pp.can_export,d.can_export) base_export,coalesce(pp.can_administer,d.can_administer) base_administer,
 coalesce(pp.can_view_sensitive,d.can_view_sensitive) base_sensitive,case when pp.module_id is null then 'ROLE_DEFAULT' else 'MULTI_PROFILE' end base_source
 from membership mem
 join public.organization_modules orgm on orgm.organization_id=mem.organization_id and orgm.status='ENABLED'
 join public.app_modules m on m.id=orgm.module_id and m.active
 cross join lateral public.default_role_module_permission(mem.role,m.key) d
 left join profile_permissions pp on pp.module_id=m.id
), user_override as(
 select * from public.user_module_permission_overrides where organization_id=p_organization_id and user_id=p_user_id and revoked_at is null and(expires_at is null or expires_at>now())
), project_override as(
 select * from public.project_module_permission_overrides where organization_id=p_organization_id and user_id=p_user_id and project_id=p_project_id and p_project_id is not null and revoked_at is null and(expires_at is null or expires_at>now())
)
select b.module_id,b.module_key,b.module_name,b.module_description,b.module_href,b.icon_key,b.display_order,b.sensitive,
 case when coalesce(po.denied,false) or coalesce(uo.denied,false) then 'NONE'::public.app_access_level else coalesce(po.access_level,uo.access_level,b.base_level) end,
 case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_approve,uo.can_approve,b.base_approve) end,
 case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_release,uo.can_release,b.base_release) end,
 case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_sign,uo.can_sign,b.base_sign) end,
 case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_export,uo.can_export,b.base_export) end,
 case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_administer,uo.can_administer,b.base_administer) end,
 case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_view_sensitive,uo.can_view_sensitive,b.base_sensitive) end,
 case when coalesce(po.denied,false) then 'PROJECT_DENY' when po.id is not null then 'PROJECT_OVERRIDE' when coalesce(uo.denied,false) then 'USER_DENY' when uo.id is not null then 'USER_OVERRIDE' else b.base_source end
from base b left join user_override uo on uo.module_id=b.module_id left join project_override po on po.module_id=b.module_id
order by b.display_order,b.module_name;
$$;

alter table public.membership_access_profiles enable row level security;
drop policy if exists membership_profiles_read on public.membership_access_profiles;
create policy membership_profiles_read on public.membership_access_profiles for select to authenticated
using(exists(select 1 from public.organization_memberships om where om.id=membership_id and(om.user_id=auth.uid() or public.has_org_role(om.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]))));
revoke insert,update,delete on public.membership_access_profiles from anon,authenticated;

revoke all on function public.ensure_organization_module_defaults(uuid) from public,anon;
revoke all on function public.create_modular_access_profile(uuid,text,text,text,public.org_role) from public,anon;
revoke all on function public.set_organization_module_status(uuid,text,text,text) from public,anon;
revoke all on function public.assign_user_access_profile(uuid,uuid,uuid,text,uuid,text) from public,anon;
revoke all on function public.revoke_user_access_profile(uuid,text) from public,anon;
grant execute on function public.ensure_organization_module_defaults(uuid) to authenticated,service_role;
grant execute on function public.create_modular_access_profile(uuid,text,text,text,public.org_role) to authenticated,service_role;
grant execute on function public.set_organization_module_status(uuid,text,text,text) to authenticated,service_role;
grant execute on function public.assign_user_access_profile(uuid,uuid,uuid,text,uuid,text) to authenticated,service_role;
grant execute on function public.revoke_user_access_profile(uuid,text) to authenticated,service_role;

select public.ensure_organization_module_defaults(id) from public.organizations;
