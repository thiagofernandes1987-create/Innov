create table if not exists public.rh_sst_cat_cases(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  accident_date date not null,accident_time time,hours_worked_before numeric(6,2),
  accident_type integer not null check(accident_type in(1,2,3)),
  cat_type integer not null default 1 check(cat_type in(1,2,3)),
  death boolean not null default false,death_date date,police_report boolean not null default false,
  generating_situation_code text not null,
  initiator_type integer not null check(initiator_type between 1 and 6),
  last_worked_day date,caused_leave boolean not null default false,
  location_type integer not null check(location_type between 1 and 6),
  establishment_registration_type integer check(establishment_registration_type in(1,3,4)),
  establishment_registration_number text,
  location_description text not null,worksite_code text,country_code text,state_code text,city_ibge_code text,
  status text not null default 'DRAFT' check(status in('DRAFT','READY','SIGNED','SENT','ACCEPTED','REJECTED','CANCELLED')),
  evidence_reference text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check((death=false and death_date is null) or (death=true and death_date is not null))
);
create table if not exists public.rh_sst_cat_body_parts(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  cat_case_id uuid not null references public.rh_sst_cat_cases(id) on delete cascade,body_part_code text not null,laterality integer check(laterality between 0 and 3),created_at timestamptz not null default now(),unique(cat_case_id,body_part_code,laterality)
);
create table if not exists public.rh_sst_cat_agents(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  cat_case_id uuid not null references public.rh_sst_cat_cases(id) on delete cascade,agent_code text not null,created_at timestamptz not null default now(),unique(cat_case_id,agent_code)
);
create table if not exists public.rh_sst_cat_medical_attestations(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  cat_case_id uuid not null references public.rh_sst_cat_cases(id) on delete cascade,attendance_date date not null,attendance_time time,
  hospitalization boolean not null default false,treatment_duration_days integer not null default 0 check(treatment_duration_days>=0),
  leave_recommended boolean not null default false,injury_nature_code text not null,cid_code text,
  professional_name text not null,professional_registration_type text not null,professional_registration_number text not null,professional_state text,
  created_at timestamptz not null default now(),unique(cat_case_id)
);

create table if not exists public.rh_sst_aso_records(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,exam_type integer not null check(exam_type between 0 and 9),
  aso_date date not null,result_code integer check(result_code in(1,2)),
  physician_name text not null,physician_cpf text not null,physician_registration_number text,physician_state text,
  pcmso_responsible_cpf text,pcmso_responsible_name text,pcmso_responsible_registration_number text,pcmso_responsible_state text,
  status text not null default 'DRAFT' check(status in('DRAFT','READY','SIGNED','SENT','ACCEPTED','REJECTED','CANCELLED')),
  evidence_reference text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.rh_sst_exam_procedures(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  aso_id uuid not null references public.rh_sst_aso_records(id) on delete cascade,exam_date date not null,procedure_code text not null,
  result_interpretation integer check(result_interpretation between 1 and 2),order_number integer not null default 1 check(order_number>0),created_at timestamptz not null default now(),
  unique(aso_id,order_number)
);

create table if not exists public.rh_sst_exposure_periods(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,valid_from date not null,valid_to date,
  environment_code text not null,activity_description text not null,environment_registration_type integer check(environment_registration_type in(1,3,4)),
  environment_registration_number text,responsible_cpf text,responsible_registration_type text,responsible_registration_number text,responsible_state text,
  status text not null default 'DRAFT' check(status in('DRAFT','READY','SIGNED','SENT','ACCEPTED','REJECTED','ENDED','CANCELLED')),
  evidence_reference text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(valid_to is null or valid_to>=valid_from)
);
create table if not exists public.rh_sst_exposure_agents(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  exposure_period_id uuid not null references public.rh_sst_exposure_periods(id) on delete cascade,agent_code text not null,intensity_concentration numeric(18,6),measurement_unit text,
  technique text,epc_implemented boolean,epc_effective boolean,epi_used boolean,epi_effective boolean,
  epi_certificate_number text,epi_use_condition_compliant boolean,epi_expiry_observed boolean,epi_change_frequency_observed boolean,epi_cleaning_observed boolean,
  created_at timestamptz not null default now(),unique(exposure_period_id,agent_code,epi_certificate_number)
);

create table if not exists public.rh_sst_epi_catalog(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,name text not null,certificate_number text not null,manufacturer text,active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),unique(organization_id,code)
);
create table if not exists public.rh_sst_epi_deliveries(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,epi_id uuid not null references public.rh_sst_epi_catalog(id) on delete restrict,
  delivered_at timestamptz not null,quantity numeric(12,3) not null check(quantity>0),returned_at timestamptz,reason text,evidence_reference text,
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),check(returned_at is null or returned_at>=delivered_at)
);

