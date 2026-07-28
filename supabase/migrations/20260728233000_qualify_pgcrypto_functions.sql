-- VACINA-032: funções de extensões não pertencem ao schema public.
-- SECURITY DEFINER com search_path restrito deve qualificar o schema da extensão.

create or replace function public.sandbox_signature_event_core(
  p_envelope_id uuid,
  p_event_type text,
  p_provider_event_id text
)
returns public.signature_envelopes
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v public.signature_envelopes;
  v_status public.signature_status;
begin
  select * into v
  from public.signature_envelopes
  where id = p_envelope_id
  for update;

  if not found then raise exception 'Envelope não encontrado'; end if;
  if not public.is_org_member(v.organization_id) then raise exception 'Acesso negado'; end if;
  if v.provider <> 'SANDBOX' then raise exception 'Esta função aceita somente provider SANDBOX'; end if;

  v_status := case p_event_type
    when 'SENT' then 'SENT'
    when 'VIEWED' then 'VIEWED'
    when 'SIGNED' then 'PARTIALLY_SIGNED'
    when 'COMPLETED' then 'COMPLETED'
    when 'DECLINED' then 'DECLINED'
    else 'ERROR'
  end;

  insert into public.signature_events(
    organization_id, envelope_id, provider_event_id, event_type, payload_hash
  ) values (
    v.organization_id,
    v.id,
    p_provider_event_id,
    p_event_type,
    encode(extensions.digest(p_provider_event_id || p_event_type, 'sha256'), 'hex')
  )
  on conflict(envelope_id, provider_event_id) do nothing;

  update public.signature_envelopes
  set status = v_status,
      sent_at = case when v_status = 'SENT' then coalesce(sent_at, now()) else sent_at end,
      completed_at = case when v_status = 'COMPLETED' then now() else completed_at end
  where id = v.id
  returning * into v;

  perform public.write_audit(
    v.organization_id,
    'SIGNATURE_ENVELOPE',
    v.id,
    p_event_type,
    to_jsonb(v)
  );

  return v;
end;
$function$;

revoke all on function public.sandbox_signature_event_core(uuid, text, text) from public;
revoke all on function public.sandbox_signature_event_core(uuid, text, text) from anon;
revoke all on function public.sandbox_signature_event_core(uuid, text, text) from authenticated;
grant execute on function public.sandbox_signature_event_core(uuid, text, text) to service_role;

create or replace function public.create_report_snapshot(
  p_organization_id uuid,
  p_kind public.report_kind,
  p_project_id uuid default null,
  p_period_start date default ((date_trunc('month', current_date) - interval '11 months'))::date,
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
begin
  if not public.has_module_permission(
    p_organization_id, 'relatorios', 'EDIT', p_project_id, null
  ) then
    raise exception 'Permissão insuficiente para gerar snapshot.';
  end if;

  if p_saved_view_id is not null and not exists(
    select 1
    from public.report_saved_views
    where id = p_saved_view_id
      and organization_id = p_organization_id
      and (
        owner_user_id = auth.uid()
        or shared
        or public.has_module_permission(
          p_organization_id, 'relatorios', 'READ', p_project_id, 'administer'
        )
      )
  ) then
    raise exception 'Relatório salvo inválido.';
  end if;

  insert into public.report_snapshots(
    organization_id, project_id, saved_view_id, kind,
    period_start, period_end, filters, status, generated_by
  ) values (
    p_organization_id, p_project_id, p_saved_view_id, p_kind,
    p_period_start, p_period_end, coalesce(p_filters, '{}'::jsonb),
    'PENDING', auth.uid()
  ) returning * into v_snapshot;

  begin
    v_metrics := public.get_report_dashboard(
      p_organization_id, p_project_id, p_period_start, p_period_end
    );
    v_hash := encode(extensions.digest(v_metrics::text, 'sha256'), 'hex');

    update public.report_snapshots
    set metrics = v_metrics,
        source_sha256 = v_hash,
        status = 'COMPLETED',
        generated_at = now()
    where id = v_snapshot.id
    returning * into v_snapshot;

    insert into public.report_events(
      organization_id, project_id, saved_view_id, snapshot_id,
      actor_user_id, event_type, metadata
    ) values (
      p_organization_id, p_project_id, p_saved_view_id, v_snapshot.id,
      auth.uid(), 'SNAPSHOT_COMPLETED',
      jsonb_build_object('kind', p_kind, 'sha256', v_hash)
    );
  exception when others then
    update public.report_snapshots
    set status = 'FAILED',
        error_message = sqlerrm,
        generated_at = now()
    where id = v_snapshot.id
    returning * into v_snapshot;

    insert into public.report_events(
      organization_id, project_id, saved_view_id, snapshot_id,
      actor_user_id, event_type, metadata
    ) values (
      p_organization_id, p_project_id, p_saved_view_id, v_snapshot.id,
      auth.uid(), 'SNAPSHOT_FAILED', jsonb_build_object('error', sqlerrm)
    );
  end;

  return v_snapshot;
end;
$function$;

revoke all on function public.create_report_snapshot(
  uuid, public.report_kind, uuid, date, date, uuid, jsonb
) from public;
revoke all on function public.create_report_snapshot(
  uuid, public.report_kind, uuid, date, date, uuid, jsonb
) from anon;
grant execute on function public.create_report_snapshot(
  uuid, public.report_kind, uuid, date, date, uuid, jsonb
) to authenticated;
grant execute on function public.create_report_snapshot(
  uuid, public.report_kind, uuid, date, date, uuid, jsonb
) to service_role;
