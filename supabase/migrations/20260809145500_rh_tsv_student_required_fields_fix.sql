-- S-2300 categorias 901/906 — tornar obrigatoriedade explícita no PostgreSQL.
-- CHECK aceita UNKNOWN/NULL; por isso campos obrigatórios precisam de IS NOT NULL
-- antes de validações como IN/regex. Mantém banco, gerador e XSD com a mesma regra.

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
      and internship_nature is not null
      and internship_nature in ('O','N')
      and internship_level is not null
      and internship_level in (1,2,3,4,8,9)
      and internship_expected_end is not null
      and (
        (
          education_institution_cnpj is not null
          and education_institution_cnpj ~ '^[0-9]{14}$'
          and education_institution_name is null
          and education_institution_street is null
          and education_institution_number is null
          and education_institution_neighborhood is null
          and education_institution_postal_code is null
          and education_institution_city_ibge_code is null
          and education_institution_state_code is null
        )
        or
        (
          education_institution_cnpj is null
          and nullif(trim(education_institution_name),'') is not null
          and nullif(trim(education_institution_street),'') is not null
          and nullif(trim(education_institution_number),'') is not null
          and nullif(trim(education_institution_neighborhood),'') is not null
          and (
            education_institution_postal_code is null
            or education_institution_postal_code ~ '^[0-9]{8}$'
          )
          and (
            education_institution_city_ibge_code is null
            or education_institution_city_ibge_code ~ '^[0-9]{7}$'
          )
          and (
            education_institution_state_code is null
            or education_institution_state_code ~ '^[A-Z]{2}$'
          )
        )
      )
      and (integration_agent_cnpj is null or integration_agent_cnpj ~ '^[0-9]{14}$')
      and (internship_supervisor_cpf is null or internship_supervisor_cpf ~ '^[0-9]{11}$')
    )
    or (
      category_code='906'
      and internship_nature is not null
      and internship_nature='N'
      and (internship_level is null or internship_level in (1,2,3,4,8))
      and internship_expected_end is not null
      and (
        (
          education_institution_cnpj is not null
          and education_institution_cnpj ~ '^[0-9]{14}$'
          and education_institution_name is null
          and education_institution_street is null
          and education_institution_number is null
          and education_institution_neighborhood is null
          and education_institution_postal_code is null
          and education_institution_city_ibge_code is null
          and education_institution_state_code is null
        )
        or
        (
          education_institution_cnpj is null
          and nullif(trim(education_institution_name),'') is not null
          and nullif(trim(education_institution_street),'') is not null
          and nullif(trim(education_institution_number),'') is not null
          and nullif(trim(education_institution_neighborhood),'') is not null
          and (
            education_institution_postal_code is null
            or education_institution_postal_code ~ '^[0-9]{8}$'
          )
          and (
            education_institution_city_ibge_code is null
            or education_institution_city_ibge_code ~ '^[0-9]{7}$'
          )
          and (
            education_institution_state_code is null
            or education_institution_state_code ~ '^[A-Z]{2}$'
          )
        )
      )
      and integration_agent_cnpj is null
      and internship_supervisor_cpf is null
    )
  );

comment on constraint rh_tsv_esocial_profiles_student_shape_check
  on public.rh_tsv_esocial_profiles is
  'S-2300 901/906: campos obrigatórios usam IS NOT NULL explícito para impedir UNKNOWN em CHECK; instituição deve ser CNPJ ou identificação/endereço textual.';
