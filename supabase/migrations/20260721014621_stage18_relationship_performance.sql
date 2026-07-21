-- Etapa 18 — índices complementares de relações, RLS e auditoria.

create index if not exists client_consents_client_idx
  on public.client_consents(client_id,occurred_at desc);
create index if not exists client_consents_created_by_idx
  on public.client_consents(created_by) where created_by is not null;
create index if not exists client_contacts_created_by_idx
  on public.client_contacts(created_by) where created_by is not null;

create index if not exists crm_activities_created_by_idx
  on public.crm_activities(created_by) where created_by is not null;
create index if not exists crm_activities_owner_idx
  on public.crm_activities(owner_id,due_at) where owner_id is not null;

create index if not exists crm_leads_converted_client_idx
  on public.crm_leads(converted_client_id) where converted_client_id is not null;
create index if not exists crm_leads_converted_opportunity_idx
  on public.crm_leads(converted_opportunity_id) where converted_opportunity_id is not null;
create index if not exists crm_leads_created_by_idx
  on public.crm_leads(created_by) where created_by is not null;
create index if not exists crm_leads_owner_idx
  on public.crm_leads(owner_id,next_follow_up_at) where owner_id is not null;

create index if not exists crm_stage_history_changed_by_idx
  on public.crm_opportunity_stage_history(changed_by) where changed_by is not null;
create index if not exists crm_stage_history_organization_idx
  on public.crm_opportunity_stage_history(organization_id,changed_at desc);

create index if not exists sac_ticket_attachments_message_idx
  on public.sac_ticket_attachments(message_id) where message_id is not null;
create index if not exists sac_ticket_attachments_uploaded_by_idx
  on public.sac_ticket_attachments(uploaded_by) where uploaded_by is not null;

create index if not exists sac_ticket_events_actor_client_idx
  on public.sac_ticket_events(actor_client_id,created_at desc) where actor_client_id is not null;
create index if not exists sac_ticket_events_actor_user_idx
  on public.sac_ticket_events(actor_user_id,created_at desc) where actor_user_id is not null;
create index if not exists sac_ticket_events_organization_idx
  on public.sac_ticket_events(organization_id,created_at desc);

create index if not exists sac_ticket_messages_author_client_idx
  on public.sac_ticket_messages(author_client_id,created_at desc) where author_client_id is not null;
create index if not exists sac_ticket_messages_author_user_idx
  on public.sac_ticket_messages(author_user_id,created_at desc) where author_user_id is not null;
create index if not exists sac_ticket_messages_organization_idx
  on public.sac_ticket_messages(organization_id,created_at desc);

create index if not exists sac_tickets_category_idx
  on public.sac_tickets(category_id,status) where category_id is not null;
create index if not exists sac_tickets_contract_idx
  on public.sac_tickets(contract_id,status) where contract_id is not null;
create index if not exists sac_tickets_created_by_idx
  on public.sac_tickets(created_by,created_at desc) where created_by is not null;
