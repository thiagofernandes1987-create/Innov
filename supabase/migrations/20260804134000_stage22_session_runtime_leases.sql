-- Etapa 22 / Sprint W-08 — single writer, lease, fencing e kill switch.
-- Nenhum QR, pairing code, segredo ou payload de sessão é persistido nesta camada.

begin;

create table if not exists public.session_runtime_leases (
  session_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  provider_type text not null check (provider_type='WHATSAPP_WEB_BAILEYS'),
  provider_account_id text not null check (length(btrim(provider_account_id))>0),
  schema_version smallint not null default 1 check (schema_version=1),
  holder_instance_id text check (
    holder_instance_id is null or (length(btrim(holder_instance_id)) between 1 and 128)
  ),
  fencing_token bigint not null default 0 check (fencing_token>=0),
  lease_expires_at timestamptz not null default now(),
  acquired_at timestamptz,
  renewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists session_runtime_lease_scope_uidx
  on public.session_runtime_leases(
    organization_id,account_id,provider_type,provider_account_id,session_id
  );
create index if not exists session_runtime_lease_expiry_idx
  on public.session_runtime_leases(lease_expires_at)
  where holder_instance_id is not null;

create table if not exists public.messaging_runtime_global_control (
  singleton boolean primary key default true check (singleton),
  kill_switch_enabled boolean not null default false,
  reason text not null default 'INITIALIZED' check (length(btrim(reason)) between 1 and 500),
  changed_at timestamptz not null default now()
);
insert into public.messaging_runtime_global_control(singleton)
values(true)
on conflict(singleton) do nothing;

create table if not exists public.session_runtime_controls (
  session_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  provider_type text not null check (provider_type='WHATSAPP_WEB_BAILEYS'),
  provider_account_id text not null check (length(btrim(provider_account_id))>0),
  kill_switch_enabled boolean not null default false,
  reason text not null default 'INITIALIZED' check (length(btrim(reason)) between 1 and 500),
  changed_at timestamptz not null default now()
);

create table if not exists public.session_runtime_audit (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  organization_id uuid references public.organizations(id) on delete cascade,
  account_id uuid references public.whatsapp_accounts(id) on delete cascade,
  provider_type text check (provider_type is null or provider_type='WHATSAPP_WEB_BAILEYS'),
  provider_account_id text,
  holder_instance_id text,
  fencing_token bigint check (fencing_token is null or fencing_token>=0),
  action text not null check (
    action in (
      'LEASE_ACQUIRED','LEASE_RENEWED','LEASE_RELEASED','LEASE_TAKEOVER',
      'FENCE_REJECTED','GLOBAL_KILL_SWITCH_CHANGED','SESSION_KILL_SWITCH_CHANGED'
    )
  ),
  outcome text not null check (outcome in ('SUCCESS','REJECTED','FAILED')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  attributes jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (jsonb_typeof(attributes)='object'),
  check (pg_column_size(attributes)<=4096),
  check (not (attributes ?| array[
    'qr','qr_value','pairing_code','challenge_value','credentials','keys',
    'plaintext','secret','ciphertext','wrapped_dek','auth_tag','adv_secret_key'
  ]))
);
create index if not exists session_runtime_audit_session_idx
  on public.session_runtime_audit(session_id,occurred_at desc);

create or replace function public.guard_session_runtime_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare
  v_organization_id uuid;
  v_provider_type text;
  v_provider_account_id text;
begin
  select organization_id,provider_type,provider_account_id
    into v_organization_id,v_provider_type,v_provider_account_id
  from public.whatsapp_accounts
  where id=new.account_id;

  if not found then
    raise exception 'RUNTIME_ACCOUNT_NOT_FOUND';
  end if;
  if new.organization_id<>v_organization_id
    or new.provider_type<>v_provider_type
    or new.provider_account_id<>v_provider_account_id
  then
    raise exception 'RUNTIME_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists session_runtime_lease_scope_guard on public.session_runtime_leases;
create trigger session_runtime_lease_scope_guard
before insert or update of organization_id,account_id,provider_type,provider_account_id
on public.session_runtime_leases
for each row execute function public.guard_session_runtime_scope();

drop trigger if exists session_runtime_control_scope_guard on public.session_runtime_controls;
create trigger session_runtime_control_scope_guard
before insert or update of organization_id,account_id,provider_type,provider_account_id
on public.session_runtime_controls
for each row execute function public.guard_session_runtime_scope();

create or replace function public.assert_runtime_not_killed(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_global boolean;
  v_session boolean;
begin
  select kill_switch_enabled into v_global
  from public.messaging_runtime_global_control
  where singleton=true;
  if coalesce(v_global,false) then
    raise exception 'GLOBAL_KILL_SWITCH_ACTIVE';
  end if;

  select kill_switch_enabled into v_session
  from public.session_runtime_controls
  where session_id=p_session_id;
  if coalesce(v_session,false) then
    raise exception 'SESSION_KILL_SWITCH_ACTIVE';
  end if;
end;
$$;

create or replace function public.acquire_session_runtime_lease(
  p_session_id uuid,
  p_organization_id uuid,
  p_account_id uuid,
  p_provider_type text,
  p_provider_account_id text,
  p_holder_instance_id text,
  p_ttl_seconds integer
)
returns table(
  holder_instance_id text,
  fencing_token bigint,
  lease_expires_at timestamptz,
  acquired boolean
)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_current public.session_runtime_leases%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_acquired boolean:=false;
  v_action text;
begin
  if p_ttl_seconds<1 or p_ttl_seconds>300 then
    raise exception 'INVALID_LEASE_TTL';
  end if;
  if length(btrim(p_holder_instance_id))<1 or length(p_holder_instance_id)>128 then
    raise exception 'INVALID_HOLDER_INSTANCE';
  end if;
  perform public.assert_runtime_not_killed(p_session_id);

  select lease.* into v_current
  from public.session_runtime_leases lease
  where lease.session_id=p_session_id
  for update;

  if not found then
    insert into public.session_runtime_leases(
      session_id,organization_id,account_id,provider_type,provider_account_id,
      holder_instance_id,fencing_token,lease_expires_at,acquired_at,renewed_at,updated_at
    ) values (
      p_session_id,p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
      p_holder_instance_id,1,v_now+make_interval(secs=>p_ttl_seconds),v_now,v_now,v_now
    ) returning * into v_current;
    v_acquired:=true;
    v_action:='LEASE_ACQUIRED';
  elsif v_current.holder_instance_id=p_holder_instance_id
    and v_current.lease_expires_at>v_now
  then
    update public.session_runtime_leases lease
    set lease_expires_at=v_now+make_interval(secs=>p_ttl_seconds),
        renewed_at=v_now,
        updated_at=v_now
    where lease.session_id=p_session_id
    returning * into v_current;
    v_action:='LEASE_RENEWED';
  elsif v_current.holder_instance_id is not null
    and v_current.lease_expires_at>v_now
  then
    insert into public.session_runtime_audit(
      session_id,organization_id,account_id,provider_type,provider_account_id,
      holder_instance_id,fencing_token,action,outcome,reason
    ) values (
      p_session_id,p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
      p_holder_instance_id,v_current.fencing_token,'FENCE_REJECTED','REJECTED','LEASE_HELD'
    );
    raise exception 'LEASE_HELD';
  else
    update public.session_runtime_leases lease
    set organization_id=p_organization_id,
        account_id=p_account_id,
        provider_type=p_provider_type,
        provider_account_id=p_provider_account_id,
        holder_instance_id=p_holder_instance_id,
        fencing_token=lease.fencing_token+1,
        lease_expires_at=v_now+make_interval(secs=>p_ttl_seconds),
        acquired_at=v_now,
        renewed_at=v_now,
        updated_at=v_now
    where lease.session_id=p_session_id
    returning * into v_current;
    v_acquired:=true;
    v_action:='LEASE_TAKEOVER';
  end if;

  insert into public.session_runtime_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    holder_instance_id,fencing_token,action,outcome,reason,
    attributes
  ) values (
    v_current.session_id,v_current.organization_id,v_current.account_id,
    v_current.provider_type,v_current.provider_account_id,
    v_current.holder_instance_id,v_current.fencing_token,v_action,'SUCCESS',v_action,
    jsonb_build_object('leaseExpiresAt',v_current.lease_expires_at,'acquired',v_acquired)
  );

  return query select
    v_current.holder_instance_id,v_current.fencing_token,
    v_current.lease_expires_at,v_acquired;
end;
$$;

create or replace function public.renew_session_runtime_lease(
  p_session_id uuid,
  p_holder_instance_id text,
  p_fencing_token bigint,
  p_ttl_seconds integer
)
returns table(fencing_token bigint,lease_expires_at timestamptz)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_current public.session_runtime_leases%rowtype;
  v_now timestamptz:=clock_timestamp();
begin
  if p_ttl_seconds<1 or p_ttl_seconds>300 then
    raise exception 'INVALID_LEASE_TTL';
  end if;
  perform public.assert_runtime_not_killed(p_session_id);

  select lease.* into v_current
  from public.session_runtime_leases lease
  where lease.session_id=p_session_id
  for update;
  if not found then
    raise exception 'RUNTIME_NOT_LEASED';
  end if;
  if v_current.holder_instance_id<>p_holder_instance_id
    or v_current.fencing_token<>p_fencing_token
  then
    raise exception 'FENCING_TOKEN_STALE';
  end if;
  if v_current.lease_expires_at<=v_now then
    raise exception 'LEASE_EXPIRED';
  end if;

  update public.session_runtime_leases lease
  set lease_expires_at=v_now+make_interval(secs=>p_ttl_seconds),
      renewed_at=v_now,
      updated_at=v_now
  where lease.session_id=p_session_id
  returning * into v_current;

  insert into public.session_runtime_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    holder_instance_id,fencing_token,action,outcome,reason
  ) values (
    v_current.session_id,v_current.organization_id,v_current.account_id,
    v_current.provider_type,v_current.provider_account_id,
    v_current.holder_instance_id,v_current.fencing_token,
    'LEASE_RENEWED','SUCCESS','LEASE_RENEWED'
  );

  return query select v_current.fencing_token,v_current.lease_expires_at;
end;
$$;

create or replace function public.release_session_runtime_lease(
  p_session_id uuid,
  p_holder_instance_id text,
  p_fencing_token bigint,
  p_reason text default 'REQUESTED'
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_current public.session_runtime_leases%rowtype;
  v_now timestamptz:=clock_timestamp();
begin
  select lease.* into v_current
  from public.session_runtime_leases lease
  where lease.session_id=p_session_id
  for update;
  if not found or v_current.holder_instance_id is null then
    raise exception 'RUNTIME_NOT_LEASED';
  end if;
  if v_current.holder_instance_id<>p_holder_instance_id
    or v_current.fencing_token<>p_fencing_token
  then
    raise exception 'FENCING_TOKEN_STALE';
  end if;

  update public.session_runtime_leases lease
  set holder_instance_id=null,
      lease_expires_at=v_now,
      renewed_at=v_now,
      updated_at=v_now
  where lease.session_id=p_session_id;

  insert into public.session_runtime_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    holder_instance_id,fencing_token,action,outcome,reason
  ) values (
    v_current.session_id,v_current.organization_id,v_current.account_id,
    v_current.provider_type,v_current.provider_account_id,
    p_holder_instance_id,p_fencing_token,'LEASE_RELEASED','SUCCESS',left(p_reason,500)
  );
end;
$$;

create or replace function public.assert_session_runtime_fence(
  p_session_id uuid,
  p_holder_instance_id text,
  p_fencing_token bigint
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_current public.session_runtime_leases%rowtype;
begin
  perform public.assert_runtime_not_killed(p_session_id);
  select lease.* into v_current
  from public.session_runtime_leases lease
  where lease.session_id=p_session_id
  for share;
  if not found or v_current.holder_instance_id is null then
    raise exception 'RUNTIME_NOT_LEASED';
  end if;
  if v_current.holder_instance_id<>p_holder_instance_id
    or v_current.fencing_token<>p_fencing_token
  then
    raise exception 'FENCING_TOKEN_STALE';
  end if;
  if v_current.lease_expires_at<=clock_timestamp() then
    raise exception 'LEASE_EXPIRED';
  end if;
end;
$$;

create or replace function public.set_global_messaging_runtime_kill_switch(
  p_enabled boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if length(btrim(p_reason))<1 or length(p_reason)>500 then
    raise exception 'INVALID_KILL_SWITCH_REASON';
  end if;
  update public.messaging_runtime_global_control
  set kill_switch_enabled=p_enabled,reason=p_reason,changed_at=clock_timestamp()
  where singleton=true;
  insert into public.session_runtime_audit(action,outcome,reason,attributes)
  values(
    'GLOBAL_KILL_SWITCH_CHANGED','SUCCESS',p_reason,
    jsonb_build_object('enabled',p_enabled)
  );
end;
$$;

create or replace function public.set_session_runtime_kill_switch(
  p_session_id uuid,
  p_organization_id uuid,
  p_account_id uuid,
  p_provider_type text,
  p_provider_account_id text,
  p_enabled boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if length(btrim(p_reason))<1 or length(p_reason)>500 then
    raise exception 'INVALID_KILL_SWITCH_REASON';
  end if;
  insert into public.session_runtime_controls(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    kill_switch_enabled,reason,changed_at
  ) values (
    p_session_id,p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
    p_enabled,p_reason,clock_timestamp()
  )
  on conflict(session_id) do update set
    organization_id=excluded.organization_id,
    account_id=excluded.account_id,
    provider_type=excluded.provider_type,
    provider_account_id=excluded.provider_account_id,
    kill_switch_enabled=excluded.kill_switch_enabled,
    reason=excluded.reason,
    changed_at=excluded.changed_at;

  insert into public.session_runtime_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    action,outcome,reason,attributes
  ) values (
    p_session_id,p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
    'SESSION_KILL_SWITCH_CHANGED','SUCCESS',p_reason,
    jsonb_build_object('enabled',p_enabled)
  );
end;
$$;

create or replace function public.compare_and_swap_channel_session_credentials_fenced(
  p_holder_instance_id text,
  p_fencing_token bigint,
  p_session_id uuid,
  p_organization_id uuid,
  p_account_id uuid,
  p_provider_type text,
  p_provider_account_id text,
  p_expected_generation bigint,
  p_data_key_version bigint,
  p_kek_id text,
  p_kek_version bigint,
  p_wrapped_dek bytea,
  p_wrap_iv bytea,
  p_wrap_auth_tag bytea,
  p_wrap_aad_sha256 text,
  p_encoding text,
  p_ciphertext bytea,
  p_iv bytea,
  p_auth_tag bytea,
  p_aad_sha256 text,
  p_correlation_id text default null
)
returns table(generation bigint,record_version bigint,data_key_version bigint)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  perform public.assert_session_runtime_fence(
    p_session_id,p_holder_instance_id,p_fencing_token
  );
  return query
  select result.generation,result.record_version,result.data_key_version
  from public.compare_and_swap_channel_session_credentials(
    p_session_id,p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
    p_expected_generation,p_data_key_version,p_kek_id,p_kek_version,p_wrapped_dek,
    p_wrap_iv,p_wrap_auth_tag,p_wrap_aad_sha256,p_encoding,p_ciphertext,p_iv,
    p_auth_tag,p_aad_sha256,p_correlation_id
  ) result;
end;
$$;

do $$
declare
  relation text;
begin
  foreach relation in array array[
    'session_runtime_leases','messaging_runtime_global_control',
    'session_runtime_controls','session_runtime_audit'
  ] loop
    execute format('alter table public.%I enable row level security',relation);
    execute format('alter table public.%I force row level security',relation);
    execute format('revoke all on table public.%I from public,anon,authenticated',relation);
  end loop;
end;
$$;

revoke all on function public.assert_runtime_not_killed(uuid) from public,anon,authenticated;
revoke all on function public.acquire_session_runtime_lease(uuid,uuid,uuid,text,text,text,integer)
  from public,anon,authenticated;
revoke all on function public.renew_session_runtime_lease(uuid,text,bigint,integer)
  from public,anon,authenticated;
revoke all on function public.release_session_runtime_lease(uuid,text,bigint,text)
  from public,anon,authenticated;
revoke all on function public.assert_session_runtime_fence(uuid,text,bigint)
  from public,anon,authenticated;
revoke all on function public.set_global_messaging_runtime_kill_switch(boolean,text)
  from public,anon,authenticated;
revoke all on function public.set_session_runtime_kill_switch(uuid,uuid,uuid,text,text,boolean,text)
  from public,anon,authenticated;
revoke all on function public.compare_and_swap_channel_session_credentials_fenced(
  text,bigint,uuid,uuid,uuid,text,text,bigint,bigint,text,bigint,bytea,bytea,bytea,
  text,text,bytea,bytea,bytea,text,text
) from public,anon,authenticated;

grant execute on function public.acquire_session_runtime_lease(uuid,uuid,uuid,text,text,text,integer)
  to service_role;
grant execute on function public.renew_session_runtime_lease(uuid,text,bigint,integer)
  to service_role;
grant execute on function public.release_session_runtime_lease(uuid,text,bigint,text)
  to service_role;
grant execute on function public.assert_session_runtime_fence(uuid,text,bigint)
  to service_role;
grant execute on function public.set_global_messaging_runtime_kill_switch(boolean,text)
  to service_role;
grant execute on function public.set_session_runtime_kill_switch(uuid,uuid,uuid,text,text,boolean,text)
  to service_role;
grant execute on function public.compare_and_swap_channel_session_credentials_fenced(
  text,bigint,uuid,uuid,uuid,text,text,bigint,bigint,text,bigint,bytea,bytea,bytea,
  text,text,bytea,bytea,bytea,text,text
) to service_role;

commit;
