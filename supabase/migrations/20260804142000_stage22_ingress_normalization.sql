-- Etapa 22 / Sprint W-09 — ingress e normalização duráveis.
-- Reutiliza channel_inbox_events; não cria domínio paralelo de mensagens.

begin;

alter table public.channel_inbox_events
  add column if not exists schema_version text not null default '1.0.0',
  add column if not exists event_kind text,
  add column if not exists idempotency_key text,
  add column if not exists canonical_envelope jsonb,
  add column if not exists ingress_state text not null default 'RECEIVED',
  add column if not exists sequence_key text,
  add column if not exists sequence_number bigint,
  add column if not exists replay_count integer not null default 0,
  add column if not exists dispatch_locked_by text,
  add column if not exists dispatch_locked_at timestamptz,
  add column if not exists dispatched_at timestamptz;

update public.channel_inbox_events
set event_kind=coalesce(event_kind,'UNKNOWN'),
    idempotency_key=coalesce(idempotency_key,payload_sha256),
    canonical_envelope=coalesce(canonical_envelope,sanitized_payload),
    sequence_key=coalesce(sequence_key,account_id::text),
    ingress_state=case
      when state='PROCESSED' then 'DISPATCHED'
      when state='FAILED' then 'FAILED'
      when state='DLQ' then 'DLQ'
      else 'PERSISTED'
    end
where event_kind is null
   or idempotency_key is null
   or canonical_envelope is null
   or sequence_key is null;

