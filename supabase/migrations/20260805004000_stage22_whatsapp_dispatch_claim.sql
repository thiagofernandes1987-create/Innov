-- Etapa 22 pós-fechamento — claim atômico para envio oficial.
-- A idempotência de persistência não basta: somente um dispatcher pode chamar o provider.

begin;

alter table public.whatsapp_messages
  add column if not exists dispatch_token uuid,
  add column if not exists dispatch_started_at timestamptz;

create index if not exists whatsapp_messages_dispatch_claim_idx
  on public.whatsapp_messages(status,dispatch_started_at)
  where direction='OUTBOUND' and status='QUEUED';

create or replace function public.claim_whatsapp_outbound_dispatch(
  p_message_id uuid,
  p_dispatch_token uuid,
  p_stale_after_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_conversation public.whatsapp_conversations;
begin
  if p_dispatch_token is null then raise exception 'DISPATCH_TOKEN_REQUIRED'; end if;
  if p_stale_after_seconds < 30 or p_stale_after_seconds > 900 then
    raise exception 'DISPATCH_STALE_WINDOW_INVALID';
  end if;

  select conversation.* into v_conversation
  from public.whatsapp_messages message
  join public.whatsapp_conversations conversation on conversation.id=message.conversation_id
  where message.id=p_message_id
    and message.direction='OUTBOUND';

  if not found then raise exception 'OUTBOUND_MESSAGE_NOT_FOUND'; end if;
  if not public.has_module_permission(
    v_conversation.organization_id,'whatsapp','EDIT',v_conversation.project_id,null
  ) then raise exception 'DISPATCH_FORBIDDEN'; end if;

  update public.whatsapp_messages
  set dispatch_token=p_dispatch_token,
      dispatch_started_at=clock_timestamp()
  where id=p_message_id
    and direction='OUTBOUND'
    and status='QUEUED'
    and (
      dispatch_token is null
      or dispatch_started_at is null
      or dispatch_started_at < clock_timestamp()-make_interval(secs=>p_stale_after_seconds)
    );

  return found;
end;
$$;

create or replace function public.complete_whatsapp_outbound_dispatch(
  p_message_id uuid,
  p_dispatch_token uuid,
  p_provider_message_id text,
  p_status text,
  p_error_code text default null,
  p_error_message text default null
)
returns public.whatsapp_messages
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_message public.whatsapp_messages;
begin
  if p_status not in ('SENT','FAILED') then raise exception 'DISPATCH_STATUS_INVALID'; end if;
  if p_dispatch_token is null then raise exception 'DISPATCH_TOKEN_REQUIRED'; end if;

  update public.whatsapp_messages
  set provider_message_id=coalesce(nullif(p_provider_message_id,''),provider_message_id),
      status=p_status,
      sent_at=case when p_status='SENT' then coalesce(sent_at,clock_timestamp()) else sent_at end,
      failed_at=case when p_status='FAILED' then coalesce(failed_at,clock_timestamp()) else failed_at end,
      error_code=case when p_status='FAILED' then nullif(p_error_code,'') else null end,
      error_message=case when p_status='FAILED' then nullif(p_error_message,'') else null end,
      dispatch_token=null,
      dispatch_started_at=null
  where id=p_message_id
    and direction='OUTBOUND'
    and status='QUEUED'
    and dispatch_token=p_dispatch_token
  returning * into v_message;

  if not found then raise exception 'DISPATCH_FENCING_REJECTED'; end if;
  return v_message;
end;
$$;

revoke all on function public.claim_whatsapp_outbound_dispatch(uuid,uuid,integer) from public,anon;
revoke all on function public.complete_whatsapp_outbound_dispatch(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_whatsapp_outbound_dispatch(uuid,uuid,integer) to authenticated,service_role;
grant execute on function public.complete_whatsapp_outbound_dispatch(uuid,uuid,text,text,text,text) to service_role;

commit;
