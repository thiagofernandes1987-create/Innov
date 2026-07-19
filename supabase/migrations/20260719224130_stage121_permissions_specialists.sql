begin;

with matrix(role,module_key,level,approve,release,sign_doc,export_data,administer,view_sensitive) as (values
('ORCAMENTISTA'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
('ORCAMENTISTA'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
('ORCAMENTISTA'::public.org_role,'orcamentos','EDIT'::public.app_access_level,false,false,false,true,false,true),
('ORCAMENTISTA'::public.org_role,'propostas','EDIT'::public.app_access_level,false,true,false,true,false,true),
('ORCAMENTISTA'::public.org_role,'contratos','READ'::public.app_access_level,false,false,false,true,false,false),
('ORCAMENTISTA'::public.org_role,'documentos','READ'::public.app_access_level,false,false,false,true,false,false),
('ORCAMENTISTA'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,true),
('FINANCEIRO'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
('FINANCEIRO'::public.org_role,'orcamentos','READ'::public.app_access_level,true,false,false,true,false,true),
('FINANCEIRO'::public.org_role,'propostas','READ'::public.app_access_level,true,false,false,true,false,true),
('FINANCEIRO'::public.org_role,'contratos','EDIT'::public.app_access_level,true,false,false,true,false,true),
('FINANCEIRO'::public.org_role,'aditivos','EDIT'::public.app_access_level,true,false,false,true,false,true),
('FINANCEIRO'::public.org_role,'assinaturas','READ'::public.app_access_level,false,false,false,true,false,false),
('FINANCEIRO'::public.org_role,'relatorios','EDIT'::public.app_access_level,true,false,false,true,false,true),
('FINANCEIRO'::public.org_role,'auditoria','READ'::public.app_access_level,false,false,false,true,false,true),
('QUALIDADE'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
('QUALIDADE'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
('QUALIDADE'::public.org_role,'planejamento','READ'::public.app_access_level,false,false,false,false,false,false),
('QUALIDADE'::public.org_role,'tarefas','READ'::public.app_access_level,false,false,false,false,false,false),
('QUALIDADE'::public.org_role,'diario','EDIT'::public.app_access_level,true,true,false,true,false,false),
('QUALIDADE'::public.org_role,'documentos','EDIT'::public.app_access_level,true,true,false,true,false,false),
('QUALIDADE'::public.org_role,'qualidade','EDIT'::public.app_access_level,true,true,false,true,false,false),
('QUALIDADE'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false),
('SAC'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
('SAC'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
('SAC'::public.org_role,'documentos','READ'::public.app_access_level,false,false,false,false,false,false),
('SAC'::public.org_role,'sac','EDIT'::public.app_access_level,true,true,false,true,false,false),
('SAC'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false))
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
