create table if not exists public.rh_sst_exposure_epi_documents(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  exposure_agent_id uuid not null references public.rh_sst_exposure_agents(id) on delete cascade,document_number text not null,
  created_at timestamptz not null default now(),unique(exposure_agent_id,document_number)
);
alter table public.rh_sst_exposure_epi_documents enable row level security;
create policy rh_read on public.rh_sst_exposure_epi_documents for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_sst_exposure_epi_documents for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

create or replace function public.create_rh_sst_cat(p_organization_id uuid,p_employment_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_body jsonb;v_agent jsonb;v_att jsonb;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from public.rh_employments where id=p_employment_id and organization_id=p_organization_id) then raise exception 'Vínculo inválido';end if;
 v_body:=p_payload->'bodyPart';v_agent:=p_payload->'agent';v_att:=p_payload->'attestation';
 if v_body is null or v_agent is null or v_att is null then raise exception 'CAT exige parte atingida, agente e atestado';end if;
 insert into public.rh_sst_cat_cases(organization_id,employment_id,accident_date,accident_time,hours_worked_before,accident_type,cat_type,death,death_date,police_report,generating_situation_code,initiator_type,last_worked_day,caused_leave,location_type,establishment_registration_type,establishment_registration_number,location_description,street_type,street,street_number,complement,neighborhood,postal_code,city_ibge_code,state_code,country_code,foreign_postal_code,observation,evidence_reference,created_by)
 values(p_organization_id,p_employment_id,(p_payload->>'accidentDate')::date,nullif(p_payload->>'accidentTime','')::time,nullif(p_payload->>'hoursWorkedBefore','')::numeric,(p_payload->>'accidentType')::integer,coalesce((p_payload->>'catType')::integer,1),coalesce((p_payload->>'death')::boolean,false),nullif(p_payload->>'deathDate','')::date,coalesce((p_payload->>'policeReport')::boolean,false),p_payload->>'generatingSituationCode',(p_payload->>'initiatorType')::integer,nullif(p_payload->>'lastWorkedDay','')::date,coalesce((p_payload->>'causedLeave')::boolean,false),(p_payload->>'locationType')::integer,nullif(p_payload->>'establishmentRegistrationType','')::integer,nullif(p_payload->>'establishmentRegistrationNumber',''),coalesce(p_payload->>'locationDescription',''),nullif(p_payload->>'streetType',''),coalesce(p_payload->>'street',''),coalesce(p_payload->>'streetNumber','S/N'),nullif(p_payload->>'complement',''),nullif(p_payload->>'neighborhood',''),nullif(regexp_replace(coalesce(p_payload->>'postalCode',''),'\D','','g'),''),nullif(regexp_replace(coalesce(p_payload->>'cityIbgeCode',''),'\D','','g'),''),nullif(p_payload->>'stateCode',''),nullif(p_payload->>'countryCode',''),nullif(p_payload->>'foreignPostalCode',''),nullif(p_payload->>'observation',''),nullif(p_payload->>'evidenceReference',''),auth.uid()) returning id into v_id;
 insert into public.rh_sst_cat_body_parts(organization_id,cat_case_id,body_part_code,laterality) values(p_organization_id,v_id,v_body->>'code',coalesce((v_body->>'laterality')::integer,0));
 insert into public.rh_sst_cat_agents(organization_id,cat_case_id,agent_code) values(p_organization_id,v_id,v_agent->>'code');
 insert into public.rh_sst_cat_medical_attestations(organization_id,cat_case_id,attendance_date,attendance_time,hospitalization,treatment_duration_days,leave_recommended,injury_nature_code,injury_description,probable_diagnosis,cid_code,observation,professional_name,professional_registration_type,professional_registration_number,professional_state)
 values(p_organization_id,v_id,(v_att->>'attendanceDate')::date,(v_att->>'attendanceTime')::time,coalesce((v_att->>'hospitalization')::boolean,false),coalesce((v_att->>'treatmentDurationDays')::integer,0),coalesce((v_att->>'leaveRecommended')::boolean,false),v_att->>'injuryNatureCode',nullif(v_att->>'injuryDescription',''),nullif(v_att->>'probableDiagnosis',''),v_att->>'cidCode',nullif(v_att->>'observation',''),v_att->>'professionalName',v_att->>'professionalRegistrationType',v_att->>'professionalRegistrationNumber',nullif(v_att->>'professionalState',''));
 return v_id;
end$$;

