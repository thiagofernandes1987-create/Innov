-- S-30 — a persona Cliente precisa conseguir originar o evento do portal,
-- sem ganhar permissão para representar uma cadeira interna.
-- VACINA-022: profissão, identidade e autorização precisam concordar.
begin;

create or replace function public.operational_validate_responsibility_persona()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
begin
  select membership.role::text into v_role
  from public.organization_memberships membership
  where membership.organization_id = new.organization_id
    and membership.user_id = new.user_id
    and membership.active;

  if v_role is null then
    raise exception 'Usuário não é membro ativo da organização.';
  end if;
  if (new.persona_id = 'P15') <> (v_role = 'CLIENTE') then
    raise exception 'A persona Cliente só pode ser atribuída a um cliente ativo, e vice-versa.';
  end if;
  return new;
end;
$$;

create trigger operational_responsibility_persona_guard
before insert or update of organization_id, user_id, persona_id, active
on public.operational_responsibilities
for each row execute function public.operational_validate_responsibility_persona();

drop policy if exists operational_events_read on public.operational_events;
create policy operational_events_read
on public.operational_events for select to authenticated
using (
  public.is_internal_member(organization_id)
  or actor_user_id = (select auth.uid())
  or exists (
    select 1
    from public.operational_notifications notification
    where notification.event_id = operational_events.id
      and notification.organization_id = operational_events.organization_id
      and notification.recipient_user_id = (select auth.uid())
  )
);

create or replace function public.create_operational_event(
  p_organization_id uuid,
  p_project_id uuid,
  p_event_code text,
  p_module_key text,
  p_object_type text,
  p_object_id uuid,
  p_title text,
  p_impact text,
  p_obligation_persona text,
  p_occurred_at timestamptz,
  p_response_due_at timestamptz,
  p_client_approved boolean,
  p_evidence jsonb,
  p_deduplication_key text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_actor_persona text;
  v_member_role text;
  v_recipients text[];
  v_created boolean := false;
begin
  select membership.role::text into v_member_role
  from public.organization_memberships membership
  where membership.organization_id = p_organization_id
    and membership.user_id = auth.uid()
    and membership.active;

  if v_member_role is null then
    raise exception 'Acesso negado para registrar evento operacional.';
  end if;

  if p_project_id is not null and not exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and project.organization_id = p_organization_id
  ) then
    raise exception 'Projeto não pertence à organização.';
  end if;

  select actor_persona, default_recipient_personas
    into v_actor_persona, v_recipients
  from public.operational_event_types
  where event_code = p_event_code and active;

  if v_actor_persona is null then
    raise exception 'Tipo de evento operacional inexistente ou inativo.';
  end if;

  if (v_actor_persona = 'P15') <> (v_member_role = 'CLIENTE') then
    raise exception 'O papel do usuário não pode originar este tipo de evento.';
  end if;

  if not exists (
    select 1
    from public.operational_responsibilities responsibility
    where responsibility.organization_id = p_organization_id
      and responsibility.user_id = auth.uid()
      and responsibility.persona_id = v_actor_persona
      and responsibility.active
      and (
        responsibility.project_id is null
        or responsibility.project_id = p_project_id
      )
  ) then
    raise exception 'Usuário não responde pela persona que origina este evento.';
  end if;

  insert into public.operational_events(
    organization_id, project_id, event_code, module_key, object_type, object_id,
    title, impact, obligation_persona, actor_persona, actor_user_id,
    occurred_at, response_due_at, client_approved, evidence,
    deduplication_key
  ) values (
    p_organization_id, p_project_id, p_event_code, p_module_key, p_object_type,
    p_object_id, p_title, p_impact, p_obligation_persona, v_actor_persona,
    auth.uid(), p_occurred_at, p_response_due_at, p_client_approved,
    coalesce(p_evidence, '{}'::jsonb), p_deduplication_key
  )
  on conflict (organization_id, deduplication_key) do nothing
  returning id into v_event_id;

  if v_event_id is not null then
    v_created := true;
  else
    select id into v_event_id
    from public.operational_events
    where organization_id = p_organization_id
      and deduplication_key = p_deduplication_key;
  end if;

  if v_created then
    insert into public.operational_notifications(
      organization_id, event_id, recipient_user_id, recipient_persona, escalated
    )
    select
      p_organization_id,
      v_event_id,
      recipient.user_id,
      recipient.persona_id,
      p_response_due_at < now() and recipient.persona_id = 'P13'
    from (
      select distinct on (responsibility.user_id)
        responsibility.user_id,
        responsibility.persona_id
      from public.operational_responsibilities responsibility
      where responsibility.organization_id = p_organization_id
        and responsibility.active
        and responsibility.persona_id = any(v_recipients)
        and (
          responsibility.project_id is null
          or responsibility.project_id = p_project_id
        )
        and (
          responsibility.persona_id <> 'P15'
          or p_client_approved
        )
      order by
        responsibility.user_id,
        (responsibility.project_id is not null) desc,
        array_position(v_recipients, responsibility.persona_id),
        responsibility.assigned_at desc
    ) recipient
    on conflict (event_id, recipient_user_id) do nothing;
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.operational_validate_responsibility_persona()
  from public, anon, authenticated;
revoke all on function public.create_operational_event(
  uuid,uuid,text,text,text,uuid,text,text,text,timestamptz,timestamptz,boolean,jsonb,text
) from public, anon, authenticated;
grant execute on function public.create_operational_event(
  uuid,uuid,text,text,text,uuid,text,text,text,timestamptz,timestamptz,boolean,jsonb,text
) to authenticated;

commit;
