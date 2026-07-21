-- Etapa 19 — hardening pós-homologação: diagnósticos globais e cobertura de FKs.
begin;

create or replace function public.stage19_can_read_global_diagnostics()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null and exists(
    select 1
    from public.organization_memberships membership
    where membership.user_id=auth.uid()
      and membership.active
      and public.has_module_permission(membership.organization_id,'auditoria','READ',null,null)
  );
$$;

drop policy if exists observability_diagnostics_select on public.observability_diagnostics;
create policy observability_diagnostics_select on public.observability_diagnostics
for select to authenticated
using (
  (organization_id is not null and public.has_module_permission(organization_id,'auditoria','READ',null,null))
  or (organization_id is null and public.stage19_can_read_global_diagnostics())
);

create index if not exists audit_events_actor_user_idx
  on public.audit_events(actor_user_id,occurred_at desc)
  where actor_user_id is not null;

create index if not exists observability_alert_rules_created_by_idx
  on public.observability_alert_rules(created_by)
  where created_by is not null;

create index if not exists observability_alerts_acknowledged_by_idx
  on public.observability_alerts(acknowledged_by)
  where acknowledged_by is not null;

create index if not exists observability_alerts_audit_event_idx
  on public.observability_alerts(audit_event_id)
  where audit_event_id is not null;

create index if not exists observability_alerts_resolved_by_idx
  on public.observability_alerts(resolved_by)
  where resolved_by is not null;

create index if not exists observability_alerts_rule_idx
  on public.observability_alerts(rule_id,last_occurred_at desc)
  where rule_id is not null;

create index if not exists observability_retention_policies_created_by_idx
  on public.observability_retention_policies(created_by)
  where created_by is not null;

revoke execute on function public.stage19_can_read_global_diagnostics() from public,anon;
grant execute on function public.stage19_can_read_global_diagnostics() to authenticated,service_role;

commit;
