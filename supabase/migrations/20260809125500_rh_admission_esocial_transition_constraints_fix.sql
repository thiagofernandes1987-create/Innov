-- PostgreSQL CHECK considera NULL como não reprovado. Reescrevemos as
-- invariantes da transição S-2200 com testes explícitos de nulidade.

alter table public.rh_admission_esocial_profiles
  drop constraint if exists rh_admission_esocial_transition_shape_check;
alter table public.rh_admission_esocial_profiles
  add constraint rh_admission_esocial_transition_shape_check check (
    (
      admission_type = 1
      and succession_registration_type is null
      and succession_registration_number is null
      and succession_previous_registration is null
      and succession_transfer_date is null
      and cpf_change_previous_cpf is null
      and cpf_change_previous_registration is null
      and cpf_change_date is null
    )
    or (
      admission_type in (2,3,4,7)
      and original_admission_date is not null
      and succession_registration_type is not null
      and succession_registration_type in (1,2,5,6)
      and succession_registration_number is not null
      and nullif(trim(succession_registration_number),'') is not null
      and succession_previous_registration is not null
      and nullif(trim(succession_previous_registration),'') is not null
      and succession_transfer_date is not null
      and succession_transfer_date > original_admission_date
      and cpf_change_previous_cpf is null
      and cpf_change_previous_registration is null
      and cpf_change_date is null
    )
    or (
      admission_type = 6
      and original_admission_date is not null
      and cpf_change_previous_cpf is not null
      and cpf_change_previous_cpf ~ '^[0-9]{11}$'
      and cpf_change_previous_registration is not null
      and nullif(trim(cpf_change_previous_registration),'') is not null
      and cpf_change_date is not null
      and cpf_change_date > original_admission_date
      and succession_registration_type is null
      and succession_registration_number is null
      and succession_previous_registration is null
      and succession_transfer_date is null
    )
  );

alter table public.rh_admission_esocial_profiles
  drop constraint if exists rh_admission_esocial_judicial_shape_check;
alter table public.rh_admission_esocial_profiles
  add constraint rh_admission_esocial_judicial_shape_check check (
    (
      admission_indicator = 3
      and admission_judicial_process_number is not null
      and admission_judicial_process_number ~ '^[0-9]{20}$'
    )
    or (
      admission_indicator in (1,2)
      and admission_judicial_process_number is null
    )
  );

alter table public.rh_admission_esocial_profiles
  drop constraint if exists rh_admission_esocial_succession_registration_check;
alter table public.rh_admission_esocial_profiles
  add constraint rh_admission_esocial_succession_registration_check check (
    succession_registration_type is null
    or (
      succession_registration_number is not null
      and (
        (succession_registration_type = 1 and succession_registration_number ~ '^[0-9]{14}$')
        or (succession_registration_type = 2 and succession_registration_number ~ '^[0-9]{11}$')
        or (succession_registration_type = 5 and succession_registration_number ~ '^[0-9]{8,14}$')
        or (succession_registration_type = 6 and succession_registration_number ~ '^[0-9]{12}$')
      )
    )
  );
