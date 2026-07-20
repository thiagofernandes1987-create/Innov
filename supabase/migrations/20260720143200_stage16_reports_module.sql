-- Etapa 16 — aplicativo plug-and-play, perfis, métricas e metas padrão.

insert into public.app_modules(key,name,description,href,icon_key,display_order,active,sensitive,version,category,manifest,default_enabled,is_core)
values(
  'relatorios','Relatórios e Indicadores','Painéis executivos, indicadores por obra, snapshots e exportações.','/app/relatorios','reports',190,true,true,'1.0.0','Geral',
  jsonb_build_object(
    'navigationLabel','Relatórios',
    'plugin','executive-analytics',
    'dependencies',jsonb_build_array('obras'),
    'optionalSources',jsonb_build_array('financeiro','compras','qualidade','planejamento','diario','documentos'),
    'snapshots',true,
    'csvExport',true,
    'publicDashboards',false
  ),true,false
)
on conflict(key) do update set
  name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,
  display_order=excluded.display_order,active=true,sensitive=true,version=excluded.version,category=excluded.category,
  manifest=excluded.manifest,default_enabled=true,deprecated_at=null,updated_at=now();

create or replace function public.install_report_defaults(p_organization_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then
    raise exception 'Organização não encontrada.';
  end if;

  insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
  select p_organization_id,module.id,'ENABLED',module.version,
    jsonb_build_object('defaultPeriodMonths',12,'showSensitiveOnlyWithCapability',true),now()
  from public.app_modules module where module.key='relatorios'
  on conflict(organization_id,module_id) do update set
    status='ENABLED',installed_version=excluded.installed_version,
    settings=public.organization_modules.settings||excluded.settings,
    enabled_at=coalesce(public.organization_modules.enabled_at,now()),disabled_at=null,archived_at=null,updated_at=now();

  insert into public.access_profiles(organization_id,code,name,description,base_role,system,active)
  select p_organization_id,profile.code,profile.name,profile.description,profile.role::public.org_role,true,true
  from (values
    ('super-admin','Super Administrador','Acesso completo à plataforma.','SUPER_ADMIN'),
    ('direcao','Direção','Gestão, aprovações e informações sensíveis.','DIRECAO'),
    ('administrador','Administrador','Administração operacional da plataforma.','ADMINISTRADOR'),
    ('vendas','Vendas','CRM, clientes, propostas e indicadores comerciais.','COMERCIAL'),
    ('gestor-obras','Operacional / Gestor de Obras','Obras, planejamento, campo e indicadores operacionais.','GESTOR_OBRAS'),
    ('engenharia','Engenharia','Planejamento, campo e indicadores técnicos.','ENGENHEIRO'),
    ('orcamentista','Orçamentista','Orçamentos, custos e indicadores autorizados.','ORCAMENTISTA'),
    ('financeiro','Financeiro','Financeiro, contratos e relatórios sensíveis.','FINANCEIRO'),
    ('qualidade','Qualidade','Inspeções, conformidade e indicadores de qualidade.','QUALIDADE'),
    ('pos-venda','Pós-venda','Ocorrências, pesquisas e relacionamento.','SAC'),
    ('cliente','Cliente','Acesso ao portal do cliente.','CLIENTE')
  ) as profile(code,name,description,role)
  on conflict(organization_id,code) do update set
    name=excluded.name,description=excluded.description,base_role=excluded.base_role,system=true,active=true,updated_at=now();

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
  )
  select profile.organization_id,profile.id,module.id,
    case
      when profile.code in ('super-admin','direcao','administrador') then 'DELETE'::public.app_access_level
      when profile.code in ('financeiro','orcamentista','gestor-obras','engenharia','qualidade','vendas','pos-venda') then 'READ'::public.app_access_level
      else 'NONE'::public.app_access_level
    end,
    false,false,false,
    profile.code in ('super-admin','direcao','administrador','financeiro','orcamentista','gestor-obras','engenharia','qualidade','vendas','pos-venda'),
    profile.code in ('super-admin','direcao','administrador'),
    profile.code in ('super-admin','direcao','administrador','financeiro','orcamentista')
  from public.access_profiles profile cross join public.app_modules module
  where profile.organization_id=p_organization_id and module.key='relatorios'
  on conflict(profile_id,module_id) do update set
    access_level=excluded.access_level,can_approve=excluded.can_approve,can_release=excluded.can_release,
    can_sign=excluded.can_sign,can_export=excluded.can_export,can_administer=excluded.can_administer,
    can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

  insert into public.report_metric_definitions(
    organization_id,metric_key,source_module,name,description,unit,category,sensitive,display_order
  )
  select p_organization_id,metric.metric_key,metric.source_module,metric.name,metric.description,metric.unit,metric.category,metric.sensitive,metric.display_order
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
    ('schedule_variance_pp','planejamento','Desvio de avanço','Diferença em pontos percentuais entre realizado e previsto.','PERCENT_POINT','SCHEDULE',false,100),
    ('overdue_purchase_orders','compras','Pedidos atrasados','Pedidos com entrega prevista vencida.','COUNT','PROCUREMENT',false,110),
    ('pending_quality_reviews','qualidade','Revisões de qualidade','Respostas aguardando revisão.','COUNT','QUALITY',false,120),
    ('average_quality_score','qualidade','Conformidade média','Pontuação média das inspeções e formulários.','PERCENT','QUALITY',false,130),
    ('nps','qualidade','NPS','Índice líquido de promotores das pesquisas.','SCORE','QUALITY',false,140),
    ('daily_logs_30d','diario','Diários nos últimos 30 dias','Registros de campo recentes.','COUNT','FIELD',false,150),
    ('project_documents','documentos','Documentos ativos','Documentos não arquivados vinculados às obras.','COUNT','DOCUMENTS',false,160)
  ) as metric(metric_key,source_module,name,description,unit,category,sensitive,display_order)
  on conflict(organization_id,metric_key) do update set
    source_module=excluded.source_module,name=excluded.name,description=excluded.description,unit=excluded.unit,
    category=excluded.category,sensitive=excluded.sensitive,display_order=excluded.display_order,active=true,updated_at=now();

  insert into public.report_targets(organization_id,project_id,metric_key,comparison,warning_value,critical_value,active)
  values
    (p_organization_id,null,'schedule_variance_pp','MIN',-5,-10,true),
    (p_organization_id,null,'overdue_days','MAX',1,15,true),
    (p_organization_id,null,'blocked_tasks','MAX',1,5,true),
    (p_organization_id,null,'overdue_purchase_orders','MAX',1,3,true),
    (p_organization_id,null,'average_quality_score','MIN',90,75,true),
    (p_organization_id,null,'nps','MIN',50,0,true)
  on conflict(organization_id,project_id,metric_key) do update set
    comparison=excluded.comparison,warning_value=excluded.warning_value,critical_value=excluded.critical_value,
    active=true,updated_at=now();

  update public.organization_memberships membership set access_profile_id=profile.id
  from public.access_profiles profile
  where profile.organization_id=membership.organization_id and profile.base_role=membership.role and profile.active
    and membership.organization_id=p_organization_id
    and (membership.access_profile_id is null or membership.access_profile_id<>profile.id);

  insert into public.membership_access_profiles(organization_id,membership_id,profile_id,scope_type,scope_id,active,starts_at)
  select membership.organization_id,membership.id,profile.id,'ORGANIZATION',membership.organization_id,true,now()
  from public.organization_memberships membership
  join public.access_profiles profile on profile.organization_id=membership.organization_id and profile.base_role=membership.role
  where membership.organization_id=p_organization_id and membership.active
    and not exists(
      select 1 from public.membership_access_profiles assignment
      where assignment.membership_id=membership.id and assignment.profile_id=profile.id and assignment.active
    );
end $$;

select public.install_report_defaults(organization.id) from public.organizations organization;

create or replace function public.organizations_install_report_defaults()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.install_report_defaults(new.id);
  return new;
end $$;

drop trigger if exists organizations_install_report_defaults on public.organizations;
create trigger organizations_install_report_defaults
after insert on public.organizations
for each row execute function public.organizations_install_report_defaults();

revoke all on function public.install_report_defaults(uuid) from public,anon,authenticated;
revoke all on function public.organizations_install_report_defaults() from public,anon,authenticated;
grant execute on function public.install_report_defaults(uuid) to service_role;
