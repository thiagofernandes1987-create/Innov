create table if not exists public.rh_admission_cases(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  case_number text not null,
  status text not null default 'DRAFT' check(status in('DRAFT','VALIDATING','READY','ACTIVATED','CANCELLED')),
  full_name text not null,
  preferred_name text,
  cpf text,
  birth_date date,
  email text,
  phone text,
  worker_code text not null,
  registration_number text not null,
  employment_type text not null default 'EMPLOYEE' check(employment_type in('EMPLOYEE','TSV','APPRENTICE','INTERN','DIRECTOR','OTHER')),
  admission_date date not null,
  employer_id uuid not null references public.rh_employers(id) on delete restrict,
  establishment_id uuid not null references public.rh_establishments(id) on delete restrict,
  tax_allocation_id uuid references public.rh_tax_allocations(id) on delete restrict,
  position_id uuid references public.rh_positions(id) on delete restrict,
  function_id uuid references public.rh_functions(id) on delete restrict,
  union_id uuid references public.rh_unions(id) on delete restrict,
  work_schedule_id uuid references public.rh_work_schedules(id) on delete restrict,
  base_salary numeric(14,2) not null check(base_salary>=0),
  esocial_strategy text not null default 'S2200' check(esocial_strategy in('S2190_THEN_S2200','S2200','NONE')),
  activated_worker_id uuid references public.rh_workers(id) on delete restrict,
  activated_employment_id uuid references public.rh_employments(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  unique(organization_id,case_number),
  check(cpf is null or cpf ~ '^[0-9]{11}$')
);
create index if not exists rh_admission_cases_status_idx on public.rh_admission_cases(organization_id,status,admission_date);

create table if not exists public.rh_admission_checklist_items(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  admission_case_id uuid not null references public.rh_admission_cases(id) on delete cascade,
  item_key text not null,
  label text not null,
  required boolean not null default true,
  status text not null default 'PENDING' check(status in('PENDING','COMPLETED','WAIVED','BLOCKED')),
  note text,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(admission_case_id,item_key)
);

alter table public.rh_admission_cases add constraint rh_admission_cases_org_id_uq unique(organization_id,id);
alter table public.rh_admission_checklist_items add constraint rh_admission_checklist_case_tenant_fk foreign key(organization_id,admission_case_id) references public.rh_admission_cases(organization_id,id) on delete cascade;
alter table public.rh_admission_cases add constraint rh_admission_employer_tenant_fk foreign key(organization_id,employer_id) references public.rh_employers(organization_id,id) on delete restrict;
alter table public.rh_admission_cases add constraint rh_admission_establishment_tenant_fk foreign key(organization_id,establishment_id) references public.rh_establishments(organization_id,id) on delete restrict;
alter table public.rh_admission_cases add constraint rh_admission_tax_tenant_fk foreign key(organization_id,tax_allocation_id) references public.rh_tax_allocations(organization_id,id) on delete restrict;
alter table public.rh_admission_cases add constraint rh_admission_position_tenant_fk foreign key(organization_id,position_id) references public.rh_positions(organization_id,id) on delete restrict;
alter table public.rh_admission_cases add constraint rh_admission_function_tenant_fk foreign key(organization_id,function_id) references public.rh_functions(organization_id,id) on delete restrict;
alter table public.rh_admission_cases add constraint rh_admission_union_tenant_fk foreign key(organization_id,union_id) references public.rh_unions(organization_id,id) on delete restrict;
alter table public.rh_admission_cases add constraint rh_admission_schedule_tenant_fk foreign key(organization_id,work_schedule_id) references public.rh_work_schedules(organization_id,id) on delete restrict;

alter table public.rh_admission_cases enable row level security;
alter table public.rh_admission_checklist_items enable row level security;
create policy rh_read on public.rh_admission_cases for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_admission_cases for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));
create policy rh_read on public.rh_admission_checklist_items for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_admission_checklist_items for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

