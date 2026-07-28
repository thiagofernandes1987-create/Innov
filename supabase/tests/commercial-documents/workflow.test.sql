begin;

insert into auth.users(id, email) values
  ('10000000-0000-0000-0000-000000000001', 'commercial@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'director@example.com'),
  ('10000000-0000-0000-0000-000000000003', 'client@example.com');

insert into public.organizations(id, legal_name, trade_name, created_by)
values (
  '20000000-0000-0000-0000-000000000001',
  'Organização de Teste Ltda.',
  'Organização de Teste',
  '10000000-0000-0000-0000-000000000002'
);

insert into public.organization_memberships(organization_id, user_id, role, active)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'COMERCIAL', true),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'DIRECAO', true),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'CLIENTE', true);

insert into public.clients(
  id, organization_id, user_id, type, legal_name, email, created_by
) values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'COMPANY',
  'Cliente de Teste S.A.',
  'cliente@example.com',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.budgets(
  id, organization_id, client_id, code, title, status, created_by
) values (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'ORC-TESTE-001',
  'Orçamento aprovado',
  'APPROVED',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.budget_versions(
  id, organization_id, budget_id, version_number, status, sale_price,
  frozen_at, approved_at, approved_by, created_by
) values (
  '41000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  1,
  'APPROVED',
  125000,
  now(),
  now(),
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001'
);

update public.budgets
set current_version_id = '41000000-0000-0000-0000-000000000001'
where id = '40000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select public.create_proposal_from_budget_version(
  '41000000-0000-0000-0000-000000000001',
  'PROP-TESTE-001',
  'Proposta aprovada',
  'Execução do escopo contratado.',
  'Projeto, fabricação e montagem.',
  'Materiais e instalação.',
  'Serviços de terceiros.',
  'Ambiente liberado pelo cliente.',
  'Preço fechado.',
  '30% de entrada e saldo por medição.',
  '90 dias.',
  '12 meses.',
  'Documento de ensaio.',
  current_date + 30,
  '20000000-0000-0000-0000-000000000001/proposals/teste.pdf',
  repeat('a', 64),
  true
);

reset role;

do $$
declare
  v_proposal public.proposals;
  v_version public.proposal_versions;
begin
  select * into v_proposal
  from public.proposals
  where code = 'PROP-TESTE-001';

  select * into v_version
  from public.proposal_versions
  where proposal_id = v_proposal.id;

  if v_proposal.status <> 'SENT'
    or v_proposal.client_released_at is null
    or v_version.document_sha256 <> repeat('a', 64)
    or v_version.frozen_at is null
    or v_version.sale_price <> 125000 then
    raise exception 'Fluxo de proposta não preservou PDF, preço, estado e liberação';
  end if;

  raise notice 'Proposta com PDF e hash aprovada.';
end;
$$;

do $$
declare
  v_signature regprocedure := 'public.create_proposal_from_budget_version(uuid,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean)'::regprocedure;
begin
  if has_function_privilege('anon', v_signature, 'EXECUTE') then
    raise exception 'anon não pode executar criação de proposta';
  end if;
  if not has_function_privilege('authenticated', v_signature, 'EXECUTE') then
    raise exception 'authenticated precisa executar a RPC autorizada';
  end if;
  raise notice 'Privilégios mínimos da proposta aprovados.';
end;
$$;

select current_version_id as accepted_version_id
from public.proposals
where code = 'PROP-TESTE-001'
\gset

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select public.accept_proposal(
  :'accepted_version_id',
  'ACCEPTED',
  'Aceite técnico do ensaio'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select public.create_contract_from_proposal(
  :'accepted_version_id',
  'CT-TESTE-001',
  'Contrato de teste',
  'Corpo integral do contrato.',
  null
) as contract_id
\gset

select public.create_amendment(
  :'contract_id',
  'AD-TESTE-001',
  'Acréscimo solicitado e aprovado.',
  'Inclusão de novo ambiente.',
  5000,
  5,
  current_date + 95,
  null
);

reset role;

do $$
begin
  if not exists (
    select 1
    from public.contracts c
    join public.amendments a on a.contract_id = c.id
    where c.code = 'CT-TESTE-001'
      and c.original_value = 125000
      and a.code = 'AD-TESTE-001'
      and a.value_delta = 5000
      and a.days_delta = 5
  ) then
    raise exception 'Contrato ou aditivo não preservou a cadeia da proposta';
  end if;
  raise notice 'Contrato e aditivo encadeados aprovados.';
end;
$$;

rollback;
