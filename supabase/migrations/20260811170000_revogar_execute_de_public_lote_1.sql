-- T-74.1 — VACINA-004: tirar `EXECUTE` de `PUBLIC` das 73 funções que já têm
-- concessão nominal.
--
-- No PostgreSQL, `CREATE FUNCTION` concede `EXECUTE` a `PUBLIC` por padrão, e
-- `PUBLIC` inclui `anon`. Validar permissão por dentro do corpo não remove a
-- exposição do endpoint: a função continua aparecendo como chamável por
-- visitante não autenticado. É a VACINA-004, que existe desde a etapa 10 e
-- nunca teve portão — por isso 120 de 407 funções chegaram aqui sem o revoke.
--
-- Por que estas 73 primeiro, e não as outras 47: **elas já têm `grant execute`
-- nominal**. O `revoke ... from public` retira só o privilégio herdado; a
-- concessão explícita a `authenticated` e `service_role` sobrevive intacta, e
-- nenhum chamador do produto perde acesso. Nas outras 47 não há concessão
-- nominal nenhuma, e revogar sem antes conceder as tornaria inalcançáveis —
-- é a T-74.2, que decide o papel de cada uma, uma a uma.
--
-- Conferido antes de escrever: **nenhuma das 73 concede a `anon`**, então
-- revogar de `anon` junto não tira acesso legítimo de ninguém.
--
-- A assinatura de cada linha foi copiada do próprio `grant` já existente, e
-- não reconstruída a partir da declaração da função: assinatura reconstruída
-- erra em `default`, em tipo com espaço e em sobrecarga, e o erro só aparece
-- na aplicação.
--
-- Idempotente: `revoke` de privilégio que já não existe é no-op.

begin;

