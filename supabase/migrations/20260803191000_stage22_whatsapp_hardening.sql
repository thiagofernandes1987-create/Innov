-- Etapa 22 — hardening de índices, retenção e instalação do WhatsApp.

begin;

-- Todas as FKs relevantes precisam de índice para evitar regressões nos advisors
-- e degradação em exclusões/atualizações das entidades relacionadas.
create index if not exists whatsapp_accounts_created_by_idx
  on public.whatsapp_accounts(created_by);
create index if not exists whatsapp_conversations_created_by_idx
  on public.whatsapp_conversations(created_by);
create index if not exists whatsapp_content_bindings_created_by_idx
  on public.whatsapp_content_bindings(created_by);
create index if not exists whatsapp_messages_org_idx
  on public.whatsapp_messages(organization_id,occurred_at desc);
create index if not exists whatsapp_messages_created_by_idx
  on public.whatsapp_messages(created_by);
create index if not exists whatsapp_webhook_events_account_idx
  on public.whatsapp_webhook_events(account_id);

-- Contas, contatos, conversas e bindings são desativados/encerrados.
-- Exclusão direta apagaria a cadeia de proveniência das mensagens.
revoke delete on public.whatsapp_accounts from authenticated;
revoke delete on public.whatsapp_contacts from authenticated;
revoke delete on public.whatsapp_conversations from authenticated;
revoke delete on public.whatsapp_content_bindings from authenticated;

-- O aplicativo fica instalado e habilitado, mas continua inerte enquanto
-- as credenciais do provider e uma conta ativa não estiverem configuradas.
update public.app_modules
set default_enabled=true,
    updated_at=now()
where key='whatsapp';

commit;
