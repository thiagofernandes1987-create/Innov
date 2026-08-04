-- Etapa 22 / Sprint W-11 — identidades, contatos e deduplicação.
-- whatsapp_contacts permanece o contato canônico; channel_* guarda somente aliases técnicos.

begin;

alter table public.whatsapp_contacts
  add column if not exists identity_version bigint not null default 1,
  add column if not exists active boolean not null default true,
  add column if not exists merged_into_contact_id uuid references public.whatsapp_contacts(id) on delete restrict;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='whatsapp_contacts_identity_version_check') then
    alter table public.whatsapp_contacts add constraint whatsapp_contacts_identity_version_check
      check(identity_version>0);
  end if;
  if not exists(select 1 from pg_constraint where conname='whatsapp_contacts_merge_self_check') then
    alter table public.whatsapp_contacts add constraint whatsapp_contacts_merge_self_check
      check(merged_into_contact_id is null or merged_into_contact_id<>id);
  end if;
end;
$$;
create index if not exists whatsapp_contacts_merged_into_idx
  on public.whatsapp_contacts(merged_into_contact_id);

alter table public.channel_contact_identities
  add column if not exists link_status text not null default 'OBSERVED',
  add column if not exists identity_version bigint not null default 1,
  add column if not exists identity_fingerprint text;

update public.channel_contact_identities
set identity_fingerprint=encode(digest(
  organization_id::text||':'||provider_type||':'||provider_account_id||':'||
  namespace||':'||normalized_id||':'||coalesce(device_id,''),'sha256'),'hex')
where identity_fingerprint is null;

alter table public.channel_contact_identities
  alter column identity_fingerprint set not null;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='channel_identity_link_status_check') then
    alter table public.channel_contact_identities add constraint channel_identity_link_status_check
      check(link_status in ('OBSERVED','CONFIRMED','CONFLICT','REJECTED'));
  end if;
  if not exists(select 1 from pg_constraint where conname='channel_identity_version_check') then
    alter table public.channel_contact_identities add constraint channel_identity_version_check
      check(identity_version>0);
  end if;
  if not exists(select 1 from pg_constraint where conname='channel_identity_fingerprint_check') then
    alter table public.channel_contact_identities add constraint channel_identity_fingerprint_check
      check(identity_fingerprint~'^[0-9a-f]{64}$');
  end if;
end;
$$;
create index if not exists channel_identity_fingerprint_idx
  on public.channel_contact_identities(organization_id,identity_fingerprint);

create table if not exists public.channel_identity_alias_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  primary_identity_id uuid not null references public.channel_contact_identities(id) on delete restrict,
  alias_identity_id uuid not null references public.channel_contact_identities(id) on delete restrict,
  status text not null default 'OBSERVED' check(status in ('OBSERVED','CONFIRMED','CONFLICT','REJECTED')),
  confidence text not null default 'OBSERVED' check(confidence in ('OBSERVED','INFERRED','CONFIRMED')),
  evidence jsonb not null default '{}'::jsonb,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(primary_identity_id<>alias_identity_id),
  check(jsonb_typeof(evidence)='object'),
  check(pg_column_size(evidence)<=4096),
  check(not (evidence ?| array['raw_payload','credentials','secret','token','qr','pairing_code']))
);
create unique index if not exists channel_identity_alias_pair_uidx
  on public.channel_identity_alias_links(
    organization_id,least(primary_identity_id,alias_identity_id),greatest(primary_identity_id,alias_identity_id)
  );
create index if not exists channel_identity_alias_contact_idx
  on public.channel_identity_alias_links(contact_id,status,updated_at desc);

create table if not exists public.channel_contact_merge_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_contact_id uuid not null,
  target_contact_id uuid not null references public.whatsapp_contacts(id) on delete restrict,
  source_version bigint not null,
  target_version bigint not null,
  moved_conversations integer not null default 0,
  moved_identities integer not null default 0,
  superseded_identities integer not null default 0,
  reason text not null,
  requested_by uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  check(source_contact_id<>target_contact_id),
  check(length(btrim(reason))>=8)
);
create index if not exists channel_contact_merge_audit_org_idx
  on public.channel_contact_merge_audit(organization_id,occurred_at desc);

