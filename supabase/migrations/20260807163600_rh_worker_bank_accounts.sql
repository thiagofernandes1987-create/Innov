create table if not exists public.rh_worker_bank_accounts(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  worker_id uuid not null references public.rh_workers(id) on delete restrict,
  account_holder_tax_id text not null,bank_code text,branch_number text,account_number text,account_digit text,
  account_type text check(account_type is null or account_type in('CHECKING','SAVINGS','PAYMENT')),
  pix_key_type text check(pix_key_type is null or pix_key_type in('CPF','CNPJ','EMAIL','PHONE','EVP')),
  pix_key text,priority integer not null default 1 check(priority>0),active boolean not null default true,
  valid_from date not null default current_date,valid_to date,evidence_reference text,
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check((pix_key is not null) or (bank_code is not null and branch_number is not null and account_number is not null)),
  check(valid_to is null or valid_to>=valid_from)
);
alter table public.rh_worker_bank_accounts add constraint rh_worker_bank_accounts_org_id_uq unique(organization_id,id);
alter table public.rh_worker_bank_accounts add constraint rh_worker_bank_worker_tenant_fk foreign key(organization_id,worker_id) references public.rh_workers(organization_id,id) on delete restrict;
create unique index if not exists rh_worker_bank_active_priority_uq on public.rh_worker_bank_accounts(organization_id,worker_id,priority) where active;
alter table public.rh_worker_bank_accounts enable row level security;
create policy rh_read on public.rh_worker_bank_accounts for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_worker_bank_accounts for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

create or replace function public.create_rh_payroll_payment_batch(p_period_id uuid,p_provider_code text,p_file_format text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_batch uuid;v_seq integer:=0;v_payment record;v_missing integer;begin
 select organization_id into v_org from public.rh_payroll_periods where id=p_period_id;if v_org is null then raise exception 'Competência não encontrada';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','APPROVE',null,null) then raise exception 'FORBIDDEN';end if;if coalesce(trim(p_provider_code),'')='' or coalesce(trim(p_file_format),'')='' then raise exception 'Provider e formato são obrigatórios';end if;
 select count(*) into v_missing from public.rh_payroll_payments p join public.rh_employments e on e.id=p.employment_id where p.organization_id=v_org and p.period_id=p_period_id and p.status='PENDING' and not exists(select 1 from public.rh_worker_bank_accounts b where b.organization_id=v_org and b.worker_id=e.worker_id and b.active and b.valid_from<=p.scheduled_date and(b.valid_to is null or b.valid_to>=p.scheduled_date));if v_missing>0 then raise exception 'Existem % pagamentos sem conta bancária/PIX ativa',v_missing;end if;
 insert into public.rh_payroll_payment_batches(organization_id,period_id,provider_code,file_format,status,created_by) values(v_org,p_period_id,p_provider_code,p_file_format,'DRAFT',auth.uid()) returning id into v_batch;
 for v_payment in select id from public.rh_payroll_payments where organization_id=v_org and period_id=p_period_id and status='PENDING' order by employment_id,id for update loop v_seq:=v_seq+1;insert into public.rh_payroll_payment_batch_items(organization_id,batch_id,payment_id,sequence_number) values(v_org,v_batch,v_payment.id,v_seq);update public.rh_payroll_payments set status='BATCHED',updated_at=now() where id=v_payment.id;end loop;if v_seq=0 then delete from public.rh_payroll_payment_batches where id=v_batch;raise exception 'Nenhum pagamento pendente para formar lote';end if;return v_batch;
end$$;
