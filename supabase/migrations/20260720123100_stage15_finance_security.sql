-- Etapa 15 — RLS, Storage e transações financeiras.

do $$
declare t text;
begin
 foreach t in array array[
  'finance_categories','finance_cost_centers','finance_cash_accounts','finance_measurements','finance_measurement_items',
  'finance_entries','finance_installments','finance_approvals','finance_settlements','finance_attachments','finance_events'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''financeiro'',''READ'',null,''sensitive''))',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.has_module_permission(organization_id,''financeiro'',''EDIT'',null,''sensitive''))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using (public.has_module_permission(organization_id,''financeiro'',''EDIT'',null,''sensitive'')) with check (public.has_module_permission(organization_id,''financeiro'',''EDIT'',null,''sensitive''))',t||'_update',t);
  execute format('create policy %I on public.%I for delete to authenticated using (public.has_module_permission(organization_id,''financeiro'',''DELETE'',null,''sensitive''))',t||'_delete',t);
 end loop;
end $$;

create policy finance_storage_read on storage.objects for select to authenticated
using(bucket_id='finance-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'financeiro','READ',null,'sensitive'));
create policy finance_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='finance-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'financeiro','EDIT',null,'sensitive'));
create policy finance_storage_delete on storage.objects for delete to authenticated
using(bucket_id='finance-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'financeiro','DELETE',null,'sensitive'));

create or replace function public.finance_create_installments(
 p_entry_id uuid,p_first_due_date date,p_count integer,p_interval_months integer default 1
) returns void language plpgsql security definer set search_path=public as $$
declare v_entry public.finance_entries; v_base numeric(18,2); v_amount numeric(18,2); i integer;
begin
 if p_count<1 or p_count>120 then raise exception 'Quantidade de parcelas inválida.'; end if;
 if p_interval_months<1 or p_interval_months>24 then raise exception 'Intervalo entre parcelas inválido.'; end if;
 select * into v_entry from public.finance_entries where id=p_entry_id for update;
 if not found then raise exception 'Lançamento não encontrado.'; end if;
 if exists(select 1 from public.finance_installments where entry_id=p_entry_id) then raise exception 'O lançamento já possui parcelas.'; end if;
 v_base:=trunc(v_entry.total_amount/p_count,2);
 for i in 1..p_count loop
  v_amount:=case when i=p_count then v_entry.total_amount-(v_base*(p_count-1)) else v_base end;
  insert into public.finance_installments(organization_id,entry_id,installment_number,due_date,original_amount)
  values(v_entry.organization_id,v_entry.id,i,(p_first_due_date+make_interval(months=>(i-1)*p_interval_months))::date,v_amount);
 end loop;
end $$;

create or replace function public.submit_finance_entry(p_entry_id uuid)
returns public.finance_entries language plpgsql security definer set search_path=public as $$
declare v public.finance_entries; v_count integer; v_scheduled numeric(18,2); v_approval public.finance_approvals;
begin
 select * into v from public.finance_entries where id=p_entry_id for update;
 if not found then raise exception 'Lançamento não encontrado.'; end if;
 if not public.has_module_permission(v.organization_id,'financeiro','EDIT',v.project_id,'sensitive') then raise exception 'Permissão insuficiente.'; end if;
 if v.status<>'DRAFT' then raise exception 'Somente lançamentos em rascunho podem ser enviados.'; end if;
 select count(*),coalesce(sum(total_due),0) into v_count,v_scheduled from public.finance_installments where entry_id=v.id and status<>'CANCELED';
 if v_count=0 then raise exception 'Inclua ao menos uma parcela.'; end if;
 if abs(v_scheduled-v.total_amount)>0.01 then raise exception 'A soma das parcelas deve ser igual ao valor total.'; end if;
 update public.finance_entries set status='PENDING_APPROVAL',updated_at=now() where id=v.id returning * into v;
 insert into public.finance_approvals(organization_id,entry_id,status,amount,requested_by)
 values(v.organization_id,v.id,'PENDING',v.total_amount,auth.uid())
 on conflict(entry_id) do update set status='PENDING',amount=excluded.amount,requested_by=excluded.requested_by,requested_at=now(),decided_by=null,decided_at=null,comment=''
 returning * into v_approval;
 insert into public.finance_events(organization_id,project_id,entry_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v.project_id,v.id,auth.uid(),'ENTRY_SUBMITTED',jsonb_build_object('approvalId',v_approval.id,'amount',v.total_amount));
 return v;
end $$;

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
 update public.finance_approvals set status=p_decision,decided_by=auth.uid(),decided_at=now(),comment=coalesce(p_comment,'') where id=v_approval.id;
 update public.finance_entries set status=case when p_decision='APPROVED' then 'APPROVED' else 'DRAFT' end,
  approved_at=case when p_decision='APPROVED' then now() else null end,updated_at=now() where id=v.id returning * into v;
 insert into public.finance_events(organization_id,project_id,entry_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v.project_id,v.id,auth.uid(),case when p_decision='APPROVED' then 'ENTRY_APPROVED' else 'ENTRY_REJECTED' end,jsonb_build_object('comment',p_comment));
 return v;
end $$;

create or replace function public.register_finance_settlement(
 p_installment_id uuid,p_amount numeric,p_settled_at timestamptz,p_method public.finance_settlement_method,
 p_cash_account_id uuid default null,p_reference text default null,p_notes text default ''
) returns public.finance_settlements language plpgsql security definer set search_path=public as $$
declare v_installment public.finance_installments; v_entry public.finance_entries; v_settlement public.finance_settlements; v_balance numeric; v_open integer; v_any boolean;
begin
 if p_amount<=0 then raise exception 'O valor da baixa deve ser positivo.'; end if;
 select * into v_installment from public.finance_installments where id=p_installment_id for update;
 if not found then raise exception 'Parcela não encontrada.'; end if;
 select * into v_entry from public.finance_entries where id=v_installment.entry_id for update;
 if not public.has_module_permission(v_entry.organization_id,'financeiro','EDIT',v_entry.project_id,'sensitive') then raise exception 'Permissão insuficiente.'; end if;
 if v_entry.status not in ('APPROVED','PARTIALLY_SETTLED','OVERDUE') then raise exception 'O lançamento não está liberado para baixa.'; end if;
 v_balance:=v_installment.balance;
 if p_amount>v_balance+0.001 then raise exception 'O valor da baixa supera o saldo da parcela.'; end if;
 if p_cash_account_id is not null and not exists(select 1 from public.finance_cash_accounts where id=p_cash_account_id and organization_id=v_entry.organization_id and active) then raise exception 'Conta de caixa inválida.'; end if;
 insert into public.finance_settlements(organization_id,installment_id,cash_account_id,amount,settled_at,method,reference,notes,created_by)
 values(v_entry.organization_id,v_installment.id,p_cash_account_id,p_amount,coalesce(p_settled_at,now()),p_method,p_reference,coalesce(p_notes,''),auth.uid()) returning * into v_settlement;
 update public.finance_installments set settled_amount=settled_amount+p_amount,
  status=case when balance-p_amount<=0.001 then 'SETTLED' else 'PARTIALLY_SETTLED' end,updated_at=now()
 where id=v_installment.id;
 select count(*) into v_open from public.finance_installments where entry_id=v_entry.id and status not in ('SETTLED','CANCELED');
 select exists(select 1 from public.finance_installments where entry_id=v_entry.id and settled_amount>0) into v_any;
 update public.finance_entries set status=case when v_open=0 then 'SETTLED' when v_any then 'PARTIALLY_SETTLED' else 'APPROVED' end,updated_at=now() where id=v_entry.id;
 insert into public.finance_events(organization_id,project_id,entry_id,installment_id,actor_user_id,event_type,metadata)
 values(v_entry.organization_id,v_entry.project_id,v_entry.id,v_installment.id,auth.uid(),'SETTLEMENT_REGISTERED',jsonb_build_object('amount',p_amount,'method',p_method,'settlementId',v_settlement.id));
 return v_settlement;
end $$;

create or replace function public.create_finance_entry_from_procurement_order(
 p_order_id uuid,p_first_due_date date,p_installments integer default 1
) returns public.finance_entries language plpgsql security definer set search_path=public as $$
declare v_order public.procurement_orders; v_supplier public.procurement_suppliers; v public.finance_entries;
begin
 select * into v_order from public.procurement_orders where id=p_order_id;
 if not found or v_order.status='CANCELED' then raise exception 'Pedido válido não encontrado.'; end if;
 if not public.has_module_permission(v_order.organization_id,'financeiro','EDIT',v_order.project_id,'sensitive') then raise exception 'Permissão insuficiente.'; end if;
 select * into v_supplier from public.procurement_suppliers where id=v_order.supplier_id;
 insert into public.finance_entries(organization_id,project_id,supplier_id,procurement_order_id,code,direction,source_type,description,document_number,total_amount,issue_date,notes,created_by)
 values(v_order.organization_id,v_order.project_id,v_order.supplier_id,v_order.id,'CP-'||v_order.code,'PAYABLE','PROCUREMENT_ORDER','Pedido '||v_order.code||' · '||coalesce(v_supplier.trade_name,v_supplier.legal_name),v_order.code,v_order.total,coalesce(v_order.issued_at::date,current_date),v_order.payment_terms,auth.uid())
 returning * into v;
 perform public.finance_create_installments(v.id,p_first_due_date,p_installments,1);
 insert into public.finance_events(organization_id,project_id,entry_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v.project_id,v.id,auth.uid(),'ENTRY_IMPORTED_FROM_PURCHASE_ORDER',jsonb_build_object('orderId',v_order.id));
 return v;
exception when unique_violation then raise exception 'Este pedido já possui conta a pagar.';
end $$;

create or replace function public.create_finance_entry_from_contract(
 p_contract_id uuid,p_first_due_date date,p_installments integer default 1
) returns public.finance_entries language plpgsql security definer set search_path=public as $$
declare v_contract public.contracts; v public.finance_entries; v_amount numeric(18,2);
begin
 select * into v_contract from public.contracts where id=p_contract_id;
 if not found or v_contract.status in ('CANCELED','TERMINATED') then raise exception 'Contrato válido não encontrado.'; end if;
 if not public.has_module_permission(v_contract.organization_id,'financeiro','EDIT',v_contract.project_id,'sensitive') then raise exception 'Permissão insuficiente.'; end if;
 v_amount:=coalesce(v_contract.consolidated_value,v_contract.original_value);
 if v_amount<=0 then raise exception 'O contrato não possui valor financeiro válido.'; end if;
 insert into public.finance_entries(organization_id,project_id,client_id,contract_id,code,direction,source_type,description,document_number,total_amount,issue_date,notes,created_by)
 values(v_contract.organization_id,v_contract.project_id,v_contract.client_id,v_contract.id,'CR-'||v_contract.code,'RECEIVABLE','CONTRACT',v_contract.title,v_contract.code,v_amount,coalesce(v_contract.starts_at,current_date),'Recebível originado do contrato.',auth.uid())
 returning * into v;
 perform public.finance_create_installments(v.id,p_first_due_date,p_installments,1);
 insert into public.finance_events(organization_id,project_id,entry_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v.project_id,v.id,auth.uid(),'ENTRY_IMPORTED_FROM_CONTRACT',jsonb_build_object('contractId',v_contract.id));
 return v;
exception when unique_violation then raise exception 'Este contrato já possui cronograma financeiro base.';
end $$;

create or replace function public.submit_finance_measurement(p_measurement_id uuid)
returns public.finance_measurements language plpgsql security definer set search_path=public as $$
declare v public.finance_measurements; v_count integer; v_gross numeric(18,2);
begin
 select * into v from public.finance_measurements where id=p_measurement_id for update;
 if not found then raise exception 'Medição não encontrada.'; end if;
 if not public.has_module_permission(v.organization_id,'financeiro','EDIT',v.project_id,'sensitive') then raise exception 'Permissão insuficiente.'; end if;
 if v.status<>'DRAFT' then raise exception 'Somente medições em rascunho podem ser enviadas.'; end if;
 select count(*),coalesce(sum(amount),0) into v_count,v_gross from public.finance_measurement_items where measurement_id=v.id;
 if v_count=0 or v_gross<=0 then raise exception 'Inclua ao menos um item medido.'; end if;
 update public.finance_measurements set gross_amount=v_gross,status='SUBMITTED',submitted_at=now(),updated_at=now() where id=v.id returning * into v;
 insert into public.finance_events(organization_id,project_id,measurement_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v.project_id,v.id,auth.uid(),'MEASUREMENT_SUBMITTED',jsonb_build_object('grossAmount',v.gross_amount,'netAmount',v.net_amount));
 return v;
end $$;

create or replace function public.decide_finance_measurement(
 p_measurement_id uuid,p_decision public.finance_measurement_status,p_comment text default ''
) returns public.finance_entries language plpgsql security definer set search_path=public as $$
declare v public.finance_measurements; v_entry public.finance_entries; v_approval public.finance_approvals;
begin
 if p_decision not in ('APPROVED','REJECTED') then raise exception 'Decisão inválida.'; end if;
 select * into v from public.finance_measurements where id=p_measurement_id for update;
 if not found or v.status<>'SUBMITTED' then raise exception 'Medição enviada não encontrada.'; end if;
 if not public.has_module_permission(v.organization_id,'financeiro','READ',v.project_id,'approve')
    or not public.has_module_permission(v.organization_id,'financeiro','READ',v.project_id,'sensitive') then raise exception 'Permissão insuficiente para aprovar.'; end if;
 if p_decision='REJECTED' then
  update public.finance_measurements set status='REJECTED',reviewed_at=now(),reviewed_by=auth.uid(),review_comment=coalesce(p_comment,''),updated_at=now() where id=v.id;
  insert into public.finance_events(organization_id,project_id,measurement_id,actor_user_id,event_type,metadata)
  values(v.organization_id,v.project_id,v.id,auth.uid(),'MEASUREMENT_REJECTED',jsonb_build_object('comment',p_comment));
  return null;
 end if;
 if v.net_amount<=0 then raise exception 'A medição não possui valor líquido positivo.'; end if;
 insert into public.finance_entries(organization_id,project_id,client_id,contract_id,measurement_id,code,direction,source_type,description,document_number,status,total_amount,issue_date,competence_date,approved_at,notes,created_by)
 values(v.organization_id,v.project_id,v.client_id,v.contract_id,v.id,'MED-'||v.code,'RECEIVABLE','MEASUREMENT','Medição '||v.code,v.code,'APPROVED',v.net_amount,current_date,v.period_end,now(),'Recebível gerado por medição aprovada.',auth.uid()) returning * into v_entry;
 insert into public.finance_installments(organization_id,entry_id,installment_number,due_date,original_amount)
 values(v.organization_id,v_entry.id,1,v.due_date,v.net_amount);
 insert into public.finance_approvals(organization_id,entry_id,status,amount,requested_by,decided_by,decided_at,comment)
 values(v.organization_id,v_entry.id,'APPROVED',v.net_amount,auth.uid(),auth.uid(),now(),coalesce(p_comment,'')) returning * into v_approval;
 update public.finance_measurements set status='INVOICED',reviewed_at=now(),reviewed_by=auth.uid(),review_comment=coalesce(p_comment,''),updated_at=now() where id=v.id;
 insert into public.finance_events(organization_id,project_id,entry_id,measurement_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v.project_id,v_entry.id,v.id,auth.uid(),'MEASUREMENT_APPROVED_AND_INVOICED',jsonb_build_object('entryId',v_entry.id,'approvalId',v_approval.id,'netAmount',v.net_amount));
 return v_entry;
exception when unique_violation then raise exception 'Esta medição já gerou um recebível.';
end $$;

create or replace function public.refresh_finance_overdue_statuses(p_organization_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 if not public.has_module_permission(p_organization_id,'financeiro','READ',null,'sensitive') then raise exception 'Permissão insuficiente.'; end if;
 update public.finance_installments set status='OVERDUE',updated_at=now()
 where organization_id=p_organization_id and due_date<current_date and balance>0 and status='OPEN';
 get diagnostics v_count=row_count;
 update public.finance_entries entry set status='OVERDUE',updated_at=now()
 where entry.organization_id=p_organization_id and entry.status='APPROVED'
 and exists(select 1 from public.finance_installments installment where installment.entry_id=entry.id and installment.status='OVERDUE');
 return v_count;
end $$;

revoke all on function public.finance_create_installments(uuid,date,integer,integer) from public,anon,authenticated;
revoke all on function public.submit_finance_entry(uuid) from public,anon;
revoke all on function public.decide_finance_approval(uuid,public.finance_approval_status,text) from public,anon;
revoke all on function public.register_finance_settlement(uuid,numeric,timestamptz,public.finance_settlement_method,uuid,text,text) from public,anon;
revoke all on function public.create_finance_entry_from_procurement_order(uuid,date,integer) from public,anon;
revoke all on function public.create_finance_entry_from_contract(uuid,date,integer) from public,anon;
revoke all on function public.submit_finance_measurement(uuid) from public,anon;
revoke all on function public.decide_finance_measurement(uuid,public.finance_measurement_status,text) from public,anon;
revoke all on function public.refresh_finance_overdue_statuses(uuid) from public,anon;
grant execute on function public.finance_create_installments(uuid,date,integer,integer) to service_role;
grant execute on function public.submit_finance_entry(uuid) to authenticated,service_role;
grant execute on function public.decide_finance_approval(uuid,public.finance_approval_status,text) to authenticated,service_role;
grant execute on function public.register_finance_settlement(uuid,numeric,timestamptz,public.finance_settlement_method,uuid,text,text) to authenticated,service_role;
grant execute on function public.create_finance_entry_from_procurement_order(uuid,date,integer) to authenticated,service_role;
grant execute on function public.create_finance_entry_from_contract(uuid,date,integer) to authenticated,service_role;
grant execute on function public.submit_finance_measurement(uuid) to authenticated,service_role;
grant execute on function public.decide_finance_measurement(uuid,public.finance_measurement_status,text) to authenticated,service_role;
grant execute on function public.refresh_finance_overdue_statuses(uuid) to authenticated,service_role;
