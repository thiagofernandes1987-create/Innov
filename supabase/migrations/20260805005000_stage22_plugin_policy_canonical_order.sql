-- Etapa 22 pós-fechamento — ordem canônica e fail-closed dos plugins.
-- Prioridade, permissão e feature flag são contratos do servidor, nunca dados confiáveis da UI.

begin;

drop index if exists public.channel_message_plugin_priority_uidx;

insert into public.channel_message_plugin_policies(
  organization_id,
  plugin_id,
  enabled,
  priority,
  required_permission,
  feature_flag,
  configuration,
  updated_by,
  updated_at
)
select
  organization.id,
  canonical.plugin_id,
  canonical.mandatory,
  canonical.priority,
  canonical.required_permission,
  canonical.feature_flag,
  '{}'::jsonb,
  null,
  clock_timestamp()
from public.organizations organization
cross join (
  values
    ('CONSENT'::text,10::integer,null::text,null::text,true),
    ('ANTI_SPAM',20,null,null,true),
    ('QUALIFICATION',30,'messaging.qualification','MESSAGING_QUALIFICATION',false),
    ('PROJECT_STATUS',40,'projects.read','MESSAGING_PROJECT_STATUS',false),
    ('DOCUMENT',50,'documents.read','MESSAGING_DOCUMENTS',false),
    ('SAC',60,'sac.create','MESSAGING_SAC',false),
    ('HANDOFF',70,null,null,true),
    ('AI_FALLBACK',1000,'messaging.ai.draft','MESSAGING_AI_DRAFT',false)
) as canonical(plugin_id,priority,required_permission,feature_flag,mandatory)
on conflict (organization_id,plugin_id) do update set
  enabled=case
    when excluded.plugin_id in ('CONSENT','ANTI_SPAM','HANDOFF') then true
    else public.channel_message_plugin_policies.enabled
  end,
  priority=excluded.priority,
  required_permission=excluded.required_permission,
  feature_flag=excluded.feature_flag,
  updated_at=clock_timestamp();

create unique index channel_message_plugin_priority_uidx
  on public.channel_message_plugin_policies(organization_id, priority)
  where enabled;

create or replace function public.set_channel_message_plugin_policy(
  p_organization_id uuid,
  p_plugin_id text,
  p_enabled boolean,
  p_priority integer,
  p_required_permission text,
  p_feature_flag text,
  p_configuration jsonb default '{}'::jsonb
)
returns public.channel_message_plugin_policies
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  result public.channel_message_plugin_policies;
  canonical_priority integer;
  canonical_permission text;
  canonical_flag text;
  mandatory boolean;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then
    raise exception 'PLUGIN_FORBIDDEN';
  end if;

  select mapping.priority,mapping.required_permission,mapping.feature_flag,mapping.mandatory
  into canonical_priority,canonical_permission,canonical_flag,mandatory
  from (
    values
      ('CONSENT'::text,10::integer,null::text,null::text,true),
      ('ANTI_SPAM',20,null,null,true),
      ('QUALIFICATION',30,'messaging.qualification','MESSAGING_QUALIFICATION',false),
      ('PROJECT_STATUS',40,'projects.read','MESSAGING_PROJECT_STATUS',false),
      ('DOCUMENT',50,'documents.read','MESSAGING_DOCUMENTS',false),
      ('SAC',60,'sac.create','MESSAGING_SAC',false),
      ('HANDOFF',70,null,null,true),
      ('AI_FALLBACK',1000,'messaging.ai.draft','MESSAGING_AI_DRAFT',false)
  ) as mapping(plugin_id,priority,required_permission,feature_flag,mandatory)
  where mapping.plugin_id=p_plugin_id;

  if canonical_priority is null then raise exception 'PLUGIN_ID_INVALID'; end if;
  if mandatory and not p_enabled then raise exception 'MANDATORY_PLUGIN_REQUIRED:%',p_plugin_id; end if;
  if jsonb_typeof(coalesce(p_configuration,'{}'::jsonb)) <> 'object' then
    raise exception 'PLUGIN_CONFIGURATION_INVALID';
  end if;
  if coalesce(p_configuration,'{}'::jsonb)::text ~* '"(secret|token|credential|password|cookie)"' then
    raise exception 'PLUGIN_CONFIGURATION_SECRET_DETECTED';
  end if;

  insert into public.channel_message_plugin_policies(
    organization_id,plugin_id,enabled,priority,required_permission,feature_flag,
    configuration,updated_by,updated_at
  ) values (
    p_organization_id,p_plugin_id,case when mandatory then true else p_enabled end,
    canonical_priority,canonical_permission,canonical_flag,
    coalesce(p_configuration,'{}'::jsonb),auth.uid(),clock_timestamp()
  )
  on conflict (organization_id,plugin_id) do update set
    enabled=excluded.enabled,
    priority=excluded.priority,
    required_permission=excluded.required_permission,
    feature_flag=excluded.feature_flag,
    configuration=excluded.configuration,
    updated_by=excluded.updated_by,
    updated_at=excluded.updated_at
  returning * into result;

  return result;
end;
$$;

revoke all on function public.set_channel_message_plugin_policy(uuid,text,boolean,integer,text,text,jsonb)
  from public,anon;
grant execute on function public.set_channel_message_plugin_policy(uuid,text,boolean,integer,text,text,jsonb)
  to authenticated,service_role;

commit;
