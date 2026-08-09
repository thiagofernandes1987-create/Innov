create table if not exists public.rh_tsv_esocial_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null,
  category_code text not null default '721' check(category_code='721'),
  sex text not null check(sex in('M','F')),
  race_color integer not null check(race_color between 1 and 5),
  marital_status integer check(marital_status is null or marital_status between 1 and 5),
  education_level text not null check(education_level ~ '^(0[1-9]|1[0-2])$'),
  birth_country_code text not null default '105' check(birth_country_code ~ '^[0-9]{3}$'),
  nationality_country_code text not null default '105' check(nationality_country_code ~ '^[0-9]{3}$'),
  street_type text,
  street text not null,
  street_number text not null,
  complement text,
  neighborhood text,
  postal_code text not null check(postal_code ~ '^[0-9]{8}$'),
  city_ibge_code text not null check(city_ibge_code ~ '^[0-9]{7}$'),
  state_code text not null check(state_code ~ '^[A-Z]{2}$'),
  immigrant_residence_term integer check(immigrant_residence_term is null or immigrant_residence_term in(1,2)),
  immigrant_entry_condition integer check(immigrant_entry_condition is null or immigrant_entry_condition between 1 and 7),
  salary_unit integer not null default 5 check(salary_unit between 1 and 7),
  variable_salary_description text,
  fgts_option_date date not null,
  judicial_process_number text check(judicial_process_number is null or judicial_process_number ~ '^[0-9]{20}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,employment_id),
  check((nationality_country_code='105' and immigrant_residence_term is null and immigrant_entry_condition is null) or (nationality_country_code<>'105' and immigrant_residence_term is not null and immigrant_entry_condition is not null)),
  check(salary_unit not in(6,7) or nullif(trim(variable_salary_description),'') is not null)
);
alter table public.rh_tsv_esocial_profiles add constraint rh_tsv_profile_org_id_uq unique(organization_id,id);
alter table public.rh_tsv_esocial_profiles add constraint rh_tsv_profile_employment_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_tsv_esocial_profiles enable row level security;
create policy rh_tsv_profile_read on public.rh_tsv_esocial_profiles for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_tsv_profile_write on public.rh_tsv_esocial_profiles for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));
comment on table public.rh_tsv_esocial_profiles is 'Perfil complementar S-2300. Primeira vertical operacional: categoria 721; demais categorias permanecem bloqueadas até seus grupos condicionais serem implementados.';
