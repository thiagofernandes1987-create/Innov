-- Etapa 22 / Sprint W-14 — playbooks versionados sobre fontes canônicas.
-- Não duplica mensagens padrão: cada versão referencia whatsapp_content_bindings.

begin;

alter table public.whatsapp_content_bindings
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_field text,
  add column if not exists variables_schema jsonb not null default '{}'::jsonb,
  add column if not exists active boolean not null default true;

create table if not exists public.communication_playbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  playbook_key text not null,
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,playbook_key),
  check(playbook_key ~ '^[a-z0-9][a-z0-9._-]{2,79}$'),
  check(length(btrim(name)) between 3 and 160)
);

create table if not exists public.communication_playbook_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  playbook_id uuid not null references public.communication_playbooks(id) on delete restrict,
  version_number integer not null,
  binding_id uuid not null references public.whatsapp_content_bindings(id) on delete restrict,
  variable_schema jsonb not null default '{}'::jsonb,
  autonomy text not null,
  sensitivity text not null,
  content_mode text not null default 'CANONICAL_ONLY',
  approval_required boolean not null default false,
  change_note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(playbook_id,version_number),
  check(version_number>0),
  check(jsonb_typeof(variable_schema)='object'),
  check(pg_column_size(variable_schema)<=32768),
  check(not (variable_schema ?| array['raw_payload','credentials','secret','token','qr','pairing_code'])),
  check(autonomy in ('HUMAN_ONLY','DRAFT_ASSIST','AUTO_LOW_RISK')),
  check(sensitivity in ('ROUTINE','SENSITIVE','CONTRACTUAL')),
  check(content_mode='CANONICAL_ONLY'),
  check(sensitivity<>'CONTRACTUAL' or autonomy='HUMAN_ONLY'),
  check(sensitivity='ROUTINE' or approval_required),
  check(length(btrim(change_note))>=8)
);

create table if not exists public.communication_playbook_version_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  playbook_version_id uuid not null references public.communication_playbook_versions(id) on delete restrict,
  decision text not null check(decision in ('APPROVED','REJECTED')),
  reason text not null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  unique(playbook_version_id),
  check(length(btrim(reason))>=8)
);

create table if not exists public.communication_playbook_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  playbook_version_id uuid not null references public.communication_playbook_versions(id) on delete restrict,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete restrict,
  version_number_snapshot integer not null,
  binding_id_snapshot uuid not null,
  variables_snapshot jsonb not null,
  source_snapshot jsonb not null,
  resolved_snapshot jsonb not null,
  content_sha256 text not null,
  executed_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz not null default now(),
  check(jsonb_typeof(variables_snapshot)='object'),
  check(jsonb_typeof(source_snapshot)='object'),
  check(jsonb_typeof(resolved_snapshot)='object'),
  check(pg_column_size(variables_snapshot)<=32768),
  check(pg_column_size(source_snapshot)<=32768),
  check(pg_column_size(resolved_snapshot)<=65536),
  check(not (variables_snapshot ?| array['raw_payload','credentials','secret','token','qr','pairing_code'])),
  check(not (source_snapshot ?| array['raw_payload','credentials','secret','token','qr','pairing_code'])),
  check(not (resolved_snapshot ?| array['raw_payload','credentials','secret','token','qr','pairing_code','freeTextOverride'])),
  check(content_sha256 ~ '^[0-9a-f]{64}$'),
  check((source_snapshot->>'sha256') ~ '^[0-9a-f]{64}$')
);

create index if not exists communication_playbook_versions_binding_idx
  on public.communication_playbook_versions(organization_id,binding_id,version_number desc);
create index if not exists communication_playbook_executions_conversation_idx
  on public.communication_playbook_executions(organization_id,conversation_id,executed_at desc);

create or replace function public.guard_communication_playbook_immutable()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  raise exception 'IMMUTABLE_PLAYBOOK_HISTORY';
end;
$$;

drop trigger if exists communication_playbook_versions_immutable on public.communication_playbook_versions;
create trigger communication_playbook_versions_immutable
before update or delete on public.communication_playbook_versions
for each row execute function public.guard_communication_playbook_immutable();

drop trigger if exists communication_playbook_executions_immutable on public.communication_playbook_executions;
create trigger communication_playbook_executions_immutable
before update or delete on public.communication_playbook_executions
for each row execute function public.guard_communication_playbook_immutable();

create or replace function public.create_communication_playbook_version(
  p_playbook_id uuid,
  p_binding_id uuid,
  p_variable_schema jsonb,
  p_autonomy text,
  p_sensitivity text,
  p_change_note text
)
returns public.communication_playbook_versions
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  playbook_row public.communication_playbooks%rowtype;
  binding_row public.whatsapp_content_bindings%rowtype;
  next_version integer;
  normalized_autonomy text;
  approval_required boolean;
  result public.communication_playbook_versions%rowtype;
