create table if not exists public.rh_payroll_payments(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,
  run_id uuid not null references public.rh_payroll_runs(id) on delete restrict,
  worker_result_id uuid not null references public.rh_payroll_worker_results(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  amount numeric(18,2) not null check(amount>=0),
  scheduled_date date not null,
  paid_at timestamptz,
  payment_method text not null default 'BANK_TRANSFER' check(payment_method in('BANK_TRANSFER','PIX','CASH','OTHER')),
  bank_reference text,
  external_payment_id text,
  evidence_reference text,
  status text not null default 'PENDING' check(status in('PENDING','BATCHED','SENT','SETTLED','REJECTED','CANCELLED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(worker_result_id)
);
create table if not exists public.rh_payroll_payment_batches(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,provider_code text not null,file_format text not null,
  file_name text,storage_path text,file_sha256 text,generated_at timestamptz,sent_at timestamptz,return_received_at timestamptz,
  status text not null default 'DRAFT' check(status in('DRAFT','GENERATED','SENT','PARTIALLY_SETTLED','SETTLED','REJECTED','CANCELLED')),
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.rh_payroll_payment_batch_items(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  batch_id uuid not null references public.rh_payroll_payment_batches(id) on delete cascade,payment_id uuid not null references public.rh_payroll_payments(id) on delete restrict,
  sequence_number integer not null check(sequence_number>0),created_at timestamptz not null default now(),unique(batch_id,payment_id),unique(batch_id,sequence_number)
);
create table if not exists public.rh_esocial_period_states(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,reference_month date not null,
  status text not null default 'OPEN' check(status in('OPEN','REMUNERATION_PENDING','PAYMENTS_PENDING','READY_TO_CLOSE','CLOSURE_SENT','CLOSED','REOPEN_SENT','REOPENED','ERROR')),
  closure_event_id uuid references public.rh_esocial_events(id) on delete set null,reopen_event_id uuid references public.rh_esocial_events(id) on delete set null,
  last_reconciled_at timestamptz,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(period_id)
);
alter table public.rh_payroll_payments add constraint rh_payroll_payments_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_payment_batches add constraint rh_payroll_payment_batches_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_payments drop constraint if exists rh_payroll_payments_period_id_fkey;
alter table public.rh_payroll_payments add constraint rh_payroll_payment_period_tenant_fk foreign key(organization_id,period_id) references public.rh_payroll_periods(organization_id,id) on delete restrict;
alter table public.rh_payroll_payments add constraint rh_payroll_payment_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_payroll_payment_batches drop constraint if exists rh_payroll_payment_batches_period_id_fkey;
alter table public.rh_payroll_payment_batches add constraint rh_payment_batch_period_tenant_fk foreign key(organization_id,period_id) references public.rh_payroll_periods(organization_id,id) on delete restrict;
alter table public.rh_payroll_payment_batch_items drop constraint if exists rh_payroll_payment_batch_items_batch_id_fkey;
alter table public.rh_payroll_payment_batch_items add constraint rh_payment_batch_item_batch_tenant_fk foreign key(organization_id,batch_id) references public.rh_payroll_payment_batches(organization_id,id) on delete cascade;
alter table public.rh_payroll_payment_batch_items drop constraint if exists rh_payroll_payment_batch_items_payment_id_fkey;
alter table public.rh_payroll_payment_batch_items add constraint rh_payment_batch_item_payment_tenant_fk foreign key(organization_id,payment_id) references public.rh_payroll_payments(organization_id,id) on delete restrict;
alter table public.rh_esocial_period_states drop constraint if exists rh_esocial_period_states_period_id_fkey;
alter table public.rh_esocial_period_states add constraint rh_esocial_period_tenant_fk foreign key(organization_id,period_id) references public.rh_payroll_periods(organization_id,id) on delete restrict;

do $$declare t text;begin foreach t in array array['rh_payroll_payments','rh_payroll_payment_batches','rh_payroll_payment_batch_items','rh_esocial_period_states'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);end loop;end$$;

create or replace function public.create_rh_payroll_payments(p_period_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_run uuid;v_pay_date date;v_count integer:=0;begin
 select organization_id,pay_date into v_org,v_pay_date from public.rh_payroll_periods where id=p_period_id;if v_org is null then raise exception 'Competência não encontrada';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;if v_pay_date is null then raise exception 'Data de pagamento precisa estar definida';end if;
 select id into v_run from public.rh_payroll_runs where period_id=p_period_id and status='COMPLETED' order by run_number desc limit 1;if v_run is null then raise exception 'Folha calculada não encontrada';end if;
 insert into public.rh_payroll_payments(organization_id,period_id,run_id,worker_result_id,employment_id,amount,scheduled_date,created_by)
 select v_org,p_period_id,v_run,w.id,w.employment_id,w.net_amount,v_pay_date,auth.uid() from public.rh_payroll_worker_results w where w.run_id=v_run and not exists(select 1 from public.rh_payroll_payments p where p.worker_result_id=w.id);
 get diagnostics v_count=row_count;return v_count;
end$$;
create or replace function public.settle_rh_payroll_payment(p_payment_id uuid,p_paid_at timestamptz,p_bank_reference text,p_external_payment_id text,p_evidence_reference text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$declare v_org uuid;begin select organization_id into v_org from public.rh_payroll_payments where id=p_payment_id for update;if v_org is null then raise exception 'Pagamento não encontrado';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','APPROVE',null,null) then raise exception 'FORBIDDEN';end if;update public.rh_payroll_payments set status='SETTLED',paid_at=p_paid_at,bank_reference=p_bank_reference,external_payment_id=p_external_payment_id,evidence_reference=p_evidence_reference,updated_at=now() where id=p_payment_id;end$$;
grant execute on function public.create_rh_payroll_payments(uuid) to authenticated;
grant execute on function public.settle_rh_payroll_payment(uuid,timestamptz,text,text,text) to authenticated;
