begin;

-- Funções expostas devem usar um search_path determinístico.
alter function public.touch_updated_at() set search_path = public, pg_temp;
alter function public.is_aal2() set search_path = public, auth, pg_temp;

-- Remove a permissão implícita de EXECUTE concedida ao papel SQL PUBLIC.
revoke execute on function public.accept_proposal(uuid,text,text) from public;
revoke execute on function public.apply_signed_amendment(uuid) from public;
revoke execute on function public.calculate_budget_version_core(uuid) from public;
revoke execute on function public.calculate_budget_version(uuid) from public;
revoke execute on function public.create_amendment(uuid,text,text,text,numeric,integer,date,uuid) from public;
revoke execute on function public.create_budget_version(uuid,text,public.budget_scenario_type) from public;
revoke execute on function public.create_budget(uuid,uuid,text,text,date,uuid,uuid) from public;
revoke execute on function public.create_contract_from_proposal(uuid,text,text,text,uuid) from public;
revoke execute on function public.create_sandbox_signature_envelope(uuid,uuid,text,jsonb) from public;
revoke execute on function public.decide_budget_approval(uuid,public.approval_status,text) from public;
revoke execute on function public.freeze_budget_version(uuid) from public;
revoke execute on function public.has_org_role(uuid,public.org_role[]) from public;
revoke execute on function public.is_aal2() from public;
revoke execute on function public.is_client_owner(uuid) from public;
revoke execute on function public.is_internal_member(uuid) from public;
revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.prevent_frozen_budget_item_mutation() from public;
revoke execute on function public.prevent_frozen_budget_version_mutation() from public;
revoke execute on function public.release_proposal_version(uuid) from public;
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.sandbox_signature_event_core(uuid,text,text) from public;
revoke execute on function public.sandbox_signature_event(uuid,text,text) from public;
revoke execute on function public.touch_updated_at() from public;
revoke execute on function public.write_audit(uuid,text,uuid,text,jsonb,uuid) from public;

-- Bloqueia explicitamente o papel anônimo.
revoke execute on function public.accept_proposal(uuid,text,text) from anon;
revoke execute on function public.calculate_budget_version(uuid) from anon;
revoke execute on function public.create_amendment(uuid,text,text,text,numeric,integer,date,uuid) from anon;
revoke execute on function public.create_budget_version(uuid,text,public.budget_scenario_type) from anon;
revoke execute on function public.create_budget(uuid,uuid,text,text,date,uuid,uuid) from anon;
revoke execute on function public.create_contract_from_proposal(uuid,text,text,text,uuid) from anon;
revoke execute on function public.create_sandbox_signature_envelope(uuid,uuid,text,jsonb) from anon;
revoke execute on function public.decide_budget_approval(uuid,public.approval_status,text) from anon;
revoke execute on function public.freeze_budget_version(uuid) from anon;
revoke execute on function public.release_proposal_version(uuid) from anon;
revoke execute on function public.sandbox_signature_event(uuid,text,text) from anon;
revoke execute on function public.has_org_role(uuid,public.org_role[]) from anon;
revoke execute on function public.is_aal2() from anon;
revoke execute on function public.is_client_owner(uuid) from anon;
revoke execute on function public.is_internal_member(uuid) from anon;
revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.touch_updated_at() from anon;
revoke execute on function public.prevent_frozen_budget_item_mutation() from anon;
revoke execute on function public.prevent_frozen_budget_version_mutation() from anon;

-- Funções de gatilho e infraestrutura não podem ser chamadas pela API autenticada.
revoke execute on function public.rls_auto_enable() from authenticated;
revoke execute on function public.touch_updated_at() from authenticated;
revoke execute on function public.prevent_frozen_budget_item_mutation() from authenticated;
revoke execute on function public.prevent_frozen_budget_version_mutation() from authenticated;

-- RPCs de negócio e auxiliares RLS necessárias para usuários autenticados.
grant execute on function public.accept_proposal(uuid,text,text) to authenticated;
grant execute on function public.calculate_budget_version(uuid) to authenticated;
grant execute on function public.create_amendment(uuid,text,text,text,numeric,integer,date,uuid) to authenticated;
grant execute on function public.create_budget_version(uuid,text,public.budget_scenario_type) to authenticated;
grant execute on function public.create_budget(uuid,uuid,text,text,date,uuid,uuid) to authenticated;
grant execute on function public.create_contract_from_proposal(uuid,text,text,text,uuid) to authenticated;
grant execute on function public.create_sandbox_signature_envelope(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.decide_budget_approval(uuid,public.approval_status,text) to authenticated;
grant execute on function public.freeze_budget_version(uuid) to authenticated;
grant execute on function public.release_proposal_version(uuid) to authenticated;
grant execute on function public.sandbox_signature_event(uuid,text,text) to authenticated;
grant execute on function public.has_org_role(uuid,public.org_role[]) to authenticated;
grant execute on function public.is_aal2() to authenticated;
grant execute on function public.is_client_owner(uuid) to authenticated;
grant execute on function public.is_internal_member(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

commit;
