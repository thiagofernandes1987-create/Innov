-- Etapa 22 / Sprint W-10 — outbox, comandos e entrega.
-- Reutiliza as relações técnicas W-04 e as mensagens canônicas whatsapp_*.

begin;

alter table public.channel_commands
  add column if not exists sequence_number bigint,
  add column if not exists reconciliation_state text not null default 'NONE',
  add column if not exists provider_confirmation_deadline timestamptz,
  add column if not exists completed_at timestamptz;

with numbered as (
  select id,row_number() over(partition by conversation_id order by created_at,id) as sequence_number
  from public.channel_commands
)
update public.channel_commands command
set sequence_number=numbered.sequence_number
from numbered
where numbered.id=command.id and command.sequence_number is null;

alter table public.channel_commands alter column sequence_number set not null;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='channel_commands_sequence_check') then
    alter table public.channel_commands add constraint channel_commands_sequence_check
      check(sequence_number>0);
  end if;
  if not exists(select 1 from pg_constraint where conname='channel_commands_reconciliation_check') then
    alter table public.channel_commands add constraint channel_commands_reconciliation_check
      check(reconciliation_state in ('NONE','AWAITING_CONFIRMATION','RETRY_PENDING','CONFIRMED','TERMINAL'));
  end if;
end;
$$;

create unique index if not exists channel_commands_conversation_sequence_uidx
  on public.channel_commands(conversation_id,sequence_number);

alter table public.channel_outbox_events
  add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete restrict,
  add column if not exists message_id uuid references public.whatsapp_messages(id) on delete restrict,
  add column if not exists sequence_number bigint,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists failure_class text,
  add column if not exists provider_message_id text;

update public.channel_outbox_events event
set conversation_id=command.conversation_id,
    message_id=command.message_id,
    sequence_number=command.sequence_number,
    max_attempts=command.max_attempts
from public.channel_commands command
where command.id=event.command_id
  and (event.conversation_id is null or event.sequence_number is null);

alter table public.channel_outbox_events
  alter column conversation_id set not null,
  alter column sequence_number set not null;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='channel_outbox_sequence_check') then
    alter table public.channel_outbox_events add constraint channel_outbox_sequence_check
      check(sequence_number>0);
  end if;
  if not exists(select 1 from pg_constraint where conname='channel_outbox_max_attempts_check') then
    alter table public.channel_outbox_events add constraint channel_outbox_max_attempts_check
      check(max_attempts>0 and max_attempts<=20);
  end if;
end;
$$;

create index if not exists channel_outbox_conversation_sequence_idx
  on public.channel_outbox_events(conversation_id,sequence_number,state);

create table if not exists public.channel_delivery_circuits (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  state text not null default 'CLOSED' check(state in ('CLOSED','OPEN','HALF_OPEN')),
  consecutive_failures integer not null default 0 check(consecutive_failures>=0),
  opened_until timestamptz,
  last_failure_class text,
  version bigint not null default 1 check(version>0),
  updated_at timestamptz not null default now(),
  primary key(organization_id,account_id)
);

create table if not exists public.channel_delivery_rate_buckets (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  window_started_at timestamptz not null,
  accepted_count integer not null default 0 check(accepted_count>=0),
  limit_count integer not null check(limit_count>0),
  updated_at timestamptz not null default now(),
  primary key(organization_id,account_id,window_started_at)
);
create index if not exists channel_delivery_rate_cleanup_idx
  on public.channel_delivery_rate_buckets(window_started_at);

create or replace function public.guard_channel_delivery_account_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare account_org uuid;
begin
  select organization_id into account_org from public.whatsapp_accounts where id=new.account_id;
  if not found or account_org<>new.organization_id then
    raise exception 'DELIVERY_ACCOUNT_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists channel_delivery_circuit_scope_guard on public.channel_delivery_circuits;
