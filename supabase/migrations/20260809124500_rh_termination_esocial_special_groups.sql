alter table public.rh_termination_cases
  add column if not exists esocial_judicial_process_number text,
  add column if not exists successor_registration_type integer check(successor_registration_type is null or successor_registration_type in(1,2)),
  add column if not exists successor_registration_number text,
  add column if not exists new_cpf text,
  add column if not exists post_termination_remuneration_indicator integer check(post_termination_remuneration_indicator is null or post_termination_remuneration_indicator in(1,2,3)),
  add column if not exists post_termination_remuneration_end date,
  add constraint rh_termination_post_remun_pair check((post_termination_remuneration_indicator is null)=(post_termination_remuneration_end is null));
comment on column public.rh_termination_cases.new_cpf is 'S-2299 mudancaCPF/novoCPF no motivo 36; S-2399 no motivo 07.';
comment on column public.rh_termination_cases.successor_registration_number is 'S-2299 sucessaoVinc/nrInsc para motivos de sucessão previstos no leiaute vigente.';
comment on column public.rh_termination_cases.post_termination_remuneration_indicator is 'S-2299 remunAposDeslig: 1 quarentena, 2 desligamento judicial anterior, 3 aposentadoria servidor; S-2399 aceita 1/2.';