create or replace function public.create_rh_admission_case(
 p_organization_id uuid,p_full_name text,p_preferred_name text,p_cpf text,p_birth_date date,p_email text,p_phone text,
 p_worker_code text,p_registration_number text,p_employment_type text,p_admission_date date,
 p_employer_id uuid,p_establishment_id uuid,p_tax_allocation_id uuid,p_position_id uuid,p_function_id uuid,p_union_id uuid,p_work_schedule_id uuid,
 p_base_salary numeric,p_esocial_strategy text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_id uuid;v_number text;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
 if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
 if trim(coalesce(p_full_name,''))='' or trim(coalesce(p_worker_code,''))='' or trim(coalesce(p_registration_number,''))='' then raise exception 'Nome, código e matrícula são obrigatórios'; end if;
 if p_admission_date is null or p_employer_id is null or p_establishment_id is null then raise exception 'Admissão, empresa e estabelecimento são obrigatórios'; end if;
 if p_cpf is not null and p_cpf<>'' and p_cpf !~ '^[0-9]{11}$' then raise exception 'CPF inválido'; end if;
 v_number:='ADM-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS');
 insert into public.rh_admission_cases(organization_id,case_number,full_name,preferred_name,cpf,birth_date,email,phone,worker_code,registration_number,employment_type,admission_date,employer_id,establishment_id,tax_allocation_id,position_id,function_id,union_id,work_schedule_id,base_salary,esocial_strategy,created_by)
 values(p_organization_id,v_number,trim(p_full_name),nullif(trim(coalesce(p_preferred_name,'')),''),nullif(p_cpf,''),p_birth_date,nullif(trim(coalesce(p_email,'')),''),nullif(trim(coalesce(p_phone,'')),''),trim(p_worker_code),trim(p_registration_number),coalesce(nullif(p_employment_type,''),'EMPLOYEE'),p_admission_date,p_employer_id,p_establishment_id,p_tax_allocation_id,p_position_id,p_function_id,p_union_id,p_work_schedule_id,coalesce(p_base_salary,0),coalesce(nullif(p_esocial_strategy,''),'S2200'),auth.uid()) returning id into v_id;
 insert into public.rh_admission_checklist_items(organization_id,admission_case_id,item_key,label,required) values
 (p_organization_id,v_id,'PERSONAL_DATA','Dados pessoais conferidos',true),
 (p_organization_id,v_id,'DOCUMENTS','Documentos obrigatórios conferidos',true),
 (p_organization_id,v_id,'CONTRACT','Condições contratuais conferidas',true),
 (p_organization_id,v_id,'ESOCIAL_DATA','Dados necessários ao eSocial conferidos',true);
 return v_id;
end$$;

grant execute on function public.create_rh_admission_case(uuid,text,text,text,date,text,text,text,text,text,date,uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,text) to authenticated;

create or replace function public.set_rh_admission_checklist_item(p_item_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_org uuid;
begin
 select organization_id into v_org from public.rh_admission_checklist_items where id=p_item_id;
 if v_org is null then raise exception 'Item não encontrado'; end if;
 if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
 if p_status not in('PENDING','COMPLETED','WAIVED','BLOCKED') then raise exception 'Status inválido'; end if;
 update public.rh_admission_checklist_items set status=p_status,note=nullif(trim(coalesce(p_note,'')),''),completed_by=case when p_status in('COMPLETED','WAIVED') then auth.uid() else null end,completed_at=case when p_status in('COMPLETED','WAIVED') then now() else null end where id=p_item_id;
end$$;

grant execute on function public.set_rh_admission_checklist_item(uuid,text,text) to authenticated;

create or replace function public.activate_rh_admission(p_case_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare c public.rh_admission_cases%rowtype;v_person uuid;v_worker uuid;v_employment uuid;
begin
 select * into c from public.rh_admission_cases where id=p_case_id for update;
 if c.id is null then raise exception 'Caso não encontrado'; end if;
 if not public.has_module_permission(c.organization_id,'rh','READ',null,'approve') then raise exception 'FORBIDDEN'; end if;
 if c.status='ACTIVATED' then return c.activated_employment_id; end if;
 if c.status='CANCELLED' then raise exception 'Caso cancelado não pode ser ativado'; end if;
 if exists(select 1 from public.rh_admission_checklist_items where admission_case_id=c.id and required and status not in('COMPLETED','WAIVED')) then raise exception 'Checklist obrigatório incompleto'; end if;
 if c.cpf is not null and exists(select 1 from public.rh_people where organization_id=c.organization_id and cpf=c.cpf) then raise exception 'Já existe pessoa com este CPF'; end if;
 if exists(select 1 from public.rh_workers where organization_id=c.organization_id and worker_code=c.worker_code) then raise exception 'Código de trabalhador já existe'; end if;
 if exists(select 1 from public.rh_employments where organization_id=c.organization_id and registration_number=c.registration_number) then raise exception 'Matrícula já existe'; end if;
 insert into public.rh_people(organization_id,full_name,preferred_name,cpf,birth_date,email,phone,created_by) values(c.organization_id,c.full_name,c.preferred_name,c.cpf,c.birth_date,c.email,c.phone,auth.uid()) returning id into v_person;
 insert into public.rh_workers(organization_id,person_id,worker_code,status,created_by) values(c.organization_id,v_person,c.worker_code,'ACTIVE',auth.uid()) returning id into v_worker;
 insert into public.rh_employments(organization_id,worker_id,registration_number,employment_type,admission_date,status,base_salary,created_by) values(c.organization_id,v_worker,c.registration_number,c.employment_type,c.admission_date,'ACTIVE',c.base_salary,auth.uid()) returning id into v_employment;
 insert into public.rh_employment_conditions(organization_id,employment_id,valid_from,employer_id,establishment_id,tax_allocation_id,position_id,function_id,union_id,work_schedule_id,base_salary,change_reason,created_by)
 values(c.organization_id,v_employment,c.admission_date,c.employer_id,c.establishment_id,c.tax_allocation_id,c.position_id,c.function_id,c.union_id,c.work_schedule_id,c.base_salary,'Admissão',auth.uid());
 update public.rh_admission_cases set status='ACTIVATED',activated_worker_id=v_worker,activated_employment_id=v_employment,activated_at=now(),updated_at=now() where id=c.id;
 return v_worker;
end$$;

grant execute on function public.activate_rh_admission(uuid) to authenticated;