create trigger channel_delivery_circuit_scope_guard
before insert or update of organization_id,account_id
on public.channel_delivery_circuits
for each row execute function public.guard_channel_delivery_account_scope();

drop trigger if exists channel_delivery_rate_scope_guard on public.channel_delivery_rate_buckets;
create trigger channel_delivery_rate_scope_guard
before insert or update of organization_id,account_id
on public.channel_delivery_rate_buckets
for each row execute function public.guard_channel_delivery_account_scope();

create or replace function public.reserve_channel_delivery_capacity(
  p_organization_id uuid,
  p_account_id uuid,
  p_limit integer,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  window_start timestamptz;
  resulting_count integer;
begin
  if p_limit<1 or p_limit>100000 then raise exception 'INVALID_DELIVERY_LIMIT'; end if;
  if p_window_seconds<10 or p_window_seconds>3600 then raise exception 'INVALID_DELIVERY_WINDOW'; end if;
  window_start:=to_timestamp(
    floor(extract(epoch from now())/p_window_seconds)*p_window_seconds
  );
  insert into public.channel_delivery_rate_buckets(
    organization_id,account_id,window_started_at,accepted_count,limit_count
  ) values(p_organization_id,p_account_id,window_start,1,p_limit)
  on conflict(organization_id,account_id,window_started_at)
  do update set
    accepted_count=public.channel_delivery_rate_buckets.accepted_count+1,
    limit_count=excluded.limit_count,
    updated_at=now()
  where public.channel_delivery_rate_buckets.accepted_count<excluded.limit_count
  returning accepted_count into resulting_count;
  return resulting_count is not null;
end;
$$;

create or replace function public.claim_ordered_channel_outbox_events(
  p_worker_id text,
  p_limit integer default 20,
  p_lock_timeout interval default interval '2 minutes'
)
returns setof public.channel_outbox_events
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if length(btrim(p_worker_id))<3 then raise exception 'INVALID_WORKER_ID'; end if;
  if p_limit<1 or p_limit>100 then raise exception 'INVALID_CLAIM_LIMIT'; end if;
  return query
  with candidates as (
    select event.id
    from public.channel_outbox_events event
    join public.channel_commands command on command.id=event.command_id
    left join public.channel_delivery_circuits circuit
      on circuit.organization_id=command.organization_id and circuit.account_id=command.account_id
    where (
      event.state in ('PENDING','FAILED') and event.available_at<=now()
      or event.state='CLAIMED' and event.locked_at<now()-p_lock_timeout
    )
      and command.state in ('PENDING','FAILED','CLAIMED')
      and (
        circuit.state is null or circuit.state='CLOSED'
        or circuit.state='OPEN' and circuit.opened_until<=now()
        or circuit.state='HALF_OPEN'
      )
      and not exists(
        select 1
        from public.channel_outbox_events earlier
        where earlier.conversation_id=event.conversation_id
          and earlier.sequence_number<event.sequence_number
          and earlier.state not in ('PUBLISHED','CANCELLED')
      )
    order by event.available_at,event.conversation_id,event.sequence_number,event.id
    for update of event skip locked
    limit p_limit
  )
  update public.channel_outbox_events event
  set state='CLAIMED',locked_by=p_worker_id,locked_at=now(),updated_at=now()
  from candidates
  where event.id=candidates.id
  returning event.*;
end;
$$;

create or replace function public.begin_channel_delivery_attempt(
  p_event_id uuid,
  p_worker_id text,
  p_payload_sha256 text,
  p_confirmation_timeout interval default interval '2 minutes'
)
returns public.channel_delivery_attempts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare event_row public.channel_outbox_events%rowtype;
declare command_row public.channel_commands%rowtype;
declare attempt_row public.channel_delivery_attempts%rowtype;
declare next_attempt integer;
begin
  if p_payload_sha256!~'^[0-9a-f]{64}$' then raise exception 'INVALID_PAYLOAD_SHA256'; end if;
  select * into event_row from public.channel_outbox_events where id=p_event_id for update;
  if not found or event_row.state<>'CLAIMED' or event_row.locked_by<>p_worker_id then
    raise exception 'OUTBOX_CLAIM_MISMATCH';
  end if;
  select * into command_row from public.channel_commands where id=event_row.command_id for update;
  next_attempt:=command_row.attempt_count+1;
  if next_attempt>command_row.max_attempts then raise exception 'MAX_ATTEMPTS_EXCEEDED'; end if;
  update public.channel_commands
  set state='CLAIMED',attempt_count=next_attempt,reconciliation_state='AWAITING_CONFIRMATION',
      provider_confirmation_deadline=now()+p_confirmation_timeout,locked_by=p_worker_id,
      locked_at=now(),updated_at=now()
  where id=command_row.id;
  insert into public.channel_delivery_attempts(
    organization_id,command_id,message_id,attempt_number,payload_sha256,
    retryable,outcome,started_at,metadata
  ) values(
    command_row.organization_id,command_row.id,command_row.message_id,next_attempt,
    p_payload_sha256,false,'ABORTED',now(),jsonb_build_object('inProgress',true)
  )
  returning * into attempt_row;
  return attempt_row;
end;
$$;

create or replace function public.complete_channel_delivery_attempt(
  p_event_id uuid,
  p_worker_id text,
  p_provider_message_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.channel_delivery_attempts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare event_row public.channel_outbox_events%rowtype;
declare command_row public.channel_commands%rowtype;
declare attempt_row public.channel_delivery_attempts%rowtype;
begin
  select * into event_row from public.channel_outbox_events where id=p_event_id for update;
  if not found or event_row.state<>'CLAIMED' or event_row.locked_by<>p_worker_id then
    raise exception 'OUTBOX_CLAIM_MISMATCH';
  end if;
  select * into command_row from public.channel_commands where id=event_row.command_id for update;
  update public.channel_delivery_attempts
  set outcome='SUCCESS',retryable=false,finished_at=now(),metadata=coalesce(p_metadata,'{}'::jsonb)
  where command_id=command_row.id and attempt_number=command_row.attempt_count
  returning * into attempt_row;
  if not found then raise exception 'DELIVERY_ATTEMPT_NOT_FOUND'; end if;
  update public.channel_commands
  set state='SUCCEEDED',reconciliation_state='CONFIRMED',completed_at=now(),
      provider_confirmation_deadline=null,locked_by=null,locked_at=null,updated_at=now()
  where id=command_row.id;
  update public.channel_outbox_events
  set state='PUBLISHED',provider_message_id=nullif(p_provider_message_id,''),published_at=now(),
      locked_by=null,locked_at=null,updated_at=now()
  where id=event_row.id;
  update public.whatsapp_messages
  set status=case when status in ('QUEUED','PENDING','FAILED') then 'SENT' else status end,
      provider_message_id=coalesce(provider_message_id,nullif(p_provider_message_id,''))
  where id=command_row.message_id;
  insert into public.channel_delivery_circuits(organization_id,account_id,state,consecutive_failures,version)
  values(command_row.organization_id,command_row.account_id,'CLOSED',0,1)
  on conflict(organization_id,account_id) do update set
    state='CLOSED',consecutive_failures=0,opened_until=null,last_failure_class=null,
    version=public.channel_delivery_circuits.version+1,updated_at=now();
  return attempt_row;
end;
$$;

create or replace function public.fail_channel_delivery_attempt(
  p_event_id uuid,
  p_worker_id text,
  p_failure_class text,
  p_provider_code text,
  p_retryable boolean,
  p_backoff_seconds integer,
  p_reason text
)
returns public.channel_delivery_attempts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare event_row public.channel_outbox_events%rowtype;
declare command_row public.channel_commands%rowtype;
declare attempt_row public.channel_delivery_attempts%rowtype;
declare should_retry boolean;
declare next_at timestamptz;
declare failures integer;
begin
  if p_backoff_seconds<0 or p_backoff_seconds>3600 then raise exception 'INVALID_BACKOFF'; end if;
  select * into event_row from public.channel_outbox_events where id=p_event_id for update;
  if not found or event_row.state<>'CLAIMED' or event_row.locked_by<>p_worker_id then
    raise exception 'OUTBOX_CLAIM_MISMATCH';
  end if;
  select * into command_row from public.channel_commands where id=event_row.command_id for update;
  should_retry:=p_retryable and command_row.attempt_count<command_row.max_attempts;
  next_at:=case when should_retry then now()+make_interval(secs=>p_backoff_seconds) else null end;
  update public.channel_delivery_attempts
  set outcome=case when should_retry then 'RETRY' else 'TERMINAL' end,
      retryable=should_retry,failure_class=nullif(p_failure_class,''),
      provider_code=nullif(p_provider_code,''),finished_at=now(),next_attempt_at=next_at,
      metadata=jsonb_build_object('reason',left(coalesce(p_reason,''),500),'sanitized',true)
  where command_id=command_row.id and attempt_number=command_row.attempt_count
  returning * into attempt_row;
  if not found then raise exception 'DELIVERY_ATTEMPT_NOT_FOUND'; end if;
  update public.channel_commands
  set state=case when should_retry then 'FAILED' else 'FAILED' end,
      available_at=coalesce(next_at,available_at),last_error_code=p_failure_class,
      last_error_message=left(p_reason,1000),reconciliation_state=case when should_retry then 'RETRY_PENDING' else 'TERMINAL' end,
      provider_confirmation_deadline=null,locked_by=null,locked_at=null,updated_at=now()
  where id=command_row.id;
  update public.channel_outbox_events
  set state='FAILED',available_at=coalesce(next_at,available_at),failure_class=p_failure_class,
      last_error=left(p_reason,1000),attempt_count=attempt_count+1,
      locked_by=null,locked_at=null,updated_at=now()
  where id=event_row.id;
  insert into public.channel_delivery_circuits(
    organization_id,account_id,state,consecutive_failures,opened_until,last_failure_class,version
  ) values(
    command_row.organization_id,command_row.account_id,
    case when should_retry then 'CLOSED' else 'OPEN' end,1,
    case when should_retry then null else now()+interval '30 seconds' end,
    p_failure_class,1
  ) on conflict(organization_id,account_id) do update set
    consecutive_failures=public.channel_delivery_circuits.consecutive_failures+1,
    state=case
      when public.channel_delivery_circuits.consecutive_failures+1>=3 then 'OPEN'
      else public.channel_delivery_circuits.state
    end,
    opened_until=case
      when public.channel_delivery_circuits.consecutive_failures+1>=3 then now()+interval '30 seconds'
      else public.channel_delivery_circuits.opened_until
    end,
    last_failure_class=excluded.last_failure_class,
    version=public.channel_delivery_circuits.version+1,updated_at=now()
  returning consecutive_failures into failures;
  if not should_retry then
    insert into public.channel_dead_letters(
      organization_id,source_kind,source_id,failure_class,reason,payload_snapshot
    ) values(
      command_row.organization_id,'OUTBOX',event_row.id,p_failure_class,left(p_reason,1000),
      jsonb_build_object('commandId',command_row.id,'attempt',command_row.attempt_count,
        'payloadSha256',attempt_row.payload_sha256,'sanitized',true)
    ) on conflict(source_kind,source_id) where state='OPEN'
    do update set failure_class=excluded.failure_class,reason=excluded.reason;
  end if;
  return attempt_row;
end;
$$;

create or replace function public.reconcile_unconfirmed_channel_commands(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare affected integer;
begin
  with candidates as (
    select id from public.channel_commands
    where state='CLAIMED' and reconciliation_state='AWAITING_CONFIRMATION'
      and provider_confirmation_deadline<=now()
    order by provider_confirmation_deadline,id
    for update skip locked
    limit greatest(1,least(p_limit,1000))
  )
  update public.channel_commands command
  set state='FAILED',reconciliation_state='RETRY_PENDING',available_at=now(),
      locked_by=null,locked_at=null,provider_confirmation_deadline=null,
      last_error_code='CONFIRMATION_TIMEOUT',updated_at=now()
  from candidates where command.id=candidates.id;
  get diagnostics affected=row_count;
  update public.channel_outbox_events event
  set state='FAILED',available_at=now(),locked_by=null,locked_at=null,
      failure_class='CONFIRMATION_TIMEOUT',updated_at=now()
  where exists(
    select 1 from public.channel_commands command
    where command.id=event.command_id and command.last_error_code='CONFIRMATION_TIMEOUT'
      and command.reconciliation_state='RETRY_PENDING'
  ) and event.state='CLAIMED';
  return affected;
end;
$$;

create or replace function public.replay_channel_outbox_event(
  p_event_id uuid,
  p_justification text
)
returns public.channel_outbox_events
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare result public.channel_outbox_events%rowtype;
begin
  if length(btrim(p_justification))<8 then raise exception 'REPLAY_JUSTIFICATION_REQUIRED'; end if;
  update public.channel_outbox_events
  set state='PENDING',available_at=now(),locked_by=null,locked_at=null,
      failure_class=null,last_error=null,updated_at=now()
  where id=p_event_id and state in ('FAILED','CANCELLED')
  returning * into result;
  if not found then raise exception 'OUTBOX_NOT_REPLAYABLE'; end if;
  update public.channel_commands
  set state='PENDING',reconciliation_state='NONE',available_at=now(),
      last_error_code=null,last_error_message=null,updated_at=now()
  where id=result.command_id;
  update public.channel_dead_letters
  set state='REPLAYED',replay_count=replay_count+1,resolution_note=left(p_justification,1000),resolved_at=now()
  where source_kind='OUTBOX' and source_id=p_event_id and state='OPEN';
  return result;
end;
$$;

alter table public.channel_delivery_circuits enable row level security;
alter table public.channel_delivery_circuits force row level security;
alter table public.channel_delivery_rate_buckets enable row level security;
alter table public.channel_delivery_rate_buckets force row level security;
revoke all on table public.channel_delivery_circuits,public.channel_delivery_rate_buckets from public,anon,authenticated;

revoke all on function public.reserve_channel_delivery_capacity(uuid,uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.claim_ordered_channel_outbox_events(text,integer,interval) from public,anon,authenticated;
revoke all on function public.begin_channel_delivery_attempt(uuid,text,text,interval) from public,anon,authenticated;
revoke all on function public.complete_channel_delivery_attempt(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.fail_channel_delivery_attempt(uuid,text,text,text,boolean,integer,text) from public,anon,authenticated;
revoke all on function public.reconcile_unconfirmed_channel_commands(integer) from public,anon,authenticated;
revoke all on function public.replay_channel_outbox_event(uuid,text) from public,anon,authenticated;

grant execute on function public.reserve_channel_delivery_capacity(uuid,uuid,integer,integer) to service_role;
grant execute on function public.claim_ordered_channel_outbox_events(text,integer,interval) to service_role;
grant execute on function public.begin_channel_delivery_attempt(uuid,text,text,interval) to service_role;
grant execute on function public.complete_channel_delivery_attempt(uuid,text,text,jsonb) to service_role;
grant execute on function public.fail_channel_delivery_attempt(uuid,text,text,text,boolean,integer,text) to service_role;
grant execute on function public.reconcile_unconfirmed_channel_commands(integer) to service_role;
grant execute on function public.replay_channel_outbox_event(uuid,text) to service_role;

commit;
