-- W-13 — compatibilidade aditiva para instalações antigas/fixtures.

begin;

alter table public.whatsapp_conversations
  add column if not exists unread_count integer not null default 0;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='whatsapp_conversations_unread_count_check') then
    alter table public.whatsapp_conversations add constraint whatsapp_conversations_unread_count_check
      check(unread_count>=0);
  end if;
end;
$$;

create or replace view public.channel_inbox_unified_contacts
with (security_invoker=true)
as
select
  conversation.organization_id,
  coalesce(conversation.client_id::text,conversation.contact_id::text) as unified_contact_key,
  max(conversation.last_message_at) as last_message_at,
  sum(coalesce(conversation.unread_count,0))::bigint as unread_count,
  count(*)::bigint as thread_count,
  jsonb_agg(jsonb_build_object(
    'conversationId',conversation.id,
    'contactId',conversation.contact_id,
    'clientId',conversation.client_id,
    'accountId',conversation.account_id,
    'providerType',account.provider_type,
    'providerAccountId',account.provider_account_id,
    'channelState',conversation.channel_state,
    'queueId',conversation.queue_id,
    'assignedTo',conversation.assigned_to,
    'lastActorKind',conversation.last_actor_kind,
    'status',conversation.status,
    'unreadCount',conversation.unread_count,
    'lastMessageAt',conversation.last_message_at
  ) order by conversation.last_message_at desc nulls last) as threads
from public.whatsapp_conversations conversation
join public.whatsapp_accounts account on account.id=conversation.account_id
where conversation.status<>'ARCHIVED'
group by conversation.organization_id,
  coalesce(conversation.client_id::text,conversation.contact_id::text);

grant select on public.channel_inbox_unified_contacts to authenticated,service_role;

commit;
