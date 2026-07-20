begin;

alter table public.user_module_permission_overrides
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null;

alter table public.project_module_permission_overrides
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null;

create index if not exists user_module_overrides_active_idx
  on public.user_module_permission_overrides(organization_id,user_id,module_id)
  where revoked_at is null;
create index if not exists project_module_overrides_active_idx
  on public.project_module_permission_overrides(project_id,user_id,module_id)
  where revoked_at is null;

commit;
