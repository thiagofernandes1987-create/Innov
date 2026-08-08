create table if not exists public.rh_benefit_provider_invoices(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 provider_name text not null,reference_month date not null check(extract(day from reference_month)=1),external_invoice_number text,total_amount numeric(18,2) not null check(total_amount>=0),
 status text not null default 'DRAFT' check(status in('DRAFT','IMPORTED','RECONCILED','DIVERGENT','APPROVED','PAID','CANCELLED')),
 due_date date,payment_reference text,evidence_reference text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,provider_name,reference_month,external_invoice_number)
);
create table if not exists public.rh_benefit_provider_invoice_items(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 invoice_id uuid not null,enrollment_id uuid not null,external_worker_reference text,billed_total numeric(18,2) not null check(billed_total>=0),billed_employee_amount numeric(18,2) not null default 0 check(billed_employee_amount>=0),
 expected_total numeric(18,2),expected_employee_amount numeric(18,2),difference_amount numeric(18,2),charge_id uuid references public.rh_benefit_charges(id) on delete set null,
 status text not null default 'PENDING' check(status in('PENDING','MATCHED','DIVERGENT','MISSING_INTERNAL','IGNORED')),note text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(invoice_id,enrollment_id)
);
alter table public.rh_benefit_provider_invoices add constraint rh_benefit_provider_invoices_org_id_uq unique(organization_id,id);
alter table public.rh_benefit_provider_invoice_items add constraint rh_benefit_invoice_items_invoice_fk foreign key(organization_id,invoice_id) references public.rh_benefit_provider_invoices(organization_id,id) on delete cascade;
alter table public.rh_benefit_provider_invoice_items add constraint rh_benefit_invoice_items_enrollment_fk foreign key(organization_id,enrollment_id) references public.rh_benefit_enrollments(organization_id,id) on delete restrict;
create index if not exists rh_benefit_provider_invoices_period_idx on public.rh_benefit_provider_invoices(organization_id,reference_month,status);
create index if not exists rh_benefit_provider_invoice_items_invoice_idx on public.rh_benefit_provider_invoice_items(organization_id,invoice_id,status);

do $$declare t text;begin foreach t in array array['rh_benefit_provider_invoices','rh_benefit_provider_invoice_items'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);end loop;end$$;

create or replace function public.reconcile_rh_benefit_provider_invoice(p_invoice_id uuid)
returns table(matched integer,divergent integer,missing_internal integer,total_difference numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_month date;v_total numeric;begin
 select organization_id,reference_month,total_amount into v_org,v_month,v_total from public.rh_benefit_provider_invoices where id=p_invoice_id for update;
 if v_org is null then raise exception 'Fatura não encontrada';end if;if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 update public.rh_benefit_provider_invoice_items i set charge_id=c.id,expected_total=c.provider_amount,expected_employee_amount=c.employee_amount+c.copay_amount,difference_amount=round(i.billed_total-c.provider_amount,2),status=case when abs(round(i.billed_total-c.provider_amount,2))<=0.01 and abs(round(i.billed_employee_amount-(c.employee_amount+c.copay_amount),2))<=0.01 then 'MATCHED' else 'DIVERGENT' end,updated_at=now()
 from public.rh_benefit_charges c where i.invoice_id=p_invoice_id and c.organization_id=v_org and c.enrollment_id=i.enrollment_id and c.reference_month=v_month;
 update public.rh_benefit_provider_invoice_items i set charge_id=null,expected_total=null,expected_employee_amount=null,difference_amount=null,status='MISSING_INTERNAL',updated_at=now() where i.invoice_id=p_invoice_id and not exists(select 1 from public.rh_benefit_charges c where c.organization_id=v_org and c.enrollment_id=i.enrollment_id and c.reference_month=v_month);
 select count(*) filter(where status='MATCHED'),count(*) filter(where status='DIVERGENT'),count(*) filter(where status='MISSING_INTERNAL'),coalesce(sum(coalesce(difference_amount,0)),0) into matched,divergent,missing_internal,total_difference from public.rh_benefit_provider_invoice_items where invoice_id=p_invoice_id;
 update public.rh_benefit_provider_invoices set status=case when divergent=0 and missing_internal=0 and abs(coalesce(total_difference,0))<=0.01 then 'RECONCILED' else 'DIVERGENT' end,updated_at=now() where id=p_invoice_id;
 return next;
end$$;
grant execute on function public.reconcile_rh_benefit_provider_invoice(uuid) to authenticated;
