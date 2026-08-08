create or replace function public.project_rh_termination_esocial_status()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.source_type<>'TERMINATION_CASE' or new.source_id is null or new.status is not distinct from old.status then return new;end if;
 if new.status='ACCEPTED' then update public.rh_termination_cases set status=case when status='EFFECTIVE' then 'CLOSED' when status='EXTERNAL_PENDING' then 'CLOSED' else status end,updated_at=now() where id=new.source_id and organization_id=new.organization_id;
 elsif new.status in('BATCHED','SENT','PROCESSING') then update public.rh_termination_cases set status=case when status='EFFECTIVE' then 'EXTERNAL_PENDING' else status end,updated_at=now() where id=new.source_id and organization_id=new.organization_id;
 elsif new.status='REJECTED' then update public.rh_termination_cases set status=case when status in('EFFECTIVE','EXTERNAL_PENDING') then 'EXTERNAL_PENDING' else status end,updated_at=now() where id=new.source_id and organization_id=new.organization_id;end if;
 return new;
end$$;
drop trigger if exists trg_rh_termination_esocial_status on public.rh_esocial_events;
create trigger trg_rh_termination_esocial_status after update of status on public.rh_esocial_events for each row execute function public.project_rh_termination_esocial_status();
