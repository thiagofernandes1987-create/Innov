-- T-74.2 — VACINA-004: as 47 funções que não tinham concessão nominal.
--
-- A T-74.1 revogou as 73 que já tinham `grant`, onde a revogação era segura
-- porque a concessão nominal sobrevive. Estas 47 não tinham nenhuma, e por isso
-- exigiam uma decisão por função: revogar sem conceder as tornaria
-- inalcançáveis pelo produto.
--
-- A decisão foi MEDIDA, não presumida. O critério é chamada real `.rpc("nome")`
-- em `app/` ou `lib/` — não menção do nome em qualquer contexto, que foi o
-- primeiro sinal que usei e estava errado: por menção, todas as 47 pareciam
-- chamadas pelo navegador; por chamada real, são 5.
--
--    5 com chamada real do navegador -> revoke + grant a authenticated
--   42 sem chamador no produto       -> revoke apenas
--
-- As 42 são gatilhos e auxiliares internos. **Revogar `EXECUTE` de gatilho não
-- quebra o gatilho**: o PostgreSQL confere o privilégio na criação do gatilho,
-- não a cada disparo. Isso está afirmado aqui por conhecimento do motor e
-- **precisa ser conferido no banco** na T-74.4, junto do resto — é a razão de
-- aquela tarefa exigir observar a recusa, e não só a aprovação.
--
-- A assinatura de cada linha usa **só os tipos**, sem nome de parâmetro e sem
-- `default`, que é o que o PostgreSQL exige em `revoke`. Três funções tinham
-- `default auth.uid()` e `default null`, e a extração conta parênteses para não
-- truncar no meio.

begin;

-- Chamadas pelo navegador: revogar de `public` e conceder nominalmente.
revoke all on function public.acknowledge_observability_alert(uuid,text) from public, anon;
grant execute on function public.acknowledge_observability_alert(uuid,text) to authenticated, service_role;
revoke all on function public.get_observability_dashboard(uuid,integer) from public, anon;
grant execute on function public.get_observability_dashboard(uuid,integer) to authenticated, service_role;
revoke all on function public.get_observability_events(uuid,text,text,text,uuid,timestamptz,timestamptz,integer,integer) from public, anon;
grant execute on function public.get_observability_events(uuid,text,text,text,uuid,timestamptz,timestamptz,integer,integer) to authenticated, service_role;
revoke all on function public.resolve_observability_alert(uuid,text) from public, anon;
grant execute on function public.resolve_observability_alert(uuid,text) to authenticated, service_role;
revoke all on function public.run_observability_health_snapshot(uuid) from public, anon;
grant execute on function public.run_observability_health_snapshot(uuid) to authenticated, service_role;

-- Sem chamador no produto: revogar, sem conceder a ninguém.
revoke all on function public.channel_ai_immutable_invocation() from public, anon;
revoke all on function public.channel_ai_scope_guard() from public, anon;
revoke all on function public.channel_bot_profile_scope_guard() from public, anon;
revoke all on function public.channel_homologation_evidence_immutable() from public, anon;
revoke all on function public.channel_message_plugin_decision_immutable() from public, anon;
revoke all on function public.channel_message_plugin_scope_guard() from public, anon;
revoke all on function public.channel_pilot_evidence_immutable() from public, anon;
revoke all on function public.channel_pilot_scope_guard() from public, anon;
revoke all on function public.channel_runtime_observation_immutable() from public, anon;
revoke all on function public.channel_security_immutable_event() from public, anon;
revoke all on function public.channel_verification_run_immutable() from public, anon;
revoke all on function public.effective_module_permissions(uuid,uuid,uuid) from public, anon;
revoke all on function public.fonte_de_custo_oficial(text) from public, anon;
revoke all on function public.guard_channel_delivery_account_scope() from public, anon;
revoke all on function public.guard_channel_identity_alias_scope() from public, anon;
revoke all on function public.guard_channel_ingress_scope() from public, anon;
revoke all on function public.guard_channel_media_scope() from public, anon;
revoke all on function public.guard_channel_media_state_transition() from public, anon;
revoke all on function public.guard_channel_queue_scope() from public, anon;
revoke all on function public.guard_channel_session_secret_scope() from public, anon;
revoke all on function public.guard_communication_playbook_immutable() from public, anon;
revoke all on function public.guard_session_runtime_scope() from public, anon;
revoke all on function public.open_channel_delivery_circuit_on_terminal_attempt() from public, anon;
revoke all on function public.organizations_install_observability_defaults() from public, anon;
revoke all on function public.pipeline_codigo_data(text,text) from public, anon;
revoke all on function public.prevent_rh_raw_punch_mutation() from public, anon;
revoke all on function public.project_rh_esocial_period_status() from public, anon;
revoke all on function public.project_rh_esocial_status_to_domain() from public, anon;
revoke all on function public.project_rh_termination_esocial_status() from public, anon;
revoke all on function public.protect_signature_document_version() from public, anon;
revoke all on function public.protect_signature_field_layout() from public, anon;
revoke all on function public.rh_calculate_irrf_2026(numeric,numeric,integer,numeric,numeric,jsonb) from public, anon;
revoke all on function public.rh_calculate_progressive(numeric,jsonb,text) from public, anon;
revoke all on function public.rh_calculate_progressive_accumulated(numeric,numeric,jsonb) from public, anon;
revoke all on function public.rh_irrf_2026_trace(numeric,numeric,integer,numeric,numeric,jsonb) from public, anon;
revoke all on function public.rh_seed_esocial_profiles_from_admission() from public, anon;
revoke all on function public.sanitize_audit_json(jsonb) from public, anon;
revoke all on function public.stage19_severity_rank(text) from public, anon;
revoke all on function public.task_dependency_cria_ciclo(uuid,uuid) from public, anon;
revoke all on function public.task_dependency_sem_ciclo() from public, anon;
revoke all on function public.tipologias_do_cub() from public, anon;
revoke all on function public.ufs_do_brasil() from public, anon;

commit;
