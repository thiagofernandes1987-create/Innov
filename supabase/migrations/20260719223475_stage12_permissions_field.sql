begin;

revoke all on function public.submit_daily_log(uuid) from public,anon;
revoke all on function public.decide_daily_log(uuid,boolean,text,boolean) from public,anon;
revoke all on function public.release_project_document_version(uuid) from public,anon;

grant execute on function public.submit_daily_log(uuid) to authenticated,service_role;
grant execute on function public.decide_daily_log(uuid,boolean,text,boolean) to authenticated,service_role;
grant execute on function public.release_project_document_version(uuid) to authenticated,service_role;

commit;
