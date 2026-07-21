-- Etapa 18 — RLS, portal do cliente e Storage privado.

create or replace function public.is_client_owner(p_client_id uuid)
returns boolean
language sql stable security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1 from public.clients client
    where client.id=p_client_id and client.user_id=auth.uid() and client.archived_at is null
  );
$$;

create or replace function public.can_access_sac_ticket(p_ticket_id uuid,p_internal_required boolean default false)
returns boolean
language sql stable security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1 from public.sac_tickets ticket
    where ticket.id=p_ticket_id
      and (
        public.has_module_permission(ticket.organization_id,'sac','READ',ticket.project_id,null)
        or (not p_internal_required and public.is_client_owner(ticket.client_id))
      )
  );
$$;

revoke all on function public.is_client_owner(uuid) from public,anon;
revoke all on function public.can_access_sac_ticket(uuid,boolean) from public,anon;
grant execute on function public.is_client_owner(uuid) to authenticated,service_role;
grant execute on function public.can_access_sac_ticket(uuid,boolean) to authenticated,service_role;

alter table public.crm_leads enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_consents enable row level security;
alter table public.sac_categories enable row level security;
alter table public.sac_tickets enable row level security;
alter table public.sac_ticket_messages enable row level security;
alter table public.sac_ticket_attachments enable row level security;
alter table public.sac_ticket_events enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_opportunity_stage_history enable row level security;

-- Substitui políticas mínimas anteriores pelos módulos consolidados.
drop policy if exists clients_internal_or_owner on public.clients;
drop policy if exists opportunities_internal on public.opportunities;

drop policy if exists clients_stage18_select on public.clients;
create policy clients_stage18_select on public.clients for select to authenticated using (
  public.is_client_owner(id)
  or public.has_module_permission(organization_id,'clientes','READ',null,null)
  or public.has_module_permission(organization_id,'crm','READ',null,null)
  or public.has_module_permission(organization_id,'sac','READ',null,null)
);
drop policy if exists clients_stage18_insert on public.clients;
create policy clients_stage18_insert on public.clients for insert to authenticated with check (
  public.has_module_permission(organization_id,'clientes','EDIT',null,null)
  or public.has_module_permission(organization_id,'crm','EDIT',null,null)
);
drop policy if exists clients_stage18_update on public.clients;
create policy clients_stage18_update on public.clients for update to authenticated using (
  public.has_module_permission(organization_id,'clientes','EDIT',null,null)
  or public.has_module_permission(organization_id,'crm','EDIT',null,null)
) with check (
  public.has_module_permission(organization_id,'clientes','EDIT',null,null)
  or public.has_module_permission(organization_id,'crm','EDIT',null,null)
);
drop policy if exists clients_stage18_delete on public.clients;
create policy clients_stage18_delete on public.clients for delete to authenticated using (
  public.has_module_permission(organization_id,'clientes','DELETE',null,null)
);

drop policy if exists opportunities_stage18_select on public.opportunities;
create policy opportunities_stage18_select on public.opportunities for select to authenticated using (
  public.has_module_permission(organization_id,'crm','READ',null,null)
);
drop policy if exists opportunities_stage18_write on public.opportunities;
create policy opportunities_stage18_write on public.opportunities for all to authenticated using (
  public.has_module_permission(organization_id,'crm','EDIT',null,null)
) with check (
  public.has_module_permission(organization_id,'crm','EDIT',null,null)
);

drop policy if exists crm_leads_internal on public.crm_leads;
create policy crm_leads_internal on public.crm_leads for all to authenticated using (
  public.has_module_permission(organization_id,'crm','READ',null,null)
) with check (
  public.has_module_permission(organization_id,'crm','EDIT',null,null)
);

drop policy if exists client_contacts_select on public.client_contacts;
create policy client_contacts_select on public.client_contacts for select to authenticated using (
  public.is_client_owner(client_id)
  or public.has_module_permission(organization_id,'clientes','READ',null,null)
  or public.has_module_permission(organization_id,'crm','READ',null,null)
  or public.has_module_permission(organization_id,'sac','READ',null,null)
);
drop policy if exists client_contacts_write on public.client_contacts;
create policy client_contacts_write on public.client_contacts for all to authenticated using (
  public.has_module_permission(organization_id,'clientes','EDIT',null,null)
  or public.has_module_permission(organization_id,'crm','EDIT',null,null)
) with check (
  public.has_module_permission(organization_id,'clientes','EDIT',null,null)
  or public.has_module_permission(organization_id,'crm','EDIT',null,null)
);

drop policy if exists client_consents_select on public.client_consents;
create policy client_consents_select on public.client_consents for select to authenticated using (
  public.is_client_owner(client_id)
  or public.has_module_permission(organization_id,'clientes','READ',null,null)
  or public.has_module_permission(organization_id,'crm','READ',null,null)
);
drop policy if exists client_consents_insert on public.client_consents;
create policy client_consents_insert on public.client_consents for insert to authenticated with check (
  public.is_client_owner(client_id)
  or public.has_module_permission(organization_id,'clientes','EDIT',null,null)
  or public.has_module_permission(organization_id,'crm','EDIT',null,null)
);

