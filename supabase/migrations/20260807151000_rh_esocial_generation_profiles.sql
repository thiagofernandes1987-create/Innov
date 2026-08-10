create table if not exists public.rh_esocial_employer_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employer_id uuid not null references public.rh_employers(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  class_trib text not null,
  ind_coop integer not null default 0 check(ind_coop between 0 and 3),
  ind_constr integer not null default 0 check(ind_constr between 0 and 2),
  ind_des_folha integer not null default 0 check(ind_des_folha between 0 and 1),
  ind_opt_reg_eletron integer not null default 1 check(ind_opt_reg_eletron between 0 and 1),
  ind_ent_ed integer not null default 0 check(ind_ent_ed between 0 and 1),
  ind_ett integer not null default 0 check(ind_ett between 0 and 1),
  additional_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(valid_to is null or valid_to>valid_from)
);

create table if not exists public.rh_esocial_establishment_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  establishment_id uuid not null references public.rh_establishments(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  cnae_preponderant text not null,
  rat_rate numeric(4,2),
  fap numeric(5,4),
  additional_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(valid_to is null or valid_to>valid_from)
);

create table if not exists public.rh_esocial_tax_allocation_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  tax_allocation_id uuid not null references public.rh_tax_allocations(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  lotacao_type text not null,
  fpas_code text not null,
  third_parties_code text,
  additional_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(valid_to is null or valid_to>valid_from)
);

alter table public.rh_rubric_versions add column if not exists esocial_table_code text;
alter table public.rh_rubric_versions add column if not exists esocial_rubric_type text check(esocial_rubric_type is null or esocial_rubric_type in('1','2','3','4'));
alter table public.rh_employment_conditions add column if not exists esocial_category_code text;

create table if not exists public.rh_esocial_event_drafts(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null,
  event_key text not null,
  event_group integer not null check(event_group in(1,2,3)),
  environment text not null check(environment in('RESTRICTED','PRODUCTION')),
  operation text not null check(operation in('INCLUDE','RECTIFY','DELETE')),
  layout_version text not null,
  source_type text not null,
  source_id uuid,
  unsigned_xml text not null,
  unsigned_sha256 text not null check(unsigned_sha256 ~ '^[a-f0-9]{64}$'),
  validation_status text not null default 'GENERATED' check(validation_status in('GENERATED','STRUCTURE_VALID','XSD_VALID','INVALID','SIGNED')),
  validation_errors jsonb not null default '[]'::jsonb,
  signed_event_id uuid references public.rh_esocial_events(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,environment,event_key),
  unique(organization_id,environment,unsigned_sha256)
);

alter table public.rh_esocial_employer_profiles add constraint rh_esocial_employer_profiles_org_id_uq unique(organization_id,id);
alter table public.rh_esocial_establishment_profiles add constraint rh_esocial_establishment_profiles_org_id_uq unique(organization_id,id);
alter table public.rh_esocial_tax_allocation_profiles add constraint rh_esocial_tax_allocation_profiles_org_id_uq unique(organization_id,id);
alter table public.rh_esocial_event_drafts add constraint rh_esocial_event_drafts_org_id_uq unique(organization_id,id);

alter table public.rh_esocial_employer_profiles add constraint rh_esocial_employer_profile_tenant_fk foreign key(organization_id,employer_id) references public.rh_employers(organization_id,id) on delete restrict;
alter table public.rh_esocial_establishment_profiles add constraint rh_esocial_establishment_profile_tenant_fk foreign key(organization_id,establishment_id) references public.rh_establishments(organization_id,id) on delete restrict;
alter table public.rh_esocial_tax_allocation_profiles add constraint rh_esocial_tax_allocation_profile_tenant_fk foreign key(organization_id,tax_allocation_id) references public.rh_tax_allocations(organization_id,id) on delete restrict;

create extension if not exists btree_gist;
alter table public.rh_esocial_employer_profiles add constraint rh_esocial_employer_profiles_no_overlap exclude using gist(employer_id with =,daterange(valid_from,valid_to,'[)') with &&);
alter table public.rh_esocial_establishment_profiles add constraint rh_esocial_establishment_profiles_no_overlap exclude using gist(establishment_id with =,daterange(valid_from,valid_to,'[)') with &&);
alter table public.rh_esocial_tax_allocation_profiles add constraint rh_esocial_tax_allocation_profiles_no_overlap exclude using gist(tax_allocation_id with =,daterange(valid_from,valid_to,'[)') with &&);

do $$ declare t text; begin
  foreach t in array array['rh_esocial_employer_profiles','rh_esocial_establishment_profiles','rh_esocial_tax_allocation_profiles','rh_esocial_event_drafts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
    execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
  end loop;
end$$;
