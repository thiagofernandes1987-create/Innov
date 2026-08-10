-- S-2300: grupos próprios 401 (dirigente sindical), 305/410 (cedido)
-- e 304 (mandato eletivo), conforme leiaute S-1.3/NT 06-2026.

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_profiles_category_code_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_profiles_category_code_check
  check (category_code in (
    '304','305','401','410',
    '701','711','712','721','722','723','731','734','738','741','751','761','771','781',
    '901','906'
  ));

alter table public.rh_tsv_esocial_profiles
  add column if not exists special_activity_nature integer,
  add column if not exists special_function_name text,
  add column if not exists special_function_cbo_code text,
  add column if not exists union_origin_category text,
  add column if not exists union_origin_registration_type integer,
  add column if not exists union_origin_registration_number text,
  add column if not exists union_origin_admission_date date,
  add column if not exists union_origin_registration text,
  add column if not exists union_origin_work_regime integer,
  add column if not exists union_origin_social_security_regime integer,
  add column if not exists ceded_origin_category text,
  add column if not exists cedent_cnpj text,
  add column if not exists cedent_registration text,
  add column if not exists cedent_admission_date date,
  add column if not exists ceded_work_regime integer,
  add column if not exists ceded_social_security_regime integer,
  add column if not exists mandate_origin_category text,
  add column if not exists mandate_origin_cnpj text,
  add column if not exists mandate_origin_registration text,
  add column if not exists mandate_origin_exercise_date date,
  add column if not exists mandate_keep_origin_remuneration text,
  add column if not exists mandate_work_regime integer,
  add column if not exists mandate_social_security_regime integer;

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_special_shape_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_special_shape_check check (
    (
      category_code not in ('304','305','401','410')
      and special_activity_nature is null
      and special_function_name is null
      and special_function_cbo_code is null
      and union_origin_category is null
      and union_origin_registration_type is null
      and union_origin_registration_number is null
      and union_origin_admission_date is null
      and union_origin_registration is null
      and union_origin_work_regime is null
      and union_origin_social_security_regime is null
      and ceded_origin_category is null
      and cedent_cnpj is null
      and cedent_registration is null
      and cedent_admission_date is null
      and ceded_work_regime is null
      and ceded_social_security_regime is null
      and mandate_origin_category is null
      and mandate_origin_cnpj is null
      and mandate_origin_registration is null
      and mandate_origin_exercise_date is null
      and mandate_keep_origin_remuneration is null
      and mandate_work_regime is null
      and mandate_social_security_regime is null
    )
    or (
      category_code='401'
      and special_activity_nature in (1,2)
      and union_origin_category is not null
      and union_origin_category ~ '^[0-9]{3}$'
      and union_origin_category<>'401'
      and union_origin_social_security_regime in (1,2,3)
      and ceded_origin_category is null
      and mandate_origin_category is null
    )
    or (
      category_code in ('305','410')
      and ceded_origin_category is not null
      and ceded_origin_category ~ '^[0-9]{3}$'
      and ceded_origin_category not in ('305','410')
      and cedent_cnpj ~ '^[0-9]{14}$'
      and nullif(trim(cedent_registration),'') is not null
      and cedent_admission_date is not null
      and ceded_work_regime in (1,2)
      and ceded_social_security_regime in (1,2,3,4)
      and (category_code<>'305' or ceded_social_security_regime=2)
      and union_origin_category is null
      and mandate_origin_category is null
    )
    or (
      category_code='304'
      and mandate_origin_category is not null
      and mandate_origin_category ~ '^[0-9]{3}$'
      and mandate_origin_category<>'304'
      and mandate_origin_cnpj ~ '^[0-9]{14}$'
      and nullif(trim(mandate_origin_registration),'') is not null
      and mandate_origin_exercise_date is not null
      and mandate_work_regime in (1,2)
      and mandate_social_security_regime in (1,2,3)
      and (mandate_keep_origin_remuneration is null or mandate_keep_origin_remuneration in ('S','N'))
      and union_origin_category is null
      and ceded_origin_category is null
    )
  );

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_special_identifiers_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_special_identifiers_check check (
    (union_origin_registration_type is null and union_origin_registration_number is null)
    or (
      union_origin_registration_type=1
      and union_origin_registration_number ~ '^[0-9]{14}$'
    )
    or (
      union_origin_registration_type=2
      and union_origin_registration_number ~ '^[0-9]{11}$'
    )
  );

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_special_function_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_special_function_check check (
    (special_function_name is null and special_function_cbo_code is null)
    or (
      nullif(trim(special_function_name),'') is not null
      and special_function_cbo_code ~ '^[0-9]{6}$'
    )
  );

comment on column public.rh_tsv_esocial_profiles.union_origin_category is 'S-2300 infoDirigenteSindical/categOrig.';
comment on column public.rh_tsv_esocial_profiles.cedent_cnpj is 'S-2300 infoTrabCedido/cnpjCednt.';
comment on column public.rh_tsv_esocial_profiles.mandate_origin_cnpj is 'S-2300 infoMandElet/cnpjOrig.';