-- As 71 definidoras que não são gatilho — pior caso, porque somam ignorar
-- RLS com herdar `EXECUTE` de `PUBLIC`.
revoke all on function public.accept_rh_payroll_shadow(uuid,text) from public, anon;
revoke all on function public.activate_rh_admission(uuid) from public, anon;
revoke all on function public.add_rh_payroll_base_member(uuid,uuid,uuid,numeric,date,date) from public, anon;
revoke all on function public.apply_rh_esocial_event_result(uuid,text,text,text,text,text,jsonb) from public, anon;
revoke all on function public.apply_rh_termination_rubric_mappings(uuid) from public, anon;
revoke all on function public.approve_rh_benefit_provider_invoice(uuid) from public, anon;
revoke all on function public.approve_rh_payroll_accounting_batch(uuid) from public, anon;
revoke all on function public.approve_rh_payroll_difference_case(uuid,uuid) from public, anon;
revoke all on function public.approve_rh_termination_calculation(uuid) from public, anon;
revoke all on function public.approve_rh_vacation_case(uuid) from public, anon;
revoke all on function public.authorize_rh_document_download(uuid) from public, anon;
revoke all on function public.calculate_rh_termination(uuid) from public, anon;
revoke all on function public.calculate_rh_thirteenth(uuid) from public, anon;
revoke all on function public.calculate_rh_time_period(uuid) from public, anon;
revoke all on function public.close_rh_payroll(uuid,text) from public, anon;
revoke all on function public.close_rh_time_period_to_payroll(uuid,uuid,uuid,uuid) from public, anon;
revoke all on function public.create_rh_admission_case(uuid,text,text,text,date,text,text,text,text,text,date,uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,text) from public, anon;
revoke all on function public.create_rh_contract_change(uuid,date,date,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,integer,integer,integer,integer,integer,integer,date,text,text,integer,integer,text) from public, anon;
revoke all on function public.create_rh_dctfweb_declaration(uuid,date,text,boolean,boolean,boolean,jsonb,text) from public, anon;
revoke all on function public.create_rh_derived_rubric(uuid,text,text,text,text,date,date,text,integer,text,text,text,text,text,text) from public, anon;
revoke all on function public.create_rh_employment_esocial_contract_profile_version(uuid,date,integer,integer,integer,integer,integer,integer,date,text,text,integer,integer,text) from public, anon;
revoke all on function public.create_rh_esocial_batch(uuid,uuid[]) from public, anon;
revoke all on function public.create_rh_fgts_guide(uuid,text,text,date,numeric,numeric,text) from public, anon;
revoke all on function public.create_rh_fgts_period_from_payroll(uuid,text,text,text) from public, anon;
revoke all on function public.create_rh_mit_apuration(uuid,uuid,date,boolean,integer,integer,integer,integer,boolean,text,text,text,text,text,text) from public, anon;
revoke all on function public.create_rh_payroll_base(uuid,text,text,text) from public, anon;
revoke all on function public.create_rh_payroll_parameter(uuid,text,text,text,text,date,date,numeric,jsonb,text) from public, anon;
revoke all on function public.create_rh_payroll_parameter_from_template(uuid,uuid,text) from public, anon;
revoke all on function public.create_rh_payroll_payment_batch(uuid,text,text) from public, anon;
revoke all on function public.create_rh_payroll_payments(uuid) from public, anon;
revoke all on function public.create_rh_payroll_shadow_run(uuid,text,text,numeric) from public, anon;
revoke all on function public.create_rh_rubric(uuid,text,text,text,text,date,date,text,numeric,numeric,integer,text,text,text,text,text,text) from public, anon;
revoke all on function public.create_rh_sst_aso(uuid,uuid,jsonb) from public, anon;
revoke all on function public.create_rh_sst_cat(uuid,uuid,jsonb) from public, anon;
revoke all on function public.create_rh_sst_exposure(uuid,uuid,jsonb) from public, anon;
revoke all on function public.create_rh_termination_case(uuid,uuid,date,text,text,text,integer,date,integer,integer,integer,numeric,numeric,numeric,numeric,numeric,numeric,text) from public, anon;
revoke all on function public.create_rh_worker(uuid,text,text,text,date,text,text,text,text,text,date,numeric) from public, anon;
revoke all on function public.create_rh_worker_esocial_profile_version(uuid,date,text,text,text,integer,integer,text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.export_rh_benefit_charge_to_payroll(uuid,uuid,uuid) from public, anon;
revoke all on function public.export_rh_payroll_difference_case(uuid) from public, anon;
revoke all on function public.export_rh_thirteenth(uuid,uuid,text) from public, anon;
revoke all on function public.export_rh_vacation_to_payroll(uuid,uuid,uuid,uuid,uuid) from public, anon;
revoke all on function public.finalize_rh_esocial_batch_from_events(uuid) from public, anon;
revoke all on function public.generate_rh_payroll_accounting_batch(uuid) from public, anon;
revoke all on function public.generate_rh_payroll_provisions(uuid) from public, anon;
revoke all on function public.get_my_rh_documents() from public, anon;
revoke all on function public.get_my_rh_payslip_lines(uuid) from public, anon;
revoke all on function public.get_my_rh_payslips() from public, anon;
revoke all on function public.get_rh_payslip_pdf_data(uuid) from public, anon;
revoke all on function public.install_observability_defaults(uuid) from public, anon;
revoke all on function public.make_rh_termination_effective(uuid) from public, anon;
revoke all on function public.mark_rh_esocial_batch_protocol(uuid,text,text,text) from public, anon;
revoke all on function public.mark_rh_payroll_payment_batch_generated(uuid,text,text,text) from public, anon;
revoke all on function public.mark_rh_payroll_payment_batch_sent(uuid) from public, anon;
revoke all on function public.mark_rh_sst_ready(text,uuid) from public, anon;
revoke all on function public.materialize_rh_payroll_difference(uuid,uuid,text) from public, anon;
revoke all on function public.pay_rh_benefit_provider_invoice(uuid,text,text) from public, anon;
revoke all on function public.persist_rh_esocial_generated_event(uuid,text,text,integer,text,text,text,text,uuid,integer,text,integer,text,text,text,text,text) from public, anon;
revoke all on function public.publish_rh_document_version(uuid,boolean) from public, anon;
revoke all on function public.publish_rh_payslips(uuid) from public, anon;
revoke all on function public.reconcile_rh_benefit_provider_invoice(uuid) from public, anon;
revoke all on function public.reconcile_rh_payroll_shadow(uuid) from public, anon;
revoke all on function public.record_rh_dctfweb_external_snapshot(uuid,text,text,numeric,numeric,numeric,numeric,text,text) from public, anon;
revoke all on function public.record_rh_fgts_payment(uuid,numeric,timestamptz,text,text,text) from public, anon;
revoke all on function public.run_rh_payroll(uuid) from public, anon;
revoke all on function public.set_rh_admission_checklist_item(uuid,text,text) from public, anon;
revoke all on function public.set_rh_shadow_rubric_external(uuid,uuid,text,numeric,text) from public, anon;
revoke all on function public.set_rh_shadow_worker_external(uuid,uuid,numeric,numeric,numeric,text) from public, anon;
revoke all on function public.settle_rh_payroll_payment(uuid,timestamptz,text,text,text) from public, anon;
revoke all on function public.update_rh_fgts_worker_external(uuid,numeric,numeric,text,text,text,text) from public, anon;
revoke all on function public.upsert_rh_dctfweb_reconciliation_item(uuid,text,text,numeric,numeric,text,text,text,text) from public, anon;

-- As 2 demais.
revoke all on function public.pipeline_preset_estagios(text) from public, anon;
revoke all on function public.pipeline_presets() from public, anon;

commit;
