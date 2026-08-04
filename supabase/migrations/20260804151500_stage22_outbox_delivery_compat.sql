-- Sprint W-10 — compatibilidade aditiva do enqueue e trigger da W-04.

begin;

create or replace function public.create_channel_outbox_for_command()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  insert into public.channel_outbox_events(
    organization_id,command_id,conversation_id,message_id,sequence_number,
    max_attempts,topic,payload
  ) values (
    new.organization_id,new.id,new.conversation_id,new.message_id,new.sequence_number,
    new.max_attempts,'channel.command.requested.v1',
    jsonb_build_object(
      'schemaVersion','1.0.0',
      'commandId',new.id,
      'organizationId',new.organization_id,
      'providerType',new.provider_type,
      'providerAccountId',new.provider_account_id,
      'commandType',new.command_type,
      'conversationId',new.conversation_id,
      'messageId',new.message_id,
      'sequenceNumber',new.sequence_number,
      'idempotencyKey',new.idempotency_key
    )
  ) on conflict(command_id,topic) do nothing;
  return new;
end;
$$;

create or replace function public.enqueue_channel_command(
  p_conversation_id uuid,
  p_message_id uuid,
  p_command_type text,
  p_payload jsonb,
  p_idempotency_key text
)
returns public.channel_commands
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_conversation public.whatsapp_conversations;
  v_account public.whatsapp_accounts;
  v_command public.channel_commands;
  v_sequence bigint;
begin
  select * into v_conversation
  from public.whatsapp_conversations
  where id=p_conversation_id
  for share;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.has_module_permission(
    v_conversation.organization_id,'whatsapp','EDIT',v_conversation.project_id,null
  ) then raise exception 'Acesso negado.'; end if;
  select * into v_account
  from public.whatsapp_accounts
  where id=v_conversation.account_id and active and provider_status='ENABLED';
  if not found then raise exception 'Conta de canal indisponível.'; end if;
  if p_command_type not in (
    'SEND_MESSAGE','DOWNLOAD_MEDIA','RESOLVE_IDENTITY','REFRESH_ACCOUNT','CUSTOM'
  ) then raise exception 'Tipo de comando inválido.'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception 'Idempotency key obrigatória.'; end if;

  select * into v_command
  from public.channel_commands
  where organization_id=v_conversation.organization_id
    and provider_type=v_account.provider_type
    and provider_account_id=v_account.provider_account_id
    and idempotency_key=btrim(p_idempotency_key);
  if found then return v_command; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text,0));
  select coalesce(max(sequence_number),0)+1 into v_sequence
  from public.channel_commands where conversation_id=p_conversation_id;

  insert into public.channel_commands(
    organization_id,account_id,conversation_id,message_id,
    provider_type,provider_account_id,command_type,idempotency_key,
    payload,created_by,sequence_number
  ) values (
    v_conversation.organization_id,v_account.id,v_conversation.id,p_message_id,
    v_account.provider_type,v_account.provider_account_id,p_command_type,
    btrim(p_idempotency_key),coalesce(p_payload,'{}'::jsonb),auth.uid(),v_sequence
  )
  on conflict(organization_id,provider_type,provider_account_id,idempotency_key)
  do update set idempotency_key=excluded.idempotency_key
  returning * into v_command;
  return v_command;
end;
$$;

commit;
