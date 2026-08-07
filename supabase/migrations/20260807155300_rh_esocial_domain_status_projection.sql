create or replace function public.project_rh_esocial_status_to_domain()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_status text;
begin
 if new.status is not distinct from old.status then return new;end if;
 if new.source_id is null then return new;end if;

 if new.source_type in('SST_CAT','SST_ASO','SST_EXPOSURE') then
   v_status:=case when new.status='ACCEPTED' then 'ACCEPTED' when new.status='REJECTED' then 'REJECTED' when new.status in('BATCHED','SENT','PROCESSING') then 'SENT' else null end;
   if v_status is not null then
     if new.source_type='SST_CAT' then update public.rh_sst_cat_cases set status=v_status,updated_at=now() where id=new.source_id and organization_id=new.organization_id;
     elsif new.source_type='SST_ASO' then update public.rh_sst_aso_records set status=v_status,updated_at=now() where id=new.source_id and organization_id=new.organization_id;
     else update public.rh_sst_exposure_periods set status=v_status,updated_at=now() where id=new.source_id and organization_id=new.organization_id;end if;
   end if;
 elsif new.source_type='LEAVE_CASE_START' then
   if new.status='ACCEPTED' then update public.rh_leave_cases set status='ACTIVE',updated_at=now() where id=new.source_id and organization_id=new.organization_id;
   elsif new.status in('BATCHED','SENT','PROCESSING','REJECTED') then update public.rh_leave_cases set status='EXTERNAL_PENDING',updated_at=now() where id=new.source_id and organization_id=new.organization_id;end if;
 elsif new.source_type='LEAVE_CASE_END' then
   if new.status='ACCEPTED' then update public.rh_leave_cases set status='CLOSED',updated_at=now() where id=new.source_id and organization_id=new.organization_id;
   elsif new.status in('BATCHED','SENT','PROCESSING','REJECTED') then update public.rh_leave_cases set status='RETURN_PENDING',updated_at=now() where id=new.source_id and organization_id=new.organization_id;end if;
 end if;
 return new;
end$$;

drop trigger if exists trg_rh_esocial_domain_status on public.rh_esocial_events;
create trigger trg_rh_esocial_domain_status after update of status on public.rh_esocial_events for each row execute function public.project_rh_esocial_status_to_domain();
