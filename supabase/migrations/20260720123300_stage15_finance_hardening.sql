-- Etapa 15 — hardening identificado durante a homologação funcional.

create or replace function public.decide_finance_approval(
 p_approval_id uuid,p_decision public.finance_approval_status,p_comment text default ''
) returns public.finance_entries language plpgsql security definer set search_path=public as $$
declare v_approval public.finance_approvals; v public.finance_entries;
begin
 if p_decision not in ('APPROVED','REJECTED') then raise exception 'Decisão inválida.'; end if;
 select * into v_approval from public.finance_approvals where id=p_approval_id for update;
 if not found or v_approval.status<>'PENDING' then raise exception 'Aprovação pendente não encontrada.'; end if;
 select * into v from public.finance_entries where id=v_approval.entry_id for update;
 if not public.has_module_permission(v.organization_id,'financeiro','READ',v.project_id,'approve')
    or not public.has_module_permission(v.organization_id,'financeiro','READ',v.project_id,'sensitive') then
  raise exception 'Permissão insuficiente para aprovar.';
 end if;
 update public.finance_approvals
 set status=p_decision,decided_by=auth.uid(),decided_at=now(),comment=coalesce(p_comment,'')
 where id=v_approval.id;
 update public.finance_entries
 set status=case when p_decision='APPROVED'
   then 'APPROVED'::public.finance_entry_status else 'DRAFT'::public.finance_entry_status end,
  approved_at=case when p_decision='APPROVED' then now() else null end,updated_at=now()
 where id=v.id returning * into v;
 insert into public.finance_events(organization_id,project_id,entry_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v.project_id,v.id,auth.uid(),
  case when p_decision='APPROVED' then 'ENTRY_APPROVED' else 'ENTRY_REJECTED' end,
  jsonb_build_object('comment',p_comment));
 return v;
end $$;

create or replace function public.register_finance_settlement(
 p_installment_id uuid,p_amount numeric,p_settled_at timestamptz,p_method public.finance_settlement_method,
 p_cash_account_id uuid default null,p_reference text default null,p_notes text default ''
) returns public.finance_settlements language plpgsql security definer set search_path=public as $$
declare
 v_installment public.finance_installments; v_entry public.finance_entries;
 v_settlement public.finance_settlements; v_balance numeric; v_open integer; v_any boolean;
begin
 if p_amount<=0 then raise exception 'O valor da baixa deve ser positivo.'; end if;
 select * into v_installment from public.finance_installments where id=p_installment_id for update;
 if not found then raise exception 'Parcela não encontrada.'; end if;
 select * into v_entry from public.finance_entries where id=v_installment.entry_id for update;
 if not public.has_module_permission(v_entry.organization_id,'financeiro','EDIT',v_entry.project_id,'sensitive') then
  raise exception 'Permissão insuficiente.';
 end if;
 if v_entry.status not in ('APPROVED','PARTIALLY_SETTLED','OVERDUE') then
  raise exception 'O lançamento não está liberado para baixa.';
 end if;
 v_balance:=v_installment.balance;
 if p_amount>v_balance+0.001 then raise exception 'O valor da baixa supera o saldo da parcela.'; end if;
 if p_cash_account_id is not null and not exists(
  select 1 from public.finance_cash_accounts
  where id=p_cash_account_id and organization_id=v_entry.organization_id and active
 ) then raise exception 'Conta de caixa inválida.'; end if;
 insert into public.finance_settlements(
  organization_id,installment_id,cash_account_id,amount,settled_at,method,reference,notes,created_by
 ) values(
  v_entry.organization_id,v_installment.id,p_cash_account_id,p_amount,coalesce(p_settled_at,now()),
  p_method,p_reference,coalesce(p_notes,''),auth.uid()
 ) returning * into v_settlement;
 update public.finance_installments
 set settled_amount=settled_amount+p_amount,
  status=case when v_balance-p_amount<=0.001
   then 'SETTLED'::public.finance_installment_status
   else 'PARTIALLY_SETTLED'::public.finance_installment_status end,
  updated_at=now()
 where id=v_installment.id;
 select count(*) into v_open from public.finance_installments
 where entry_id=v_entry.id and status not in ('SETTLED','CANCELED');
 select exists(select 1 from public.finance_installments where entry_id=v_entry.id and settled_amount>0) into v_any;
 update public.finance_entries
 set status=case
  when v_open=0 then 'SETTLED'::public.finance_entry_status
  when v_any then 'PARTIALLY_SETTLED'::public.finance_entry_status
  else 'APPROVED'::public.finance_entry_status end,
  updated_at=now()
 where id=v_entry.id;
 insert into public.finance_events(organization_id,project_id,entry_id,installment_id,actor_user_id,event_type,metadata)
 values(v_entry.organization_id,v_entry.project_id,v_entry.id,v_installment.id,auth.uid(),
  'SETTLEMENT_REGISTERED',jsonb_build_object('amount',p_amount,'method',p_method,'settlementId',v_settlement.id));
 return v_settlement;
