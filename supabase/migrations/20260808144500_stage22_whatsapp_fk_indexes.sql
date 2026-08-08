-- Etapa 22 — cobertura de FKs do WhatsApp.
--
-- O advisor pós-DDL e a conferência direta de pg_constraint/pg_index mostraram
-- cinco chaves estrangeiras sem índice cujo primeiro campo fosse a própria FK.
-- As demais FKs do módulo já possuem cobertura.

create index if not exists whatsapp_accounts_created_by_idx
  on public.whatsapp_accounts(created_by)
  where created_by is not null;

create index if not exists whatsapp_content_bindings_created_by_idx
  on public.whatsapp_content_bindings(created_by)
  where created_by is not null;

create index if not exists whatsapp_conversations_created_by_idx
  on public.whatsapp_conversations(created_by)
  where created_by is not null;

create index if not exists whatsapp_messages_created_by_idx
  on public.whatsapp_messages(created_by)
  where created_by is not null;

create index if not exists whatsapp_webhook_events_account_idx
  on public.whatsapp_webhook_events(account_id)
  where account_id is not null;
