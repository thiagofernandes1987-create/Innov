begin;

-- REVOKE apenas de authenticated não remove o EXECUTE herdado de PUBLIC.
-- As portas antigas não criam memberships nem aplicam todas as invariantes v3.
revoke all on function public.create_independent_project_v2(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) from public, anon, authenticated;

revoke all on function public.create_independent_project(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,uuid,text
) from public, anon, authenticated;

commit;
