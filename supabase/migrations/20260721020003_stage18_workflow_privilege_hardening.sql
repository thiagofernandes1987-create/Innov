-- Etapa 18 — workflow protegido por identidade SQL e privilégios por coluna.

create or replace function public.stage18_protect_workflow_state()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_old jsonb:=to_jsonb(old);
  v_new jsonb:=to_jsonb(new);
begin
  -- Dentro de uma RPC SECURITY DEFINER, current_user é o proprietário da função.
  -- Atualizações diretas pelo navegador executam como authenticated/anon.
  if current_user in ('authenticated','anon') then
    if tg_table_name='crm_leads' and (
      (v_new->>'stage') is distinct from (v_old->>'stage')
      or (v_new->>'converted_client_id') is distinct from (v_old->>'converted_client_id')
      or (v_new->>'converted_opportunity_id') is distinct from (v_old->>'converted_opportunity_id')
    ) then
      raise exception 'Altere o estágio do lead pelas RPCs do CRM.';
    end if;

    if tg_table_name='opportunities' and (
      (v_new->>'stage') is distinct from (v_old->>'stage')
      or (v_new->>'probability') is distinct from (v_old->>'probability')
      or (v_new->>'lost_reason') is distinct from (v_old->>'lost_reason')
      or (v_new->>'closed_at') is distinct from (v_old->>'closed_at')
    ) then
      raise exception 'Altere o estágio pela RPC do CRM.';
    end if;

    if tg_table_name='sac_tickets' and (
      (v_new->>'status') is distinct from (v_old->>'status')
      or (v_new->>'assigned_to') is distinct from (v_old->>'assigned_to')
      or (v_new->>'first_responded_at') is distinct from (v_old->>'first_responded_at')
      or (v_new->>'resolved_at') is distinct from (v_old->>'resolved_at')
      or (v_new->>'closed_at') is distinct from (v_old->>'closed_at')
      or (v_new->>'reopened_at') is distinct from (v_old->>'reopened_at')
      or (v_new->>'satisfaction_score') is distinct from (v_old->>'satisfaction_score')
    ) then
      raise exception 'Altere o fluxo do chamado pelas RPCs do SAC.';
    end if;
  end if;
  return new;
end $$;

-- O lead também passa a usar o guard de workflow.
drop trigger if exists crm_leads_workflow_guard on public.crm_leads;
create trigger crm_leads_workflow_guard
before update on public.crm_leads
for each row execute function public.stage18_protect_workflow_state();

-- Criação e estados críticos somente por RPC. Campos editoriais continuam atualizáveis.
revoke insert,update,delete on public.crm_leads from authenticated;
grant update(
  full_name,company_name,email,phone,tax_id,source,campaign,interest,
  estimated_budget,city,state,owner_id,next_follow_up_at,notes,
  consent_contact,consent_source,disqualified_reason,updated_at,archived_at
) on public.crm_leads to authenticated;

revoke insert,update,delete on public.opportunities from authenticated;
grant update(
  client_id,lead_id,title,description,estimated_value,
  expected_close_date,source,owner_id,updated_at,archived_at
) on public.opportunities to authenticated;

revoke insert,update,delete on public.sac_tickets from authenticated;
grant update(
  category_id,title,description,priority,updated_at
) on public.sac_tickets to authenticated;

create or replace function public.move_crm_lead_stage(
  p_lead_id uuid,
  p_to_stage text,
  p_reason text default null
) returns public.crm_leads
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_lead public.crm_leads;
  v_from text;
  v_allowed boolean:=false;
begin
  select * into v_lead
  from public.crm_leads
  where id=p_lead_id
  for update;

  if not found then raise exception 'Lead não encontrado.'; end if;
  if not public.has_module_permission(v_lead.organization_id,'crm','EDIT',null,null) then
    raise exception 'Permissão insuficiente para mover lead.';
  end if;
  if p_to_stage not in ('NEW','CONTACTED','QUALIFIED','DISQUALIFIED') then
    raise exception 'Estágio de lead inválido.';
  end if;

  v_from:=v_lead.stage;
  if v_from='CONVERTED' then raise exception 'Lead convertido é imutável.'; end if;
  if v_from=p_to_stage then return v_lead; end if;

  v_allowed:=case v_from
    when 'NEW' then p_to_stage in ('CONTACTED','QUALIFIED','DISQUALIFIED')
    when 'CONTACTED' then p_to_stage in ('NEW','QUALIFIED','DISQUALIFIED')
    when 'QUALIFIED' then p_to_stage in ('CONTACTED','DISQUALIFIED')
    when 'DISQUALIFIED' then p_to_stage in ('NEW','CONTACTED')
    else false
  end;
  if not v_allowed then
    raise exception 'Transição de lead de % para % não permitida.',v_from,p_to_stage;
  end if;
  if p_to_stage='DISQUALIFIED' and nullif(trim(p_reason),'') is null then
    raise exception 'Motivo da desqualificação é obrigatório.';
  end if;

  update public.crm_leads
  set stage=p_to_stage,
      disqualified_reason=case when p_to_stage='DISQUALIFIED' then trim(p_reason) else null end,
      updated_at=now()
  where id=v_lead.id
  returning * into v_lead;

  insert into public.crm_activities(
    organization_id,activity_type,subject,description,lead_id,owner_id,created_by
  ) values(
    v_lead.organization_id,'NOTE','Estágio do lead alterado',
    format('%s → %s%s',v_from,p_to_stage,case when nullif(trim(p_reason),'') is null then '' else ': '||trim(p_reason) end),
    v_lead.id,v_lead.owner_id,auth.uid()
  );

  return v_lead;
end $$;

revoke all on function public.move_crm_lead_stage(uuid,text,text) from public,anon;
grant execute on function public.move_crm_lead_stage(uuid,text,text) to authenticated,service_role;
