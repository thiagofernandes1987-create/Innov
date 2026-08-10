create or replace function public.approve_rh_benefit_provider_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_status text;v_total numeric;v_items_total numeric;v_items integer;begin
 select organization_id,status,total_amount into v_org,v_status,v_total from public.rh_benefit_provider_invoices where id=p_invoice_id for update;
 if v_org is null then raise exception 'Fatura não encontrada';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(v_org,'rh','READ',null,'approve') then raise exception 'FORBIDDEN';end if;
 if v_status='APPROVED' then return;end if;
 if v_status<>'RECONCILED' then raise exception 'Somente fatura reconciliada pode ser aprovada';end if;
 select count(*),coalesce(sum(billed_total),0) into v_items,v_items_total from public.rh_benefit_provider_invoice_items where invoice_id=p_invoice_id and status='MATCHED';
 if v_items=0 then raise exception 'Fatura sem itens reconciliados';end if;
 if abs(v_items_total-v_total)>0.01 then raise exception 'Total dos itens não confere com o total da fatura';end if;
 update public.rh_benefit_provider_invoices set status='APPROVED',updated_at=now() where id=p_invoice_id;
end$$;

grant execute on function public.approve_rh_benefit_provider_invoice(uuid) to authenticated;

create or replace function public.pay_rh_benefit_provider_invoice(p_invoice_id uuid,p_payment_reference text,p_evidence_reference text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_status text;begin
 select organization_id,status into v_org,v_status from public.rh_benefit_provider_invoices where id=p_invoice_id for update;
 if v_org is null then raise exception 'Fatura não encontrada';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(v_org,'rh','READ',null,'approve') then raise exception 'FORBIDDEN';end if;
 if v_status='PAID' then return;end if;
 if v_status<>'APPROVED' then raise exception 'Fatura precisa estar aprovada para registrar pagamento';end if;
 if nullif(btrim(coalesce(p_payment_reference,'')),'') is null then raise exception 'Referência de pagamento obrigatória';end if;
 update public.rh_benefit_provider_invoices set status='PAID',payment_reference=btrim(p_payment_reference),evidence_reference=coalesce(nullif(btrim(coalesce(p_evidence_reference,'')),''),evidence_reference),updated_at=now() where id=p_invoice_id;
end$$;

grant execute on function public.pay_rh_benefit_provider_invoice(uuid,text,text) to authenticated;
