begin;

create or replace function public.decide_proposal_discount(
  p_proposal_version_id uuid,
  p_decision text,
  p_comment text
) returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_decision public.proposal_discount_decisions;
  v_version public.proposal_versions;
  v_status text := upper(trim(coalesce(p_decision, '')));
  v_next_proposal_status public.proposal_status;
begin
  select * into v_decision
  from public.proposal_discount_decisions
  where proposal_version_id = p_proposal_version_id
  for update;

  if v_decision.id is null or v_decision.status <> 'PENDING' then
    raise exception 'Solicitação de desconto pendente não encontrada.';
  end if;

  if not public.has_org_role(
    v_decision.organization_id,
    array['SUPER_ADMIN','DIRECAO']::public.org_role[]
  ) then
    raise exception 'Somente a diretoria pode decidir desconto acima da alçada.';
  end if;

  if auth.uid() = v_decision.requested_by then
    raise exception 'O solicitante não pode aprovar o próprio desconto.';
  end if;

  if v_status not in ('APPROVED','REJECTED') then
    raise exception 'Decisão inválida.';
  end if;

  if nullif(trim(p_comment), '') is null then
    raise exception 'Comentário da diretoria é obrigatório.';
  end if;

  select * into v_version
  from public.proposal_versions
  where id = p_proposal_version_id
  for update;

  if v_version.id is null then
    raise exception 'Versão da proposta não encontrada.';
  end if;

  update public.proposal_discount_decisions
  set status = v_status,
      decided_by = auth.uid(),
      decided_at = now(),
      comment = trim(p_comment)
  where id = v_decision.id;

  update public.proposal_versions
  set discount_status = v_status
  where id = p_proposal_version_id;

  v_next_proposal_status := case
    when v_status = 'REJECTED' then 'DRAFT'::public.proposal_status
    when v_version.document_sha256 is null or v_version.frozen_at is null
      then 'DRAFT'::public.proposal_status
    when v_version.client_released_at is not null
      then 'SENT'::public.proposal_status
    else 'APPROVED'::public.proposal_status
  end;

  update public.proposals
  set status = v_next_proposal_status,
      updated_at = now()
  where id = v_decision.proposal_id;

  perform public.write_audit(
    v_decision.organization_id,
    'PROPOSAL',
    v_decision.proposal_id,
    'DISCOUNT_' || v_status,
    jsonb_build_object(
      'proposal_version_id', p_proposal_version_id,
      'discount_rate', v_decision.discount_rate,
      'comment', trim(p_comment),
      'proposal_status_after_decision', v_next_proposal_status
    )
  );

  return v_decision.proposal_id;
end;
$function$;

revoke all on function public.decide_proposal_discount(uuid,text,text) from public;
revoke all on function public.decide_proposal_discount(uuid,text,text) from anon;
grant execute on function public.decide_proposal_discount(uuid,text,text) to authenticated;

commit;
