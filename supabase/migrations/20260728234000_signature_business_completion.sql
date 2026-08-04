-- VACINA-033: simulador, webhook e qualquer provider precisam concluir o
-- mesmo estado de negócio por uma única RPC transacional.

create or replace function public.complete_signature_business_state(
  p_envelope_id uuid
)
returns public.signature_envelopes
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_envelope public.signature_envelopes;
  v_contract_id uuid;
  v_amendment_id uuid;
begin
  select * into v_envelope
  from public.signature_envelopes
  where id = p_envelope_id
  for update;

  if not found then raise exception 'Envelope não encontrado'; end if;

  if auth.role() <> 'service_role'
     and not public.has_org_role(
       v_envelope.organization_id,
       array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
     ) then
    raise exception 'Acesso negado';
  end if;

  if v_envelope.status <> 'COMPLETED' then
    raise exception 'Envelope ainda não foi concluído';
  end if;

  update public.signature_signers
  set status = 'COMPLETED',
      viewed_at = coalesce(viewed_at, now()),
      signed_at = coalesce(signed_at, now())
  where envelope_id = v_envelope.id
    and status <> 'COMPLETED';

  if v_envelope.contract_version_id is not null then
    update public.contract_versions
    set status = 'SIGNED',
        frozen_at = coalesce(frozen_at, now())
    where id = v_envelope.contract_version_id
    returning contract_id into v_contract_id;

    if v_contract_id is null then
      raise exception 'Versão contratual do envelope não encontrada';
    end if;

    update public.contracts
    set status = 'SIGNED'
    where id = v_contract_id;
  end if;

  if v_envelope.amendment_version_id is not null then
    update public.amendment_versions
    set status = 'SIGNED',
        frozen_at = coalesce(frozen_at, now())
    where id = v_envelope.amendment_version_id
    returning amendment_id into v_amendment_id;

    if v_amendment_id is null then
      raise exception 'Versão de aditivo do envelope não encontrada';
    end if;

    update public.amendments
    set status = 'SIGNED'
    where id = v_amendment_id;

    perform public.apply_signed_amendment(v_amendment_id);
  end if;

  perform public.write_audit(
    v_envelope.organization_id,
    'SIGNATURE_ENVELOPE',
    v_envelope.id,
    'COMPLETE_BUSINESS_STATE',
    jsonb_build_object(
      'contract_version_id', v_envelope.contract_version_id,
      'amendment_version_id', v_envelope.amendment_version_id
    )
  );

  select * into v_envelope
  from public.signature_envelopes
  where id = p_envelope_id;

  return v_envelope;
end;
$function$;

revoke all on function public.complete_signature_business_state(uuid) from public;
revoke all on function public.complete_signature_business_state(uuid) from anon;
revoke all on function public.complete_signature_business_state(uuid) from authenticated;
grant execute on function public.complete_signature_business_state(uuid) to service_role;

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

  if v_status = 'COMPLETED' then
    perform public.complete_signature_business_state(v.id);
    select * into v from public.signature_envelopes where id = v.id;
  end if;

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
