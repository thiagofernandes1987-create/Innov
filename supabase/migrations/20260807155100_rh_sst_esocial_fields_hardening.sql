alter table public.rh_sst_cat_cases drop constraint if exists rh_sst_cat_cases_location_type_check;
alter table public.rh_sst_cat_cases add constraint rh_sst_cat_cases_location_type_check check(location_type in(1,2,3,4,5,6,9));
alter table public.rh_sst_cat_cases drop constraint if exists rh_sst_cat_cases_initiator_type_check;
alter table public.rh_sst_cat_cases add constraint rh_sst_cat_cases_initiator_type_check check(initiator_type in(1,2,3));
alter table public.rh_sst_cat_cases add column if not exists observation text;
alter table public.rh_sst_cat_cases add column if not exists street_type text;
alter table public.rh_sst_cat_cases add column if not exists street text;
alter table public.rh_sst_cat_cases add column if not exists street_number text;
alter table public.rh_sst_cat_cases add column if not exists complement text;
alter table public.rh_sst_cat_cases add column if not exists neighborhood text;
alter table public.rh_sst_cat_cases add column if not exists postal_code text;
alter table public.rh_sst_cat_cases add column if not exists foreign_postal_code text;

alter table public.rh_sst_cat_medical_attestations add column if not exists injury_description text;
alter table public.rh_sst_cat_medical_attestations add column if not exists probable_diagnosis text;
alter table public.rh_sst_cat_medical_attestations add column if not exists observation text;

alter table public.rh_sst_exam_procedures drop constraint if exists rh_sst_exam_procedures_result_interpretation_check;
alter table public.rh_sst_exam_procedures add constraint rh_sst_exam_procedures_result_interpretation_check check(result_interpretation is null or result_interpretation between 1 and 4);
alter table public.rh_sst_exam_procedures add column if not exists procedure_observation text;
alter table public.rh_sst_exam_procedures add column if not exists exam_order_code integer check(exam_order_code is null or exam_order_code in(1,2));

alter table public.rh_sst_exposure_periods add column if not exists environment_location_type integer not null default 1 check(environment_location_type in(1,2));
alter table public.rh_sst_exposure_periods add column if not exists sector_description text;
alter table public.rh_sst_exposure_periods add column if not exists environmental_observation text;

alter table public.rh_sst_exposure_agents add column if not exists agent_description text;
alter table public.rh_sst_exposure_agents add column if not exists evaluation_type integer check(evaluation_type is null or evaluation_type in(1,2));
alter table public.rh_sst_exposure_agents add column if not exists tolerance_limit numeric(18,4);
alter table public.rh_sst_exposure_agents add column if not exists measurement_unit_code integer check(measurement_unit_code is null or measurement_unit_code between 1 and 30);
alter table public.rh_sst_exposure_agents add column if not exists judicial_process_number text;
alter table public.rh_sst_exposure_agents add column if not exists protective_measures_attempted boolean;
alter table public.rh_sst_exposure_agents add column if not exists uninterrupted_use_observed boolean;

-- Estrutura gerencial guarda apenas resultado de aptidão/procedimentos. Diagnóstico clínico detalhado
-- não é requerido para S-2220 e deve permanecer fora desta superfície operacional.
