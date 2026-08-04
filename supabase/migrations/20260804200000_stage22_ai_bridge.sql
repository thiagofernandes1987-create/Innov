-- Sprint W-15 — ponte de IA provider-neutral, somente draft_only.

create table if not exists public.channel_ai_conversation_locks (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  lease_owner text not null check (length(lease_owner) between 1 and 160),
  fencing_token bigint not null check (fencing_token > 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, conversation_id)
);

create table if not exists public.channel_ai_budget_daily (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  usage_date date not null default current_date,
  maximum_cost_micros bigint not null check (maximum_cost_micros >= 0),
  reserved_cost_micros bigint not null default 0 check (reserved_cost_micros >= 0),
  committed_cost_micros bigint not null default 0 check (committed_cost_micros >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, usage_date),
  check (reserved_cost_micros + committed_cost_micros <= maximum_cost_micros)
);

create table if not exists public.channel_ai_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  reason text not null check (reason in (
    'HUMAN_ASSIGNED','LOW_CONFIDENCE','SENSITIVE_CONTENT','BUDGET_EXCEEDED',
    'POLICY_BLOCKED','OPERATOR_REQUESTED','PROVIDER_UNAVAILABLE'
  )),
  summary text not null check (length(summary) between 1 and 4000),
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  requested_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status='RESOLVED') = (resolved_at is not null))
);

create index if not exists channel_ai_handoffs_conversation_idx
  on public.channel_ai_handoffs(organization_id, conversation_id, created_at desc);

create table if not exists public.channel_ai_invocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  provider_id text not null check (length(provider_id) between 1 and 100),
  model_id text not null check (length(model_id) between 1 and 160),
  autonomy_mode text not null default 'DRAFT_ONLY' check (autonomy_mode='DRAFT_ONLY'),
  status text not null check (status in ('DRAFT_CREATED','HANDOFF','BLOCKED','FAILED')),
  source_citations jsonb not null default '[]'::jsonb check (jsonb_typeof(source_citations)='array'),
  tools_used jsonb not null default '[]'::jsonb check (jsonb_typeof(tools_used)='array'),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_micros bigint not null default 0 check (estimated_cost_micros >= 0),
  claim_validation jsonb not null default '{}'::jsonb check (jsonb_typeof(claim_validation)='object'),
  prompt_injection_signals_removed integer not null default 0 check (prompt_injection_signals_removed >= 0),
  created_at timestamptz not null default now(),
  check (not (source_citations::text ~* '"(content|body|prompt|secret|token|credential)"')),
  check (not (tools_used::text ~* '(delete_database|shell|exec|admin_override)'))
);

create index if not exists channel_ai_invocations_conversation_idx
  on public.channel_ai_invocations(organization_id, conversation_id, created_at desc);

create or replace function public.channel_ai_scope_guard()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$
declare
  conversation_org uuid;
begin
  select organization_id into conversation_org
  from public.whatsapp_conversations
  where id=new.conversation_id;
  if conversation_org is null or conversation_org <> new.organization_id then
    raise exception 'AI_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

for table_name in
  select unnest(array['channel_ai_conversation_locks','channel_ai_handoffs','channel_ai_invocations'])
loop
  execute format('drop trigger if exists %I on public.%I', table_name||'_scope_guard', table_name);
  execute format(
    'create trigger %I before insert or update on public.%I for each row execute function public.channel_ai_scope_guard()',
    table_name||'_scope_guard', table_name
  );
end loop;

create or replace function public.channel_ai_immutable_invocation()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$
begin
  raise exception 'AI_INVOCATION_IMMUTABLE';
end;
$$;

drop trigger if exists channel_ai_invocations_immutable on public.channel_ai_invocations;
create trigger channel_ai_invocations_immutable
before update or delete on public.channel_ai_invocations
for each row execute function public.channel_ai_immutable_invocation();

create or replace function public.claim_channel_ai_conversation(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_owner_id text,
  p_ttl_seconds integer default 30
)
returns bigint
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  current_row public.channel_ai_conversation_locks%rowtype;
  next_token bigint;
begin
  if p_ttl_seconds < 5 or p_ttl_seconds > 120 then
    raise exception 'AI_LOCK_TTL_INVALID';
  end if;
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then
    raise exception 'AI_FORBIDDEN';
  end if;
  perform 1 from public.whatsapp_conversations
    where id=p_conversation_id and organization_id=p_organization_id;
  if not found then raise exception 'AI_SCOPE_MISMATCH'; end if;

  select * into current_row from public.channel_ai_conversation_locks
    where organization_id=p_organization_id and conversation_id=p_conversation_id
    for update;
  if found and current_row.expires_at > clock_timestamp() and current_row.lease_owner <> p_owner_id then
    return null;
  end if;
  next_token := coalesce(current_row.fencing_token,0)+1;
  insert into public.channel_ai_conversation_locks(
    organization_id,conversation_id,lease_owner,fencing_token,expires_at,updated_at
  ) values (
    p_organization_id,p_conversation_id,left(p_owner_id,160),next_token,
    clock_timestamp()+make_interval(secs=>p_ttl_seconds),clock_timestamp()
  )
  on conflict (organization_id,conversation_id) do update set
    lease_owner=excluded.lease_owner,
    fencing_token=excluded.fencing_token,
    expires_at=excluded.expires_at,
    updated_at=excluded.updated_at;
  return next_token;
end;
$$;

