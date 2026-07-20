-- Etapa 16 — normaliza flags de capacidade antes das constraints NOT NULL.

create or replace function public.normalize_profile_module_permission_booleans()
returns trigger language plpgsql set search_path=public as $$
begin
  new.can_approve:=coalesce(new.can_approve,false);
  new.can_release:=coalesce(new.can_release,false);
  new.can_sign:=coalesce(new.can_sign,false);
  new.can_export:=coalesce(new.can_export,false);
  new.can_administer:=coalesce(new.can_administer,false);
  new.can_view_sensitive:=coalesce(new.can_view_sensitive,false);
  return new;
end $$;

drop trigger if exists profile_module_permissions_boolean_guard on public.profile_module_permissions;
create trigger profile_module_permissions_boolean_guard
before insert or update on public.profile_module_permissions
for each row execute function public.normalize_profile_module_permission_booleans();

revoke all on function public.normalize_profile_module_permission_booleans() from public,anon,authenticated;
