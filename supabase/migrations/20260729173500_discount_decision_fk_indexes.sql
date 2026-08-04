-- VACINA-021: FKs operacionais precisam de índice de cobertura antes que o
-- volume real torne joins, cascatas e verificações de integridade custosos.

create index if not exists proposal_discount_decisions_proposal_idx
on public.proposal_discount_decisions(proposal_id);

create index if not exists proposal_discount_decisions_requested_by_idx
on public.proposal_discount_decisions(requested_by)
where requested_by is not null;

create index if not exists proposal_discount_decisions_decided_by_idx
on public.proposal_discount_decisions(decided_by)
where decided_by is not null;
