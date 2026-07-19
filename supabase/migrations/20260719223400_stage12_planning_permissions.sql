begin;

revoke all on function public.is_project_client(uuid) from public,anon;
revoke all on function public.can_access_project(uuid) from public,anon;
revoke all on function public.can_manage_project(uuid) from public,anon;
revoke all on function public.can_write_daily_log(uuid) from public,anon;
revoke all on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) from public,anon;
revoke all on function public.recalculate_project_progress(uuid) from public,anon;
revoke all on function public.move_project_task(uuid,public.task_status,numeric,text) from public,anon;
revoke all on function public.create_schedule_baseline(uuid,text,text) from public,anon;
revoke all on function public.submit_daily_log(uuid) from public,anon;
revoke all on function public.decide_daily_log(uuid,boolean,text,boolean) from public,anon;
revoke all on function public.release_project_document_version(uuid) from public,anon;
revoke all on function public.prevent_frozen_baseline_mutation() from public,anon,authenticated;
revoke all on function public.prevent_released_document_mutation() from public,anon,authenticated;

grant execute on function public.is_project_client(uuid) to authenticated,service_role;
grant execute on function public.can_access_project(uuid) to authenticated,service_role;
grant execute on function public.can_manage_project(uuid) to authenticated,service_role;
grant execute on function public.can_write_daily_log(uuid) to authenticated,service_role;
grant execute on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) to authenticated,service_role;
grant execute on function public.recalculate_project_progress(uuid) to authenticated,service_role;
grant execute on function public.move_project_task(uuid,public.task_status,numeric,text) to authenticated,service_role;
grant execute on function public.create_schedule_baseline(uuid,text,text) to authenticated,service_role;
grant execute on function public.submit_daily_log(uuid) to authenticated,service_role;
grant execute on function public.decide_daily_log(uuid,boolean,text,boolean) to authenticated,service_role;
grant execute on function public.release_project_document_version(uuid) to authenticated,service_role;
grant execute on function public.prevent_frozen_baseline_mutation() to service_role;
grant execute on function public.prevent_released_document_mutation() to service_role;

commit;