begin
  select * into playbook_row from public.communication_playbooks
  where id=p_playbook_id for update;
  select * into binding_row from public.whatsapp_content_bindings
  where id=p_binding_id;
  if playbook_row.id is null or not playbook_row.active then raise exception 'PLAYBOOK_NOT_FOUND'; end if;
  if binding_row.id is null or binding_row.organization_id<>playbook_row.organization_id
     or not coalesce(binding_row.active,true) then raise exception 'BINDING_SCOPE_MISMATCH'; end if;
  if not public.has_module_permission(playbook_row.organization_id,'whatsapp','EDIT',null,null) then
    raise exception 'PLAYBOOK_PERMISSION_DENIED';
  end if;
  if jsonb_typeof(coalesce(p_variable_schema,'{}'::jsonb))<>'object' then
    raise exception 'INVALID_VARIABLE_SCHEMA';
  end if;
  if coalesce(p_variable_schema,'{}'::jsonb) ?| array['raw_payload','credentials','secret','token','qr','pairing_code'] then
    raise exception 'SENSITIVE_SCHEMA_KEY_BLOCKED';
  end if;
  if p_sensitivity not in ('ROUTINE','SENSITIVE','CONTRACTUAL') then raise exception 'INVALID_SENSITIVITY'; end if;
  if p_autonomy not in ('HUMAN_ONLY','DRAFT_ASSIST','AUTO_LOW_RISK') then raise exception 'INVALID_AUTONOMY'; end if;
  if length(btrim(coalesce(p_change_note,'')))<8 then raise exception 'CHANGE_NOTE_REQUIRED'; end if;

  normalized_autonomy:=case when p_sensitivity='CONTRACTUAL' then 'HUMAN_ONLY' else p_autonomy end;
  approval_required:=p_sensitivity in ('SENSITIVE','CONTRACTUAL');
  select coalesce(max(version_number),0)+1 into next_version
  from public.communication_playbook_versions where playbook_id=playbook_row.id;

  insert into public.communication_playbook_versions(
    organization_id,playbook_id,version_number,binding_id,variable_schema,
    autonomy,sensitivity,content_mode,approval_required,change_note,created_by
  ) values(
    playbook_row.organization_id,playbook_row.id,next_version,binding_row.id,
    coalesce(p_variable_schema,'{}'::jsonb),normalized_autonomy,p_sensitivity,
    'CANONICAL_ONLY',approval_required,btrim(p_change_note),auth.uid()
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.decide_communication_playbook_version(
  p_playbook_version_id uuid,
  p_decision text,
  p_reason text
)
returns public.communication_playbook_version_approvals
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  version_row public.communication_playbook_versions%rowtype;
  result public.communication_playbook_version_approvals%rowtype;
begin
  select * into version_row from public.communication_playbook_versions
  where id=p_playbook_version_id;
  if version_row.id is null then raise exception 'PLAYBOOK_VERSION_NOT_FOUND'; end if;
  if not public.has_module_permission(version_row.organization_id,'whatsapp','READ',null,'approve') then
    raise exception 'PLAYBOOK_APPROVAL_PERMISSION_DENIED';
  end if;
  if p_decision not in ('APPROVED','REJECTED') then raise exception 'INVALID_APPROVAL_DECISION'; end if;
  if length(btrim(coalesce(p_reason,'')))<8 then raise exception 'APPROVAL_REASON_REQUIRED'; end if;
  insert into public.communication_playbook_version_approvals(
    organization_id,playbook_version_id,decision,reason,decided_by
  ) values(version_row.organization_id,version_row.id,p_decision,btrim(p_reason),auth.uid())
  on conflict(playbook_version_id) do update set
    decision=excluded.decision,reason=excluded.reason,decided_by=auth.uid(),decided_at=now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.register_communication_playbook_execution(
  p_playbook_version_id uuid,
  p_conversation_id uuid,
  p_variables_snapshot jsonb,
  p_source_snapshot jsonb,
  p_resolved_snapshot jsonb,
  p_content_sha256 text
)
returns public.communication_playbook_executions
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  version_row public.communication_playbook_versions%rowtype;
  conversation_row public.whatsapp_conversations%rowtype;
  variable_key text;
  variable_rule jsonb;
  result public.communication_playbook_executions%rowtype;
begin
  select * into version_row from public.communication_playbook_versions
  where id=p_playbook_version_id;
  select * into conversation_row from public.whatsapp_conversations
  where id=p_conversation_id;
  if version_row.id is null or conversation_row.id is null then raise exception 'PLAYBOOK_EXECUTION_SOURCE_NOT_FOUND'; end if;
  if version_row.organization_id<>conversation_row.organization_id then raise exception 'PLAYBOOK_EXECUTION_SCOPE_MISMATCH'; end if;
  if not public.has_module_permission(version_row.organization_id,'whatsapp','EDIT',conversation_row.project_id,null) then
    raise exception 'PLAYBOOK_EXECUTION_PERMISSION_DENIED';
  end if;
  if version_row.approval_required and not exists(
    select 1 from public.communication_playbook_version_approvals approval
    where approval.playbook_version_id=version_row.id and approval.decision='APPROVED'
  ) then raise exception 'PLAYBOOK_APPROVAL_REQUIRED'; end if;
  if jsonb_typeof(coalesce(p_variables_snapshot,'{}'::jsonb))<>'object'
     or jsonb_typeof(coalesce(p_source_snapshot,'{}'::jsonb))<>'object'
     or jsonb_typeof(coalesce(p_resolved_snapshot,'{}'::jsonb))<>'object' then
    raise exception 'INVALID_PLAYBOOK_SNAPSHOT';
  end if;
  if coalesce(p_variables_snapshot,'{}'::jsonb) ?| array['raw_payload','credentials','secret','token','qr','pairing_code']
     or coalesce(p_source_snapshot,'{}'::jsonb) ?| array['raw_payload','credentials','secret','token','qr','pairing_code']
     or coalesce(p_resolved_snapshot,'{}'::jsonb) ?| array['raw_payload','credentials','secret','token','qr','pairing_code','freeTextOverride'] then
    raise exception 'SENSITIVE_PLAYBOOK_SNAPSHOT_BLOCKED';
  end if;
  if p_content_sha256 !~ '^[0-9a-f]{64}$'
     or coalesce(p_source_snapshot->>'sha256','') !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_PLAYBOOK_SHA';
  end if;

  for variable_key,variable_rule in select key,value from jsonb_each(version_row.variable_schema)
  loop
    if coalesce((variable_rule->>'required')::boolean,false)
       and not coalesce(p_variables_snapshot,'{}'::jsonb) ? variable_key then
      raise exception 'REQUIRED_PLAYBOOK_VARIABLE:%',variable_key;
    end if;
    if coalesce(p_variables_snapshot,'{}'::jsonb) ? variable_key
       and jsonb_typeof(p_variables_snapshot->variable_key)<>'string' then
      raise exception 'INVALID_PLAYBOOK_VARIABLE_TYPE:%',variable_key;
    end if;
  end loop;
  select key into variable_key
  from jsonb_object_keys(coalesce(p_variables_snapshot,'{}'::jsonb)) key
  where not version_row.variable_schema ? key limit 1;
  if variable_key is not null then raise exception 'UNKNOWN_PLAYBOOK_VARIABLE:%',variable_key; end if;

  insert into public.communication_playbook_executions(
    organization_id,playbook_version_id,conversation_id,version_number_snapshot,
    binding_id_snapshot,variables_snapshot,source_snapshot,resolved_snapshot,
    content_sha256,executed_by
  ) values(
    version_row.organization_id,version_row.id,conversation_row.id,
    version_row.version_number,version_row.binding_id,
    coalesce(p_variables_snapshot,'{}'::jsonb),p_source_snapshot,p_resolved_snapshot,
    p_content_sha256,auth.uid()
  ) returning * into result;
  return result;
end;
$$;

create or replace view public.communication_playbook_catalog
with (security_invoker=true)
as
select
  playbook.id,
  playbook.organization_id,
  playbook.playbook_key,
  playbook.name,
  playbook.description,
  version.id as version_id,
  version.version_number,
  version.binding_id,
  version.variable_schema,
  version.autonomy,
  version.sensitivity,
  version.content_mode,
  version.approval_required,
  approval.decision as approval_decision,
  version.created_at
from public.communication_playbooks playbook
join lateral (
  select candidate.* from public.communication_playbook_versions candidate
  where candidate.playbook_id=playbook.id
  order by candidate.version_number desc limit 1
) version on true
left join public.communication_playbook_version_approvals approval
  on approval.playbook_version_id=version.id
where playbook.active;

alter table public.communication_playbooks enable row level security;
alter table public.communication_playbooks force row level security;
alter table public.communication_playbook_versions enable row level security;
alter table public.communication_playbook_versions force row level security;
alter table public.communication_playbook_version_approvals enable row level security;
alter table public.communication_playbook_version_approvals force row level security;
alter table public.communication_playbook_executions enable row level security;
alter table public.communication_playbook_executions force row level security;

do $$
declare relation text;
begin
  foreach relation in array array[
    'communication_playbooks','communication_playbook_versions',
    'communication_playbook_version_approvals','communication_playbook_executions'
  ] loop
    execute format('drop policy if exists %I on public.%I',relation||'_read',relation);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',
      relation||'_read',relation
    );
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
    execute format('grant all on public.%I to service_role',relation);
  end loop;
end;
$$;

revoke all on public.communication_playbook_catalog from anon;
grant select on public.communication_playbook_catalog to authenticated,service_role;
revoke all on function public.create_communication_playbook_version(uuid,uuid,jsonb,text,text,text) from public,anon,authenticated;
revoke all on function public.decide_communication_playbook_version(uuid,text,text) from public,anon,authenticated;
revoke all on function public.register_communication_playbook_execution(uuid,uuid,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_communication_playbook_version(uuid,uuid,jsonb,text,text,text) to authenticated,service_role;
grant execute on function public.decide_communication_playbook_version(uuid,text,text) to authenticated,service_role;
grant execute on function public.register_communication_playbook_execution(uuid,uuid,jsonb,jsonb,jsonb,text) to authenticated,service_role;

commit;
