-- Etapa 16 — índices complementares e integridade dos vínculos analíticos.

create index if not exists report_metric_definitions_created_by_idx on public.report_metric_definitions(created_by) where created_by is not null;
create index if not exists report_targets_created_by_idx on public.report_targets(created_by) where created_by is not null;
create index if not exists report_targets_org_metric_idx on public.report_targets(organization_id,metric_key);
create index if not exists report_saved_views_project_idx on public.report_saved_views(project_id) where project_id is not null;
create index if not exists report_snapshots_saved_view_idx on public.report_snapshots(saved_view_id) where saved_view_id is not null;
create index if not exists report_snapshots_generated_by_idx on public.report_snapshots(generated_by) where generated_by is not null;
create index if not exists report_exports_project_idx on public.report_exports(project_id) where project_id is not null;
create index if not exists report_exports_saved_view_idx on public.report_exports(saved_view_id) where saved_view_id is not null;
create index if not exists report_exports_snapshot_idx on public.report_exports(snapshot_id) where snapshot_id is not null;
create index if not exists report_exports_generated_by_idx on public.report_exports(generated_by) where generated_by is not null;
create index if not exists report_events_saved_view_idx on public.report_events(saved_view_id) where saved_view_id is not null;
create index if not exists report_events_snapshot_idx on public.report_events(snapshot_id) where snapshot_id is not null;
create index if not exists report_events_actor_idx on public.report_events(actor_user_id) where actor_user_id is not null;

alter table public.report_targets drop constraint if exists report_targets_metric_definition_fk;
alter table public.report_targets add constraint report_targets_metric_definition_fk
foreign key(organization_id,metric_key) references public.report_metric_definitions(organization_id,metric_key) on delete cascade;

create or replace function public.validate_report_links()
returns trigger language plpgsql set search_path=public as $$
declare
  v_project uuid;
  v_saved_org uuid;
  v_saved_project uuid;
  v_snapshot_org uuid;
  v_snapshot_project uuid;
begin
  if new.project_id is not null then
    select organization_id into v_project from public.projects where id=new.project_id;
    if v_project is null or v_project<>new.organization_id then
      raise exception 'A obra não pertence à organização do relatório.';
    end if;
  end if;

  if tg_table_name in ('report_snapshots','report_exports','report_events') and new.saved_view_id is not null then
    select organization_id,project_id into v_saved_org,v_saved_project from public.report_saved_views where id=new.saved_view_id;
    if v_saved_org is null or v_saved_org<>new.organization_id
       or (new.project_id is not null and v_saved_project is not null and v_saved_project<>new.project_id) then
      raise exception 'O relatório salvo é incompatível com organização ou obra.';
    end if;
  end if;

  if tg_table_name in ('report_exports','report_events') and new.snapshot_id is not null then
    select organization_id,project_id into v_snapshot_org,v_snapshot_project from public.report_snapshots where id=new.snapshot_id;
    if v_snapshot_org is null or v_snapshot_org<>new.organization_id
       or (new.project_id is not null and v_snapshot_project is not null and v_snapshot_project<>new.project_id) then
      raise exception 'O snapshot é incompatível com organização ou obra.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists report_targets_validate_links on public.report_targets;
create trigger report_targets_validate_links before insert or update on public.report_targets
for each row execute function public.validate_report_links();
drop trigger if exists report_saved_views_validate_links on public.report_saved_views;
create trigger report_saved_views_validate_links before insert or update on public.report_saved_views
for each row execute function public.validate_report_links();
drop trigger if exists report_snapshots_validate_links on public.report_snapshots;
create trigger report_snapshots_validate_links before insert or update on public.report_snapshots
for each row execute function public.validate_report_links();
drop trigger if exists report_exports_validate_links on public.report_exports;
create trigger report_exports_validate_links before insert or update on public.report_exports
for each row execute function public.validate_report_links();
drop trigger if exists report_events_validate_links on public.report_events;
create trigger report_events_validate_links before insert or update on public.report_events
for each row execute function public.validate_report_links();

revoke all on function public.validate_report_links() from public,anon,authenticated;
