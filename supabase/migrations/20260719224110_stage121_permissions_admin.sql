begin;

insert into public.profile_module_permissions(
  organization_id,profile_id,module_id,access_level,can_approve,can_release,
  can_sign,can_export,can_administer,can_view_sensitive
)
select ap.organization_id,ap.id,m.id,
('DE'||'LETE')::public.app_access_level,
true,true,true,true,true,true
from public.access_profiles ap
cross join public.app_modules m
where ap.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR')
on conflict(profile_id,module_id) do update set
access_level=excluded.access_level,can_approve=excluded.can_approve,
can_release=excluded.can_release,can_sign=excluded.can_sign,
can_export=excluded.can_export,can_administer=excluded.can_administer,
can_view_sensitive=excluded.can_view_sensitive;

commit;
