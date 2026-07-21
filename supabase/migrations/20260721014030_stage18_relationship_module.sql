-- Etapa 18 — catálogo modular, perfis e dados padrão.

insert into public.app_modules(
  key,name,description,href,icon_key,display_order,active,sensitive,
  version,category,manifest,default_enabled,is_core
)
values
 ('crm','CRM e Vendas','Leads, oportunidades, atividades e pipeline comercial.','/app/crm','crm',10,true,true,'1.0.0','COMERCIAL',jsonb_build_object('dependencies',jsonb_build_array(),'routes',jsonb_build_array('/app/crm')),true,false),
 ('clientes','Clientes','Cadastro 360, contatos, consentimentos e visão multiobra.','/app/clientes','clients',20,true,true,'1.0.0','COMERCIAL',jsonb_build_object('dependencies',jsonb_build_array(),'routes',jsonb_build_array('/app/clientes')),true,false),
 ('sac','Pós-venda e SAC','Chamados, SLAs, mensagens, anexos e satisfação.','/app/ocorrencias','support',180,true,true,'1.0.0','POS_VENDA',jsonb_build_object('dependencies',jsonb_build_array('clientes'),'routes',jsonb_build_array('/app/ocorrencias')),true,false)
on conflict(key) do update set
 name=excluded.name,
 description=excluded.description,
 href=excluded.href,
 icon_key=excluded.icon_key,
 display_order=excluded.display_order,
 active=true,
 sensitive=true,
 version=excluded.version,
 category=excluded.category,
 manifest=excluded.manifest,
 default_enabled=true,
 updated_at=now();

create or replace function public.install_stage18_relationship_defaults(p_organization_id uuid)
returns void
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_module record;
  v_profile record;
  v_level public.app_access_level;
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then
    raise exception 'Organização não encontrada.';
  end if;

  for v_module in
    select id,key,version from public.app_modules where key in ('crm','clientes','sac')
  loop
    insert into public.organization_modules(
      organization_id,module_id,status,installed_version,settings,enabled_at
    )
    values(
      p_organization_id,
      v_module.id,
      'ENABLED',
      v_module.version,
      case v_module.key
        when 'crm' then jsonb_build_object('duplicateDetection',true,'defaultProbability',25)
        when 'sac' then jsonb_build_object('allowClientPortal',true,'requireCloseReason',true)
        else '{}'::jsonb
      end,
      now()
    )
    on conflict(organization_id,module_id) do update set
      status='ENABLED',
      installed_version=excluded.installed_version,
      settings=coalesce(public.organization_modules.settings,'{}'::jsonb)||excluded.settings,
      disabled_at=null,
      archived_at=null,
      updated_at=now();
  end loop;

  insert into public.sac_categories(
    organization_id,code,name,description,default_priority,
    first_response_sla_hours,resolution_sla_hours
  )
  values
   (p_organization_id,'ATENDIMENTO','Atendimento geral','Dúvidas e solicitações gerais.','NORMAL',24,120),
   (p_organization_id,'GARANTIA','Garantia','Solicitação relacionada à garantia da obra ou serviço.','HIGH',8,72),
   (p_organization_id,'DOCUMENTACAO','Documentação','Contratos, laudos, arquivos e documentos.','NORMAL',24,120),
   (p_organization_id,'FINANCEIRO','Financeiro','Cobranças, parcelas e comprovantes.','NORMAL',24,120),
   (p_organization_id,'OBRA','Obra em andamento','Ocorrência operacional vinculada à obra.','HIGH',8,48),
   (p_organization_id,'POS_VENDA','Pós-venda','Atendimento após entrega ou encerramento da obra.','NORMAL',24,168)
  on conflict(organization_id,code) do update set
    name=excluded.name,
    description=excluded.description,
    default_priority=excluded.default_priority,
    first_response_sla_hours=excluded.first_response_sla_hours,
    resolution_sla_hours=excluded.resolution_sla_hours,
    active=true,
    updated_at=now();

  for v_profile in
    select id,base_role
    from public.access_profiles
    where organization_id=p_organization_id and active and base_role is not null
  loop
    for v_module in
      select id,key from public.app_modules where key in ('crm','clientes','sac')
    loop
      v_level:=case
        when v_profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then 'DELETE'::public.app_access_level
        when v_profile.base_role='COMERCIAL' and v_module.key in ('crm','clientes') then 'EDIT'::public.app_access_level
        when v_profile.base_role='SAC' and v_module.key='sac' then 'DELETE'::public.app_access_level
        when v_profile.base_role='SAC' and v_module.key in ('crm','clientes') then 'READ'::public.app_access_level
        when v_profile.base_role in ('GESTOR_OBRAS','ENGENHEIRO','QUALIDADE') and v_module.key='sac' then 'EDIT'::public.app_access_level
        when v_profile.base_role in ('GESTOR_OBRAS','ENGENHEIRO','QUALIDADE','ORCAMENTISTA','FINANCEIRO') and v_module.key='clientes' then 'READ'::public.app_access_level
        when v_profile.base_role in ('GESTOR_OBRAS','ENGENHEIRO','ORCAMENTISTA') and v_module.key='crm' then 'READ'::public.app_access_level
        when v_profile.base_role in ('COMERCIAL','ORCAMENTISTA','FINANCEIRO') and v_module.key='sac' then 'READ'::public.app_access_level
        else 'NONE'::public.app_access_level
      end;

      insert into public.profile_module_permissions(
        organization_id,profile_id,module_id,access_level,
        can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
      )
      values(
        p_organization_id,
        v_profile.id,
        v_module.id,
        v_level,
        v_profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','SAC') and v_module.key='sac',
        false,
        false,
        v_level>='READ'::public.app_access_level and v_profile.base_role<>'CLIENTE',
        v_profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') or (v_profile.base_role='SAC' and v_module.key='sac'),
        v_profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','SAC')
      )
      on conflict(profile_id,module_id) do update set
        access_level=excluded.access_level,
        can_approve=excluded.can_approve,
        can_export=excluded.can_export,
        can_administer=excluded.can_administer,
        can_view_sensitive=excluded.can_view_sensitive,
        updated_at=now();
    end loop;
  end loop;
end $$;

create or replace function public.organizations_install_stage18_relationship_defaults()
returns trigger
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
begin
  perform public.install_stage18_relationship_defaults(new.id);
  return new;
end $$;

drop trigger if exists organizations_stage18_relationship_defaults on public.organizations;
create trigger organizations_stage18_relationship_defaults
after insert on public.organizations
for each row execute function public.organizations_install_stage18_relationship_defaults();

do $$
declare v_org uuid;
begin
  for v_org in select id from public.organizations loop
    perform public.install_stage18_relationship_defaults(v_org);
  end loop;
end $$;

revoke all on function public.install_stage18_relationship_defaults(uuid) from public,anon,authenticated;
revoke all on function public.organizations_install_stage18_relationship_defaults() from public,anon,authenticated;
grant execute on function public.install_stage18_relationship_defaults(uuid) to service_role;
