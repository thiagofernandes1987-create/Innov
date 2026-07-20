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
  v_row jsonb;
  v_organization_id uuid;
  v_project_id uuid;
  v_saved_view_id uuid;
  v_snapshot_id uuid;
  v_related_org uuid;
  v_related_project uuid;
begin
  v_row:=to_jsonb(new);
  v_organization_id:=nullif(v_row->>'organization_id','')::uuid;
  v_project_id:=nullif(v_row->>'project_id','')::uuid;
  v_saved_view_id:=nullif(v_row->>'saved_view_id','')::uuid;
  v_snapshot_id:=nullif(v_row->>'snapshot_id','')::uuid;

  if v_project_id is not null then
    select organization_id into v_related_org from public.projects where id=v_project_id;
    if v_related_org is null or v_related_org<>v_organization_id then
      raise exception 'A obra não pertence à organização do relatório.';
    end if;
  end if;

  if v_saved_view_id is not null then
    select organization_id,project_id into v_related_org,v_related_project from public.report_saved_views where id=v_saved_view_id;
    if v_related_org is null or v_related_org<>v_organization_id
       or (v_project_id is not null and v_related_project is not null and v_related_project<>v_project_id) then
      raise exception 'O relatório salvo é incompatível com organização ou obra.';
    end if;
  end if;

  if v_snapshot_id is not null then
    select organization_id,project_id into v_related_org,v_related_project from public.report_snapshots where id=v_snapshot_id;
    if v_related_org is null or v_related_org<>v_organization_id
       or (v_project_id is not null and v_related_project is not null and v_related_project<>v_project_id) then
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
