begin;

with matrix(role,module_key,level,approve,release,sign_doc,export_data,administer,view_sensitive) as (values
('COMERCIAL'::public.org_role,'crm','EDIT'::public.app_access_level,false,false,false,true,false,false),
('COMERCIAL'::public.org_role,'clientes','EDIT'::public.app_access_level,false,false,false,true,false,false),
('COMERCIAL'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
('COMERCIAL'::public.org_role,'propostas','EDIT'::public.app_access_level,false,true,false,true,false,false),
('COMERCIAL'::public.org_role,'contratos','READ'::public.app_access_level,false,false,false,true,false,false),
('COMERCIAL'::public.org_role,'assinaturas','READ'::public.app_access_level,false,false,false,false,false,false),
('COMERCIAL'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false),
('GESTOR_OBRAS'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
('GESTOR_OBRAS'::public.org_role,'obras','EDIT'::public.app_access_level,true,true,false,true,false,false),
('GESTOR_OBRAS'::public.org_role,'planejamento','EDIT'::public.app_access_level,true,true,false,true,false,false),
('GESTOR_OBRAS'::public.org_role,'tarefas','EDIT'::public.app_access_level,true,true,false,true,false,false),
('GESTOR_OBRAS'::public.org_role,'diario','EDIT'::public.app_access_level,true,true,false,true,false,false),
('GESTOR_OBRAS'::public.org_role,'equipes','EDIT'::public.app_access_level,false,false,false,true,false,true),
('GESTOR_OBRAS'::public.org_role,'contratos','READ'::public.app_access_level,false,false,false,false,false,false),
('GESTOR_OBRAS'::public.org_role,'assinaturas','READ'::public.app_access_level,false,false,false,false,false,false),
('GESTOR_OBRAS'::public.org_role,'documentos','EDIT'::public.app_access_level,true,true,false,true,false,false),
('GESTOR_OBRAS'::public.org_role,'qualidade','EDIT'::public.app_access_level,true,true,false,true,false,false),
('GESTOR_OBRAS'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false),
('ENGENHEIRO'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
('ENGENHEIRO'::public.org_role,'obras','EDIT'::public.app_access_level,false,true,false,true,false,false),
('ENGENHEIRO'::public.org_role,'planejamento','EDIT'::public.app_access_level,false,true,false,true,false,false),
('ENGENHEIRO'::public.org_role,'tarefas','EDIT'::public.app_access_level,false,true,false,true,false,false),
('ENGENHEIRO'::public.org_role,'diario','EDIT'::public.app_access_level,false,true,false,true,false,false),
('ENGENHEIRO'::public.org_role,'equipes','READ'::public.app_access_level,false,false,false,false,false,true),
('ENGENHEIRO'::public.org_role,'documentos','EDIT'::public.app_access_level,false,true,false,true,false,false),
('ENGENHEIRO'::public.org_role,'qualidade','EDIT'::public.app_access_level,false,true,false,true,false,false),
('ENGENHEIRO'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false))
insert into public.profile_module_permissions(
organization_id,profile_id,module_id,access_level,can_approve,can_release,
can_sign,can_export,can_administer,can_view_sensitive)
select ap.organization_id,ap.id,m.id,x.level,x.approve,x.release,x.sign_doc,
x.export_data,x.administer,x.view_sensitive
from matrix x join public.access_profiles ap on ap.base_role=x.role
join public.app_modules m on m.key=x.module_key
on conflict(profile_id,module_id) do update set access_level=excluded.access_level,
can_approve=excluded.can_approve,can_release=excluded.can_release,
can_sign=excluded.can_sign,can_export=excluded.can_export,
can_administer=excluded.can_administer,can_view_sensitive=excluded.can_view_sensitive;

commit;
