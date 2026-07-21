-- Etapa 19 — Aplicativo, defaults, diagnóstico e performance.
begin;

insert into public.app_modules(key,name,description,href,icon_key,display_order,active,sensitive,version,category,manifest,default_enabled,is_core)
values(
  'auditoria','Auditoria e Observabilidade','Eventos correlacionados, alertas, saúde, diagnósticos e retenção.','/app/auditoria','audit',220,true,true,'1.0.0','Administração',
  jsonb_build_object('navigationLabel','Auditoria','plugin','audit-observability','dependencies',jsonb_build_array('administracao'),
    'unifiedEventStream',true,'alerts',true,'healthChecks',true,'diagnostics',true,'rawSensitivePayloads',false),true,true
)
on conflict(key) do update set name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,
  display_order=excluded.display_order,active=true,sensitive=true,version=excluded.version,category=excluded.category,
  manifest=excluded.manifest,default_enabled=true,is_core=true,deprecated_at=null,updated_at=now();

create or replace function public.install_observability_defaults(p_organization_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then raise exception 'Organização não encontrada.'; end if;
  perform public.ensure_organization_access_profiles(p_organization_id);

  insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
  select p_organization_id,module.id,'ENABLED',module.version,
    jsonb_build_object('defaultPeriodHours',24,'retentionDays',365,'criticalAlertWithoutRule',true),now()
  from public.app_modules module where module.key='auditoria'
  on conflict(organization_id,module_id) do update set status='ENABLED',installed_version=excluded.installed_version,
    settings=public.organization_modules.settings||excluded.settings,enabled_at=coalesce(public.organization_modules.enabled_at,now()),
    disabled_at=null,archived_at=null,updated_at=now();

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
  )
  select profile.organization_id,profile.id,module.id,
    case when profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then 'DELETE'::public.app_access_level else 'NONE'::public.app_access_level end,
    false,false,false,
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR')
  from public.access_profiles profile cross join public.app_modules module
  where profile.organization_id=p_organization_id and module.key='auditoria' and profile.base_role is not null
  on conflict(profile_id,module_id) do update set access_level=excluded.access_level,can_approve=false,can_release=false,can_sign=false,
    can_export=excluded.can_export,can_administer=excluded.can_administer,can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

  insert into public.observability_retention_policies(organization_id,source_table,retention_days,preserve_critical,active)
  values(p_organization_id,'audit_events',365,true,true)
  on conflict(organization_id,source_table) do nothing;

  insert into public.observability_alert_rules(organization_id,name,module_key,event_type_pattern,minimum_severity,threshold_count,window_minutes,cooldown_minutes,active)
  values
    (p_organization_id,'Evento crítico',null,null,'CRITICAL',1,5,30,true),
    (p_organization_id,'Erros recorrentes',null,null,'ERROR',3,15,30,true)
  on conflict(organization_id,name) do nothing;
end;
$$;

select public.install_observability_defaults(organization.id) from public.organizations organization;

create or replace function public.organizations_install_observability_defaults()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.install_observability_defaults(new.id);
  return new;
end;
$$;
drop trigger if exists organizations_install_observability_defaults on public.organizations;
create trigger organizations_install_observability_defaults after insert on public.organizations
for each row execute function public.organizations_install_observability_defaults();

create or replace function public.record_observability_diagnostic(
  p_organization_id uuid,
  p_diagnostic_type text,
  p_object_schema text,
  p_object_name text,
  p_code text,
  p_message text,
  p_severity text default 'WARNING',
  p_details jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.role()<>'service_role' and (p_organization_id is null or not public.has_module_permission(p_organization_id,'auditoria','READ',null,'administer')) then
    raise exception 'Acesso negado.';
  end if;
  if upper(p_diagnostic_type) not in ('UNINDEXED_FK','RLS_INITPLAN','MULTIPLE_PERMISSIVE_POLICIES','FUNCTION_PRIVILEGE','MIGRATION_LEDGER','OTHER') then raise exception 'Tipo inválido.'; end if;
  if upper(p_severity) not in ('INFO','WARNING','ERROR','CRITICAL') then raise exception 'Severidade inválida.'; end if;
  insert into public.observability_diagnostics(organization_id,diagnostic_type,severity,object_schema,object_name,code,message,details,detected_at,resolved_at,resolution_note)
  values(p_organization_id,upper(p_diagnostic_type),upper(p_severity),coalesce(nullif(p_object_schema,''),'public'),p_object_name,p_code,p_message,
    coalesce(public.sanitize_audit_json(p_details),'{}'::jsonb),now(),null,null)
  on conflict(organization_id,diagnostic_type,object_schema,object_name,code) do update set
    severity=excluded.severity,message=excluded.message,details=excluded.details,detected_at=now(),resolved_at=null,resolution_note=null
  returning id into v_id;
  return v_id;
end;
$$;

create unique index if not exists audit_events_org_dedup_uidx on public.audit_events(organization_id,deduplication_key)
  where deduplication_key is not null;
create index if not exists audit_events_org_occurred_idx on public.audit_events(organization_id,occurred_at desc,id desc);
create index if not exists audit_events_org_severity_idx on public.audit_events(organization_id,severity,occurred_at desc);
create index if not exists audit_events_org_module_idx on public.audit_events(organization_id,module_key,occurred_at desc);
create index if not exists audit_events_correlation_idx on public.audit_events(organization_id,correlation_id,occurred_at);
create index if not exists audit_events_project_idx on public.audit_events(project_id,occurred_at desc) where project_id is not null;
create index if not exists audit_events_client_idx on public.audit_events(client_id,occurred_at desc) where client_id is not null;
create index if not exists observability_alert_rules_org_active_idx on public.observability_alert_rules(organization_id,active,module_key);
create index if not exists observability_alerts_org_status_idx on public.observability_alerts(organization_id,status,severity,last_occurred_at desc);
create index if not exists observability_alerts_project_idx on public.observability_alerts(project_id,status,last_occurred_at desc) where project_id is not null;
create index if not exists observability_health_checks_latest_idx on public.observability_health_checks(organization_id,check_key,checked_at desc);
create index if not exists observability_diagnostics_pending_idx on public.observability_diagnostics(organization_id,severity,detected_at desc) where resolved_at is null;

revoke all on function public.install_observability_defaults(uuid), public.organizations_install_observability_defaults() from public,anon,authenticated;
grant execute on function public.install_observability_defaults(uuid) to service_role;
revoke execute on function public.record_observability_diagnostic(uuid,text,text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.record_observability_diagnostic(uuid,text,text,text,text,text,text,jsonb) to authenticated,service_role;

commit;
