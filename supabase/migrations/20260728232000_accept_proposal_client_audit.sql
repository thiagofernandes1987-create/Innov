-- VACINA-022: a persona externa precisa concordar com a identidade do ator
-- em todas as camadas, inclusive no evento de auditoria.
--
-- O fluxo anterior validava corretamente is_client_owner(), gravava o aceite,
-- mas chamava write_audit(), cujo ator padrão é INTERNAL. record_audit_event()
-- recusava a transação inteira porque o cliente não é membro interno.

create or replace function public.accept_proposal(
  p_proposal_version_id uuid,
  p_decision text,
  p_comment text default null
)
returns public.proposal_acceptances
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_proposal public.proposals;
  v_version public.proposal_versions;
  v_accept public.proposal_acceptances;
begin
  select pv.*
    into v_version
    from public.proposal_versions pv
   where pv.id = p_proposal_version_id;

  if not found then
    raise exception 'Proposta não encontrada';
  end if;

  select p.*
    into v_proposal
    from public.proposals p
   where p.id = v_version.proposal_id
   for update;

  if not found
     or not public.is_client_owner(v_proposal.client_id)
     or v_version.client_released_at is null then
    raise exception 'Acesso negado';
  end if;

  if p_decision not in ('ACCEPTED', 'REJECTED') then
    raise exception 'Decisão inválida';
  end if;

  insert into public.proposal_acceptances(
    organization_id,
    proposal_version_id,
    client_user_id,
    decision,
    comment
  )
  values(
    v_proposal.organization_id,
    p_proposal_version_id,
    auth.uid(),
    p_decision,
    p_comment
  )
  returning * into v_accept;

  update public.proposals
     set status = p_decision::public.proposal_status
   where id = v_proposal.id;

  perform public.record_audit_event(
    p_organization_id => v_proposal.organization_id,
    p_module_key => 'propostas',
    p_event_type => 'proposal.' || lower(p_decision),
    p_resource_type => 'PROPOSAL_VERSION',
    p_resource_id => p_proposal_version_id,
    p_action => p_decision,
    p_result => 'SUCCESS',
    p_severity => 'INFO',
    p_source => 'APPLICATION',
    p_message => 'Decisão do cliente sobre proposta',
    p_after => to_jsonb(v_accept),
    p_metadata => jsonb_build_object('proposal_id', v_proposal.id),
    p_client_id => v_proposal.client_id,
    p_actor_type => 'CLIENT'
  );

  return v_accept;
end;
$function$;

revoke all on function public.accept_proposal(uuid, text, text) from public;
revoke all on function public.accept_proposal(uuid, text, text) from anon;
grant execute on function public.accept_proposal(uuid, text, text) to authenticated;
grant execute on function public.accept_proposal(uuid, text, text) to service_role;
