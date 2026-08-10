-- W-13 — compatibilidade prévia para instalações antigas e fixtures.

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

commit;
