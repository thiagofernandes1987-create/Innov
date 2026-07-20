-- Etapa 17 — homologação transacional reproduzível.
-- Executar somente em desenvolvimento/homologação.
-- O script cria dados efêmeros e termina com ROLLBACK.

begin;

create temp table stage17_test_results(
  test_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

do $$
declare
  v_user uuid:=gen_random_uuid();
  v_org1 uuid:=gen_random_uuid();
  v_org2 uuid:=gen_random_uuid();
  v_project1 uuid:=gen_random_uuid();
  v_project2 uuid:=gen_random_uuid();
  v_unit1 uuid;
  v_source_wh public.inventory_warehouses;
  v_source_loc uuid;
  v_same_project_wh public.inventory_warehouses;
  v_same_project_loc uuid;
  v_other_project_wh public.inventory_warehouses;
  v_other_project_loc uuid;
  v_item public.inventory_items;
  v_entry public.inventory_movements;
  v_entry_repeat public.inventory_movements;
  v_issue public.inventory_movements;
  v_reversal public.inventory_movements;
  v_reversal_repeat public.inventory_movements;
  v_balance numeric;
  v_origin numeric;
  v_destination numeric;
  v_count integer;
  v_error text;
begin
  insert into auth.users(
    id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values(
    v_user,'authenticated','authenticated',
    'stage17-'||replace(v_user::text,'-','')||'@example.invalid',
    '{}','{}',now(),now()
  );

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',v_user,'role','authenticated','aal','aal2')::text,
    true
  );

  insert into public.organizations(id,legal_name,trade_name,created_by) values
    (v_org1,'Homologação Etapa 17 A','Homologação A',v_user),
    (v_org2,'Homologação Etapa 17 B','Homologação B',v_user);

  insert into public.organization_memberships(organization_id,user_id,role,active) values
    (v_org1,v_user,'SUPER_ADMIN',true),
    (v_org2,v_user,'SUPER_ADMIN',true);

  insert into public.projects(id,organization_id,code,name,status,created_by) values
    (v_project1,v_org1,'H17-A','Obra Homologação A','PLANNING',v_user),
    (v_project2,v_org1,'H17-B','Obra Homologação B','PLANNING',v_user);

  select id into v_unit1
  from public.inventory_units
  where organization_id=v_org1 and code='un';

  select count(*) into v_count
  from public.inventory_units
  where organization_id=v_org1;
  insert into stage17_test_results values(
    'defaults_units',v_count=8,'unidades instaladas='||v_count
  );

  select count(*) into v_count
  from public.inventory_categories
  where organization_id=v_org1;
  insert into stage17_test_results values(
    'defaults_categories',v_count=6,'categorias instaladas='||v_count
  );

  select count(*) into v_count
  from public.organization_modules om
  join public.app_modules am on am.id=om.module_id
  where om.organization_id=v_org1
    and am.key='estoque'
    and om.status='ENABLED'
    and om.installed_version='1.0.0';
  insert into stage17_test_results values(
    'module_installation',v_count=1,'módulo estoque habilitado='||(v_count=1)
  );

  insert into stage17_test_results values(
    'authorization_super_admin',
    public.has_module_permission(v_org1,'estoque','DELETE',v_project1,'administer')
      and public.has_module_permission(v_org1,'estoque','READ',v_project1,'sensitive'),
    'permissões elevadas e sensíveis resolvidas'
  );

  v_source_wh:=public.create_inventory_warehouse(
    v_org1,v_project1,'OBRA-A1','Almoxarifado A1','PROJECT','',null,'PADRAO','Local padrão'
  );
  select id into v_source_loc
  from public.inventory_locations
  where warehouse_id=v_source_wh.id and is_default;

  v_same_project_wh:=public.create_inventory_warehouse(
    v_org1,v_project1,'OBRA-A2','Almoxarifado A2','PROJECT','',null,'PADRAO','Local padrão'
  );
  select id into v_same_project_loc
  from public.inventory_locations
  where warehouse_id=v_same_project_wh.id and is_default;

  v_other_project_wh:=public.create_inventory_warehouse(
    v_org1,v_project2,'OBRA-B','Almoxarifado B','PROJECT','',null,'PADRAO','Local padrão'
  );
  select id into v_other_project_loc
  from public.inventory_locations
  where warehouse_id=v_other_project_wh.id and is_default;

  v_item:=public.create_inventory_item(
    v_org1,null,v_unit1,'H17-CIM','Cimento de homologação','MATERIAL',
    '','',null,null,2,5,false,false,false
  );

  v_entry:=public.create_inventory_movement(
    v_org1,v_project1,'MANUAL_IN',now(),'Entrada','',
    jsonb_build_array(jsonb_build_object(
      'warehouseId',v_source_wh.id,
      'locationId',v_source_loc,
      'itemId',v_item.id,
      'quantityDelta',10,
      'unitCost',5
    )),
    'stage17-entry-idempotent',true
  );

  select coalesce(sum(physical_quantity),0) into v_balance
  from public.inventory_stock_v
  where organization_id=v_org1 and item_id=v_item.id;
  insert into stage17_test_results values(
    'entry_increases_balance',v_balance=10,'saldo='||v_balance
  );

  v_entry_repeat:=public.create_inventory_movement(
    v_org1,v_project1,'MANUAL_IN',now(),'Repetição','',
    jsonb_build_array(jsonb_build_object(
      'warehouseId',v_source_wh.id,
      'locationId',v_source_loc,
      'itemId',v_item.id,
      'quantityDelta',99,
      'unitCost',5
    )),
    'stage17-entry-idempotent',true
  );

  select count(*) into v_count
  from public.inventory_movements
  where organization_id=v_org1
    and idempotency_key='stage17-entry-idempotent';
  select coalesce(sum(physical_quantity),0) into v_balance
  from public.inventory_stock_v
  where organization_id=v_org1 and item_id=v_item.id;
  insert into stage17_test_results values(
    'movement_idempotency',
    v_entry_repeat.id=v_entry.id and v_count=1 and v_balance=10,
    'mesmo='||(v_entry_repeat.id=v_entry.id)||', registros='||v_count||', saldo='||v_balance
  );

  begin
    perform public.create_inventory_movement(
      v_org1,v_project1,'ISSUE',now(),'Excesso','',
      jsonb_build_array(jsonb_build_object(
        'warehouseId',v_source_wh.id,
        'locationId',v_source_loc,
        'itemId',v_item.id,
        'quantityDelta',-11,
        'unitCost',5
      )),null,true
    );
    insert into stage17_test_results values(
      'negative_stock_block',false,'saída acima do saldo aceita'
    );
  exception when others then
    get stacked diagnostics v_error=message_text;
    insert into stage17_test_results values(
      'negative_stock_block',position('saldo negativo' in lower(v_error))>0,v_error
    );
  end;

  v_issue:=public.create_inventory_movement(
    v_org1,v_project1,'ISSUE',now(),'Consumo','',
    jsonb_build_array(jsonb_build_object(
      'warehouseId',v_source_wh.id,
      'locationId',v_source_loc,
      'itemId',v_item.id,
      'quantityDelta',-3,
      'unitCost',5
    )),null,true
  );

  select coalesce(sum(physical_quantity),0) into v_balance
  from public.inventory_stock_v
  where organization_id=v_org1 and item_id=v_item.id;
  insert into stage17_test_results values(
    'issue_reduces_balance',v_balance=7,'saldo='||v_balance
  );

  begin
    update public.inventory_movements
    set reason='alteração indevida'
    where id=v_issue.id;
    insert into stage17_test_results values(
      'posted_movement_immutable',false,'update aceito'
    );
  exception when others then
    get stacked diagnostics v_error=message_text;
    insert into stage17_test_results values(
      'posted_movement_immutable',position('imutável' in lower(v_error))>0,v_error
    );
  end;

  v_reversal:=public.reverse_inventory_movement(v_issue.id,'Correção');
  v_reversal_repeat:=public.reverse_inventory_movement(v_issue.id,'Repetição');
  select coalesce(sum(physical_quantity),0) into v_balance
  from public.inventory_stock_v
  where organization_id=v_org1 and item_id=v_item.id;
  insert into stage17_test_results values(
    'reversal_restores_balance',
    v_balance=10 and v_reversal.id=v_reversal_repeat.id,
    'saldo='||v_balance||', idempotente='||(v_reversal.id=v_reversal_repeat.id)
  );

  perform public.create_inventory_movement(
    v_org1,v_project1,'TRANSFER',now(),'Transferência mesma obra','',
    jsonb_build_array(
      jsonb_build_object(
        'warehouseId',v_source_wh.id,
        'locationId',v_source_loc,
        'itemId',v_item.id,
        'quantityDelta',-2,
        'unitCost',5
      ),
      jsonb_build_object(
        'warehouseId',v_same_project_wh.id,
        'locationId',v_same_project_loc,
        'itemId',v_item.id,
        'quantityDelta',2,
        'unitCost',5
      )
    ),null,true
  );

  select coalesce(sum(physical_quantity),0) into v_origin
  from public.inventory_stock_v
  where warehouse_id=v_source_wh.id and item_id=v_item.id;
  select coalesce(sum(physical_quantity),0) into v_destination
  from public.inventory_stock_v
  where warehouse_id=v_same_project_wh.id and item_id=v_item.id;
  select coalesce(sum(physical_quantity),0) into v_balance
  from public.inventory_stock_v
  where organization_id=v_org1 and item_id=v_item.id;
  insert into stage17_test_results values(
    'transfer_atomic_conservation',
    v_origin=8 and v_destination=2 and v_balance=10,
    'origem='||v_origin||', destino='||v_destination||', total='||v_balance
  );

  begin
    insert into public.inventory_items(organization_id,unit_id,code,name,kind)
    values(v_org2,v_unit1,'CROSS-ORG','Item inválido','MATERIAL');
    insert into stage17_test_results values(
      'multi_company_isolation',false,'unidade externa aceita'
    );
  exception when others then
    get stacked diagnostics v_error=message_text;
    insert into stage17_test_results values(
      'multi_company_isolation',position('unidade incompatível' in lower(v_error))>0,v_error
    );
  end;

  begin
    perform public.create_inventory_movement(
      v_org1,v_project2,'MANUAL_IN',now(),'Escopo cruzado','',
      jsonb_build_array(jsonb_build_object(
        'warehouseId',v_source_wh.id,
        'locationId',v_source_loc,
        'itemId',v_item.id,
        'quantityDelta',1,
        'unitCost',5
      )),null,true
    );
    insert into stage17_test_results values(
      'multi_project_isolation',false,'depósito da obra A aceito na obra B'
    );
  exception when others then
    get stacked diagnostics v_error=message_text;
    insert into stage17_test_results values(
      'multi_project_isolation',position('outra obra' in lower(v_error))>0,v_error
    );
  end;

  insert into stage17_test_results values(
    'balance_not_direct_column',
    not exists(
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name in ('inventory_items','inventory_warehouses')
        and column_name in (
          'balance','stock_balance','physical_quantity','available_quantity','reserved_quantity'
        )
    ),
    'saldo apenas em projeções'
  );
end $$;

select test_name,passed,detail
from stage17_test_results
order by test_name;

rollback;
