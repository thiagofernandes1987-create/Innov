begin;

insert into auth.users(id,email) values
  ('11000000-0000-0000-0000-000000000001','sinapi-orcamentista@example.com');

insert into public.organizations(id,legal_name,trade_name,created_by)
values(
  '21000000-0000-0000-0000-000000000001',
  'Organização SINAPI Teste Ltda.',
  'SINAPI Teste',
  '11000000-0000-0000-0000-000000000001'
);

insert into public.organization_memberships(organization_id,user_id,role,active)
values(
  '21000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  'ORCAMENTISTA',
  true
);

insert into public.clients(id,organization_id,type,legal_name,created_by)
values(
  '31000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  'COMPANY',
  'Cliente SINAPI Teste',
  '11000000-0000-0000-0000-000000000001'
);

insert into public.budgets(id,organization_id,client_id,code,title,status,created_by)
values(
  '41000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'ORC-SINAPI-TESTE',
  'Orçamento SINAPI de teste',
  'DRAFT',
  '11000000-0000-0000-0000-000000000001'
);

insert into public.budget_versions(
  id,organization_id,budget_id,version_number,scenario_type,base_date,status,created_by
) values(
  '42000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  1,'PROBABLE','2026-07-01','DRAFT',
  '11000000-0000-0000-0000-000000000001'
);

update public.budgets
set current_version_id='42000000-0000-0000-0000-000000000001'
where id='41000000-0000-0000-0000-000000000001';

do $$
declare
  v_batch uuid;
  v_composition_version uuid;
  v_budget_item public.budget_items;
  v_search_count integer;
  v_direct_cost numeric;
  v_invalid_source_blocked boolean:=false;
  v_authenticated_import_blocked boolean:=false;
  v_manual_edit_blocked boolean:=false;
  v_frozen_blocked boolean:=false;
begin
  begin
    perform public.start_sinapi_import(
      '21000000-0000-0000-0000-000000000001',
      'SP','2026-06-01',false,
      'https://example.com/sinapi.zip',
      repeat('a',64),
      '{}'::jsonb
    );
  exception when others then
    v_invalid_source_blocked:=true;
  end;
  if not v_invalid_source_blocked then
    raise exception 'Fonte não oficial foi aceita no importador SINAPI';
  end if;

  v_batch:=public.start_sinapi_import(
    '21000000-0000-0000-0000-000000000001',
    'SP','2026-06-01',false,
    'https://www.caixa.gov.br/Downloads/sinapi/teste-fixture.zip',
    repeat('b',64),
    jsonb_build_object('fixture','Valores técnicos de teste, não oficiais')
  );

  perform public.import_sinapi_inputs_chunk(v_batch,jsonb_build_array(
    jsonb_build_object(
      'code','000001','description','Cimento — fixture',
      'unit','SC','itemType','MATERIAL','unitCost',30
    ),
    jsonb_build_object(
      'code','000002','description','Pedreiro — fixture',
      'unit','H','itemType','LABOR','unitCost',25
    )
  ));

  perform public.import_sinapi_compositions_chunk(v_batch,jsonb_build_array(
    jsonb_build_object(
      'code','100001',
      'description','Alvenaria de vedação — fixture',
      'unit','M2',
      'unitCost',150,
      'items',jsonb_build_array(
        jsonb_build_object(
          'code','000001','description','Cimento — fixture','unit','SC',
          'itemType','INPUT','coefficient',1.5,'unitCost',30,'totalCost',45
        ),
        jsonb_build_object(
          'code','000002','description','Pedreiro — fixture','unit','H',
          'itemType','INPUT','coefficient',4.2,'unitCost',25,'totalCost',105
        )
      )
    )
  ));

  perform public.finish_sinapi_import(v_batch,null);

  select version.id into v_composition_version
  from public.cost_composition_versions version
  join public.cost_compositions composition on composition.id=version.composition_id
  where composition.organization_id='21000000-0000-0000-0000-000000000001'
    and composition.source_key='SINAPI_CAIXA'
    and composition.source_record_id='100001'
    and version.base_date='2026-06-01'
    and version.region='SP'
    and not version.tax_relief;

  if v_composition_version is null then
    raise exception 'Composição SINAPI não foi versionada';
  end if;
  if (select count(*) from public.cost_composition_items where composition_version_id=v_composition_version)<>2 then
    raise exception 'Componentes SINAPI não foram preservados';
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"11000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',
    true
  );

  select count(*) into v_search_count
  from public.search_sinapi_references(
    '21000000-0000-0000-0000-000000000001',
    'alvenaria','COMPOSITION','SP','2026-06-01',false,50
  );
  if v_search_count<>1 then
    raise exception 'Busca SINAPI retornou % registros',v_search_count;
  end if;

  select * into v_budget_item
  from public.add_sinapi_reference_to_budget(
    '42000000-0000-0000-0000-000000000001',
    'COMPOSITION',v_composition_version,10,null
  );

  select direct_cost into v_direct_cost
  from public.budget_versions
  where id='42000000-0000-0000-0000-000000000001';

  if v_budget_item.code<>'100001'
    or v_budget_item.quantity<>10
    or v_budget_item.unit_cost<>150
    or v_budget_item.base_date<>'2026-06-01'
    or v_direct_cost<>1500 then
    raise exception 'Orçamento não preservou referência e cálculo SINAPI';
  end if;

  begin
    perform public.start_sinapi_import(
      '21000000-0000-0000-0000-000000000001',
      'SP','2026-07-01',false,
      'https://www.caixa.gov.br/Downloads/sinapi/negativo.zip',
      repeat('c',64),'{}'::jsonb
    );
  exception when others then
    v_authenticated_import_blocked:=true;
  end;
  if not v_authenticated_import_blocked then
    raise exception 'Usuário autenticado executou importação oficial';
  end if;

  begin
    update public.cost_catalog_items
    set unit_cost=999
    where organization_id='21000000-0000-0000-0000-000000000001'
      and source_key='SINAPI_CAIXA'
      and source_record_id='000001';
  exception when others then
    v_manual_edit_blocked:=true;
  end;
  if not v_manual_edit_blocked then
    raise exception 'Referência oficial SINAPI foi editada manualmente';
  end if;

  execute 'set local role postgres';
  update public.budget_versions
  set frozen_at=now(),status='APPROVAL_PENDING'
  where id='42000000-0000-0000-0000-000000000001';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.role','authenticated',true);
  begin
    perform public.add_sinapi_reference_to_budget(
      '42000000-0000-0000-0000-000000000001',
      'COMPOSITION',v_composition_version,1,null
    );
  exception when others then
    v_frozen_blocked:=true;
  end;
  if not v_frozen_blocked then
    raise exception 'Versão congelada recebeu nova referência SINAPI';
  end if;

  execute 'set local role postgres';
  raise notice 'Importação, busca, composição, orçamento e guardas SINAPI aprovados.';
end;
$$;

rollback;
