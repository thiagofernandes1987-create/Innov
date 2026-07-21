-- Etapa 18 — helpers, integridade multiempresa e proteção de workflow.

create or replace function public.stage18_generate_code(p_prefix text)
returns text
language sql volatile
set search_path=public
as $$
  select upper(p_prefix)||'-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
$$;

create or replace function public.stage18_normalize_digits(p_value text)
returns text
language sql immutable
set search_path=public
as $$
  select nullif(regexp_replace(coalesce(p_value,''),'\D','','g'),'');
$$;

create or replace function public.stage18_validate_links()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_row jsonb:=to_jsonb(new);
  v_org uuid:=nullif(v_row->>'organization_id','')::uuid;
  v_client uuid:=nullif(v_row->>'client_id','')::uuid;
  v_project uuid:=nullif(v_row->>'project_id','')::uuid;
  v_contract uuid:=nullif(v_row->>'contract_id','')::uuid;
  v_ticket uuid:=nullif(v_row->>'ticket_id','')::uuid;
  v_message uuid:=nullif(v_row->>'message_id','')::uuid;
  v_lead uuid:=nullif(v_row->>'lead_id','')::uuid;
  v_opportunity uuid:=nullif(v_row->>'opportunity_id','')::uuid;
  v_category uuid:=nullif(v_row->>'category_id','')::uuid;
  v_author_client uuid:=nullif(v_row->>'author_client_id','')::uuid;
  v_actor_client uuid:=nullif(v_row->>'actor_client_id','')::uuid;
begin
  if v_org is null then
    raise exception 'Organização é obrigatória.';
  end if;

  if v_client is not null and not exists(
    select 1 from public.clients x where x.id=v_client and x.organization_id=v_org
  ) then
    raise exception 'Cliente incompatível com a organização.';
  end if;

  if v_project is not null and not exists(
    select 1 from public.projects x
    where x.id=v_project and x.organization_id=v_org
      and (v_client is null or x.client_id=v_client)
  ) then
    raise exception 'Obra incompatível com organização ou cliente.';
  end if;

  if v_contract is not null and not exists(
    select 1 from public.contracts x
    where x.id=v_contract and x.organization_id=v_org
      and (v_client is null or x.client_id=v_client)
      and (v_project is null or x.project_id=v_project)
  ) then
    raise exception 'Contrato incompatível com organização, cliente ou obra.';
  end if;

  if v_ticket is not null and not exists(
    select 1 from public.sac_tickets x where x.id=v_ticket and x.organization_id=v_org
  ) then
    raise exception 'Chamado incompatível com a organização.';
  end if;

  if v_message is not null and not exists(
    select 1 from public.sac_ticket_messages x
    where x.id=v_message and x.organization_id=v_org
      and (v_ticket is null or x.ticket_id=v_ticket)
  ) then
    raise exception 'Mensagem incompatível com o chamado.';
  end if;

  if v_lead is not null and not exists(
    select 1 from public.crm_leads x where x.id=v_lead and x.organization_id=v_org
  ) then
    raise exception 'Lead incompatível com a organização.';
  end if;

  if v_opportunity is not null and not exists(
    select 1 from public.opportunities x where x.id=v_opportunity and x.organization_id=v_org
  ) then
    raise exception 'Oportunidade incompatível com a organização.';
  end if;

  if v_category is not null and not exists(
    select 1 from public.sac_categories x
    where x.id=v_category and x.organization_id=v_org and x.active
  ) then
    raise exception 'Categoria de atendimento incompatível ou inativa.';
  end if;

  if tg_table_name='sac_ticket_messages' and v_author_client is not null and not exists(
    select 1 from public.sac_tickets x
    where x.id=v_ticket and x.client_id=v_author_client and x.organization_id=v_org
  ) then
    raise exception 'Autor cliente incompatível com o chamado.';
  end if;

  if tg_table_name='sac_ticket_events' and v_actor_client is not null and not exists(
    select 1 from public.sac_tickets x
    where x.id=v_ticket and x.client_id=v_actor_client and x.organization_id=v_org
  ) then
    raise exception 'Ator cliente incompatível com o chamado.';
  end if;

  return new;
end $$;

create or replace function public.stage18_protect_append_only()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  raise exception 'Registro de histórico imutável.';
end $$;

create or replace function public.stage18_protect_workflow_state()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_old jsonb:=to_jsonb(old);
  v_new jsonb:=to_jsonb(new);
