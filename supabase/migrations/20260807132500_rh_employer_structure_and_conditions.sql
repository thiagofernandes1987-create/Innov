create table if not exists public.rh_employers(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 code text not null,
 legal_name text not null,
 trade_name text,
 tax_id text not null,
 status text not null default 'ACTIVE' check(status in('ACTIVE','INACTIVE')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,code),
 unique(organization_id,tax_id)
);

create table if not exists public.rh_establishments(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 employer_id uuid not null references public.rh_employers(id) on delete restrict,
 code text not null,
 name text not null,
 registration_type text not null default 'CNPJ' check(registration_type in('CNPJ','CNO','CAEPF','OTHER')),
 registration_number text not null,
 status text not null default 'ACTIVE' check(status in('ACTIVE','INACTIVE')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organization_id,code),
 unique(organization_id,registration_type,registration_number)
);

create table if not exists public.rh_tax_allocations(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 employer_id uuid not null references public.rh_employers(id) on delete restrict,
 establishment_id uuid references public.rh_establishments(id) on delete restrict,
 code text not null,
 name text not null,
 esocial_lotacao_code text,
 valid_from date not null,
 valid_to date,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organization_id,code),
 check(valid_to is null or valid_to>valid_from)
);

create table if not exists public.rh_positions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 code text not null,
 name text not null,
 cbo_code text,
 active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organization_id,code)
);

create table if not exists public.rh_functions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 code text not null,
 name text not null,
 description text,
 active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organization_id,code)
);

create table if not exists public.rh_unions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 code text not null,
 name text not null,
 tax_id text,
 category_name text,
 valid_from date,
 valid_to date,
 active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organization_id,code),
 check(valid_to is null or valid_from is null or valid_to>valid_from)
);

create table if not exists public.rh_work_schedules(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 code text not null,
 name text not null,
 weekly_hours numeric(6,2) not null check(weekly_hours>=0 and weekly_hours<=168),
 description text,
 active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organization_id,code)
);

create table if not exists public.rh_employment_conditions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 employment_id uuid not null references public.rh_employments(id) on delete restrict,
 valid_from date not null,
 valid_to date,
 employer_id uuid not null references public.rh_employers(id) on delete restrict,
 establishment_id uuid not null references public.rh_establishments(id) on delete restrict,
 tax_allocation_id uuid references public.rh_tax_allocations(id) on delete restrict,
 position_id uuid references public.rh_positions(id) on delete restrict,
 function_id uuid references public.rh_functions(id) on delete restrict,
 union_id uuid references public.rh_unions(id) on delete restrict,
 work_schedule_id uuid references public.rh_work_schedules(id) on delete restrict,
 base_salary numeric(14,2) not null check(base_salary>=0),
 change_reason text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check(valid_to is null or valid_to>valid_from)
);
create index if not exists rh_employment_conditions_current_idx on public.rh_employment_conditions(organization_id,employment_id,valid_from,valid_to);

alter table public.rh_employers add constraint rh_employers_org_id_uq unique(organization_id,id);
alter table public.rh_establishments add constraint rh_establishments_org_id_uq unique(organization_id,id);
alter table public.rh_tax_allocations add constraint rh_tax_allocations_org_id_uq unique(organization_id,id);
alter table public.rh_positions add constraint rh_positions_org_id_uq unique(organization_id,id);
alter table public.rh_functions add constraint rh_functions_org_id_uq unique(organization_id,id);
alter table public.rh_unions add constraint rh_unions_org_id_uq unique(organization_id,id);
alter table public.rh_work_schedules add constraint rh_work_schedules_org_id_uq unique(organization_id,id);
alter table public.rh_employment_conditions add constraint rh_employment_conditions_org_id_uq unique(organization_id,id);

alter table public.rh_establishments add constraint rh_establishment_employer_tenant_fk foreign key(organization_id,employer_id) references public.rh_employers(organization_id,id) on delete restrict;
alter table public.rh_tax_allocations add constraint rh_tax_allocation_employer_tenant_fk foreign key(organization_id,employer_id) references public.rh_employers(organization_id,id) on delete restrict;
alter table public.rh_tax_allocations add constraint rh_tax_allocation_establishment_tenant_fk foreign key(organization_id,establishment_id) references public.rh_establishments(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_employer_tenant_fk foreign key(organization_id,employer_id) references public.rh_employers(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_establishment_tenant_fk foreign key(organization_id,establishment_id) references public.rh_establishments(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_tax_allocation_tenant_fk foreign key(organization_id,tax_allocation_id) references public.rh_tax_allocations(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_position_tenant_fk foreign key(organization_id,position_id) references public.rh_positions(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_function_tenant_fk foreign key(organization_id,function_id) references public.rh_functions(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_union_tenant_fk foreign key(organization_id,union_id) references public.rh_unions(organization_id,id) on delete restrict;
alter table public.rh_employment_conditions add constraint rh_condition_schedule_tenant_fk foreign key(organization_id,work_schedule_id) references public.rh_work_schedules(organization_id,id) on delete restrict;

-- Intervalos de vigência são semiabertos [início,fim): uma condição pode terminar
-- exatamente quando a próxima começa sem produzir sobreposição artificial.
create extension if not exists btree_gist;
alter table public.rh_employment_conditions add constraint rh_employment_conditions_no_overlap exclude using gist(
 employment_id with =,
 daterange(valid_from,valid_to,'[)') with &&
);

-- RLS por capability do RH.
do $$
declare t text;
begin
 foreach t in array array['rh_employers','rh_establishments','rh_tax_allocations','rh_positions','rh_functions','rh_unions','rh_work_schedules','rh_employment_conditions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(p_organization_id=>organization_id,p_module_key=>''rh'',p_required_level=>''READ'',p_project_id=>null,p_action=>null))',t);
  execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(p_organization_id=>organization_id,p_module_key=>''rh'',p_required_level=>''EDIT'',p_project_id=>null,p_action=>null)) with check(public.has_module_permission(p_organization_id=>organization_id,p_module_key=>''rh'',p_required_level=>''EDIT'',p_project_id=>null,p_action=>null))',t);
 end loop;
end$$;
