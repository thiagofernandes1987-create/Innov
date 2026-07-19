begin;

create type public.app_access_level as enum ('NONE','READ','EDIT','DELETE');

create table public.app_modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key = lower(key)),
  name text not null,
  description text not null,
  href text not null,
  icon_key text not null default 'module',
  display_order integer not null default 0,
  active boolean not null default true,
  sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  base_role public.org_role,
  system boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);
create unique index access_profiles_org_role_uidx
  on public.access_profiles(organization_id,base_role)
  where base_role is not null;
create index access_profiles_org_active_idx
  on public.access_profiles(organization_id,active);

alter table public.organization_memberships
  add column if not exists access_profile_id uuid references public.access_profiles(id) on delete set null;
create index if not exists organization_memberships_access_profile_idx
  on public.organization_memberships(access_profile_id);

create table public.profile_module_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.access_profiles(id) on delete cascade,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  access_level public.app_access_level not null default 'NONE',
  can_approve boolean not null default false,
  can_release boolean not null default false,
  can_sign boolean not null default false,
  can_export boolean not null default false,
  can_administer boolean not null default false,
  can_view_sensitive boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id,module_id)
);
create index profile_module_permissions_org_idx
  on public.profile_module_permissions(organization_id);
create index profile_module_permissions_module_idx
  on public.profile_module_permissions(module_id);

create table public.user_module_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  denied boolean not null default false,
  access_level public.app_access_level,
  can_approve boolean,
  can_release boolean,
  can_sign boolean,
  can_export boolean,
  can_administer boolean,
  can_view_sensitive boolean,
  reason text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,user_id,module_id)
);
create index user_module_overrides_user_idx
  on public.user_module_permission_overrides(user_id,organization_id);
create index user_module_overrides_module_idx
  on public.user_module_permission_overrides(module_id);
create index user_module_overrides_expiry_idx
  on public.user_module_permission_overrides(expires_at)
  where expires_at is not null;

create table public.project_module_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  denied boolean not null default false,
  access_level public.app_access_level,
  can_approve boolean,
  can_release boolean,
  can_sign boolean,
  can_export boolean,
  can_administer boolean,
  can_view_sensitive boolean,
  reason text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,user_id,module_id)
);
create index project_module_overrides_org_idx
  on public.project_module_permission_overrides(organization_id);
create index project_module_overrides_user_idx
  on public.project_module_permission_overrides(user_id,project_id);
create index project_module_overrides_module_idx
  on public.project_module_permission_overrides(module_id);

create table public.permission_change_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.access_profiles(id) on delete set null,
  module_id uuid references public.app_modules(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index permission_change_events_org_date_idx
  on public.permission_change_events(organization_id,created_at desc);
create index permission_change_events_target_idx
  on public.permission_change_events(target_user_id,created_at desc);

create trigger app_modules_touch_updated_at
before update on public.app_modules
for each row execute function public.touch_updated_at();
create trigger access_profiles_touch_updated_at
before update on public.access_profiles
for each row execute function public.touch_updated_at();
create trigger profile_module_permissions_touch_updated_at
before update on public.profile_module_permissions
for each row execute function public.touch_updated_at();
create trigger user_module_overrides_touch_updated_at
before update on public.user_module_permission_overrides
for each row execute function public.touch_updated_at();
create trigger project_module_overrides_touch_updated_at
before update on public.project_module_permission_overrides
for each row execute function public.touch_updated_at();

commit;
