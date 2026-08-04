-- Etapa 19.1 — remove policy legada que ampliava a leitura de audit_events.
begin;

drop policy if exists audit_internal_read on public.audit_events;
drop policy if exists audit_events_internal on public.audit_events;
drop policy if exists audit_events_stage19_select on public.audit_events;

create policy audit_events_stage19_select
on public.audit_events
for select
to authenticated
using (
  organization_id is not null
  and public.has_module_permission(
    organization_id,
    'auditoria',
    'READ',
    project_id,
    null
  )
);

commit;
