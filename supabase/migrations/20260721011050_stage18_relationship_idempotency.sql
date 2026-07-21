-- Etapa 18 — chaves idempotentes dos fluxos externos e de conversão.

alter table public.crm_leads add column if not exists idempotency_key text;
alter table public.sac_tickets add column if not exists idempotency_key text;
alter table public.sac_ticket_messages add column if not exists idempotency_key text;

create unique index if not exists crm_leads_org_idempotency_uidx
  on public.crm_leads(organization_id,idempotency_key)
  where idempotency_key is not null;

create unique index if not exists sac_tickets_org_idempotency_uidx
  on public.sac_tickets(organization_id,idempotency_key)
  where idempotency_key is not null;

create unique index if not exists sac_ticket_messages_ticket_idempotency_uidx
  on public.sac_ticket_messages(ticket_id,idempotency_key)
  where idempotency_key is not null;