alter table public.channel_inbox_events
  alter column event_kind set not null,
  alter column idempotency_key set not null,
  alter column canonical_envelope set not null,
  alter column sequence_key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='channel_inbox_event_kind_check'
  ) then
    alter table public.channel_inbox_events
      add constraint channel_inbox_event_kind_check
      check (event_kind in ('MESSAGE','RECEIPT','IDENTITY','SESSION','UNKNOWN'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname='channel_inbox_ingress_state_check'
  ) then
    alter table public.channel_inbox_events
      add constraint channel_inbox_ingress_state_check
      check (ingress_state in (
        'RECEIVED','VALIDATED','NORMALIZED','PERSISTED',
        'DISPATCHING','DISPATCHED','FAILED','DLQ'
      ));
  end if;
  if not exists (
    select 1 from pg_constraint where conname='channel_inbox_idempotency_check'
  ) then
    alter table public.channel_inbox_events
      add constraint channel_inbox_idempotency_check
      check (idempotency_key~'^[0-9a-f]{64}$');
  end if;
  if not exists (
    select 1 from pg_constraint where conname='channel_inbox_canonical_object_check'
  ) then
    alter table public.channel_inbox_events
      add constraint channel_inbox_canonical_object_check
      check (
        jsonb_typeof(canonical_envelope)='object'
        and pg_column_size(canonical_envelope)<=262144
        and not (canonical_envelope ?| array[
          'raw_payload','raw_body','raw_event','credentials','credential',
          'secret','token','cookie','qr','pairing_code','key_material'
        ])
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname='channel_inbox_sequence_number_check'
  ) then
    alter table public.channel_inbox_events
      add constraint channel_inbox_sequence_number_check
      check (sequence_number is null or sequence_number>=0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname='channel_inbox_replay_count_check'
  ) then
    alter table public.channel_inbox_events
      add constraint channel_inbox_replay_count_check
      check (replay_count>=0);
  end if;
end;
$$;

create unique index if not exists channel_inbox_idempotency_uidx
  on public.channel_inbox_events(
    organization_id,provider_type,provider_account_id,idempotency_key
  );
create index if not exists channel_inbox_ingress_dispatch_idx
  on public.channel_inbox_events(ingress_state,received_at,id)
  where ingress_state in ('PERSISTED','FAILED');
create index if not exists channel_inbox_sequence_idx
  on public.channel_inbox_events(
    organization_id,account_id,sequence_key,sequence_number,occurred_at
  );

create or replace function public.guard_channel_ingress_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare
  account_row public.whatsapp_accounts%rowtype;
begin
  select * into account_row
  from public.whatsapp_accounts
  where id=new.account_id;
  if not found then raise exception 'INGRESS_ACCOUNT_NOT_FOUND'; end if;
  if account_row.organization_id<>new.organization_id
    or account_row.provider_type<>new.provider_type
    or account_row.provider_account_id<>new.provider_account_id
  then
    raise exception 'INGRESS_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists channel_ingress_scope_guard on public.channel_inbox_events;
create trigger channel_ingress_scope_guard
before insert or update of organization_id,account_id,provider_type,provider_account_id
on public.channel_inbox_events
for each row execute function public.guard_channel_ingress_scope();

create or replace function public.persist_channel_ingress_event(
  p_organization_id uuid,
  p_account_id uuid,
  p_provider_type text,
  p_provider_account_id text,
  p_event_type text,
  p_event_kind text,
  p_provider_event_id text,
  p_idempotency_key text,
  p_payload_sha256 text,
  p_canonical_envelope jsonb,
  p_sequence_key text,
  p_sequence_number bigint default null,
  p_occurred_at timestamptz default null
)
returns table(event_id uuid,ingress_state text,duplicate boolean)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  inserted_id uuid;
begin
  if p_event_kind='UNKNOWN' then
    raise exception 'UNKNOWN_PAYLOAD';
  end if;
  if jsonb_typeof(p_canonical_envelope)<>'object' then
    raise exception 'INVALID_CANONICAL_ENVELOPE';
  end if;

  insert into public.channel_inbox_events(
    organization_id,account_id,provider_type,provider_account_id,
    event_type,event_kind,provider_event_id,payload_sha256,idempotency_key,
    sanitized_payload,canonical_envelope,state,ingress_state,
    occurred_at,sequence_key,sequence_number
  ) values (
    p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
    p_event_type,p_event_kind,p_provider_event_id,p_payload_sha256,p_idempotency_key,
    p_canonical_envelope,p_canonical_envelope,'RECEIVED','PERSISTED',
    p_occurred_at,p_sequence_key,p_sequence_number
  )
  on conflict (organization_id,provider_type,provider_account_id,idempotency_key)
  do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    return query select inserted_id,'PERSISTED'::text,false;
  else
    return query
    select inbox.id,inbox.ingress_state,true
    from public.channel_inbox_events inbox
    where inbox.organization_id=p_organization_id
      and inbox.provider_type=p_provider_type
      and inbox.provider_account_id=p_provider_account_id
      and inbox.idempotency_key=p_idempotency_key;
  end if;
end;
$$;

create or replace function public.claim_channel_ingress_events(
  p_worker_id text,
  p_limit integer default 25,
  p_lock_timeout interval default interval '2 minutes'
)
returns setof public.channel_inbox_events
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if length(btrim(p_worker_id))<3 then raise exception 'INVALID_WORKER_ID'; end if;
  return query
  with candidates as (
    select inbox.id
    from public.channel_inbox_events inbox
    where inbox.ingress_state='PERSISTED'
       or (
         inbox.ingress_state='DISPATCHING'
         and inbox.dispatch_locked_at<now()-p_lock_timeout
       )
    order by inbox.received_at,inbox.id
    for update skip locked
    limit greatest(1,least(p_limit,100))
  )
  update public.channel_inbox_events inbox
  set ingress_state='DISPATCHING',
      dispatch_locked_by=p_worker_id,
      dispatch_locked_at=now()
  from candidates
  where inbox.id=candidates.id
  returning inbox.*;
end;
$$;

create or replace function public.complete_channel_ingress_event(
  p_event_id uuid,
  p_worker_id text
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.channel_inbox_events
  set ingress_state='DISPATCHED',state='PROCESSED',processed_at=now(),
      dispatched_at=now(),dispatch_locked_by=null,dispatch_locked_at=null,
      error_code=null,error_message=null
  where id=p_event_id
    and ingress_state='DISPATCHING'
    and dispatch_locked_by=p_worker_id;
  if not found then raise exception 'INGRESS_CLAIM_MISMATCH'; end if;
end;
$$;

create or replace function public.move_channel_ingress_to_dlq(
  p_event_id uuid,
  p_failure_class text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  event_row public.channel_inbox_events%rowtype;
  dlq_id uuid;
begin
  select * into event_row from public.channel_inbox_events where id=p_event_id for update;
  if not found then raise exception 'INGRESS_NOT_FOUND'; end if;
  update public.channel_inbox_events
  set ingress_state='DLQ',state='DLQ',error_code=p_failure_class,error_message=left(p_reason,1000),
      dispatch_locked_by=null,dispatch_locked_at=null
  where id=p_event_id;
  insert into public.channel_dead_letters(
    organization_id,source_kind,source_id,failure_class,reason,payload_snapshot
  ) values (
    event_row.organization_id,'INBOX',event_row.id,p_failure_class,left(p_reason,1000),
    jsonb_build_object(
      'schemaVersion',event_row.schema_version,
      'eventKind',event_row.event_kind,
      'idempotencyKey',event_row.idempotency_key,
      'payloadSha256',event_row.payload_sha256,
      'sanitized',true
    )
  )
  on conflict (source_kind,source_id) where state='OPEN'
  do update set failure_class=excluded.failure_class,reason=excluded.reason
  returning id into dlq_id;
  return dlq_id;
end;
$$;

create or replace function public.replay_channel_ingress_event(
  p_event_id uuid,
  p_justification text
)
returns public.channel_inbox_events
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  result public.channel_inbox_events%rowtype;
begin
  if length(btrim(p_justification))<8 then raise exception 'REPLAY_JUSTIFICATION_REQUIRED'; end if;
  update public.channel_inbox_events
  set ingress_state='PERSISTED',state='RECEIVED',replay_count=replay_count+1,
      error_code=null,error_message=null,dispatch_locked_by=null,dispatch_locked_at=null
  where id=p_event_id and ingress_state in ('FAILED','DLQ')
  returning * into result;
  if not found then raise exception 'INGRESS_NOT_REPLAYABLE'; end if;
  update public.channel_dead_letters
  set state='REPLAYED',replay_count=replay_count+1,
      resolution_note=left(p_justification,1000),resolved_at=now()
  where source_kind='INBOX' and source_id=p_event_id and state='OPEN';
  return result;
end;
$$;

alter table public.channel_inbox_events enable row level security;
alter table public.channel_inbox_events force row level security;
revoke insert,update,delete on public.channel_inbox_events from public,anon,authenticated;

revoke all on function public.persist_channel_ingress_event(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,bigint,timestamptz) from public,anon,authenticated;
revoke all on function public.claim_channel_ingress_events(text,integer,interval) from public,anon,authenticated;
revoke all on function public.complete_channel_ingress_event(uuid,text) from public,anon,authenticated;
revoke all on function public.move_channel_ingress_to_dlq(uuid,text,text) from public,anon,authenticated;
revoke all on function public.replay_channel_ingress_event(uuid,text) from public,anon,authenticated;

grant execute on function public.persist_channel_ingress_event(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,bigint,timestamptz) to service_role;
grant execute on function public.claim_channel_ingress_events(text,integer,interval) to service_role;
grant execute on function public.complete_channel_ingress_event(uuid,text) to service_role;
grant execute on function public.move_channel_ingress_to_dlq(uuid,text,text) to service_role;
grant execute on function public.replay_channel_ingress_event(uuid,text) to service_role;

commit;
