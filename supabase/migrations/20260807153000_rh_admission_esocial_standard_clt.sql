create table if not exists public.rh_admission_esocial_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  admission_case_id uuid not null references public.rh_admission_cases(id) on delete cascade,
  sex text not null check(sex in('M','F')),
  race_color integer not null check(race_color between 1 and 5),
  marital_status integer check(marital_status between 1 and 5),
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
  state_code text not null check(state_code in('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  esocial_category_code text not null check(esocial_category_code ~ '^[0-9]{3}$'),
  activity_nature integer not null default 1 check(activity_nature in(1,2)),
  work_regime_type integer not null default 1 check(work_regime_type=1),
  social_security_regime_type integer not null default 1 check(social_security_regime_type in(1,3)),
  admission_type integer not null default 1 check(admission_type=1),
  admission_indicator integer not null default 1 check(admission_indicator=1),
  work_regime_journey integer not null default 1 check(work_regime_journey between 1 and 4),
  fixed_salary_unit integer not null default 5 check(fixed_salary_unit between 1 and 7),
  contract_type integer not null default 1 check(contract_type in(1,2,3)),
  contract_end_date date,
  reciprocal_termination_clause text check(reciprocal_termination_clause is null or reciprocal_termination_clause in('S','N')),
  determined_object text,
  journey_type integer not null default 9 check(journey_type in(2,3,4,5,6,7,9)),
  partial_time_type integer not null default 0 check(partial_time_type between 0 and 3),
  night_work text not null default 'N' check(night_work in('S','N')),
  fgts_option_date date,
  union_base_month integer check(union_base_month between 1 and 12),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(admission_case_id),
  check((contract_type=1 and contract_end_date is null and reciprocal_termination_clause is null and determined_object is null)
     or (contract_type=2 and contract_end_date is not null and reciprocal_termination_clause in('S','N') and determined_object is null)
     or (contract_type=3 and contract_end_date is null and reciprocal_termination_clause in('S','N') and determined_object is not null))
);
alter table public.rh_admission_esocial_profiles add constraint rh_admission_esocial_profiles_org_id_uq unique(organization_id,id);
alter table public.rh_admission_esocial_profiles add constraint rh_admission_esocial_case_tenant_fk foreign key(organization_id,admission_case_id) references public.rh_admission_cases(organization_id,id) on delete cascade;
alter table public.rh_admission_esocial_profiles enable row level security;
create policy rh_read on public.rh_admission_esocial_profiles for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_admission_esocial_profiles for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

-- A ativação copia a categoria eSocial para a condição contratual canônica.
create or replace function public.activate_rh_admission(p_organization_id uuid,p_case_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_admission_cases%rowtype;v_worker uuid;v_employment uuid;v_esocial public.rh_admission_esocial_profiles%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 select * into c from public.rh_admission_cases where id=p_case_id and organization_id=p_organization_id for update;
 if c.id is null then raise exception 'Caso de admissão não encontrado';end if;
 if c.status='ACTIVATED' then return c.activated_employment_id;end if;
 if c.status<>'REVIEW' then raise exception 'Caso deve estar em revisão antes de ativar';end if;
 if exists(select 1 from public.rh_admission_checklist_items where admission_case_id=c.id and required=true and status<>'DONE') then raise exception 'Checklist obrigatório incompleto';end if;
 select * into v_esocial from public.rh_admission_esocial_profiles where admission_case_id=c.id;
 if v_esocial.id is null then raise exception 'Perfil eSocial da admissão obrigatório antes da ativação';end if;
 if c.esocial_strategy='S2190_THEN_S2200' and not exists(select 1 from public.rh_esocial_events where organization_id=p_organization_id and event_type='S-2190' and source_type='ADMISSION_CASE' and source_id=c.id and status in('SIGNED','BATCHED','SENT','PROCESSING','ACCEPTED')) then raise exception 'Estratégia S-2190 exige evento preliminar gerado antes da ativação';end if;

 v_worker:=public.create_rh_worker(p_organization_id,c.full_name,c.preferred_name,c.cpf,c.birth_date,c.email,c.phone,c.worker_code,c.registration_number,c.employment_type,c.admission_date,c.base_salary);
 select e.id into v_employment from public.rh_employments e where e.worker_id=v_worker and e.organization_id=p_organization_id and e.registration_number=c.registration_number order by e.created_at desc limit 1;
 insert into public.rh_employment_conditions(organization_id,employment_id,valid_from,employer_id,establishment_id,tax_allocation_id,position_id,function_id,union_id,work_schedule_id,base_salary,esocial_category_code,change_reason,created_by)
 values(p_organization_id,v_employment,c.admission_date,c.employer_id,c.establishment_id,c.tax_allocation_id,c.position_id,c.function_id,c.union_id,c.work_schedule_id,c.base_salary,v_esocial.esocial_category_code,'ADMISSION',auth.uid());
 update public.rh_admission_cases set status='ACTIVATED',activated_worker_id=v_worker,activated_employment_id=v_employment,activated_at=now(),updated_at=now() where id=c.id;
 return v_employment;
end$$;
