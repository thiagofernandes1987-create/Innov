-- Reforço final, simples e NULL-safe das obrigatoriedades do grupo infoEstagiario.
-- Mantemos a constraint detalhada de shape e adicionamos esta barreira explícita
-- para que um UPDATE parcial nunca consiga persistir 901/906 incompleto.

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_profiles_student_required_fields_check;

alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_profiles_student_required_fields_check check (
    case
      when category_code = '901' then
        internship_nature is not null
        and internship_level is not null
        and internship_expected_end is not null
        and (
          education_institution_cnpj is not null
          or (
            nullif(trim(education_institution_name),'') is not null
            and nullif(trim(education_institution_street),'') is not null
            and nullif(trim(education_institution_number),'') is not null
            and nullif(trim(education_institution_neighborhood),'') is not null
          )
        )
      when category_code = '906' then
        internship_nature = 'N'
        and internship_expected_end is not null
        and (
          education_institution_cnpj is not null
          or (
            nullif(trim(education_institution_name),'') is not null
            and nullif(trim(education_institution_street),'') is not null
            and nullif(trim(education_institution_number),'') is not null
            and nullif(trim(education_institution_neighborhood),'') is not null
          )
        )
      else true
    end
  );

comment on constraint rh_tsv_esocial_profiles_student_required_fields_check
  on public.rh_tsv_esocial_profiles is
  'Barreira NULL-safe: 901 exige natureza, nivel, termino e instituicao; 906 exige natureza N, termino e instituicao.';
