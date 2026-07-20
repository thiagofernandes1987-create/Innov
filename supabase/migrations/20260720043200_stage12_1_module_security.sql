-- Etapa 12.1 — RLS e privilégios do núcleo modular incremental.

alter table public.membership_access_profiles enable row level security;

drop policy if exists membership_profiles_read on public.membership_access_profiles;
create policy membership_profiles_read
on public.membership_access_profiles
for select
to authenticated
using(
  exists(
    select 1
    from public.organization_memberships membership
    where membership.id=membership_id
      and(
        membership.user_id=auth.uid()
        or public.has_org_role(
          membership.organization_id,
          array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
        )
      )
  )
);

revoke insert,update,delete
on public.membership_access_profiles
from anon,authenticated;

revoke all on function public.ensure_organization_module_defaults(uuid) from public,anon;
revoke all on function public.create_modular_access_profile(uuid,text,text,text,public.org_role) from public,anon;
revoke all on function public.set_organization_module_status(uuid,text,text,text) from public,anon;
revoke all on function public.assign_user_access_profile(uuid,uuid,uuid,text,uuid,text) from public,anon;
revoke all on function public.revoke_user_access_profile(uuid,text) from public,anon;
revoke all on function public.set_user_module_capability_override(uuid,uuid,text,text,text,timestamptz,text) from public,anon;

grant execute on function public.ensure_organization_module_defaults(uuid) to authenticated,service_role;
grant execute on function public.create_modular_access_profile(uuid,text,text,text,public.org_role) to authenticated,service_role;
grant execute on function public.set_organization_module_status(uuid,text,text,text) to authenticated,service_role;
grant execute on function public.assign_user_access_profile(uuid,uuid,uuid,text,uuid,text) to authenticated,service_role;
grant execute on function public.revoke_user_access_profile(uuid,text) to authenticated,service_role;
grant execute on function public.set_user_module_capability_override(uuid,uuid,text,text,text,timestamptz,text) to authenticated,service_role;
