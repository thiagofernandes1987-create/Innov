begin;

create or replace function public.is_internal_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.active
      and m.role <> 'CLIENTE'
  );
$$;

-- Perfis básicos: cliente consulta somente seu cadastro; equipe interna consulta a organização.
drop policy if exists clients_internal_or_owner on public.clients;
create policy clients_internal_or_owner
on public.clients for select
using (public.is_internal_member(organization_id) or user_id = auth.uid());

drop policy if exists projects_internal_or_client on public.projects;
create policy projects_internal_or_client
on public.projects for select
using (public.is_internal_member(organization_id) or public.is_client_owner(client_id));

drop policy if exists opportunities_internal on public.opportunities;
create policy opportunities_internal
on public.opportunities for all
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

-- Substitui políticas financeiras genéricas que antes aceitavam qualquer membership.
do $$
declare t text;
begin
  foreach t in array array[
    'cost_catalog_items','cost_compositions','cost_composition_versions','cost_composition_items',
    'fixed_costs','administrative_fee_models','bdi_models','bdi_model_versions','markup_models',
    'budgets','budget_versions','budget_sections','budget_items','budget_scenarios',
    'budget_approvals','budget_validation_results','contract_templates','contract_parties',
    'signature_envelopes','signature_signers','signature_events','document_access_logs'
  ] loop
    execute format('drop policy if exists %I_internal on public.%I', t, t);
    execute format(
      'create policy %I_internal on public.%I for all using (public.is_internal_member(organization_id)) with check (public.is_internal_member(organization_id))',
      t, t
    );
  end loop;
end $$;

-- Propostas: equipe interna trabalha; cliente apenas lê a própria versão explicitamente liberada.
drop policy if exists proposals_internal_or_client on public.proposals;
drop policy if exists proposals_internal_write on public.proposals;
create policy proposals_internal_or_client
on public.proposals for select
using (
  public.is_internal_member(organization_id)
  or (public.is_client_owner(client_id) and client_released_at is not null)
);
create policy proposals_internal_write
on public.proposals for all
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

drop policy if exists proposal_versions_internal_or_client on public.proposal_versions;
drop policy if exists proposal_versions_internal_write on public.proposal_versions;
create policy proposal_versions_internal_or_client
on public.proposal_versions for select
using (
  public.is_internal_member(organization_id)
  or (
    client_released_at is not null
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.is_client_owner(p.client_id)
    )
  )
);
create policy proposal_versions_internal_write
on public.proposal_versions for all
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

-- Contratos e aditivos seguem a mesma separação.
drop policy if exists contracts_internal_or_client on public.contracts;
drop policy if exists contracts_internal_write on public.contracts;
create policy contracts_internal_or_client
on public.contracts for select
using (
  public.is_internal_member(organization_id)
  or (public.is_client_owner(client_id) and client_released_at is not null)
);
create policy contracts_internal_write
on public.contracts for all
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

drop policy if exists contract_versions_internal_or_client on public.contract_versions;
drop policy if exists contract_versions_internal_write on public.contract_versions;
create policy contract_versions_internal_or_client
on public.contract_versions for select
using (
  public.is_internal_member(organization_id)
  or (
    client_released_at is not null
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and public.is_client_owner(c.client_id)
    )
  )
);
create policy contract_versions_internal_write
on public.contract_versions for all
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

drop policy if exists amendments_internal_or_client on public.amendments;
drop policy if exists amendments_internal_write on public.amendments;
create policy amendments_internal_or_client
on public.amendments for select
using (
  public.is_internal_member(organization_id)
  or (
    client_released_at is not null
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and public.is_client_owner(c.client_id)
    )
  )
);
create policy amendments_internal_write
on public.amendments for all
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

drop policy if exists amendment_versions_internal_or_client on public.amendment_versions;
drop policy if exists amendment_versions_internal_write on public.amendment_versions;
create policy amendment_versions_internal_or_client
on public.amendment_versions for select
using (
  public.is_internal_member(organization_id)
  or (
    client_released_at is not null
    and exists (
      select 1
      from public.amendments a
      join public.contracts c on c.id = a.contract_id
      where a.id = amendment_id and public.is_client_owner(c.client_id)
    )
  )
);
create policy amendment_versions_internal_write
on public.amendment_versions for all
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

-- Buckets privados: acesso direto somente da equipe; cliente recebe URL assinada pelo servidor.
drop policy if exists commercial_documents_internal on storage.objects;
drop policy if exists contract_documents_internal on storage.objects;
drop policy if exists signature_artifacts_internal on storage.objects;
create policy commercial_documents_internal
on storage.objects for all
using (bucket_id = 'commercial-documents' and public.is_internal_member((storage.foldername(name))[1]::uuid))
with check (bucket_id = 'commercial-documents' and public.is_internal_member((storage.foldername(name))[1]::uuid));
create policy contract_documents_internal
on storage.objects for all
using (bucket_id = 'contract-documents' and public.is_internal_member((storage.foldername(name))[1]::uuid))
with check (bucket_id = 'contract-documents' and public.is_internal_member((storage.foldername(name))[1]::uuid));
create policy signature_artifacts_internal
on storage.objects for all
using (bucket_id = 'signature-artifacts' and public.is_internal_member((storage.foldername(name))[1]::uuid))
with check (bucket_id = 'signature-artifacts' and public.is_internal_member((storage.foldername(name))[1]::uuid));

-- Encapsula o cálculo legado com uma verificação de papel mais restritiva.
alter function public.calculate_budget_version(uuid) rename to calculate_budget_version_core;
revoke all on function public.calculate_budget_version_core(uuid) from public, anon, authenticated;

create or replace function public.calculate_budget_version(p_version_id uuid)
returns public.budget_versions
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.budget_versions where id = p_version_id;
  if not public.has_org_role(v_org, array[
    'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO'
  ]::public.org_role[]) then
    raise exception 'Alçada insuficiente para calcular orçamento';
  end if;
  return public.calculate_budget_version_core(p_version_id);
end;
$$;

-- Sandbox também fica restrito à equipe autorizada.
alter function public.sandbox_signature_event(uuid,text,text) rename to sandbox_signature_event_core;
revoke all on function public.sandbox_signature_event_core(uuid,text,text) from public, anon, authenticated;

create or replace function public.sandbox_signature_event(
  p_envelope_id uuid,
  p_event_type text,
  p_provider_event_id text
) returns public.signature_envelopes
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.signature_envelopes where id = p_envelope_id;
  if not public.has_org_role(v_org, array[
    'SUPER_ADMIN','DIRECAO','ADMINISTRADOR'
  ]::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  return public.sandbox_signature_event_core(p_envelope_id,p_event_type,p_provider_event_id);
end;
$$;

-- Funções auxiliares não podem ser invocadas diretamente por usuários finais.
revoke all on function public.write_audit(uuid,text,uuid,text,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.apply_signed_amendment(uuid) from public, anon, authenticated;
grant execute on function public.apply_signed_amendment(uuid) to service_role;

commit;
