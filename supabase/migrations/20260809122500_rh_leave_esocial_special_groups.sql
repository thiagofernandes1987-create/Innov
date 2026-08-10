alter table public.rh_leave_cases
  add column if not exists esocial_same_reason_60_days text check(esocial_same_reason_60_days is null or esocial_same_reason_60_days in('S','N')),
  add column if not exists esocial_traffic_accident_type integer check(esocial_traffic_accident_type is null or esocial_traffic_accident_type in(1,2,3)),
  add column if not exists vacation_acquisition_start date,
  add column if not exists vacation_acquisition_end date,
  add column if not exists cession_cnpj text,
  add column if not exists cession_burden integer check(cession_burden is null or cession_burden in(1,2,3)),
  add column if not exists union_mandate_cnpj text,
  add column if not exists union_remuneration_burden integer check(union_remuneration_burden is null or union_remuneration_burden in(1,2,3)),
  add column if not exists elective_mandate_cnpj text,
  add column if not exists elected_position_remuneration text check(elected_position_remuneration is null or elected_position_remuneration in('S','N')),
  add column if not exists rectification_receipt text,
  add column if not exists rectification_previous_reason text check(rectification_previous_reason is null or rectification_previous_reason ~ '^[0-9]{2}$'),
  add column if not exists rectification_origin integer check(rectification_origin is null or rectification_origin in(1,2,3)),
  add column if not exists rectification_process_type integer check(rectification_process_type is null or rectification_process_type in(1,2,3)),
  add column if not exists rectification_process_number text,
  add constraint rh_leave_vacation_acquisition_dates check(vacation_acquisition_end is null or vacation_acquisition_start is not null and vacation_acquisition_end>vacation_acquisition_start);

comment on column public.rh_leave_cases.cession_cnpj is 'S-2230/infoCessao/cnpjCess, obrigatório para codMotAfast 14.';
comment on column public.rh_leave_cases.union_mandate_cnpj is 'S-2230/infoMandSind/cnpjSind, obrigatório para codMotAfast 24.';
comment on column public.rh_leave_cases.elective_mandate_cnpj is 'S-2230/infoMandElet/cnpjMandElet, condicionado ao motivo 22 e natureza jurídica do declarante.';
comment on column public.rh_leave_cases.rectification_receipt is 'Recibo do S-2230 original a retificar; ativa indRetif=2.';
