-- Etapa 22 / Sprint W-12 — mídia segura.
-- Conteúdo binário permanece no storage privado; o banco guarda somente referências e hashes.

begin;

create table if not exists public.channel_media_references (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  message_id uuid references public.whatsapp_messages(id) on delete set null,
  inbox_event_id uuid references public.channel_inbox_events(id) on delete set null,
  command_id uuid references public.channel_commands(id) on delete set null,
  provider_type text not null,
  provider_account_id text not null,
  provider_media_id text,
  media_type text not null check(media_type in ('DOCUMENT','IMAGE','AUDIO','VIDEO','STICKER','UNKNOWN')),
  declared_mime_type text not null,
  detected_mime_type text,
  original_file_name text,
  safe_file_name text not null,
  size_bytes bigint not null check(size_bytes>0 and size_bytes<=26214400),
  sha256 text not null check(sha256~'^[0-9a-f]{64}$'),
  quarantine_object_path text not null,
  clean_object_path text,
  security_state text not null default 'QUARANTINED'
    check(security_state in ('QUARANTINED','SCANNING','CLEAN','BLOCKED','ERROR')),
  scan_provider text,
  scan_signature text,
  metadata_redacted boolean not null default false,
  thumbnail_object_path text,
  transcription_reference text,
  ocr_reference text,
  processing_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  scanned_at timestamptz,
  updated_at timestamptz not null default now(),
  check(length(btrim(quarantine_object_path))>0),
  check(clean_object_path is null or length(btrim(clean_object_path))>0),
  check(security_state<>'CLEAN' or (clean_object_path is not null and detected_mime_type is not null and scanned_at is not null)),
  check(security_state<>'BLOCKED' or scanned_at is not null),
  check(jsonb_typeof(processing_policy)='object'),
  check(pg_column_size(processing_policy)<=4096),
  check(not (processing_policy ?| array['base64','raw_payload','credentials','secret','token','qr','pairing_code']))
);

create unique index if not exists channel_media_provider_uidx
  on public.channel_media_references(
    organization_id,provider_type,provider_account_id,provider_media_id
  ) where provider_media_id is not null;
create index if not exists channel_media_dedup_idx
  on public.channel_media_references(organization_id,sha256,size_bytes,security_state);
create index if not exists channel_media_message_idx
  on public.channel_media_references(message_id,created_at desc);
create index if not exists channel_media_security_queue_idx
  on public.channel_media_references(security_state,created_at,id)
  where security_state in ('QUARANTINED','SCANNING','ERROR');

create or replace function public.guard_channel_media_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare account_row public.whatsapp_accounts%rowtype;
declare message_org uuid;
begin
  select * into account_row from public.whatsapp_accounts where id=new.account_id;
  if account_row.id is null then raise exception 'MEDIA_ACCOUNT_NOT_FOUND'; end if;
  if account_row.organization_id<>new.organization_id
     or account_row.provider_type<>new.provider_type
     or account_row.provider_account_id<>new.provider_account_id then
    raise exception 'MEDIA_SCOPE_MISMATCH';
  end if;
  if new.message_id is not null then
    select organization_id into message_org from public.whatsapp_messages where id=new.message_id;
    if message_org is null or message_org<>new.organization_id then raise exception 'MEDIA_MESSAGE_SCOPE_MISMATCH'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists channel_media_scope_guard on public.channel_media_references;
create trigger channel_media_scope_guard
before insert or update of organization_id,account_id,message_id,provider_type,provider_account_id
on public.channel_media_references
for each row execute function public.guard_channel_media_scope();

create or replace function public.guard_channel_media_state_transition()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if old.security_state='CLEAN' and new.security_state<>'CLEAN' then
    raise exception 'CLEAN_MEDIA_STATE_IMMUTABLE';
  end if;
  if old.security_state='BLOCKED' and new.security_state not in ('BLOCKED','ERROR') then
    raise exception 'BLOCKED_MEDIA_CANNOT_PROMOTE';
  end if;
  if old.security_state='QUARANTINED' and new.security_state not in ('QUARANTINED','SCANNING','BLOCKED','ERROR') then
    raise exception 'INVALID_MEDIA_STATE_TRANSITION';
  end if;
  if old.security_state='SCANNING' and new.security_state not in ('SCANNING','CLEAN','BLOCKED','ERROR') then
    raise exception 'INVALID_MEDIA_STATE_TRANSITION';
  end if;
  return new;
end;
$$;

drop trigger if exists channel_media_state_guard on public.channel_media_references;
create trigger channel_media_state_guard
before update of security_state on public.channel_media_references
for each row execute function public.guard_channel_media_state_transition();

