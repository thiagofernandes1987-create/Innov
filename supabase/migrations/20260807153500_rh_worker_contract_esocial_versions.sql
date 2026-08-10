create table if not exists public.rh_worker_esocial_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  worker_id uuid not null references public.rh_workers(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  full_name text not null,
  social_name text,
  sex text not null check(sex in('M','F')),
  race_color integer not null check(race_color between 1 and 5),
  marital_status integer check(marital_status between 1 and 5),
  education_level text not null check(education_level ~ '^(0[1-9]|1[0-2])$'),
  nationality_country_code text not null check(nationality_country_code ~ '^[0-9]{3}$'),
  street_type text,
  street text not null,
  street_number text not null,
  complement text,
  neighborhood text,
  postal_code text not null check(postal_code ~ '^[0-9]{8}$'),
  city_ibge_code text not null check(city_ibge_code ~ '^[0-9]{7}$'),
  state_code text not null,
  phone text,
  email text,
  source_type text not null default 'ADMISSION',
  source_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(valid_to is null or valid_to>valid_from)
);

create table if not exists public.rh_employment_esocial_contract_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  social_security_regime_type integer not null check(social_security_regime_type in(1,3)),
  work_regime_journey integer not null check(work_regime_journey between 1 and 4),
  activity_nature integer not null check(activity_nature in(1,2)),
  union_base_month integer check(union_base_month between 1 and 12),
  fixed_salary_unit integer not null check(fixed_salary_unit between 1 and 7),
  contract_type integer not null check(contract_type in(1,2,3)),
  contract_end_date date,
  reciprocal_termination_clause text check(reciprocal_termination_clause is null or reciprocal_termination_clause in('S','N')),
  determined_object text,
  journey_type integer not null check(journey_type in(2,3,4,5,6,7,9)),
  partial_time_type integer not null default 0 check(partial_time_type between 0 and 3),
  night_work text not null default 'N' check(night_work in('S','N')),
  source_type text not null default 'ADMISSION',
  source_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(valid_to is null or valid_to>valid_from),
  check((contract_type=1 and contract_end_date is null and reciprocal_termination_clause is null and determined_object is null)
     or (contract_type=2 and contract_end_date is not null and reciprocal_termination_clause in('S','N') and determined_object is null)
     or (contract_type=3 and contract_end_date is null and reciprocal_termination_clause in('S','N') and determined_object is not null))
);

alter table public.rh_worker_esocial_profiles add constraint rh_worker_esocial_profiles_org_id_uq unique(organization_id,id);
alter table public.rh_employment_esocial_contract_profiles add constraint rh_employment_esocial_contract_profiles_org_id_uq unique(organization_id,id);
alter table public.rh_worker_esocial_profiles add constraint rh_worker_esocial_worker_tenant_fk foreign key(organization_id,worker_id) references public.rh_workers(organization_id,id) on delete restrict;
alter table public.rh_employment_esocial_contract_profiles add constraint rh_employment_esocial_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
create extension if not exists btree_gist;
alter table public.rh_worker_esocial_profiles add constraint rh_worker_esocial_profiles_no_overlap exclude using gist(worker_id with =,daterange(valid_from,valid_to,'[)') with &&);
alter table public.rh_employment_esocial_contract_profiles add constraint rh_employment_esocial_profiles_no_overlap exclude using gist(employment_id with =,daterange(valid_from,valid_to,'[)') with &&);

alter table public.rh_worker_esocial_profiles enable row level security;
alter table public.rh_employment_esocial_contract_profiles enable row level security;
create policy rh_read on public.rh_worker_esocial_profiles for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_worker_esocial_profiles for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));
create policy rh_read on public.rh_employment_esocial_contract_profiles for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_employment_esocial_contract_profiles for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

