begin;

create or replace function public.list_my_modules(p_organization_id uuid)
returns table(
  module_id uuid,module_key text,module_name text,module_description text,module_href text,
  icon_key text,display_order integer,sensitive boolean,access_level public.app_access_level,
  can_approve boolean,can_release boolean,can_sign boolean,can_export boolean,
  can_administer boolean,can_view_sensitive boolean,permission_source text
)
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select * from public.effective_module_permissions(p_organization_id,auth.uid(),null)
  where access_level<>'NONE'::public.app_access_level
  order by display_order,module_name;
$$;

create or replace function public.has_module_permission(
  p_organization_id uuid,
  p_module_key text,
  p_required_level public.app_access_level default 'READ',
  p_project_id uuid default null,
  p_action text default null
) returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select coalesce(bool_or(
    access_level>=p_required_level
    and case lower(coalesce(p_action,''))
      when '' then true
      when 'approve' then can_approve
      when 'release' then can_release
      when 'sign' then can_sign
      when 'export' then can_export
      when 'administer' then can_administer
      when 'sensitive' then can_view_sensitive
      else false
    end
  ),false)
  from public.effective_module_permissions(p_organization_id,auth.uid(),p_project_id)
  where module_key=lower(p_module_key);
$$;

commit;
