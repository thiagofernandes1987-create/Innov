begin;

revoke all on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) from public,anon;
revoke all on function public.recalculate_project_progress(uuid) from public,anon;
revoke all on function public.move_project_task(uuid,public.task_status,numeric,text) from public,anon;
revoke all on function public.create_schedule_baseline(uuid,text,text) from public,anon;

grant execute on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) to authenticated,service_role;
grant execute on function public.recalculate_project_progress(uuid) to authenticated,service_role;
grant execute on function public.move_project_task(uuid,public.task_status,numeric,text) to authenticated,service_role;
grant execute on function public.create_schedule_baseline(uuid,text,text) to authenticated,service_role;

commit;
