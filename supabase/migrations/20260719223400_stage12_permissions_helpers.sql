begin;

revoke all on function public.is_project_client(uuid) from public,anon;
revoke all on function public.can_access_project(uuid) from public,anon;
revoke all on function public.can_manage_project(uuid) from public,anon;
revoke all on function public.can_write_daily_log(uuid) from public,anon;
revoke all on function public.prevent_frozen_baseline_mutation() from public,anon,authenticated;
revoke all on function public.prevent_released_document_mutation() from public,anon,authenticated;

grant execute on function public.is_project_client(uuid) to authenticated,service_role;
grant execute on function public.can_access_project(uuid) to authenticated,service_role;
grant execute on function public.can_manage_project(uuid) to authenticated,service_role;
grant execute on function public.can_write_daily_log(uuid) to authenticated,service_role;
grant execute on function public.prevent_frozen_baseline_mutation() to service_role;
grant execute on function public.prevent_released_document_mutation() to service_role;

commit;
