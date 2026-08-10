-- Security hardening: technical provider/database messages must not be persisted
-- in operational fields that can later reach UI, exports or support surfaces.
-- Public function signatures are intentionally unchanged.

create or replace function public.create_report_snapshot(
  p_organization_id uuid,
  p_kind public.report_kind,
  p_project_id uuid default null,
  p_period_start date default ((date_trunc('month'::text, current_date::timestamp with time zone) - interval '11 mons'))::date,
  p_period_end date default current_date,
  p_saved_view_id uuid default null,
  p_filters jsonb default '{}'::jsonb
)
returns public.report_snapshots
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_snapshot public.report_snapshots;
  v_metrics jsonb;
  v_hash text;
  v_error_code text;
begin
  if not public.has_module_permission(p_organization_id,'relatorios','EDIT',p_project_id,null) then
    raise exception 'Permissão insuficiente para gerar snapshot.';
  end if;
  if p_saved_view_id is not null and not exists(
    select 1 from public.report_saved_views
    where id=p_saved_view_id
      and organization_id=p_organization_id
      and (owner_user_id=auth.uid() or shared or public.has_module_permission(p_organization_id,'relatorios','READ',p_project_id,'administer'))
  ) then
    raise exception 'Relatório salvo inválido.';
  end if;

  insert into public.report_snapshots(
    organization_id,project_id,saved_view_id,kind,period_start,period_end,filters,status,generated_by
  ) values (
    p_organization_id,p_project_id,p_saved_view_id,p_kind,p_period_start,p_period_end,coalesce(p_filters,'{}'::jsonb),'PENDING',auth.uid()
  ) returning * into v_snapshot;

  begin
    v_metrics:=public.get_report_dashboard(p_organization_id,p_project_id,p_period_start,p_period_end);
    v_hash:=encode(extensions.digest(v_metrics::text,'sha256'),'hex');
    update public.report_snapshots
      set metrics=v_metrics,source_sha256=v_hash,status='COMPLETED',error_message=null,generated_at=now()
      where id=v_snapshot.id returning * into v_snapshot;
    insert into public.report_events(
      organization_id,project_id,saved_view_id,snapshot_id,actor_user_id,event_type,metadata
    ) values (
      p_organization_id,p_project_id,p_saved_view_id,v_snapshot.id,auth.uid(),'SNAPSHOT_COMPLETED',
      jsonb_build_object('kind',p_kind,'sha256',v_hash)
    );
  exception when others then
    v_error_code:=sqlstate;
    update public.report_snapshots
      set status='FAILED',error_message='REPORT_SNAPSHOT_FAILED',generated_at=now()
      where id=v_snapshot.id returning * into v_snapshot;
    insert into public.report_events(
      organization_id,project_id,saved_view_id,snapshot_id,actor_user_id,event_type,metadata
    ) values (
      p_organization_id,p_project_id,p_saved_view_id,v_snapshot.id,auth.uid(),'SNAPSHOT_FAILED',
      jsonb_build_object('error_code',v_error_code)
    );
  end;
  return v_snapshot;
end;
$function$;

