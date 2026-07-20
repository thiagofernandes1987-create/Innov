-- Etapa 15 — módulo plug-and-play, perfis e padrões organizacionais.

insert into public.app_modules(key,name,description,href,icon_key,display_order,active,sensitive,version,category,manifest,default_enabled,is_core)
values(
 'financeiro','Financeiro Operacional','Contas a pagar e receber, parcelas, medições, liquidações e fluxo de caixa.',
 '/app/financeiro','finance',170,true,true,'1.0.0','Financeiro',
 jsonb_build_object(
  'navigationLabel','Financeiro','plugin','operational-finance',
  'dependencies',jsonb_build_array('obras','contratos','compras'),
  'automaticBankReconciliation',false,'openFinance',false,'fiscalIssuance',false
 ),true,false
)
on conflict(key) do update set
 name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,
 display_order=excluded.display_order,active=true,sensitive=true,version=excluded.version,category=excluded.category,
 manifest=excluded.manifest,default_enabled=true,deprecated_at=null,updated_at=now();

create or replace function public.install_finance_defaults(p_organization_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
 select p_organization_id,module.id,'ENABLED',module.version,
  jsonb_build_object('automaticBankReconciliation',false,'openFinance',false,'fiscalIssuance',false),now()
 from public.app_modules module where module.key='financeiro'
 on conflict(organization_id,module_id) do update set
  status='ENABLED',installed_version=excluded.installed_version,
  settings=public.organization_modules.settings||excluded.settings,
  enabled_at=coalesce(public.organization_modules.enabled_at,now()),disabled_at=null,archived_at=null,updated_at=now();

 insert into public.profile_module_permissions(
  organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
 )
 select profile.organization_id,profile.id,module.id,
  case
   when profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO') then 'DELETE'::public.app_access_level
   when profile.base_role='ORCAMENTISTA' then 'READ'::public.app_access_level
   else 'NONE'::public.app_access_level
  end,
  profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO'),
  false,false,
  profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO','ORCAMENTISTA'),
  profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO'),
  profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO','ORCAMENTISTA')
 from public.access_profiles profile join public.app_modules module on module.key='financeiro'
 where profile.organization_id=p_organization_id and profile.base_role is not null
 on conflict(profile_id,module_id) do update set
  access_level=excluded.access_level,can_approve=excluded.can_approve,can_release=excluded.can_release,
  can_sign=excluded.can_sign,can_export=excluded.can_export,can_administer=excluded.can_administer,
  can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

 insert into public.finance_categories(organization_id,code,name,direction)
 values
  (p_organization_id,'MAT','Materiais','PAYABLE'),
  (p_organization_id,'SERV','Serviços e mão de obra','PAYABLE'),
  (p_organization_id,'TRIB','Tributos e taxas','PAYABLE'),
  (p_organization_id,'ADM','Despesas administrativas','PAYABLE'),
  (p_organization_id,'REC-CONTRATO','Receita contratual','RECEIVABLE'),
  (p_organization_id,'REC-MEDICAO','Receita por medição','RECEIVABLE')
 on conflict(organization_id,code) do nothing;

 insert into public.finance_cost_centers(organization_id,code,name)
 values(p_organization_id,'GERAL','Administrativo Geral')
 on conflict(organization_id,code) do nothing;

 insert into public.finance_cash_accounts(organization_id,name,account_type,opening_balance)
 values(p_organization_id,'Caixa Geral','CASH',0)
 on conflict(organization_id,name) do nothing;
end $$;

create or replace function public.install_finance_defaults_after_organization()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.install_finance_defaults(new.id);
 return new;
end $$;

drop trigger if exists organizations_install_finance_defaults on public.organizations;
create trigger organizations_install_finance_defaults
after insert on public.organizations
for each row execute function public.install_finance_defaults_after_organization();

select public.install_finance_defaults(id) from public.organizations;

revoke all on function public.install_finance_defaults(uuid) from public,anon,authenticated;
revoke all on function public.install_finance_defaults_after_organization() from public,anon,authenticated;
grant execute on function public.install_finance_defaults(uuid) to service_role;
