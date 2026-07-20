-- Etapa 16 — correção idempotente do instalador para perfis canônicos.

create or replace function public.install_report_defaults(p_organization_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then raise exception 'Organização não encontrada.'; end if;
  perform public.ensure_organization_access_profiles(p_organization_id);

  insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
  select p_organization_id,module.id,'ENABLED',module.version,jsonb_build_object('defaultPeriodMonths',12,'showSensitiveOnlyWithCapability',true),now()
  from public.app_modules module where module.key='relatorios'
  on conflict(organization_id,module_id) do update set status='ENABLED',installed_version=excluded.installed_version,
    settings=public.organization_modules.settings||excluded.settings,enabled_at=coalesce(public.organization_modules.enabled_at,now()),
    disabled_at=null,archived_at=null,updated_at=now();

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
  )
  select profile.organization_id,profile.id,module.id,
    case when profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then 'DELETE'::public.app_access_level
         when profile.base_role in ('FINANCEIRO','ORCAMENTISTA','GESTOR_OBRAS','ENGENHEIRO','QUALIDADE','COMERCIAL','SAC') then 'READ'::public.app_access_level
         else 'NONE'::public.app_access_level end,
    false,false,false,
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO','ORCAMENTISTA','GESTOR_OBRAS','ENGENHEIRO','QUALIDADE','COMERCIAL','SAC'),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO','ORCAMENTISTA')
  from public.access_profiles profile cross join public.app_modules module
  where profile.organization_id=p_organization_id and module.key='relatorios'
  on conflict(profile_id,module_id) do update set access_level=excluded.access_level,can_approve=false,can_release=false,can_sign=false,
    can_export=excluded.can_export,can_administer=excluded.can_administer,can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

  insert into public.report_metric_definitions(organization_id,metric_key,source_module,name,description,unit,category,sensitive,display_order)
  select p_organization_id,v.metric_key,v.source_module,v.name,v.description,v.unit,v.category,v.sensitive,v.display_order
  from (values
    ('active_projects','obras','Obras ativas','Quantidade de obras ativas e não arquivadas.','COUNT','EXECUTIVE',false,10),
    ('delayed_projects','obras','Obras atrasadas','Obras além da data planejada e ainda não concluídas.','COUNT','EXECUTIVE',false,20),
    ('average_progress','obras','Progresso médio','Avanço físico médio das obras autorizadas.','PERCENT','EXECUTIVE',false,30),
    ('contract_value','contratos','Valor contratado','Valor consolidado de contratos assinados e ativos.','CURRENCY','FINANCE',true,40),
    ('receivable_open','financeiro','Saldo a receber','Parcelas de recebimento ainda em aberto.','CURRENCY','FINANCE',true,50),
    ('payable_open','financeiro','Saldo a pagar','Parcelas de pagamento ainda em aberto.','CURRENCY','FINANCE',true,60),
    ('purchase_committed','compras','Compras comprometidas','Total dos pedidos emitidos e não cancelados.','CURRENCY','PROCUREMENT',true,70),
    ('blocked_tasks','tarefas','Tarefas bloqueadas','Tarefas operacionais bloqueadas.','COUNT','SCHEDULE',false,80),
    ('overdue_tasks','planejamento','Tarefas atrasadas','Tarefas com prazo vencido e não concluídas.','COUNT','SCHEDULE',false,90),
    ('schedule_variance_pp','planejamento','Desvio de avanço','Diferença entre realizado e previsto.','PERCENT_POINT','SCHEDULE',false,100),
    ('overdue_days','obras','Dias de atraso','Dias além do término planejado para obras não concluídas.','DAYS','SCHEDULE',false,105),
    ('overdue_purchase_orders','compras','Pedidos atrasados','Pedidos com entrega prevista vencida.','COUNT','PROCUREMENT',false,110),
    ('pending_quality_reviews','qualidade','Revisões de qualidade','Respostas aguardando revisão.','COUNT','QUALITY',false,120),
    ('average_quality_score','qualidade','Conformidade média','Pontuação média das inspeções.','PERCENT','QUALITY',false,130),
    ('nps','qualidade','NPS','Índice líquido de promotores.','SCORE','QUALITY',false,140),
    ('daily_logs_30d','diario','Diários nos últimos 30 dias','Registros de campo recentes.','COUNT','FIELD',false,150),
    ('project_documents','documentos','Documentos ativos','Documentos não arquivados vinculados às obras.','COUNT','DOCUMENTS',false,160)
  ) v(metric_key,source_module,name,description,unit,category,sensitive,display_order)
  on conflict(organization_id,metric_key) do update set source_module=excluded.source_module,name=excluded.name,description=excluded.description,
    unit=excluded.unit,category=excluded.category,sensitive=excluded.sensitive,display_order=excluded.display_order,active=true,updated_at=now();

  insert into public.report_targets(organization_id,project_id,metric_key,comparison,warning_value,critical_value,active)
  values (p_organization_id,null,'schedule_variance_pp','MIN',-5,-10,true),(p_organization_id,null,'overdue_days','MAX',1,15,true),
    (p_organization_id,null,'blocked_tasks','MAX',1,5,true),(p_organization_id,null,'overdue_purchase_orders','MAX',1,3,true),
    (p_organization_id,null,'average_quality_score','MIN',90,75,true),(p_organization_id,null,'nps','MIN',50,0,true)
  on conflict(organization_id,project_id,metric_key) do update set comparison=excluded.comparison,warning_value=excluded.warning_value,
    critical_value=excluded.critical_value,active=true,updated_at=now();

  update public.organization_memberships membership set access_profile_id=profile.id from public.access_profiles profile
  where profile.organization_id=membership.organization_id and profile.base_role=membership.role and profile.active
    and membership.organization_id=p_organization_id and (membership.access_profile_id is null or membership.access_profile_id<>profile.id);

  insert into public.membership_access_profiles(organization_id,membership_id,profile_id,scope_type,scope_id,active,starts_at)
  select membership.organization_id,membership.id,profile.id,'ORGANIZATION',membership.organization_id,true,now()
  from public.organization_memberships membership join public.access_profiles profile
    on profile.organization_id=membership.organization_id and profile.base_role=membership.role
  where membership.organization_id=p_organization_id and membership.active
    and not exists(select 1 from public.membership_access_profiles assignment
      where assignment.membership_id=membership.id and assignment.profile_id=profile.id and assignment.active);
end $$;

select public.install_report_defaults(id) from public.organizations;
revoke all on function public.install_report_defaults(uuid) from public,anon,authenticated;
grant execute on function public.install_report_defaults(uuid) to service_role;