create or replace function public.create_rh_sst_aso(p_organization_id uuid,p_employment_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_proc jsonb;v_count integer:=0;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from public.rh_employments where id=p_employment_id and organization_id=p_organization_id) then raise exception 'Vínculo inválido';end if;
 if jsonb_typeof(p_payload->'procedures')<>'array' or jsonb_array_length(p_payload->'procedures')<1 or jsonb_array_length(p_payload->'procedures')>99 then raise exception 'ASO exige de 1 a 99 procedimentos';end if;
 insert into public.rh_sst_aso_records(organization_id,employment_id,exam_type,aso_date,result_code,physician_name,physician_cpf,physician_registration_number,physician_state,pcmso_responsible_cpf,pcmso_responsible_name,pcmso_responsible_registration_number,pcmso_responsible_state,evidence_reference,created_by)
 values(p_organization_id,p_employment_id,(p_payload->>'examType')::integer,(p_payload->>'asoDate')::date,nullif(p_payload->>'resultCode','')::integer,p_payload->>'physicianName',regexp_replace(coalesce(p_payload->>'physicianCpf',''),'\D','','g'),nullif(p_payload->>'physicianCrm',''),nullif(p_payload->>'physicianState',''),nullif(regexp_replace(coalesce(p_payload->>'pcmsoResponsibleCpf',''),'\D','','g'),''),nullif(p_payload->>'pcmsoResponsibleName',''),nullif(p_payload->>'pcmsoResponsibleCrm',''),nullif(p_payload->>'pcmsoResponsibleState',''),nullif(p_payload->>'evidenceReference',''),auth.uid()) returning id into v_id;
 for v_proc in select value from jsonb_array_elements(p_payload->'procedures') loop v_count:=v_count+1;
   insert into public.rh_sst_exam_procedures(organization_id,aso_id,exam_date,procedure_code,procedure_observation,exam_order_code,result_interpretation,order_number)
   values(p_organization_id,v_id,(v_proc->>'examDate')::date,v_proc->>'procedureCode',nullif(v_proc->>'observation',''),nullif(v_proc->>'examOrderCode','')::integer,nullif(v_proc->>'resultCode','')::integer,v_count);
 end loop;
 return v_id;
end$$;

create or replace function public.create_rh_sst_exposure(p_organization_id uuid,p_employment_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_agent_id uuid;v_agent jsonb;v_doc jsonb;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from public.rh_employments where id=p_employment_id and organization_id=p_organization_id) then raise exception 'Vínculo inválido';end if;
 if jsonb_typeof(p_payload->'agents')<>'array' or jsonb_array_length(p_payload->'agents')<1 then raise exception 'Exposição exige ao menos um agente';end if;
 insert into public.rh_sst_exposure_periods(organization_id,employment_id,valid_from,valid_to,environment_code,environment_location_type,sector_description,activity_description,environment_registration_type,environment_registration_number,responsible_cpf,responsible_registration_type,responsible_registration_number,responsible_state,environmental_observation,evidence_reference,created_by)
 values(p_organization_id,p_employment_id,(p_payload->>'validFrom')::date,nullif(p_payload->>'validTo','')::date,coalesce(p_payload->>'environmentCode','ENV'),coalesce((p_payload->>'environmentLocationType')::integer,1),p_payload->>'sectorDescription',p_payload->>'activityDescription',nullif(p_payload->>'environmentRegistrationType','')::integer,nullif(p_payload->>'environmentRegistrationNumber',''),nullif(regexp_replace(coalesce(p_payload->>'responsibleCpf',''),'\D','','g'),''),nullif(p_payload->>'responsibleRegistrationType',''),nullif(p_payload->>'responsibleRegistrationNumber',''),nullif(p_payload->>'responsibleState',''),nullif(p_payload->>'observation',''),nullif(p_payload->>'evidenceReference',''),auth.uid()) returning id into v_id;
 for v_agent in select value from jsonb_array_elements(p_payload->'agents') loop
   insert into public.rh_sst_exposure_agents(organization_id,exposure_period_id,agent_code,agent_description,evaluation_type,intensity_concentration,tolerance_limit,measurement_unit_code,technique,judicial_process_number,epc_implemented,epc_effective,epi_used,epi_effective,protective_measures_attempted,epi_use_condition_compliant,uninterrupted_use_observed,epi_expiry_observed,epi_change_frequency_observed,epi_cleaning_observed)
   values(p_organization_id,v_id,v_agent->>'agentCode',nullif(v_agent->>'description',''),nullif(v_agent->>'evaluationType','')::integer,nullif(v_agent->>'intensity','')::numeric,nullif(v_agent->>'toleranceLimit','')::numeric,nullif(v_agent->>'unitCode','')::integer,nullif(v_agent->>'measurementTechnique',''),nullif(v_agent->>'judicialProcessNumber',''),nullif(v_agent->>'epcImplemented','')::boolean,nullif(v_agent->>'epcEffective','')::boolean,nullif(v_agent->>'epiUsed','')::boolean,nullif(v_agent->>'epiEffective','')::boolean,nullif(v_agent->>'protectiveMeasuresAttempted','')::boolean,nullif(v_agent->>'epiUseConditionCompliant','')::boolean,nullif(v_agent->>'uninterruptedUseObserved','')::boolean,nullif(v_agent->>'epiExpiryObserved','')::boolean,nullif(v_agent->>'epiChangeFrequencyObserved','')::boolean,nullif(v_agent->>'epiCleaningObserved','')::boolean) returning id into v_agent_id;
   if jsonb_typeof(v_agent->'epiDocuments')='array' then for v_doc in select value from jsonb_array_elements(v_agent->'epiDocuments') loop insert into public.rh_sst_exposure_epi_documents(organization_id,exposure_agent_id,document_number) values(p_organization_id,v_agent_id,trim(both '"' from v_doc::text));end loop;end if;
 end loop;
 return v_id;
end$$;

grant execute on function public.create_rh_sst_cat(uuid,uuid,jsonb) to authenticated;
grant execute on function public.create_rh_sst_aso(uuid,uuid,jsonb) to authenticated;
grant execute on function public.create_rh_sst_exposure(uuid,uuid,jsonb) to authenticated;