create or replace function public.release_channel_ai_conversation(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_owner_id text,
  p_fencing_token bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  delete from public.channel_ai_conversation_locks
  where organization_id=p_organization_id
    and conversation_id=p_conversation_id
    and lease_owner=p_owner_id
    and fencing_token=p_fencing_token;
  return found;
end;
$$;

create or replace function public.reserve_channel_ai_budget(
  p_organization_id uuid,
  p_amount_micros bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if p_amount_micros <= 0 then raise exception 'AI_BUDGET_AMOUNT_INVALID'; end if;
  update public.channel_ai_budget_daily
    set reserved_cost_micros=reserved_cost_micros+p_amount_micros,
        updated_at=clock_timestamp()
  where organization_id=p_organization_id and usage_date=current_date
    and reserved_cost_micros+committed_cost_micros+p_amount_micros <= maximum_cost_micros;
  return found;
end;
$$;

create or replace function public.commit_channel_ai_budget(
  p_organization_id uuid,
  p_reserved_micros bigint,
  p_actual_micros bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if p_reserved_micros < 0 or p_actual_micros < 0 or p_actual_micros > p_reserved_micros then
    raise exception 'AI_BUDGET_COMMIT_INVALID';
  end if;
  update public.channel_ai_budget_daily
    set reserved_cost_micros=reserved_cost_micros-p_reserved_micros,
        committed_cost_micros=committed_cost_micros+p_actual_micros,
        updated_at=clock_timestamp()
  where organization_id=p_organization_id and usage_date=current_date
    and reserved_cost_micros >= p_reserved_micros;
  return found;
end;
$$;

create or replace function public.request_channel_ai_handoff(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_reason text,
  p_summary text
)
returns public.channel_ai_handoffs
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  created public.channel_ai_handoffs;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then
    raise exception 'AI_FORBIDDEN';
  end if;
  insert into public.channel_ai_handoffs(
    organization_id,conversation_id,reason,summary,requested_by
  ) values (
    p_organization_id,p_conversation_id,p_reason,left(regexp_replace(p_summary,'[[:cntrl:]]',' ','g'),4000),auth.uid()
  ) returning * into created;
  return created;
end;
$$;

create or replace function public.record_channel_ai_invocation(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_provider_id text,
  p_model_id text,
  p_status text,
  p_source_citations jsonb,
  p_tools_used jsonb,
  p_input_tokens integer,
  p_output_tokens integer,
  p_estimated_cost_micros bigint,
  p_claim_validation jsonb,
  p_prompt_injection_signals_removed integer default 0
)
returns public.channel_ai_invocations
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  created public.channel_ai_invocations;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then
    raise exception 'AI_FORBIDDEN';
  end if;
  insert into public.channel_ai_invocations(
    organization_id,conversation_id,provider_id,model_id,autonomy_mode,status,
    source_citations,tools_used,input_tokens,output_tokens,estimated_cost_micros,
    claim_validation,prompt_injection_signals_removed
  ) values (
    p_organization_id,p_conversation_id,left(p_provider_id,100),left(p_model_id,160),'DRAFT_ONLY',p_status,
    coalesce(p_source_citations,'[]'::jsonb),coalesce(p_tools_used,'[]'::jsonb),
    p_input_tokens,p_output_tokens,p_estimated_cost_micros,coalesce(p_claim_validation,'{}'::jsonb),
    p_prompt_injection_signals_removed
  ) returning * into created;
  return created;
end;
$$;

alter table public.channel_ai_conversation_locks enable row level security;
alter table public.channel_ai_conversation_locks force row level security;
alter table public.channel_ai_budget_daily enable row level security;
alter table public.channel_ai_budget_daily force row level security;
alter table public.channel_ai_handoffs enable row level security;
alter table public.channel_ai_handoffs force row level security;
alter table public.channel_ai_invocations enable row level security;
alter table public.channel_ai_invocations force row level security;

do $$
declare relation text;
begin
  foreach relation in array array[
    'channel_ai_conversation_locks','channel_ai_budget_daily','channel_ai_handoffs','channel_ai_invocations'
  ] loop
    execute format('drop policy if exists %I on public.%I',relation||'_read',relation);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',
      relation||'_read',relation
    );
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
end;
$$;

revoke all on function public.claim_channel_ai_conversation(uuid,uuid,text,integer) from public,anon;
revoke all on function public.release_channel_ai_conversation(uuid,uuid,text,bigint) from public,anon;
revoke all on function public.reserve_channel_ai_budget(uuid,bigint) from public,anon;
revoke all on function public.commit_channel_ai_budget(uuid,bigint,bigint) from public,anon;
revoke all on function public.request_channel_ai_handoff(uuid,uuid,text,text) from public,anon;
revoke all on function public.record_channel_ai_invocation(uuid,uuid,text,text,text,jsonb,jsonb,integer,integer,bigint,jsonb,integer) from public,anon;

grant execute on function public.claim_channel_ai_conversation(uuid,uuid,text,integer) to authenticated,service_role;
grant execute on function public.release_channel_ai_conversation(uuid,uuid,text,bigint) to authenticated,service_role;
grant execute on function public.reserve_channel_ai_budget(uuid,bigint) to authenticated,service_role;
grant execute on function public.commit_channel_ai_budget(uuid,bigint,bigint) to authenticated,service_role;
grant execute on function public.request_channel_ai_handoff(uuid,uuid,text,text) to authenticated,service_role;
grant execute on function public.record_channel_ai_invocation(uuid,uuid,text,text,text,jsonb,jsonb,integer,integer,bigint,jsonb,integer) to authenticated,service_role;
