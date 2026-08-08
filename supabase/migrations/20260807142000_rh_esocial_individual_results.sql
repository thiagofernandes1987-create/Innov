-- Resultado individual do processamento do lote eSocial.
-- Cada retorno é correlacionado pela chave Id do evento; recibos e ocorrências
-- pertencem ao evento, não apenas ao lote.

create or replace function public.apply_rh_esocial_event_result(
  p_batch_id uuid,
  p_event_key text,
  p_status text,
  p_receipt_number text,
  p_response_code text,
  p_response_description text,
  p_occurrences jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_org uuid;
  v_event uuid;
begin
  select organization_id into v_org
  from public.rh_esocial_batches
  where id=p_batch_id
  for update;

  if v_org is null then raise exception 'Lote não encontrado'; end if;
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if p_status not in('PROCESSING','ACCEPTED','REJECTED','UNKNOWN') then raise exception 'Status individual inválido'; end if;
  if trim(coalesce(p_event_key,''))='' then raise exception 'Chave do evento obrigatória'; end if;
  if p_status='ACCEPTED' and trim(coalesce(p_receipt_number,''))='' then
    raise exception 'Evento aceito precisa possuir número de recibo';
  end if;
  if jsonb_typeof(coalesce(p_occurrences,'[]'::jsonb))<>'array' then
    raise exception 'Ocorrências devem ser uma lista JSON';
  end if;

  select e.id into v_event
  from public.rh_esocial_batch_events be
  join public.rh_esocial_events e on e.id=be.event_id
  where be.batch_id=p_batch_id
    and e.organization_id=v_org
    and e.event_key=p_event_key
  for update of e;

  if v_event is null then raise exception 'Evento % não pertence ao lote',p_event_key; end if;

  update public.rh_esocial_events
  set status=p_status,
      receipt_number=nullif(trim(coalesce(p_receipt_number,'')),''),
      response_code=nullif(trim(coalesce(p_response_code,'')),''),
      response_description=nullif(trim(coalesce(p_response_description,'')),''),
      occurrences=coalesce(p_occurrences,'[]'::jsonb),
      updated_at=now()
  where id=v_event;

  return v_event;
end$$;

grant execute on function public.apply_rh_esocial_event_result(uuid,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.finalize_rh_esocial_batch_from_events(p_batch_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_org uuid;
  v_total integer;
  v_processing integer;
  v_unknown integer;
  v_accepted integer;
  v_rejected integer;
  v_status text;
begin
  select organization_id into v_org from public.rh_esocial_batches where id=p_batch_id for update;
  if v_org is null then raise exception 'Lote não encontrado'; end if;
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;

  select count(*),
         count(*) filter(where e.status='PROCESSING'),
         count(*) filter(where e.status='UNKNOWN'),
         count(*) filter(where e.status='ACCEPTED'),
         count(*) filter(where e.status='REJECTED')
  into v_total,v_processing,v_unknown,v_accepted,v_rejected
  from public.rh_esocial_batch_events be
  join public.rh_esocial_events e on e.id=be.event_id
  where be.batch_id=p_batch_id;

  if v_total=0 then raise exception 'Lote sem eventos'; end if;

  if v_processing>0 then
    v_status:='PROCESSING';
  elsif v_unknown>0 then
    v_status:='UNKNOWN';
  elsif v_accepted+v_rejected=v_total then
    v_status:='COMPLETED';
  else
    v_status:='PROCESSING';
  end if;

  update public.rh_esocial_batches
  set status=v_status,
      completed_at=case when v_status='COMPLETED' then now() else null end,
      updated_at=now()
  where id=p_batch_id;

  return v_status;
end$$;

grant execute on function public.finalize_rh_esocial_batch_from_events(uuid) to authenticated;
