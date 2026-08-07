alter table public.rh_esocial_event_drafts add column if not exists employer_registration_type integer check(employer_registration_type is null or employer_registration_type in(1,2));
alter table public.rh_esocial_event_drafts add column if not exists employer_registration_number text;
alter table public.rh_esocial_event_drafts add column if not exists transmitter_registration_type integer check(transmitter_registration_type is null or transmitter_registration_type in(1,2));
alter table public.rh_esocial_event_drafts add column if not exists transmitter_registration_number text;

create unique index if not exists rh_esocial_drafts_source_once_uq
on public.rh_esocial_event_drafts(
  organization_id,environment,event_type,operation,source_type,source_id,employer_registration_number
) where source_id is not null and signed_event_id is not null;

create or replace function public.persist_rh_esocial_generated_event(
  p_organization_id uuid,
  p_event_type text,
  p_event_key text,
  p_event_group integer,
  p_environment text,
  p_operation text,
  p_layout_version text,
  p_source_type text,
  p_source_id uuid,
  p_employer_registration_type integer,
  p_employer_registration_number text,
  p_transmitter_registration_type integer,
  p_transmitter_registration_number text,
  p_unsigned_xml text,
  p_unsigned_sha256 text,
  p_signed_xml text,
  p_signed_sha256 text
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_event uuid;
  v_draft uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if p_event_group not in(1,2,3) then raise exception 'Grupo eSocial inválido'; end if;
  if p_environment not in('RESTRICTED','PRODUCTION') then raise exception 'Ambiente eSocial inválido'; end if;
  if p_operation not in('INCLUDE','RECTIFY','DELETE') then raise exception 'Operação eSocial inválida'; end if;
  if p_unsigned_sha256 !~ '^[a-f0-9]{64}$' or p_signed_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash eSocial inválido'; end if;
  if position('<Signature ' in p_signed_xml)=0 then raise exception 'XML assinado não contém Signature'; end if;

  if p_source_id is not null then
    select signed_event_id into v_event
    from public.rh_esocial_event_drafts
    where organization_id=p_organization_id
      and environment=p_environment
      and event_type=p_event_type
      and operation=p_operation
      and source_type=p_source_type
      and source_id=p_source_id
      and employer_registration_number=p_employer_registration_number
      and signed_event_id is not null
    order by created_at desc limit 1;
    if v_event is not null then return v_event; end if;
  end if;

  insert into public.rh_esocial_event_drafts(
    organization_id,event_type,event_key,event_group,environment,operation,layout_version,
    source_type,source_id,employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,unsigned_xml,unsigned_sha256,
    validation_status,created_by
  ) values(
    p_organization_id,p_event_type,p_event_key,p_event_group,p_environment,p_operation,p_layout_version,
    p_source_type,p_source_id,p_employer_registration_type,p_employer_registration_number,
    p_transmitter_registration_type,p_transmitter_registration_number,p_unsigned_xml,p_unsigned_sha256,
    'STRUCTURE_VALID',auth.uid()
  ) returning id into v_draft;

  insert into public.rh_esocial_events(
    organization_id,event_type,event_key,event_group,operation,environment,
    employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,
    layout_version,source_type,source_id,signed_xml,payload_sha256,status,created_by
  ) values(
    p_organization_id,p_event_type,p_event_key,p_event_group,p_operation,p_environment,
    p_employer_registration_type,p_employer_registration_number,
    p_transmitter_registration_type,p_transmitter_registration_number,
    p_layout_version,p_source_type,p_source_id,p_signed_xml,p_signed_sha256,'SIGNED',auth.uid()
  ) returning id into v_event;

  update public.rh_esocial_event_drafts
  set signed_event_id=v_event,validation_status='SIGNED',updated_at=now()
  where id=v_draft;

  return v_event;
end$$;

grant execute on function public.persist_rh_esocial_generated_event(uuid,text,text,integer,text,text,text,text,uuid,integer,text,integer,text,text,text,text,text) to authenticated;