end $$;

create or replace function public.validate_finance_measurement_links()
returns trigger language plpgsql set search_path=public as $$
declare v_contract record;
begin
 if not exists(select 1 from public.projects where id=new.project_id and organization_id=new.organization_id) then
  raise exception 'A obra não pertence à organização da medição.';
 end if;
 if not exists(select 1 from public.clients where id=new.client_id and organization_id=new.organization_id) then
  raise exception 'O cliente não pertence à organização da medição.';
 end if;
 select organization_id,project_id,client_id into v_contract from public.contracts where id=new.contract_id;
 if not found or v_contract.organization_id<>new.organization_id
    or v_contract.project_id is distinct from new.project_id
    or v_contract.client_id is distinct from new.client_id then
  raise exception 'Contrato, obra e cliente da medição são incompatíveis.';
 end if;
 return new;
end $$;

drop trigger if exists finance_measurements_validate_links on public.finance_measurements;
create trigger finance_measurements_validate_links
before insert or update of organization_id,project_id,contract_id,client_id on public.finance_measurements
for each row execute function public.validate_finance_measurement_links();

create or replace function public.validate_finance_entry_links()
returns trigger language plpgsql set search_path=public as $$
declare v_contract record; v_order record; v_measurement record;
begin
 if new.project_id is not null and not exists(
  select 1 from public.projects where id=new.project_id and organization_id=new.organization_id
 ) then raise exception 'A obra não pertence à organização do lançamento.'; end if;
 if new.client_id is not null and not exists(
  select 1 from public.clients where id=new.client_id and organization_id=new.organization_id
 ) then raise exception 'O cliente não pertence à organização do lançamento.'; end if;
 if new.supplier_id is not null and not exists(
  select 1 from public.procurement_suppliers where id=new.supplier_id and organization_id=new.organization_id
 ) then raise exception 'O fornecedor não pertence à organização do lançamento.'; end if;
 if new.category_id is not null and not exists(
  select 1 from public.finance_categories where id=new.category_id and organization_id=new.organization_id
 ) then raise exception 'A categoria não pertence à organização do lançamento.'; end if;
 if new.cost_center_id is not null and not exists(
  select 1 from public.finance_cost_centers where id=new.cost_center_id and organization_id=new.organization_id
 ) then raise exception 'O centro de custo não pertence à organização do lançamento.'; end if;
 if new.contract_id is not null then
  select organization_id,project_id,client_id into v_contract from public.contracts where id=new.contract_id;
  if not found or v_contract.organization_id<>new.organization_id
     or (new.project_id is not null and v_contract.project_id is distinct from new.project_id)
     or (new.client_id is not null and v_contract.client_id is distinct from new.client_id) then
   raise exception 'Contrato incompatível com organização, obra ou cliente.';
  end if;
 end if;
 if new.procurement_order_id is not null then
  select organization_id,project_id,supplier_id into v_order from public.procurement_orders where id=new.procurement_order_id;
  if not found or v_order.organization_id<>new.organization_id
     or (new.project_id is not null and v_order.project_id is distinct from new.project_id)
     or (new.supplier_id is not null and v_order.supplier_id is distinct from new.supplier_id) then
   raise exception 'Pedido incompatível com organização, obra ou fornecedor.';
  end if;
 end if;
 if new.measurement_id is not null then
  select organization_id,project_id,client_id,contract_id into v_measurement
  from public.finance_measurements where id=new.measurement_id;
  if not found or v_measurement.organization_id<>new.organization_id
     or (new.project_id is not null and v_measurement.project_id is distinct from new.project_id)
     or (new.client_id is not null and v_measurement.client_id is distinct from new.client_id)
     or (new.contract_id is not null and v_measurement.contract_id is distinct from new.contract_id) then
   raise exception 'Medição incompatível com o lançamento.';
  end if;
 end if;
 if new.source_type='CONTRACT' and new.contract_id is null then raise exception 'Origem contratual exige contrato.'; end if;
 if new.source_type='PROCUREMENT_ORDER' and new.procurement_order_id is null then raise exception 'Origem de compras exige pedido.'; end if;
 if new.source_type='MEASUREMENT' and new.measurement_id is null then raise exception 'Origem de medição exige medição.'; end if;
 if new.source_type='AMENDMENT' and new.amendment_id is null then raise exception 'Origem de aditivo exige aditivo.'; end if;
 return new;