create table if not exists public.channel_identity_cache_versions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  version bigint not null default 1 check(version>0),
  updated_at timestamptz not null default now()
);

create or replace function public.bump_channel_identity_cache(p_organization_id uuid)
returns bigint
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare resulting bigint;
begin
  insert into public.channel_identity_cache_versions(organization_id,version)
  values(p_organization_id,1)
  on conflict(organization_id) do update set
    version=public.channel_identity_cache_versions.version+1,updated_at=now()
  returning version into resulting;
  return resulting;
end;
$$;

create or replace function public.guard_channel_identity_alias_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare primary_row public.channel_contact_identities%rowtype;
declare alias_row public.channel_contact_identities%rowtype;
begin
  select * into primary_row from public.channel_contact_identities where id=new.primary_identity_id;
  select * into alias_row from public.channel_contact_identities where id=new.alias_identity_id;
  if primary_row.id is null or alias_row.id is null then raise exception 'IDENTITY_NOT_FOUND'; end if;
  if primary_row.organization_id<>new.organization_id
     or alias_row.organization_id<>new.organization_id
     or primary_row.account_id<>new.account_id
     or alias_row.account_id<>new.account_id
     or primary_row.contact_id<>new.contact_id
     or alias_row.contact_id<>new.contact_id then
    raise exception 'IDENTITY_ALIAS_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists channel_identity_alias_scope_guard on public.channel_identity_alias_links;
create trigger channel_identity_alias_scope_guard
before insert or update of organization_id,account_id,contact_id,primary_identity_id,alias_identity_id
on public.channel_identity_alias_links
for each row execute function public.guard_channel_identity_alias_scope();

create or replace function public.observe_channel_contact_identity(
  p_account_id uuid,
  p_contact_id uuid,
  p_namespace text,
  p_external_id text,
  p_normalized_id text,
  p_device_id text default null,
  p_observed_at timestamptz default now()
)
returns public.channel_contact_identities
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare account_row public.whatsapp_accounts%rowtype;
declare contact_row public.whatsapp_contacts%rowtype;
declare existing public.channel_contact_identities%rowtype;
declare result public.channel_contact_identities%rowtype;
declare fingerprint text;
begin
  select * into account_row from public.whatsapp_accounts where id=p_account_id;
  select * into contact_row from public.whatsapp_contacts where id=p_contact_id for share;
  if account_row.id is null or contact_row.id is null then raise exception 'ACCOUNT_OR_CONTACT_NOT_FOUND'; end if;
  if contact_row.organization_id<>account_row.organization_id or contact_row.account_id<>account_row.id then
    raise exception 'IDENTITY_CONTACT_SCOPE_MISMATCH';
  end if;
  if not contact_row.active then raise exception 'CONTACT_INACTIVE'; end if;
  if p_namespace not in ('PHONE','WHATSAPP_PN','WHATSAPP_LID','GROUP','NEWSLETTER','WEB_USER','EMAIL','CUSTOM') then
    raise exception 'INVALID_IDENTITY_NAMESPACE';
  end if;
  if nullif(btrim(p_normalized_id),'') is null then raise exception 'INVALID_NORMALIZED_ID'; end if;
  fingerprint:=encode(digest(
    account_row.organization_id::text||':'||account_row.provider_type||':'||
    account_row.provider_account_id||':'||p_namespace||':'||btrim(p_normalized_id)||':'||
    coalesce(p_device_id,''),'sha256'),'hex');

  select * into existing
  from public.channel_contact_identities identity
  where identity.organization_id=account_row.organization_id
    and identity.provider_type=account_row.provider_type
    and identity.provider_account_id=account_row.provider_account_id
    and identity.namespace=p_namespace
    and identity.normalized_id=btrim(p_normalized_id)
    and coalesce(identity.device_id,'')=coalesce(p_device_id,'')
    and identity.active
  for update;

  if existing.id is not null then
    update public.channel_contact_identities
    set last_observed_at=greatest(last_observed_at,p_observed_at),
        link_status=case when contact_id<>p_contact_id then 'CONFLICT' else link_status end,
        identity_version=identity_version+1,updated_at=now()
    where id=existing.id returning * into result;
    perform public.bump_channel_identity_cache(account_row.organization_id);
    return result;
  end if;

  insert into public.channel_contact_identities(
    organization_id,account_id,contact_id,provider_type,provider_account_id,
    namespace,external_id,normalized_id,device_id,confidence,link_status,
    first_observed_at,last_observed_at,identity_fingerprint
  ) values(
    account_row.organization_id,account_row.id,contact_row.id,
    account_row.provider_type,account_row.provider_account_id,p_namespace,
    p_external_id,btrim(p_normalized_id),nullif(p_device_id,''),'OBSERVED','OBSERVED',
    p_observed_at,p_observed_at,fingerprint
  ) returning * into result;
  perform public.bump_channel_identity_cache(account_row.organization_id);
  return result;
