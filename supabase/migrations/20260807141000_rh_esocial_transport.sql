-- eSocial: objetos operacionais reais para evento, lote, tentativa, protocolo e retorno.

create table if not exists public.rh_esocial_events(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null,
  event_key text not null,
  event_group integer not null check(event_group in(1,2,3)),
  operation text not null default 'INCLUDE' check(operation in('INCLUDE','RECTIFY','DELETE')),
  environment text not null default 'RESTRICTED' check(environment in('RESTRICTED','PRODUCTION')),
  employer_registration_type integer not null check(employer_registration_type in(1,2)),
  employer_registration_number text not null,
  transmitter_registration_type integer not null check(transmitter_registration_type in(1,2)),
  transmitter_registration_number text not null,
  layout_version text not null,
  source_type text not null,
  source_id uuid,
  signed_xml text not null,
  payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'SIGNED' check(status in(
    'SIGNED','QUEUED','BATCHED','SENT','PROCESSING','ACCEPTED','REJECTED','UNKNOWN','CANCELLED'
  )),
  receipt_number text,
  response_code text,
  response_description text,
  occurrences jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,environment,event_key),
  unique(organization_id,environment,payload_sha256)
);
create index if not exists rh_esocial_events_queue_idx on public.rh_esocial_events(organization_id,environment,status,event_group,created_at);

