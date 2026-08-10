-- S-2300: categorias 901 (estagiário) e 906 (serviço civil voluntário).
-- Fonte: leiaute eSocial S-1.3/NT 06-2026, grupo infoEstagiario.

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_profiles_category_code_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_profiles_category_code_check
  check (category_code in ('701','711','712','721','722','723','731','734','738','741','751','761','771','781','901','906'));

alter table public.rh_tsv_esocial_profiles
  add column if not exists internship_nature text,
  add column if not exists internship_level integer,
  add column if not exists internship_area text,
  add column if not exists internship_policy_number text,
  add column if not exists internship_expected_end date,
  add column if not exists education_institution_cnpj text,
  add column if not exists education_institution_name text,
  add column if not exists education_institution_street text,
  add column if not exists education_institution_number text,
  add column if not exists education_institution_neighborhood text,
  add column if not exists education_institution_postal_code text,
  add column if not exists education_institution_city_ibge_code text,
  add column if not exists education_institution_state_code text,
  add column if not exists integration_agent_cnpj text,
  add column if not exists internship_supervisor_cpf text;

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_profiles_student_shape_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_profiles_student_shape_check check (
    (
      category_code not in ('901','906')
      and internship_nature is null
      and internship_level is null
      and internship_area is null
      and internship_policy_number is null
      and internship_expected_end is null
      and education_institution_cnpj is null
      and education_institution_name is null
      and education_institution_street is null
      and education_institution_number is null
      and education_institution_neighborhood is null
      and education_institution_postal_code is null
      and education_institution_city_ibge_code is null
      and education_institution_state_code is null
      and integration_agent_cnpj is null
      and internship_supervisor_cpf is null
    )
    or (
      category_code='901'
      and internship_nature in ('O','N')
      and internship_level in (1,2,3,4,8,9)
      and internship_expected_end is not null
      and (
        (education_institution_cnpj ~ '^[0-9]{14}$'
          and education_institution_name is null
          and education_institution_street is null
          and education_institution_number is null
          and education_institution_neighborhood is null
          and education_institution_postal_code is null
          and education_institution_city_ibge_code is null
          and education_institution_state_code is null)
        or
        (education_institution_cnpj is null
          and nullif(trim(education_institution_name),'') is not null
          and nullif(trim(education_institution_street),'') is not null
          and nullif(trim(education_institution_number),'') is not null
          and nullif(trim(education_institution_neighborhood),'') is not null
          and education_institution_postal_code ~ '^[0-9]{8}$'
          and education_institution_city_ibge_code ~ '^[0-9]{7}$'
          and education_institution_state_code ~ '^[A-Z]{2}$')
      )
      and (integration_agent_cnpj is null or integration_agent_cnpj ~ '^[0-9]{14}$')
      and (internship_supervisor_cpf is null or internship_supervisor_cpf ~ '^[0-9]{11}$')
    )
    or (
      category_code='906'
      and internship_nature='N'
      and (internship_level is null or internship_level in (1,2,3,4,8))
      and internship_expected_end is not null
      and (
        (education_institution_cnpj ~ '^[0-9]{14}$'
          and education_institution_name is null
          and education_institution_street is null
          and education_institution_number is null
          and education_institution_neighborhood is null
          and education_institution_postal_code is null
          and education_institution_city_ibge_code is null
          and education_institution_state_code is null)
        or
        (education_institution_cnpj is null
          and nullif(trim(education_institution_name),'') is not null
          and nullif(trim(education_institution_street),'') is not null
          and nullif(trim(education_institution_number),'') is not null
          and nullif(trim(education_institution_neighborhood),'') is not null
          and education_institution_postal_code ~ '^[0-9]{8}$'
          and education_institution_city_ibge_code ~ '^[0-9]{7}$'
          and education_institution_state_code ~ '^[A-Z]{2}$')
      )
      and integration_agent_cnpj is null
      and internship_supervisor_cpf is null
    )
  );

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_profiles_student_dates_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_profiles_student_dates_check check (
    category_code not in ('901','906')
    or internship_expected_end is not null
  );

comment on column public.rh_tsv_esocial_profiles.internship_nature is 'S-2300 infoEstagiario/natEstagio; categoria 906 exige N.';
comment on column public.rh_tsv_esocial_profiles.internship_level is 'S-2300 infoEstagiario/nivEstagio; obrigatório na categoria 901.';