create or replace function public.rh_seed_esocial_profiles_from_admission()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.rh_admission_esocial_profiles%rowtype;
begin
  if new.status<>'ACTIVATED' or new.activated_worker_id is null or new.activated_employment_id is null then return new;end if;
  if old.status='ACTIVATED' then return new;end if;
  select * into p from public.rh_admission_esocial_profiles where admission_case_id=new.id;
  if p.id is null then return new;end if;

  insert into public.rh_worker_esocial_profiles(
    organization_id,worker_id,valid_from,full_name,sex,race_color,marital_status,education_level,nationality_country_code,
    street_type,street,street_number,complement,neighborhood,postal_code,city_ibge_code,state_code,phone,email,source_type,source_id,created_by
  ) values(
    new.organization_id,new.activated_worker_id,new.admission_date,new.full_name,p.sex,p.race_color,p.marital_status,p.education_level,p.nationality_country_code,
    p.street_type,p.street,p.street_number,p.complement,p.neighborhood,p.postal_code,p.city_ibge_code,p.state_code,new.phone,new.email,'ADMISSION',new.id,new.created_by
  ) on conflict do nothing;

  insert into public.rh_employment_esocial_contract_profiles(
    organization_id,employment_id,valid_from,social_security_regime_type,work_regime_journey,activity_nature,union_base_month,fixed_salary_unit,
    contract_type,contract_end_date,reciprocal_termination_clause,determined_object,journey_type,partial_time_type,night_work,source_type,source_id,created_by
  ) values(
    new.organization_id,new.activated_employment_id,new.admission_date,p.social_security_regime_type,p.work_regime_journey,p.activity_nature,p.union_base_month,p.fixed_salary_unit,
    p.contract_type,p.contract_end_date,p.reciprocal_termination_clause,p.determined_object,p.journey_type,p.partial_time_type,p.night_work,'ADMISSION',new.id,new.created_by
  ) on conflict do nothing;
  return new;
end$$;

drop trigger if exists trg_rh_seed_esocial_profiles_from_admission on public.rh_admission_cases;
create trigger trg_rh_seed_esocial_profiles_from_admission after update of status on public.rh_admission_cases for each row execute function public.rh_seed_esocial_profiles_from_admission();

-- Backfill determinístico para admissões já ativadas nesta linha evolutiva.
insert into public.rh_worker_esocial_profiles(
  organization_id,worker_id,valid_from,full_name,sex,race_color,marital_status,education_level,nationality_country_code,
  street_type,street,street_number,complement,neighborhood,postal_code,city_ibge_code,state_code,phone,email,source_type,source_id,created_by
)
select c.organization_id,c.activated_worker_id,c.admission_date,c.full_name,p.sex,p.race_color,p.marital_status,p.education_level,p.nationality_country_code,
  p.street_type,p.street,p.street_number,p.complement,p.neighborhood,p.postal_code,p.city_ibge_code,p.state_code,c.phone,c.email,'ADMISSION',c.id,c.created_by
from public.rh_admission_cases c join public.rh_admission_esocial_profiles p on p.admission_case_id=c.id
where c.status='ACTIVATED' and c.activated_worker_id is not null
  and not exists(select 1 from public.rh_worker_esocial_profiles x where x.worker_id=c.activated_worker_id);

insert into public.rh_employment_esocial_contract_profiles(
  organization_id,employment_id,valid_from,social_security_regime_type,work_regime_journey,activity_nature,union_base_month,fixed_salary_unit,
  contract_type,contract_end_date,reciprocal_termination_clause,determined_object,journey_type,partial_time_type,night_work,source_type,source_id,created_by
)
select c.organization_id,c.activated_employment_id,c.admission_date,p.social_security_regime_type,p.work_regime_journey,p.activity_nature,p.union_base_month,p.fixed_salary_unit,
  p.contract_type,p.contract_end_date,p.reciprocal_termination_clause,p.determined_object,p.journey_type,p.partial_time_type,p.night_work,'ADMISSION',c.id,c.created_by
from public.rh_admission_cases c join public.rh_admission_esocial_profiles p on p.admission_case_id=c.id
where c.status='ACTIVATED' and c.activated_employment_id is not null
  and not exists(select 1 from public.rh_employment_esocial_contract_profiles x where x.employment_id=c.activated_employment_id);