create table if not exists public.rh_esocial_batches(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  environment text not null check(environment in('RESTRICTED','PRODUCTION')),
  event_group integer not null check(event_group in(1,2,3)),
  employer_registration_type integer not null check(employer_registration_type in(1,2)),
  employer_registration_number text not null,
  transmitter_registration_type integer not null check(transmitter_registration_type in(1,2)),
  transmitter_registration_number text not null,
  communication_namespace_version text not null default 'v1_1_1',
  status text not null default 'CREATED' check(status in(
    'CREATED','READY','SENDING','PROTOCOL_RECEIVED','PROCESSING','COMPLETED','REJECTED','UNKNOWN','CANCELLED'
  )),
  protocol_number text,
  response_code text,
  response_description text,
  estimated_completion_seconds integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists rh_esocial_batches_status_idx on public.rh_esocial_batches(organization_id,environment,status,created_at);
create unique index if not exists rh_esocial_batches_protocol_uq on public.rh_esocial_batches(environment,protocol_number) where protocol_number is not null;

create table if not exists public.rh_esocial_batch_events(
  organization_id uuid not null references public.organizations(id) on delete restrict,
  batch_id uuid not null references public.rh_esocial_batches(id) on delete cascade,
  event_id uuid not null references public.rh_esocial_events(id) on delete restrict,
  position integer not null check(position between 1 and 50),
  primary key(batch_id,event_id),
  unique(batch_id,position)
);

create table if not exists public.rh_esocial_attempts(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  batch_id uuid not null references public.rh_esocial_batches(id) on delete cascade,
  operation text not null check(operation in('SEND_BATCH','QUERY_BATCH')),
  attempt_number integer not null check(attempt_number>0),
  endpoint_url text not null,
  soap_action text not null,
  request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
  http_status integer,
  result text not null default 'STARTED' check(result in(
    'STARTED','SUCCESS','BUSINESS_REJECTION','TECHNICAL_ERROR','TIMEOUT','UNKNOWN'
  )),
  response_xml text,
  response_sha256 text check(response_sha256 is null or response_sha256 ~ '^[a-f0-9]{64}$'),
  error_code text,
  error_message text,
  duration_ms integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique(batch_id,operation,attempt_number)
);
create index if not exists rh_esocial_attempts_batch_idx on public.rh_esocial_attempts(batch_id,operation,attempt_number desc);

alter table public.rh_esocial_events add constraint rh_esocial_events_org_id_uq unique(organization_id,id);
alter table public.rh_esocial_batches add constraint rh_esocial_batches_org_id_uq unique(organization_id,id);
alter table public.rh_esocial_batch_events add constraint rh_esocial_batch_events_batch_tenant_fk foreign key(organization_id,batch_id) references public.rh_esocial_batches(organization_id,id) on delete cascade;
alter table public.rh_esocial_batch_events add constraint rh_esocial_batch_events_event_tenant_fk foreign key(organization_id,event_id) references public.rh_esocial_events(organization_id,id) on delete restrict;
alter table public.rh_esocial_attempts add constraint rh_esocial_attempts_batch_tenant_fk foreign key(organization_id,batch_id) references public.rh_esocial_batches(organization_id,id) on delete cascade;

do $$ declare t text; begin
  foreach t in array array['rh_esocial_events','rh_esocial_batches','rh_esocial_batch_events','rh_esocial_attempts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
    execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
  end loop;
end$$;

create or replace function public.create_rh_esocial_batch(
  p_organization_id uuid,
  p_event_ids uuid[]
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_batch uuid;v_count integer;v_first public.rh_esocial_events%rowtype;v_invalid integer;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
  if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
  v_count:=coalesce(array_length(p_event_ids,1),0);
  if v_count<1 or v_count>50 then raise exception 'Lote deve conter entre 1 e 50 eventos';end if;

  select * into v_first from public.rh_esocial_events
  where organization_id=p_organization_id and id=p_event_ids[1] for update;
  if v_first.id is null then raise exception 'Evento inicial não encontrado';end if;
  if v_first.status not in('SIGNED','QUEUED') then raise exception 'Evento % não está disponível para lote',v_first.event_key;end if;

  select count(*) into v_invalid
  from public.rh_esocial_events e
  where e.id=any(p_event_ids)
    and(
      e.organization_id<>p_organization_id
      or e.environment<>v_first.environment
      or e.event_group<>v_first.event_group
      or e.employer_registration_type<>v_first.employer_registration_type
      or e.employer_registration_number<>v_first.employer_registration_number
      or e.transmitter_registration_type<>v_first.transmitter_registration_type
      or e.transmitter_registration_number<>v_first.transmitter_registration_number
      or e.status not in('SIGNED','QUEUED')
    );
  if v_invalid>0 or (select count(*) from public.rh_esocial_events where organization_id=p_organization_id and id=any(p_event_ids))<>v_count then
    raise exception 'Todos os eventos do lote devem pertencer ao mesmo tenant, ambiente, empregador, transmissor e grupo';
  end if;

  insert into public.rh_esocial_batches(
    organization_id,environment,event_group,employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,status,created_by
  ) values(
    p_organization_id,v_first.environment,v_first.event_group,v_first.employer_registration_type,v_first.employer_registration_number,
    v_first.transmitter_registration_type,v_first.transmitter_registration_number,'READY',auth.uid()
  ) returning id into v_batch;

  insert into public.rh_esocial_batch_events(organization_id,batch_id,event_id,position)
  select p_organization_id,v_batch,e.id,row_number() over(order by e.created_at,e.id)
  from public.rh_esocial_events e where e.id=any(p_event_ids);

  update public.rh_esocial_events set status='BATCHED',updated_at=now() where id=any(p_event_ids);
  return v_batch;
end$$;

grant execute on function public.create_rh_esocial_batch(uuid,uuid[]) to authenticated;

create or replace function public.mark_rh_esocial_batch_protocol(
  p_batch_id uuid,p_protocol_number text,p_response_code text,p_response_description text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.rh_esocial_batches where id=p_batch_id for update;
  if v_org is null then raise exception 'Lote não encontrado';end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
  if trim(coalesce(p_protocol_number,''))='' then raise exception 'Protocolo obrigatório';end if;
  update public.rh_esocial_batches set status='PROTOCOL_RECEIVED',protocol_number=trim(p_protocol_number),response_code=p_response_code,response_description=p_response_description,sent_at=coalesce(sent_at,now()),updated_at=now() where id=p_batch_id;
  update public.rh_esocial_events e set status='SENT',updated_at=now() from public.rh_esocial_batch_events be where be.batch_id=p_batch_id and be.event_id=e.id;
end$$;

grant execute on function public.mark_rh_esocial_batch_protocol(uuid,text,text,text) to authenticated;
