do $$begin
 if not exists(select 1 from pg_constraint where conname='rh_termination_cases_org_id_uq' and conrelid='public.rh_termination_cases'::regclass) then
  alter table public.rh_termination_cases add constraint rh_termination_cases_org_id_uq unique(organization_id,id);
 end if;
end$$;

create table if not exists public.rh_fgts_rescisory_history_rows(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 termination_case_id uuid not null,competence date not null check(extract(day from competence)=1 and competence<date '2024-03-01'),category_code text check(category_code is null or category_code ~ '^[0-9]{3}$'),
 principal_amount numeric(18,2) check(principal_amount is null or principal_amount>=0),thirteenth_amount numeric(18,2) check(thirteenth_amount is null or thirteenth_amount>=0),absence_fgts boolean not null default false,
 source_reference text,evidence_reference text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(principal_amount is not null or thirteenth_amount is not null or absence_fgts)
);
create unique index if not exists rh_fgts_rescisory_history_unique on public.rh_fgts_rescisory_history_rows(termination_case_id,competence,coalesce(category_code,''));
create index if not exists rh_fgts_rescisory_history_case_idx on public.rh_fgts_rescisory_history_rows(organization_id,termination_case_id,competence);
do $$begin
 if not exists(select 1 from pg_constraint where conname='rh_fgts_rescisory_history_case_fk' and conrelid='public.rh_fgts_rescisory_history_rows'::regclass) then
  alter table public.rh_fgts_rescisory_history_rows add constraint rh_fgts_rescisory_history_case_fk foreign key(organization_id,termination_case_id) references public.rh_termination_cases(organization_id,id) on delete cascade;
 end if;
end$$;

create table if not exists public.rh_fgts_rescisory_exports(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,termination_case_id uuid not null,layout_version text not null default '1.2',layout_reference_date date not null default date '2025-10-03',
 file_name text not null,sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),line_count integer not null check(line_count>0 and line_count<=5000),byte_size integer not null check(byte_size>0 and byte_size<=133120),
 generated_by uuid references auth.users(id) on delete set null,generated_at timestamptz not null default now(),evidence_reference text
);
do $$begin
 if not exists(select 1 from pg_constraint where conname='rh_fgts_rescisory_exports_case_fk' and conrelid='public.rh_fgts_rescisory_exports'::regclass) then
  alter table public.rh_fgts_rescisory_exports add constraint rh_fgts_rescisory_exports_case_fk foreign key(organization_id,termination_case_id) references public.rh_termination_cases(organization_id,id) on delete cascade;
 end if;
end$$;

do $$ declare t text;begin foreach t in array array['rh_fgts_rescisory_history_rows','rh_fgts_rescisory_exports'] loop
 execute format('alter table public.%I enable row level security',t);
 if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='rh_read') then execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='rh_write') then execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);end if;
 end loop;end$$;
