alter table public.rh_admission_esocial_profiles
  add column if not exists immigrant_residence_term integer check(immigrant_residence_term is null or immigrant_residence_term in(1,2)),
  add column if not exists immigrant_entry_condition integer check(immigrant_entry_condition is null or immigrant_entry_condition between 1 and 7),
  add column if not exists temporary_legal_hypothesis integer check(temporary_legal_hypothesis is null or temporary_legal_hypothesis in(1,2)),
  add column if not exists temporary_justification text,
  add column if not exists temporary_client_registration_type integer check(temporary_client_registration_type is null or temporary_client_registration_type in(1,2)),
  add column if not exists temporary_client_registration_number text,
  add column if not exists temporary_substituted_cpfs jsonb not null default '[]'::jsonb check(jsonb_typeof(temporary_substituted_cpfs)='array'),
  add column if not exists apprentice_hiring_mode integer check(apprentice_hiring_mode is null or apprentice_hiring_mode in(1,2)),
  add column if not exists apprentice_qualifier_cnpj text,
  add column if not exists apprentice_indirect_registration_type integer check(apprentice_indirect_registration_type is null or apprentice_indirect_registration_type in(1,2)),
  add column if not exists apprentice_indirect_registration_number text,
  add column if not exists apprentice_practice_cnpj text;

comment on column public.rh_admission_esocial_profiles.immigrant_residence_term is 'S-2200 trabImig/tmpResid: 1 indeterminado, 2 determinado.';
comment on column public.rh_admission_esocial_profiles.immigrant_entry_condition is 'S-2200 trabImig/condIng conforme leiaute vigente.';
comment on column public.rh_admission_esocial_profiles.temporary_legal_hypothesis is 'S-2200 trabTemporario/hipLeg para categoria 106.';
comment on column public.rh_admission_esocial_profiles.apprentice_hiring_mode is 'S-2200 aprend/indAprend para categoria 103.';
