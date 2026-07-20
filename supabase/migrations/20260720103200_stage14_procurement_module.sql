-- Etapa 14 — catálogo modular e perfis de acesso.

insert into public.app_modules(key,name,description,href,icon_key,display_order,active,sensitive,version,category,manifest,default_enabled,is_core)
values(
 'compras','Compras e Suprimentos','Solicitações, fornecedores convidados, cotações, aprovações, pedidos e recebimentos.',
 '/app/compras','procurement',150,true,true,'1.0.0','Suprimentos',
 jsonb_build_object('navigationLabel','Compras','plugin','procurement','dependencies',jsonb_build_array('obras','qualidade'),'inventoryScope','1.1'),
 true,false
)
on conflict(key) do update set
 name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,
 display_order=excluded.display_order,active=true,sensitive=true,version=excluded.version,category=excluded.category,
 manifest=excluded.manifest,default_enabled=true,deprecated_at=null,updated_at=now();

update public.app_modules set default_enabled=false,manifest=manifest||jsonb_build_object('roadmap','1.1') where key='estoque';

insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
select o.id,m.id,'ENABLED',m.version,jsonb_build_object('supplierPublicSignup',false,'inventoryEnabled',false),now()
from public.organizations o cross join public.app_modules m where m.key='compras'
on conflict(organization_id,module_id) do update set
 status='ENABLED',installed_version=excluded.installed_version,
 settings=public.organization_modules.settings||excluded.settings,
 enabled_at=coalesce(public.organization_modules.enabled_at,now()),disabled_at=null,archived_at=null,updated_at=now();

insert into public.profile_module_permissions(
 organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
)
select p.organization_id,p.id,m.id,
 case
  when p.code in ('super-admin','direcao','administrador') then 'DELETE'::public.app_access_level
  when p.code in ('gestor-obras','engenharia','qualidade') then 'EDIT'::public.app_access_level
  when p.code in ('financeiro','orcamentista') then 'READ'::public.app_access_level
  else 'NONE'::public.app_access_level
 end,
 p.code in ('super-admin','direcao','administrador','financeiro'),
 false,false,
 p.code in ('super-admin','direcao','administrador','financeiro','gestor-obras','engenharia','qualidade','orcamentista'),
 p.code in ('super-admin','direcao','administrador'),
 p.code in ('super-admin','direcao','administrador','financeiro','orcamentista')
from public.access_profiles p join public.app_modules m on m.key='compras'
on conflict(profile_id,module_id) do update set
 access_level=excluded.access_level,can_approve=excluded.can_approve,can_release=excluded.can_release,
 can_sign=excluded.can_sign,can_export=excluded.can_export,can_administer=excluded.can_administer,
 can_view_sensitive=excluded.can_view_sensitive,updated_at=now();