drop policy if exists sac_categories_select on public.sac_categories;
create policy sac_categories_select on public.sac_categories for select to authenticated using (
  public.has_module_permission(organization_id,'sac','READ',null,null)
  or exists(
    select 1 from public.clients client
    where client.organization_id=sac_categories.organization_id and client.user_id=auth.uid()
  )
);
drop policy if exists sac_categories_write on public.sac_categories;
create policy sac_categories_write on public.sac_categories for all to authenticated using (
  public.has_module_permission(organization_id,'sac','EDIT',null,'administer')
) with check (
  public.has_module_permission(organization_id,'sac','EDIT',null,'administer')
);

drop policy if exists sac_tickets_select on public.sac_tickets;
create policy sac_tickets_select on public.sac_tickets for select to authenticated using (
  public.has_module_permission(organization_id,'sac','READ',project_id,null)
  or public.is_client_owner(client_id)
);
drop policy if exists sac_tickets_internal_write on public.sac_tickets;
create policy sac_tickets_internal_write on public.sac_tickets for all to authenticated using (
  public.has_module_permission(organization_id,'sac','EDIT',project_id,null)
) with check (
  public.has_module_permission(organization_id,'sac','EDIT',project_id,null)
);

drop policy if exists sac_ticket_messages_select on public.sac_ticket_messages;
create policy sac_ticket_messages_select on public.sac_ticket_messages for select to authenticated using (
  public.can_access_sac_ticket(ticket_id,visibility='INTERNAL')
);

drop policy if exists sac_ticket_attachments_select on public.sac_ticket_attachments;
create policy sac_ticket_attachments_select on public.sac_ticket_attachments for select to authenticated using (
  public.can_access_sac_ticket(ticket_id,not client_visible)
);

drop policy if exists sac_ticket_events_internal on public.sac_ticket_events;
create policy sac_ticket_events_internal on public.sac_ticket_events for select to authenticated using (
  public.can_access_sac_ticket(ticket_id,true)
);

drop policy if exists crm_activities_internal on public.crm_activities;
create policy crm_activities_internal on public.crm_activities for all to authenticated using (
  public.has_module_permission(organization_id,'crm','READ',null,null)
  or public.has_module_permission(organization_id,'clientes','READ',null,null)
  or public.has_module_permission(organization_id,'sac','READ',null,null)
) with check (
  public.has_module_permission(organization_id,'crm','EDIT',null,null)
  or public.has_module_permission(organization_id,'clientes','EDIT',null,null)
  or public.has_module_permission(organization_id,'sac','EDIT',null,null)
);

drop policy if exists crm_stage_history_select on public.crm_opportunity_stage_history;
create policy crm_stage_history_select on public.crm_opportunity_stage_history for select to authenticated using (
  public.has_module_permission(organization_id,'crm','READ',null,null)
);

-- Histórico e mensagens são criados apenas pelas RPCs transacionais.
revoke insert,update,delete on public.crm_opportunity_stage_history from authenticated;
revoke insert,update,delete on public.sac_ticket_events from authenticated;
revoke insert,update,delete on public.sac_ticket_messages from authenticated;
revoke insert,update,delete on public.sac_ticket_attachments from authenticated;

-- Storage: acesso direto somente para equipe interna. Portal usa rota server-side autorizada.
drop policy if exists crm_sac_storage_select_internal on storage.objects;
create policy crm_sac_storage_select_internal on storage.objects for select to authenticated using (
  bucket_id='crm-sac-attachments'
  and public.has_module_permission((storage.foldername(name))[1]::uuid,'sac','READ',null,null)
);
drop policy if exists crm_sac_storage_insert_internal on storage.objects;
create policy crm_sac_storage_insert_internal on storage.objects for insert to authenticated with check (
  bucket_id='crm-sac-attachments'
  and public.has_module_permission((storage.foldername(name))[1]::uuid,'sac','EDIT',null,null)
);
drop policy if exists crm_sac_storage_update_internal on storage.objects;
create policy crm_sac_storage_update_internal on storage.objects for update to authenticated using (
  bucket_id='crm-sac-attachments'
  and public.has_module_permission((storage.foldername(name))[1]::uuid,'sac','EDIT',null,null)
) with check (
  bucket_id='crm-sac-attachments'
  and public.has_module_permission((storage.foldername(name))[1]::uuid,'sac','EDIT',null,null)
);
drop policy if exists crm_sac_storage_delete_internal on storage.objects;
create policy crm_sac_storage_delete_internal on storage.objects for delete to authenticated using (
  bucket_id='crm-sac-attachments'
  and public.has_module_permission((storage.foldername(name))[1]::uuid,'sac','DELETE',null,null)
);