create or replace function public.register_channel_media_reference(
  p_organization_id uuid,p_account_id uuid,p_message_id uuid,
  p_provider_type text,p_provider_account_id text,p_provider_media_id text,
  p_media_type text,p_declared_mime_type text,p_original_file_name text,
  p_safe_file_name text,p_size_bytes bigint,p_sha256 text,p_quarantine_object_path text,
  p_processing_policy jsonb default '{}'::jsonb
)
returns public.channel_media_references
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare duplicate public.channel_media_references%rowtype;
declare result public.channel_media_references%rowtype;
begin
  if p_media_type not in ('DOCUMENT','IMAGE','AUDIO','VIDEO','STICKER') then raise exception 'UNKNOWN_MEDIA_TYPE'; end if;
  if p_size_bytes<1 or p_size_bytes>26214400 then raise exception 'MEDIA_SIZE_NOT_ALLOWED'; end if;
  if p_sha256!~'^[0-9a-f]{64}$' then raise exception 'INVALID_MEDIA_SHA256'; end if;
  if coalesce(p_processing_policy,'{}'::jsonb) ?| array['base64','raw_payload','credentials','secret','token','qr'] then
    raise exception 'UNSAFE_MEDIA_POLICY';
  end if;
  select * into duplicate from public.channel_media_references media
  where media.organization_id=p_organization_id and media.sha256=p_sha256
    and media.size_bytes=p_size_bytes and media.security_state='CLEAN'
  order by media.created_at limit 1;
  if duplicate.id is not null then return duplicate; end if;
  insert into public.channel_media_references(
    organization_id,account_id,message_id,provider_type,provider_account_id,
    provider_media_id,media_type,declared_mime_type,original_file_name,safe_file_name,
    size_bytes,sha256,quarantine_object_path,processing_policy
  ) values(
    p_organization_id,p_account_id,p_message_id,p_provider_type,p_provider_account_id,
    nullif(p_provider_media_id,''),p_media_type,lower(p_declared_mime_type),p_original_file_name,
    p_safe_file_name,p_size_bytes,p_sha256,p_quarantine_object_path,
    coalesce(p_processing_policy,'{}'::jsonb)
  ) on conflict(organization_id,provider_type,provider_account_id,provider_media_id)
    where provider_media_id is not null
  do update set provider_media_id=excluded.provider_media_id
  returning * into result;
  return result;
end;
$$;

create or replace function public.begin_channel_media_scan(p_media_id uuid,p_scan_provider text)
returns public.channel_media_references
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare result public.channel_media_references%rowtype;
begin
  update public.channel_media_references set security_state='SCANNING',
    scan_provider=nullif(btrim(p_scan_provider),''),updated_at=now()
  where id=p_media_id and security_state in ('QUARANTINED','ERROR')
  returning * into result;
  if result.id is null then raise exception 'MEDIA_NOT_SCANNABLE'; end if;
  return result;
end;
$$;

create or replace function public.complete_channel_media_scan(
  p_media_id uuid,p_outcome text,p_detected_mime_type text,p_scan_signature text,
  p_clean_object_path text,p_metadata_redacted boolean
)
returns public.channel_media_references
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare result public.channel_media_references%rowtype;
begin
  if p_outcome not in ('CLEAN','BLOCKED') then raise exception 'INVALID_SCAN_OUTCOME'; end if;
  if p_outcome='CLEAN' and nullif(btrim(p_clean_object_path),'') is null then raise exception 'CLEAN_OBJECT_REQUIRED'; end if;
  update public.channel_media_references set
    security_state=p_outcome,
    detected_mime_type=lower(p_detected_mime_type),
    scan_signature=case when p_outcome='BLOCKED' then left(p_scan_signature,200) else null end,
    clean_object_path=case when p_outcome='CLEAN' then p_clean_object_path else null end,
    metadata_redacted=case when p_outcome='CLEAN' then p_metadata_redacted else false end,
    scanned_at=now(),updated_at=now()
  where id=p_media_id and security_state='SCANNING'
  returning * into result;
  if result.id is null then raise exception 'MEDIA_SCAN_STATE_MISMATCH'; end if;
  return result;
end;
$$;

create or replace function public.assert_channel_media_clean(p_media_id uuid)
returns text
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare object_path text;
begin
  select clean_object_path into object_path from public.channel_media_references
  where id=p_media_id and security_state='CLEAN';
  if object_path is null then raise exception 'MEDIA_NOT_CLEAN'; end if;
  return object_path;
end;
$$;

alter table public.channel_media_references enable row level security;
alter table public.channel_media_references force row level security;
revoke all on table public.channel_media_references from public,anon,authenticated;
revoke all on function public.register_channel_media_reference(uuid,uuid,uuid,text,text,text,text,text,text,text,bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.begin_channel_media_scan(uuid,text) from public,anon,authenticated;
revoke all on function public.complete_channel_media_scan(uuid,text,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.assert_channel_media_clean(uuid) from public,anon,authenticated;
grant execute on function public.register_channel_media_reference(uuid,uuid,uuid,text,text,text,text,text,text,text,bigint,text,text,jsonb) to service_role;
grant execute on function public.begin_channel_media_scan(uuid,text) to service_role;
grant execute on function public.complete_channel_media_scan(uuid,text,text,text,text,boolean) to service_role;
grant execute on function public.assert_channel_media_clean(uuid) to service_role;

commit;