alter table public.rh_sst_cat_cases add constraint rh_sst_cat_cases_org_id_uq unique(organization_id,id);
alter table public.rh_sst_aso_records add constraint rh_sst_aso_records_org_id_uq unique(organization_id,id);
alter table public.rh_sst_exposure_periods add constraint rh_sst_exposure_periods_org_id_uq unique(organization_id,id);
alter table public.rh_sst_epi_catalog add constraint rh_sst_epi_catalog_org_id_uq unique(organization_id,id);
alter table public.rh_sst_cat_cases add constraint rh_sst_cat_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_sst_aso_records add constraint rh_sst_aso_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_sst_exposure_periods add constraint rh_sst_exposure_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_sst_epi_deliveries add constraint rh_sst_epi_delivery_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_sst_epi_deliveries add constraint rh_sst_epi_delivery_epi_tenant_fk foreign key(organization_id,epi_id) references public.rh_sst_epi_catalog(organization_id,id) on delete restrict;

create extension if not exists btree_gist;
alter table public.rh_sst_exposure_periods add constraint rh_sst_exposure_no_overlap exclude using gist(employment_id with =,environment_code with =,daterange(valid_from,valid_to,'[]') with &&) where(status not in('CANCELLED'));

do $$ declare t text;begin foreach t in array array['rh_sst_cat_cases','rh_sst_cat_body_parts','rh_sst_cat_agents','rh_sst_cat_medical_attestations','rh_sst_aso_records','rh_sst_exam_procedures','rh_sst_exposure_periods','rh_sst_exposure_agents','rh_sst_epi_catalog','rh_sst_epi_deliveries'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
 execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
end loop;end$$;

create or replace function public.mark_rh_sst_ready(p_kind text,p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_count integer;
begin
 if p_kind='CAT' then
  select organization_id into v_org from public.rh_sst_cat_cases where id=p_id for update;if v_org is null then raise exception 'CAT não encontrada';end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
  select count(*) into v_count from public.rh_sst_cat_body_parts where cat_case_id=p_id;if v_count=0 then raise exception 'CAT exige ao menos uma parte atingida';end if;
  select count(*) into v_count from public.rh_sst_cat_agents where cat_case_id=p_id;if v_count=0 then raise exception 'CAT exige ao menos um agente causador';end if;
  if not exists(select 1 from public.rh_sst_cat_medical_attestations where cat_case_id=p_id) then raise exception 'CAT exige atestado médico';end if;
  update public.rh_sst_cat_cases set status='READY',updated_at=now() where id=p_id;
 elsif p_kind='ASO' then
  select organization_id into v_org from public.rh_sst_aso_records where id=p_id for update;if v_org is null then raise exception 'ASO não encontrado';end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
  select count(*) into v_count from public.rh_sst_exam_procedures where aso_id=p_id;if v_count=0 then raise exception 'ASO exige ao menos um procedimento de exame';end if;
  update public.rh_sst_aso_records set status='READY',updated_at=now() where id=p_id;
 elsif p_kind='EXPOSURE' then
  select organization_id into v_org from public.rh_sst_exposure_periods where id=p_id for update;if v_org is null then raise exception 'Exposição não encontrada';end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
  select count(*) into v_count from public.rh_sst_exposure_agents where exposure_period_id=p_id;if v_count=0 then raise exception 'Exposição exige ao menos um agente';end if;
  update public.rh_sst_exposure_periods set status='READY',updated_at=now() where id=p_id;
 else raise exception 'Tipo SST inválido';end if;
end$$;
grant execute on function public.mark_rh_sst_ready(text,uuid) to authenticated;