end $$;

drop trigger if exists finance_entries_validate_links on public.finance_entries;
create trigger finance_entries_validate_links
before insert or update of organization_id,project_id,client_id,supplier_id,contract_id,amendment_id,
 procurement_order_id,measurement_id,category_id,cost_center_id,source_type on public.finance_entries
for each row execute function public.validate_finance_entry_links();

create or replace function public.validate_finance_child_organization()
returns trigger language plpgsql set search_path=public as $$
declare v_org uuid;
begin
 if tg_table_name='finance_measurement_items' then
  select organization_id into v_org from public.finance_measurements where id=new.measurement_id;
 elsif tg_table_name='finance_installments' then
  select organization_id into v_org from public.finance_entries where id=new.entry_id;
 elsif tg_table_name='finance_approvals' then
  select organization_id into v_org from public.finance_entries where id=new.entry_id;
 elsif tg_table_name='finance_settlements' then
  select entry.organization_id into v_org from public.finance_installments installment
  join public.finance_entries entry on entry.id=installment.entry_id where installment.id=new.installment_id;
  if new.cash_account_id is not null and not exists(
   select 1 from public.finance_cash_accounts where id=new.cash_account_id and organization_id=v_org
  ) then raise exception 'Conta de caixa pertence a outra organização.'; end if;
 elsif tg_table_name='finance_attachments' then
  if new.entry_id is not null then
   select organization_id into v_org from public.finance_entries where id=new.entry_id;
  else
   select settlement.organization_id into v_org from public.finance_settlements settlement where settlement.id=new.settlement_id;
  end if;
 else
  return new;
 end if;
 if v_org is null or v_org<>new.organization_id then
  raise exception 'Organização da tabela filha é incompatível com o registro principal.';
 end if;
 return new;
end $$;

drop trigger if exists finance_measurement_items_validate_org on public.finance_measurement_items;
create trigger finance_measurement_items_validate_org before insert or update on public.finance_measurement_items
for each row execute function public.validate_finance_child_organization();
drop trigger if exists finance_installments_validate_org on public.finance_installments;
create trigger finance_installments_validate_org before insert or update on public.finance_installments
for each row execute function public.validate_finance_child_organization();
drop trigger if exists finance_approvals_validate_org on public.finance_approvals;
create trigger finance_approvals_validate_org before insert or update on public.finance_approvals
for each row execute function public.validate_finance_child_organization();
drop trigger if exists finance_settlements_validate_org on public.finance_settlements;
create trigger finance_settlements_validate_org before insert or update on public.finance_settlements
for each row execute function public.validate_finance_child_organization();
drop trigger if exists finance_attachments_validate_org on public.finance_attachments;
create trigger finance_attachments_validate_org before insert or update on public.finance_attachments
for each row execute function public.validate_finance_child_organization();

revoke all on function public.validate_finance_measurement_links() from public,anon,authenticated;
revoke all on function public.validate_finance_entry_links() from public,anon,authenticated;
revoke all on function public.validate_finance_child_organization() from public,anon,authenticated;
