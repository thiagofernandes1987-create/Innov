-- Etapa 19 — RLS, append-only e privilégios mínimos.
begin;

alter table public.audit_events enable row level security;
alter table public.observability_alert_rules enable row level security;
alter table public.observability_alerts enable row level security;
alter table public.observability_health_checks enable row level security;
alter table public.observability_diagnostics enable row level security;
alter table public.observability_retention_policies enable row level security;

drop policy if exists audit_events_internal on public.audit_events;
drop policy if exists audit_events_stage19_select on public.audit_events;
create policy audit_events_stage19_select on public.audit_events for select to authenticated
using (organization_id is not null and public.has_module_permission(organization_id,'auditoria','READ',project_id,null));

create policy observability_alert_rules_select on public.observability_alert_rules for select to authenticated
using (public.has_module_permission(organization_id,'auditoria','READ',null,null));
create policy observability_alert_rules_insert on public.observability_alert_rules for insert to authenticated
with check (public.has_module_permission(organization_id,'auditoria','READ',null,'administer'));
create policy observability_alert_rules_update on public.observability_alert_rules for update to authenticated
using (public.has_module_permission(organization_id,'auditoria','READ',null,'administer'))
with check (public.has_module_permission(organization_id,'auditoria','READ',null,'administer'));
create policy observability_alert_rules_delete on public.observability_alert_rules for delete to authenticated
using (public.has_module_permission(organization_id,'auditoria','DELETE',null,'administer'));

create policy observability_alerts_select on public.observability_alerts for select to authenticated
using (public.has_module_permission(organization_id,'auditoria','READ',project_id,null));

create policy observability_health_checks_select on public.observability_health_checks for select to authenticated
using (public.has_module_permission(organization_id,'auditoria','READ',null,null));
create policy observability_diagnostics_select on public.observability_diagnostics for select to authenticated
using (organization_id is null or public.has_module_permission(organization_id,'auditoria','READ',null,null));

create policy observability_retention_policies_select on public.observability_retention_policies for select to authenticated
using (public.has_module_permission(organization_id,'auditoria','READ',null,null));
create policy observability_retention_policies_insert on public.observability_retention_policies for insert to authenticated
with check (public.has_module_permission(organization_id,'auditoria','READ',null,'administer'));
create policy observability_retention_policies_update on public.observability_retention_policies for update to authenticated
using (public.has_module_permission(organization_id,'auditoria','READ',null,'administer'))
with check (public.has_module_permission(organization_id,'auditoria','READ',null,'administer'));
create policy observability_retention_policies_delete on public.observability_retention_policies for delete to authenticated
using (public.has_module_permission(organization_id,'auditoria','DELETE',null,'administer'));

create or replace function public.stage19_protect_append_only()
returns trigger language plpgsql set search_path=public as $$
begin
  if current_user in ('authenticated','anon') then
    raise exception 'Registro de observabilidade imutável.';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists audit_events_append_only on public.audit_events;
create trigger audit_events_append_only before update or delete on public.audit_events
for each row execute function public.stage19_protect_append_only();
drop trigger if exists observability_health_checks_append_only on public.observability_health_checks;
create trigger observability_health_checks_append_only before update or delete on public.observability_health_checks
for each row execute function public.stage19_protect_append_only();
drop trigger if exists observability_diagnostics_delete_guard on public.observability_diagnostics;
create trigger observability_diagnostics_delete_guard before delete on public.observability_diagnostics
for each row execute function public.stage19_protect_append_only();

revoke all on public.audit_events, public.observability_alerts, public.observability_health_checks,
  public.observability_diagnostics from anon,authenticated;
revoke all on public.observability_alert_rules, public.observability_retention_policies from anon;
grant select on public.audit_events, public.observability_alerts, public.observability_health_checks,
  public.observability_diagnostics to authenticated;
grant select,insert,update,delete on public.observability_alert_rules, public.observability_retention_policies to authenticated;

revoke execute on function public.stage19_protect_append_only() from public,anon,authenticated;

commit;
