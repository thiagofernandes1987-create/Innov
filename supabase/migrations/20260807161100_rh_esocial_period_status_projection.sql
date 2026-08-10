create or replace function public.project_rh_esocial_period_status()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.source_id is null or new.status is not distinct from old.status then return new;end if;

  if new.source_type='PAYROLL_PERIOD_CLOSE' and new.event_type='S-1299' then
    if new.status='ACCEPTED' then
      update public.rh_esocial_period_states set status='CLOSED',last_reconciled_at=now(),updated_at=now()
       where organization_id=new.organization_id and period_id=new.source_id;
    elsif new.status in('BATCHED','SENT','PROCESSING') then
      update public.rh_esocial_period_states set status='CLOSURE_SENT',updated_at=now()
       where organization_id=new.organization_id and period_id=new.source_id;
    elsif new.status='REJECTED' then
      update public.rh_esocial_period_states set status='ERROR',last_reconciled_at=now(),updated_at=now()
       where organization_id=new.organization_id and period_id=new.source_id;
    end if;
  elsif new.source_type='PAYROLL_PERIOD_REOPEN' and new.event_type='S-1298' then
    if new.status='ACCEPTED' then
      update public.rh_esocial_period_states set status='REOPENED',last_reconciled_at=now(),updated_at=now()
       where organization_id=new.organization_id and period_id=new.source_id;
      update public.rh_payroll_periods set status='REOPENED',updated_at=now()
       where organization_id=new.organization_id and id=new.source_id and status='CLOSED';
    elsif new.status in('BATCHED','SENT','PROCESSING') then
      update public.rh_esocial_period_states set status='REOPEN_SENT',updated_at=now()
       where organization_id=new.organization_id and period_id=new.source_id;
    elsif new.status='REJECTED' then
      update public.rh_esocial_period_states set status='ERROR',last_reconciled_at=now(),updated_at=now()
       where organization_id=new.organization_id and period_id=new.source_id;
    end if;
  end if;
  return new;
end$$;

drop trigger if exists trg_rh_esocial_period_status on public.rh_esocial_events;
create trigger trg_rh_esocial_period_status
after update of status on public.rh_esocial_events
for each row execute function public.project_rh_esocial_period_status();