create or replace function public.fail_signature_conversion_job(
  p_job_id uuid,
  p_error text,
  p_retry_after interval default interval '00:15:00'
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_job public.signature_conversion_jobs;
  v_error_code text:=upper(trim(coalesce(p_error,'')));
begin
  if v_error_code !~ '^[A-Z0-9_.:-]{1,120}$' then
    v_error_code:='CONVERSION_FAILED';
  end if;
  select * into v_job from public.signature_conversion_jobs where id=p_job_id for update;
  if not found then raise exception 'Job não encontrado'; end if;
  update public.signature_document_versions
    set conversion_status='FAILED',conversion_error=v_error_code
    where id=v_job.document_version_id;
  update public.signature_conversion_jobs
    set status='FAILED',last_error=v_error_code,next_attempt_at=now()+p_retry_after,
        locked_at=null,locked_by=null,updated_at=now()
    where id=p_job_id;
  return true;
end;
$function$;

create or replace function public.complete_signature_copy_delivery(
  p_delivery_id uuid,
  p_status public.signature_delivery_status,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_delivery public.signature_delivery_events;
  v_error_code text:=upper(trim(coalesce(p_error,'')));
begin
  if p_status not in('SENT','DELIVERED','FAILED','CANCELED') then raise exception 'Estado final inválido'; end if;
  if p_status='FAILED' then
    if v_error_code !~ '^[A-Z0-9_.:-]{1,120}$' then v_error_code:='DELIVERY_FAILED'; end if;
  else
    v_error_code:=null;
  end if;
  select * into v_delivery from public.signature_delivery_events where id=p_delivery_id for update;
  if not found then raise exception 'Entrega não encontrada'; end if;
  update public.signature_delivery_events
    set status=p_status,last_error=v_error_code,
        sent_at=case when p_status in('SENT','DELIVERED') then coalesce(sent_at,now()) else sent_at end,
        delivered_at=case when p_status='DELIVERED' then now() else delivered_at end,
        updated_at=now()
    where id=p_delivery_id;
  if p_status in('SENT','DELIVERED') then
    update public.signature_envelopes set client_copy_sent_at=coalesce(client_copy_sent_at,now()) where id=v_delivery.envelope_id;
    update public.signature_signers set copy_sent_at=coalesce(copy_sent_at,now()) where envelope_id=v_delivery.envelope_id and lower(email)=lower(v_delivery.recipient_email);
  end if;
  return true;
end;
$function$;

create or replace function public.finish_sinapi_import(
  p_batch_id uuid,
  p_error_message text default null
)
returns public.sinapi_import_batches
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_batch public.sinapi_import_batches;
  v_failed boolean:=nullif(trim(coalesce(p_error_message,'')),'') is not null;
  v_error_code text:=upper(trim(coalesce(p_error_message,'')));
begin
  if coalesce(auth.role(),current_user) not in ('postgres','service_role') then raise exception 'Importação SINAPI exige service_role.'; end if;
  if v_failed and v_error_code !~ '^[A-Z0-9_.:-]{1,120}$' then v_error_code:='SINAPI_IMPORT_FAILED'; end if;
  if not v_failed then v_error_code:=null; end if;
  select * into v_batch from public.sinapi_import_batches where id=p_batch_id for update;
  if not found then raise exception 'Lote SINAPI não encontrado.'; end if;
  update public.sinapi_import_batches
    set status=case when v_failed then 'FAILED' else 'COMPLETED' end,
        error_message=v_error_code,
        finished_at=now()
    where id=p_batch_id returning * into v_batch;
  if v_batch.status='COMPLETED' then
    update public.sinapi_import_batches
      set status='SUPERSEDED'
      where organization_id=v_batch.organization_id
        and region=v_batch.region
        and tax_relief=v_batch.tax_relief
        and status='COMPLETED'
        and id<>v_batch.id
        and base_date=v_batch.base_date;
  end if;
  return v_batch;
end;
$function$;

create or replace function public.complete_whatsapp_outbound_message(
  p_message_id uuid,
  p_provider_message_id text,
  p_status text,
  p_error_code text default null,
  p_error_message text default null
)
returns public.whatsapp_messages
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_message public.whatsapp_messages;
  v_error_code text:=upper(trim(coalesce(p_error_code,'')));
  v_error_message text:=null;
begin
  if p_status not in ('SENT','FAILED') then raise exception 'Estado de conclusão inválido.'; end if;
  if p_status='FAILED' then
    if v_error_code !~ '^[A-Z0-9_.:-]{1,120}$' then v_error_code:='WHATSAPP_SEND_FAILED'; end if;
    if coalesce(p_error_message,'') ~ '^Falha de envio\. Referência: [0-9a-fA-F-]{36}$' then
      v_error_message:=p_error_message;
    end if;
  else
    v_error_code:=null;
  end if;
  update public.whatsapp_messages
  set provider_message_id=coalesce(nullif(p_provider_message_id,''),provider_message_id),
      status=p_status,
      sent_at=case when p_status='SENT' then coalesce(sent_at,now()) else sent_at end,
      failed_at=case when p_status='FAILED' then coalesce(failed_at,now()) else failed_at end,
      error_code=v_error_code,
      error_message=v_error_message
  where id=p_message_id returning * into v_message;
  if not found then raise exception 'Mensagem não encontrada.'; end if;
  return v_message;
end;
$function$;

-- Defensive cleanup in case a failure is recorded between audit and deployment.
update public.report_snapshots
set error_message='REPORT_SNAPSHOT_FAILED'
where error_message is not null and btrim(error_message)<>'';

update public.report_events
set metadata=(metadata - 'error') || jsonb_build_object('error_code',coalesce(nullif(metadata->>'error_code',''),'LEGACY_SNAPSHOT_FAILED'))
where event_type='SNAPSHOT_FAILED' and metadata ? 'error';

update public.signature_conversion_jobs
set last_error=case when upper(btrim(last_error)) ~ '^[A-Z0-9_.:-]{1,120}$' then upper(btrim(last_error)) else 'CONVERSION_FAILED' end
where last_error is not null and btrim(last_error)<>'';

update public.signature_document_versions
set conversion_error=case when upper(btrim(conversion_error)) ~ '^[A-Z0-9_.:-]{1,120}$' then upper(btrim(conversion_error)) else 'CONVERSION_FAILED' end
where conversion_error is not null and btrim(conversion_error)<>'';

update public.signature_delivery_events
set last_error=case when upper(btrim(last_error)) ~ '^[A-Z0-9_.:-]{1,120}$' then upper(btrim(last_error)) else 'DELIVERY_FAILED' end
where last_error is not null and btrim(last_error)<>'';

update public.sinapi_import_batches
set error_message=case when upper(btrim(error_message)) ~ '^[A-Z0-9_.:-]{1,120}$' then upper(btrim(error_message)) else 'SINAPI_IMPORT_FAILED' end
where error_message is not null and btrim(error_message)<>'';

update public.whatsapp_messages
set error_code=case
      when upper(btrim(coalesce(error_code,''))) ~ '^[A-Z0-9_.:-]{1,120}$' then upper(btrim(error_code))
      else 'WHATSAPP_SEND_FAILED'
    end,
    error_message=case
      when coalesce(error_message,'') ~ '^Falha de envio\. Referência: [0-9a-fA-F-]{36}$' then error_message
      else null
    end
where status='FAILED' and (error_code is not null or error_message is not null);
