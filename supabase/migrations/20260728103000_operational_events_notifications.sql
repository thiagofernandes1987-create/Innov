-- Sprint S-30 — fatos operacionais, responsabilidades e notificações por exceção.
--
-- VACINA-004: RPC pública recebe revoke explícito e volta só para authenticated.
-- VACINA-005: fato crítico nasce por RPC; escrita direta nas tabelas é revogada.
-- VACINA-014: testes e validadores descobrem esta migration por nome, sem lista fixa.
begin;

create table public.operational_event_types (
  event_code text primary key,
  actor_persona text not null
    check (actor_persona ~ '^P([1-9]|1[0-6])$'),
  default_recipient_personas text[] not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    cardinality(default_recipient_personas) > 0
    and array_to_string(default_recipient_personas, ',')
      ~ '^P([1-9]|1[0-6])(,P([1-9]|1[0-6]))*$'
  )
);

insert into public.operational_event_types(
  event_code, actor_persona, default_recipient_personas
) values
  ('commercial.proposal_stalled', 'P1', array['P11','P13','P14']),
  ('planning.critical_path_at_risk', 'P2', array['P8','P9','P10','P13']),
  ('field.blocked', 'P3', array['P8','P9','P10','P7','P2']),
  ('finance.cash_gap', 'P4', array['P8','P9','P13','P14']),
  ('service.sla_breached', 'P5', array['P8','P9','P10','P12','P13','P15']),
  ('security.access_conflict', 'P6', array['P16','P13']),
  ('design.revision_invalid', 'P7', array['P2','P3','P8','P12','P14']),
  ('project.multi_constraint_crisis', 'P8', array['P2','P4','P9','P10','P13']),
  ('procurement.critical_supply_risk', 'P9', array['P2','P8','P10','P12','P4']),
  ('inventory.stock_unavailable', 'P10', array['P3','P8','P9','P4','P12']),
  ('budget.margin_at_risk', 'P11', array['P1','P4','P8','P13','P14']),
  ('quality.systemic_nonconformity', 'P12', array['P7','P8','P9','P10','P13','P16']),
  ('portfolio.executive_decision_required', 'P13', array['P4','P8','P2','P1']),
  ('contract.unapproved_change', 'P14', array['P1','P4','P8','P13','P16']),
  ('client.decision_or_context_risk', 'P15', array['P1','P5','P8','P14']),
  ('audit.control_failure', 'P16', array['P6','P13','P4']);

create unique index if not exists projects_id_organization_operational_uidx
  on public.projects(id, organization_id);

create table public.operational_responsibilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  persona_id text not null check (persona_id ~ '^P([1-9]|1[0-6])$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  quiet_from time,
  quiet_until time,
  timezone text not null default 'America/Sao_Paulo',
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  foreign key (organization_id, user_id)
    references public.organization_memberships(organization_id, user_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id)
);

create unique index operational_responsibilities_scope_uidx
  on public.operational_responsibilities(
    organization_id,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    persona_id,
    user_id
  );

create index operational_responsibilities_lookup_idx
  on public.operational_responsibilities(
    organization_id, persona_id, project_id, user_id
  ) where active;

create table public.operational_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  event_code text not null references public.operational_event_types(event_code),
  module_key text not null references public.app_modules(key) on update cascade,
  object_type text not null
    check (object_type in (
      'client','project','task','ticket','purchase','inventory',
      'financial','document','quality','security'
    )),
  object_id uuid not null,
  title text not null check (length(btrim(title)) between 3 and 180),
  impact text not null check (length(btrim(impact)) between 3 and 1000),
  obligation_persona text not null
    check (obligation_persona ~ '^P([1-9]|1[0-6])$'),
  actor_persona text not null
    check (actor_persona ~ '^P([1-9]|1[0-6])$'),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null,
  response_due_at timestamptz not null,
  client_approved boolean not null default false,
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object'),
  correlation_id uuid not null default gen_random_uuid(),
  deduplication_key text not null check (length(btrim(deduplication_key)) >= 8),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, deduplication_key),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id),
  check (response_due_at >= occurred_at)
);

create index operational_events_object_idx
  on public.operational_events(
    organization_id, object_type, object_id, occurred_at desc
  );
create index operational_events_due_idx
  on public.operational_events(organization_id, response_due_at)
  where response_due_at is not null;

create table public.operational_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_persona text not null
    check (recipient_persona ~ '^P([1-9]|1[0-6])$'),
  escalated boolean not null default false,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (event_id, organization_id)
    references public.operational_events(id, organization_id) on delete cascade,
  foreign key (organization_id, recipient_user_id)
    references public.organization_memberships(organization_id, user_id),
  unique (event_id, recipient_user_id)
);

create index operational_notifications_inbox_idx
  on public.operational_notifications(
    recipient_user_id, read_at, created_at desc
  );

alter table public.operational_event_types enable row level security;
alter table public.operational_event_types force row level security;
alter table public.operational_responsibilities enable row level security;
alter table public.operational_responsibilities force row level security;
alter table public.operational_events enable row level security;
alter table public.operational_events force row level security;
alter table public.operational_notifications enable row level security;
alter table public.operational_notifications force row level security;

create policy operational_event_types_read
on public.operational_event_types for select to authenticated
using (true);

create policy operational_responsibilities_read
on public.operational_responsibilities for select to authenticated
using (
  user_id = auth.uid()
  or public.is_internal_member(organization_id)
);

create policy operational_responsibilities_insert
on public.operational_responsibilities for insert to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  )
);

create policy operational_responsibilities_update
on public.operational_responsibilities for update to authenticated
using (
  public.has_org_role(
    organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  )
)
with check (
  public.has_org_role(
    organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  )
);

create policy operational_responsibilities_delete
on public.operational_responsibilities for delete to authenticated
using (
  public.has_org_role(
    organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  )
);

create policy operational_events_read
on public.operational_events for select to authenticated
using (
  public.is_internal_member(organization_id)
  or exists (
    select 1
    from public.operational_notifications notification
    where notification.event_id = operational_events.id
      and notification.organization_id = operational_events.organization_id
      and notification.recipient_user_id = auth.uid()
  )
);

create policy operational_notifications_read
on public.operational_notifications for select to authenticated
using (recipient_user_id = auth.uid());

create policy operational_notifications_mark_read
on public.operational_notifications for update to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

create or replace function public.operational_protect_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    raise exception 'Fato operacional é imutável.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger operational_events_append_only
before update or delete on public.operational_events
for each row execute function public.operational_protect_event();

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
  v_recipients text[];
  v_created boolean := false;
begin
  if not public.is_internal_member(p_organization_id) then
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

revoke all on public.operational_event_types from anon, authenticated;
revoke all on public.operational_responsibilities from anon, authenticated;
revoke all on public.operational_events from anon, authenticated;
revoke all on public.operational_notifications from anon, authenticated;

grant select on public.operational_event_types to authenticated;
grant select, insert, update, delete
  on public.operational_responsibilities to authenticated;
grant select on public.operational_events to authenticated;
grant select, update(read_at)
  on public.operational_notifications to authenticated;

revoke all on function public.operational_protect_event()
  from public, anon, authenticated;
revoke all on function public.create_operational_event(
  uuid,uuid,text,text,text,uuid,text,text,text,timestamptz,timestamptz,boolean,jsonb,text
) from public, anon, authenticated;
grant execute on function public.create_operational_event(
  uuid,uuid,text,text,text,uuid,text,text,text,timestamptz,timestamptz,boolean,jsonb,text
) to authenticated;

commit;
