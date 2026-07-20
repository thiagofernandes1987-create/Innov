begin;

alter table public.schedule_baselines enable row level security;
alter table public.schedule_baseline_tasks enable row level security;

create policy baselines_internal
on public.schedule_baselines for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

create policy baseline_tasks_internal
on public.schedule_baseline_tasks for all to authenticated
using (
  exists(
    select 1
    from public.schedule_baselines b
    where b.id=baseline_id
      and public.can_access_project(b.project_id)
  )
)
with check (
  exists(
    select 1
    from public.schedule_baselines b
    where b.id=baseline_id
      and public.can_manage_project(b.project_id)
  )
);

commit;
