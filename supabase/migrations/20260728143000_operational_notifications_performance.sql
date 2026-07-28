-- S-30 — correção indicada pelo Database Advisor após a primeira aplicação.
-- VACINA-021: FK operacional nasce com índice de cobertura e auth.uid em RLS
-- usa initplan estável por instrução.
begin;

drop policy if exists operational_responsibilities_read
  on public.operational_responsibilities;
create policy operational_responsibilities_read
on public.operational_responsibilities for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_internal_member(organization_id)
);

drop policy if exists operational_events_read on public.operational_events;
create policy operational_events_read
on public.operational_events for select to authenticated
using (
  public.is_internal_member(organization_id)
  or exists (
    select 1
    from public.operational_notifications notification
    where notification.event_id = operational_events.id
      and notification.organization_id = operational_events.organization_id
      and notification.recipient_user_id = (select auth.uid())
  )
);

drop policy if exists operational_notifications_read
  on public.operational_notifications;
create policy operational_notifications_read
on public.operational_notifications for select to authenticated
using (recipient_user_id = (select auth.uid()));

drop policy if exists operational_notifications_mark_read
  on public.operational_notifications;
create policy operational_notifications_mark_read
on public.operational_notifications for update to authenticated
using (recipient_user_id = (select auth.uid()))
with check (recipient_user_id = (select auth.uid()));

create index if not exists operational_responsibilities_assigned_by_idx
  on public.operational_responsibilities(assigned_by);
create index if not exists operational_responsibilities_org_user_idx
  on public.operational_responsibilities(organization_id, user_id);
create index if not exists operational_responsibilities_project_org_idx
  on public.operational_responsibilities(project_id, organization_id);
create index if not exists operational_responsibilities_user_idx
  on public.operational_responsibilities(user_id);

create index if not exists operational_events_actor_idx
  on public.operational_events(actor_user_id);
create index if not exists operational_events_event_code_idx
  on public.operational_events(event_code);
create index if not exists operational_events_module_idx
  on public.operational_events(module_key);
create index if not exists operational_events_project_org_idx
  on public.operational_events(project_id, organization_id);

create index if not exists operational_notifications_event_org_idx
  on public.operational_notifications(event_id, organization_id);
create index if not exists operational_notifications_org_recipient_idx
  on public.operational_notifications(organization_id, recipient_user_id);

commit;
