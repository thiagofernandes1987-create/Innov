-- Etapa 22 / Sprint W-07 — armazenamento criptográfico de sessão.
-- O banco recebe somente envelopes, ciphertext, IV, auth tag e hashes de AAD.
-- KEK/chave-mestra e material em claro permanecem fora do banco.

begin;

create table if not exists public.channel_session_secret_envelopes (
  session_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  provider_type text not null check (provider_type='WHATSAPP_WEB_BAILEYS'),
  provider_account_id text not null,
  schema_version smallint not null default 1 check (schema_version=1),
  generation bigint not null default 0 check (generation>=0),
  data_key_version bigint not null default 1 check (data_key_version>0),
  kek_id text not null check (length(btrim(kek_id))>0),
  kek_version bigint not null check (kek_version>0),
  wrapped_dek bytea not null check (octet_length(wrapped_dek)>0),
  wrap_iv bytea not null check (octet_length(wrap_iv)=12),
  wrap_auth_tag bytea not null check (octet_length(wrap_auth_tag)=16),
  wrap_aad_sha256 text not null check (wrap_aad_sha256~'^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (updated_at>=created_at)
);

create unique index if not exists channel_session_secret_scope_uidx
  on public.channel_session_secret_envelopes(
    organization_id,account_id,provider_type,provider_account_id,session_id
  );
create index if not exists channel_session_secret_account_idx
  on public.channel_session_secret_envelopes(account_id,updated_at desc);

create table if not exists public.channel_session_credentials (
  session_id uuid primary key references public.channel_session_secret_envelopes(session_id)
    on delete cascade,
  record_version bigint not null check (record_version>0),
  encoding text not null check (encoding in ('BINARY','JSON_BUFFER_V1')),
  ciphertext bytea not null check (octet_length(ciphertext)>0),
  iv bytea not null check (octet_length(iv)=12),
  auth_tag bytea not null check (octet_length(auth_tag)=16),
  aad_sha256 text not null check (aad_sha256~'^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_session_keys (
  session_id uuid not null references public.channel_session_secret_envelopes(session_id)
    on delete cascade,
  category text not null check (
    category in (
      'pre-key','session','sender-key','sender-key-memory',
      'app-state-sync-key','app-state-sync-version','lid-mapping',
      'device-list','tctoken','identity-key'
    )
  ),
  key_id text not null check (length(btrim(key_id))>0),
  record_version bigint not null check (record_version>0),
  encoding text not null check (encoding in ('BINARY','JSON_BUFFER_V1')),
  ciphertext bytea not null check (octet_length(ciphertext)>0),
  iv bytea not null check (octet_length(iv)=12),
  auth_tag bytea not null check (octet_length(auth_tag)=16),
  aad_sha256 text not null check (aad_sha256~'^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  primary key(session_id,category,key_id)
);
create index if not exists channel_session_keys_session_category_idx
  on public.channel_session_keys(session_id,category);

create table if not exists public.channel_session_secret_audit (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  provider_type text not null check (provider_type='WHATSAPP_WEB_BAILEYS'),
  provider_account_id text not null,
  action text not null check (
    action in (
      'CREDENTIALS_READ','CREDENTIALS_WRITTEN','KEYS_READ','KEYS_WRITTEN',
      'DATA_KEY_ROTATED','DATA_KEY_REWRAPPED','BACKUP_EXPORTED',
      'BACKUP_RESTORED','SESSION_SECRETS_DELETED','ACCESS_REJECTED',
      'INTEGRITY_FAILURE'
    )
  ),
  outcome text not null check (outcome in ('SUCCESS','REJECTED','FAILED')),
  generation bigint check (generation is null or generation>=0),
  actor_id uuid references auth.users(id) on delete set null,
  correlation_id text,
  attributes jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (jsonb_typeof(attributes)='object'),
  check (pg_column_size(attributes)<=4096),
  check (not (attributes ?| array[
    'credentials','credential','keys','key_material','plaintext','secret',
    'ciphertext','wrapped_dek','auth_tag','qr','pairing_code','adv_secret_key'
  ]))
);
create index if not exists channel_session_secret_audit_idx
  on public.channel_session_secret_audit(session_id,occurred_at desc);

create or replace function public.guard_channel_session_secret_scope()
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
    raise exception 'Conta canônica não encontrada para sessão.';
  end if;
  if new.organization_id<>v_organization_id
    or new.provider_type<>v_provider_type
    or new.provider_account_id<>v_provider_account_id
  then
    raise exception 'Envelope de sessão fora do escopo da conta.';
  end if;
  return new;
end;
$$;

drop trigger if exists channel_session_secret_scope_guard
  on public.channel_session_secret_envelopes;
create trigger channel_session_secret_scope_guard
before insert or update of organization_id,account_id,provider_type,provider_account_id
on public.channel_session_secret_envelopes
for each row execute function public.guard_channel_session_secret_scope();

create or replace function public.compare_and_swap_channel_session_credentials(
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
declare
  v_envelope public.channel_session_secret_envelopes%rowtype;
  v_record_version bigint;
begin
  select * into v_envelope
  from public.channel_session_secret_envelopes
  where session_id=p_session_id
  for update;

  if not found then
    if p_expected_generation is not null then
      raise exception 'SESSION_NOT_FOUND';
    end if;
    insert into public.channel_session_secret_envelopes(
      session_id,organization_id,account_id,provider_type,provider_account_id,
      schema_version,generation,data_key_version,kek_id,kek_version,
      wrapped_dek,wrap_iv,wrap_auth_tag,wrap_aad_sha256
    ) values (
      p_session_id,p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
      1,1,p_data_key_version,p_kek_id,p_kek_version,
      p_wrapped_dek,p_wrap_iv,p_wrap_auth_tag,p_wrap_aad_sha256
    );
    v_record_version:=1;
  else
    if p_expected_generation is null or v_envelope.generation<>p_expected_generation then
      raise exception 'GENERATION_CONFLICT';
    end if;
    if v_envelope.organization_id<>p_organization_id
      or v_envelope.account_id<>p_account_id
      or v_envelope.provider_type<>p_provider_type
      or v_envelope.provider_account_id<>p_provider_account_id
      or v_envelope.data_key_version<>p_data_key_version
    then
      raise exception 'INVALID_SCOPE';
    end if;
    select coalesce(record_version,0)+1 into v_record_version
    from public.channel_session_credentials
    where session_id=p_session_id;
    v_record_version:=coalesce(v_record_version,1);
    update public.channel_session_secret_envelopes
    set generation=generation+1,updated_at=now()
    where session_id=p_session_id;
  end if;

  insert into public.channel_session_credentials(
    session_id,record_version,encoding,ciphertext,iv,auth_tag,aad_sha256,updated_at
  ) values (
    p_session_id,v_record_version,p_encoding,p_ciphertext,p_iv,p_auth_tag,p_aad_sha256,now()
  )
  on conflict(session_id) do update set
    record_version=excluded.record_version,
    encoding=excluded.encoding,
    ciphertext=excluded.ciphertext,
    iv=excluded.iv,
    auth_tag=excluded.auth_tag,
    aad_sha256=excluded.aad_sha256,
    updated_at=excluded.updated_at;

  insert into public.channel_session_secret_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    action,outcome,generation,correlation_id,attributes
  )
  select
    envelope.session_id,envelope.organization_id,envelope.account_id,
    envelope.provider_type,envelope.provider_account_id,
    'CREDENTIALS_WRITTEN','SUCCESS',envelope.generation,p_correlation_id,
    jsonb_build_object('recordVersion',v_record_version,'encrypted',true)
  from public.channel_session_secret_envelopes envelope
  where envelope.session_id=p_session_id;

  return query
  select envelope.generation,v_record_version,envelope.data_key_version
  from public.channel_session_secret_envelopes envelope
  where envelope.session_id=p_session_id;
end;
$$;

create or replace function public.delete_channel_session_secrets(
  p_session_id uuid,
  p_expected_generation bigint,
  p_correlation_id text default null
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_envelope public.channel_session_secret_envelopes%rowtype;
begin
  select * into v_envelope
  from public.channel_session_secret_envelopes
  where session_id=p_session_id
  for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if v_envelope.generation<>p_expected_generation then
    raise exception 'GENERATION_CONFLICT';
  end if;

  delete from public.channel_session_secret_envelopes
  where session_id=p_session_id;

  insert into public.channel_session_secret_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    action,outcome,generation,correlation_id,attributes
  ) values (
    v_envelope.session_id,v_envelope.organization_id,v_envelope.account_id,
    v_envelope.provider_type,v_envelope.provider_account_id,
    'SESSION_SECRETS_DELETED','SUCCESS',v_envelope.generation,p_correlation_id,
    jsonb_build_object('cryptographicErasure',true)
  );
end;
$$;

for table_name in
  select unnest(array[
    'channel_session_secret_envelopes',
    'channel_session_credentials',
    'channel_session_keys',
    'channel_session_secret_audit'
  ])
loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from public,anon,authenticated',table_name);
end loop;

revoke all on function public.compare_and_swap_channel_session_credentials(
  uuid,uuid,uuid,text,text,bigint,bigint,text,bigint,bytea,bytea,bytea,text,
  text,bytea,bytea,bytea,text,text
) from public,anon,authenticated;
revoke all on function public.delete_channel_session_secrets(uuid,bigint,text)
  from public,anon,authenticated;
grant execute on function public.compare_and_swap_channel_session_credentials(
  uuid,uuid,uuid,text,text,bigint,bigint,text,bigint,bytea,bytea,bytea,text,
  text,bytea,bytea,bytea,text,text
) to service_role;
grant execute on function public.delete_channel_session_secrets(uuid,bigint,text)
  to service_role;

commit;