end;
$$;

create or replace function public.confirm_channel_identity_alias(
  p_primary_identity_id uuid,
  p_alias_identity_id uuid,
  p_evidence jsonb default '{}'::jsonb
)
returns public.channel_identity_alias_links
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare primary_row public.channel_contact_identities%rowtype;
declare alias_row public.channel_contact_identities%rowtype;
declare result public.channel_identity_alias_links%rowtype;
begin
  select * into primary_row from public.channel_contact_identities where id=p_primary_identity_id for update;
  select * into alias_row from public.channel_contact_identities where id=p_alias_identity_id for update;
  if primary_row.id is null or alias_row.id is null then raise exception 'IDENTITY_NOT_FOUND'; end if;
  if primary_row.organization_id<>alias_row.organization_id
     or primary_row.account_id<>alias_row.account_id then raise exception 'CROSS_SCOPE_ALIAS'; end if;
  if primary_row.contact_id<>alias_row.contact_id then raise exception 'CONTACT_CONFIRMATION_REQUIRED'; end if;
  if primary_row.namespace=alias_row.namespace then raise exception 'ALIAS_NAMESPACE_MUST_DIFFER'; end if;

  insert into public.channel_identity_alias_links(
    organization_id,account_id,contact_id,primary_identity_id,alias_identity_id,
    status,confidence,evidence,confirmed_by,confirmed_at
  ) values(
    primary_row.organization_id,primary_row.account_id,primary_row.contact_id,
    primary_row.id,alias_row.id,'CONFIRMED','CONFIRMED',coalesce(p_evidence,'{}'::jsonb),
    auth.uid(),now()
  ) on conflict(
    organization_id,least(primary_identity_id,alias_identity_id),greatest(primary_identity_id,alias_identity_id)
  ) do update set status='CONFIRMED',confidence='CONFIRMED',evidence=excluded.evidence,
    confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
  returning * into result;

  update public.channel_contact_identities
  set confidence='CONFIRMED',link_status='CONFIRMED',verified_at=now(),
      identity_version=identity_version+1,updated_at=now()
  where id in (primary_row.id,alias_row.id);
  update public.whatsapp_contacts
  set identity_version=identity_version+1,updated_at=now()
  where id=primary_row.contact_id;
  perform public.bump_channel_identity_cache(primary_row.organization_id);
  return result;
end;
$$;

