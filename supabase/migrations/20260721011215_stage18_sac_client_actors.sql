-- Etapa 18 — autoria explícita de clientes no portal de atendimento.

alter table public.sac_tickets
  add column if not exists opened_by_client_id uuid references public.clients(id);

alter table public.sac_ticket_attachments
  add column if not exists uploaded_client_id uuid references public.clients(id);

alter table public.sac_tickets drop constraint if exists sac_tickets_creator_check;
alter table public.sac_tickets add constraint sac_tickets_creator_check
  check (created_by is not null or opened_by_client_id is not null);

alter table public.sac_ticket_attachments drop constraint if exists sac_ticket_attachments_uploader_check;
alter table public.sac_ticket_attachments add constraint sac_ticket_attachments_uploader_check
  check (uploaded_by is not null or uploaded_client_id is not null);

create index if not exists sac_tickets_opened_by_client_idx
  on public.sac_tickets(opened_by_client_id,created_at desc)
  where opened_by_client_id is not null;

create index if not exists sac_ticket_attachments_uploaded_client_idx
  on public.sac_ticket_attachments(uploaded_client_id,created_at desc)
  where uploaded_client_id is not null;