begin
  if coalesce(current_setting('app.stage18_rpc',true),'')='true' then
    return new;
  end if;

  if tg_table_name='opportunities' and (v_new->>'stage') is distinct from (v_old->>'stage') then
    raise exception 'Altere o estágio pela RPC do CRM.';
  end if;

  if tg_table_name='sac_tickets' and (
    (v_new->>'status') is distinct from (v_old->>'status')
    or (v_new->>'assigned_to') is distinct from (v_old->>'assigned_to')
    or (v_new->>'first_responded_at') is distinct from (v_old->>'first_responded_at')
    or (v_new->>'resolved_at') is distinct from (v_old->>'resolved_at')
    or (v_new->>'closed_at') is distinct from (v_old->>'closed_at')
    or (v_new->>'reopened_at') is distinct from (v_old->>'reopened_at')
  ) then
    raise exception 'Altere o fluxo do chamado pelas RPCs do SAC.';
  end if;

  return new;
end $$;

drop trigger if exists client_contacts_stage18_links on public.client_contacts;
create trigger client_contacts_stage18_links
before insert or update on public.client_contacts
for each row execute function public.stage18_validate_links();

drop trigger if exists client_consents_stage18_links on public.client_consents;
create trigger client_consents_stage18_links
before insert or update on public.client_consents
for each row execute function public.stage18_validate_links();

drop trigger if exists opportunities_stage18_links on public.opportunities;
create trigger opportunities_stage18_links
before insert or update on public.opportunities
for each row execute function public.stage18_validate_links();

drop trigger if exists sac_tickets_stage18_links on public.sac_tickets;
create trigger sac_tickets_stage18_links
before insert or update on public.sac_tickets
for each row execute function public.stage18_validate_links();

drop trigger if exists sac_ticket_messages_stage18_links on public.sac_ticket_messages;
create trigger sac_ticket_messages_stage18_links
before insert or update on public.sac_ticket_messages
for each row execute function public.stage18_validate_links();

drop trigger if exists sac_ticket_attachments_stage18_links on public.sac_ticket_attachments;
create trigger sac_ticket_attachments_stage18_links
before insert or update on public.sac_ticket_attachments
for each row execute function public.stage18_validate_links();

drop trigger if exists sac_ticket_events_stage18_links on public.sac_ticket_events;
create trigger sac_ticket_events_stage18_links
before insert or update on public.sac_ticket_events
for each row execute function public.stage18_validate_links();

drop trigger if exists crm_activities_stage18_links on public.crm_activities;
create trigger crm_activities_stage18_links
before insert or update on public.crm_activities
for each row execute function public.stage18_validate_links();

drop trigger if exists crm_stage_history_stage18_links on public.crm_opportunity_stage_history;
create trigger crm_stage_history_stage18_links
before insert or update on public.crm_opportunity_stage_history
for each row execute function public.stage18_validate_links();

drop trigger if exists client_consents_append_only on public.client_consents;
create trigger client_consents_append_only
before update or delete on public.client_consents
for each row execute function public.stage18_protect_append_only();

drop trigger if exists crm_stage_history_append_only on public.crm_opportunity_stage_history;
create trigger crm_stage_history_append_only
before update or delete on public.crm_opportunity_stage_history
for each row execute function public.stage18_protect_append_only();

drop trigger if exists sac_ticket_events_append_only on public.sac_ticket_events;
create trigger sac_ticket_events_append_only
before update or delete on public.sac_ticket_events
for each row execute function public.stage18_protect_append_only();

drop trigger if exists sac_ticket_messages_append_only on public.sac_ticket_messages;
create trigger sac_ticket_messages_append_only
before update or delete on public.sac_ticket_messages
for each row execute function public.stage18_protect_append_only();

drop trigger if exists opportunities_workflow_guard on public.opportunities;
create trigger opportunities_workflow_guard
before update on public.opportunities
for each row execute function public.stage18_protect_workflow_state();

drop trigger if exists sac_tickets_workflow_guard on public.sac_tickets;
create trigger sac_tickets_workflow_guard
before update on public.sac_tickets
for each row execute function public.stage18_protect_workflow_state();

revoke all on function public.stage18_generate_code(text) from public,anon,authenticated;
revoke all on function public.stage18_normalize_digits(text) from public,anon,authenticated;
revoke all on function public.stage18_validate_links() from public,anon,authenticated;
revoke all on function public.stage18_protect_append_only() from public,anon,authenticated;
revoke all on function public.stage18_protect_workflow_state() from public,anon,authenticated;