create or replace function public.merge_channel_contacts(
  p_source_contact_id uuid,
  p_target_contact_id uuid,
  p_expected_source_version bigint,
  p_expected_target_version bigint,
  p_reason text
)
returns public.channel_contact_merge_audit
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare source_row public.whatsapp_contacts%rowtype;
declare target_row public.whatsapp_contacts%rowtype;
declare moved_conversations integer:=0;
declare moved_identities integer:=0;
declare superseded_identities integer:=0;
declare source_identity public.channel_contact_identities%rowtype;
declare duplicate_identity public.channel_contact_identities%rowtype;
declare audit_row public.channel_contact_merge_audit%rowtype;
begin
  if p_source_contact_id=p_target_contact_id then raise exception 'SAME_CONTACT_MERGE'; end if;
  if length(btrim(p_reason))<8 then raise exception 'MERGE_REASON_REQUIRED'; end if;
  select * into source_row from public.whatsapp_contacts where id=p_source_contact_id for update;
  select * into target_row from public.whatsapp_contacts where id=p_target_contact_id for update;
  if source_row.id is null or target_row.id is null then raise exception 'CONTACT_NOT_FOUND'; end if;
  if source_row.organization_id<>target_row.organization_id
     or source_row.account_id<>target_row.account_id then raise exception 'CROSS_SCOPE_MERGE'; end if;
  if source_row.identity_version<>p_expected_source_version
     or target_row.identity_version<>p_expected_target_version then raise exception 'CONTACT_VERSION_CONFLICT'; end if;
  if not source_row.active or not target_row.active then raise exception 'CONTACT_INACTIVE'; end if;

  update public.whatsapp_conversations
  set contact_id=target_row.id,updated_at=now()
  where contact_id=source_row.id;
  get diagnostics moved_conversations=row_count;

  for source_identity in
    select * from public.channel_contact_identities
    where contact_id=source_row.id and active for update
  loop
    select * into duplicate_identity
    from public.channel_contact_identities identity
    where identity.contact_id=target_row.id and identity.active
      and identity.provider_type=source_identity.provider_type
      and identity.provider_account_id=source_identity.provider_account_id
      and identity.namespace=source_identity.namespace
      and identity.normalized_id=source_identity.normalized_id
      and coalesce(identity.device_id,'')=coalesce(source_identity.device_id,'')
    limit 1;
    if duplicate_identity.id is not null then
      update public.channel_contact_identities
      set active=false,link_status='REJECTED',superseded_by=duplicate_identity.id,
          identity_version=identity_version+1,updated_at=now()
      where id=source_identity.id;
      superseded_identities:=superseded_identities+1;
    else
      update public.channel_contact_identities
      set contact_id=target_row.id,identity_version=identity_version+1,updated_at=now()
      where id=source_identity.id;
      moved_identities:=moved_identities+1;
    end if;
  end loop;

  update public.channel_identity_alias_links
  set contact_id=target_row.id,updated_at=now()
  where contact_id=source_row.id;

  update public.whatsapp_contacts
  set active=false,merged_into_contact_id=target_row.id,
      identity_version=identity_version+1,updated_at=now()
  where id=source_row.id;
  update public.whatsapp_contacts
  set identity_version=identity_version+1,updated_at=now()
  where id=target_row.id;

  insert into public.channel_contact_merge_audit(
    organization_id,source_contact_id,target_contact_id,source_version,target_version,
    moved_conversations,moved_identities,superseded_identities,reason,requested_by
  ) values(
    source_row.organization_id,source_row.id,target_row.id,
    p_expected_source_version,p_expected_target_version,moved_conversations,
    moved_identities,superseded_identities,p_reason,auth.uid()
  ) returning * into audit_row;
  perform public.bump_channel_identity_cache(source_row.organization_id);
  return audit_row;
end;
$$;

alter table public.channel_identity_alias_links enable row level security;
alter table public.channel_identity_alias_links force row level security;
alter table public.channel_contact_merge_audit enable row level security;
alter table public.channel_contact_merge_audit force row level security;
alter table public.channel_identity_cache_versions enable row level security;
alter table public.channel_identity_cache_versions force row level security;
revoke all on table public.channel_identity_alias_links,public.channel_contact_merge_audit,
  public.channel_identity_cache_versions from public,anon,authenticated;

revoke all on function public.bump_channel_identity_cache(uuid) from public,anon,authenticated;
revoke all on function public.observe_channel_contact_identity(uuid,uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.confirm_channel_identity_alias(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.merge_channel_contacts(uuid,uuid,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.bump_channel_identity_cache(uuid) to service_role;
grant execute on function public.observe_channel_contact_identity(uuid,uuid,text,text,text,text,timestamptz) to service_role;
grant execute on function public.confirm_channel_identity_alias(uuid,uuid,jsonb) to service_role;
grant execute on function public.merge_channel_contacts(uuid,uuid,bigint,bigint,text) to service_role;

commit;
