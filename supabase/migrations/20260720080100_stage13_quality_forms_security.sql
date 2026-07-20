-- Etapa 13 — fluxos, imutabilidade, RLS e Storage.

create or replace function public.freeze_quality_form_version()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.frozen_at is not null and new is distinct from old then
    raise exception 'Versão publicada é imutável; crie uma nova versão.';
  end if;
  return new;
end $$;

drop trigger if exists quality_form_version_immutable on public.quality_form_versions;
create trigger quality_form_version_immutable before update or delete on public.quality_form_versions
for each row execute function public.freeze_quality_form_version();

create or replace function public.publish_quality_form_version(p_version_id uuid)
returns public.quality_form_versions
language plpgsql security definer set search_path=public as $$
declare
  v_version public.quality_form_versions;
  v_template public.quality_form_templates;
begin
  select * into v_version from public.quality_form_versions where id=p_version_id for update;
  if not found then raise exception 'Versão não encontrada.'; end if;
  select * into v_template from public.quality_form_templates where id=v_version.template_id for update;
  if not public.has_module_permission(v_version.organization_id,'qualidade','EDIT',null,'approve') then
    raise exception 'Permissão insuficiente para publicar formulário.';
  end if;
  if jsonb_array_length(coalesce(v_version.schema_json->'fields','[]'::jsonb))=0 then
    raise exception 'O formulário precisa possuir ao menos um campo.';
  end if;
  update public.quality_form_versions set frozen_at=now(),frozen_by=auth.uid() where id=p_version_id returning * into v_version;
  update public.quality_form_templates set current_version_id=p_version_id,status='PUBLISHED',updated_at=now() where id=v_template.id;
  insert into public.quality_form_events(organization_id,template_id,actor_user_id,event_type,metadata)
  values(v_version.organization_id,v_template.id,auth.uid(),'FORM_VERSION_PUBLISHED',jsonb_build_object('versionId',p_version_id,'versionNumber',v_version.version_number));
  return v_version;
end $$;

create or replace function public.review_quality_response(p_response_id uuid,p_decision public.quality_response_status,p_comment text default null)
returns public.quality_form_responses
language plpgsql security definer set search_path=public as $$
declare v public.quality_form_responses;
begin
  if p_decision not in ('APPROVED','REJECTED') then raise exception 'Decisão inválida.'; end if;
  select * into v from public.quality_form_responses where id=p_response_id for update;
  if not found then raise exception 'Resposta não encontrada.'; end if;
  if not public.has_module_permission(v.organization_id,'qualidade','EDIT',v.project_id,'approve') then
    raise exception 'Permissão insuficiente.';
  end if;
  update public.quality_form_responses set status=p_decision,reviewed_at=now(),reviewed_by=auth.uid(),review_comment=p_comment,updated_at=now()
  where id=p_response_id returning * into v;
  insert into public.quality_form_events(organization_id,assignment_id,response_id,actor_user_id,event_type,metadata)
  values(v.organization_id,v.assignment_id,v.id,auth.uid(),'RESPONSE_REVIEWED',jsonb_build_object('decision',p_decision,'comment',p_comment));
  return v;
end $$;

create or replace function public.mark_quality_response_submitted(p_response_id uuid,p_score numeric default null,p_result text default null)
returns public.quality_form_responses
language plpgsql security definer set search_path=public as $$
declare v public.quality_form_responses; v_assignment public.quality_form_assignments;
begin
  select * into v from public.quality_form_responses where id=p_response_id for update;
  if not found then raise exception 'Resposta não encontrada.'; end if;
  select * into v_assignment from public.quality_form_assignments where id=v.assignment_id for update;
  if v.status<>'DRAFT' then raise exception 'Resposta já foi enviada.'; end if;
  update public.quality_form_responses set status='SUBMITTED',score=p_score,result=p_result,submitted_at=now(),updated_at=now()
  where id=p_response_id returning * into v;
  update public.quality_form_assignments set responses_count=responses_count+1,
    status=case when responses_count+1>=max_responses then 'COMPLETED' else 'OPEN' end,updated_at=now()
  where id=v.assignment_id;
  insert into public.quality_form_events(organization_id,assignment_id,response_id,actor_user_id,event_type,metadata)
  values(v.organization_id,v.assignment_id,v.id,auth.uid(),'RESPONSE_SUBMITTED',jsonb_build_object('score',p_score,'result',p_result));
  return v;
end $$;

create or replace function public.quality_client_matches(p_client_id uuid,p_project_id uuid default null)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.clients c
    where c.id=p_client_id and c.user_id=auth.uid()
      and (p_project_id is null or exists(select 1 from public.projects p where p.id=p_project_id and p.client_id=c.id))
  );
$$;

alter table public.quality_documents enable row level security;
alter table public.quality_form_templates enable row level security;
alter table public.quality_form_versions enable row level security;
alter table public.quality_form_assignments enable row level security;
alter table public.quality_public_links enable row level security;
alter table public.quality_form_responses enable row level security;
alter table public.quality_form_answers enable row level security;
alter table public.quality_form_events enable row level security;

create policy quality_documents_internal_read on public.quality_documents for select to authenticated
using(public.has_module_permission(organization_id,'qualidade','READ',project_id,null));
create policy quality_documents_internal_write on public.quality_documents for insert to authenticated
with check(public.has_module_permission(organization_id,'qualidade','EDIT',project_id,null));
create policy quality_documents_internal_update on public.quality_documents for update to authenticated
using(public.has_module_permission(organization_id,'qualidade','EDIT',project_id,null))
with check(public.has_module_permission(organization_id,'qualidade','EDIT',project_id,null));
create policy quality_documents_internal_delete on public.quality_documents for delete to authenticated
using(public.has_module_permission(organization_id,'qualidade','DELETE',project_id,null));
create policy quality_documents_client_read on public.quality_documents for select to authenticated
using(client_visible and client_id is not null and public.quality_client_matches(client_id,project_id));

create policy quality_templates_internal_read on public.quality_form_templates for select to authenticated
using(public.has_module_permission(organization_id,'qualidade','READ',null,null));
create policy quality_templates_internal_write on public.quality_form_templates for all to authenticated
using(public.has_module_permission(organization_id,'qualidade','EDIT',null,null))
with check(public.has_module_permission(organization_id,'qualidade','EDIT',null,null));

create policy quality_versions_internal_read on public.quality_form_versions for select to authenticated
using(public.has_module_permission(organization_id,'qualidade','READ',null,null));
create policy quality_versions_internal_write on public.quality_form_versions for insert to authenticated
with check(public.has_module_permission(organization_id,'qualidade','EDIT',null,null));

create policy quality_assignments_internal_read on public.quality_form_assignments for select to authenticated
using(public.has_module_permission(organization_id,'qualidade','READ',project_id,null));
create policy quality_assignments_internal_write on public.quality_form_assignments for all to authenticated
using(public.has_module_permission(organization_id,'qualidade','EDIT',project_id,null))
with check(public.has_module_permission(organization_id,'qualidade','EDIT',project_id,null));
create policy quality_assignments_client_read on public.quality_form_assignments for select to authenticated
using((assignee_user_id=auth.uid()) or (client_id is not null and public.quality_client_matches(client_id,project_id)));

create policy quality_links_internal on public.quality_public_links for all to authenticated
using(public.has_module_permission(organization_id,'qualidade','EDIT',null,null))
with check(public.has_module_permission(organization_id,'qualidade','EDIT',null,null));

create policy quality_responses_internal_read on public.quality_form_responses for select to authenticated
using(public.has_module_permission(organization_id,'qualidade','READ',project_id,null));
create policy quality_responses_internal_write on public.quality_form_responses for all to authenticated
using(public.has_module_permission(organization_id,'qualidade','EDIT',project_id,null))
with check(public.has_module_permission(organization_id,'qualidade','EDIT',project_id,null));
create policy quality_responses_client_read on public.quality_form_responses for select to authenticated
using((respondent_user_id=auth.uid()) or (client_id is not null and public.quality_client_matches(client_id,project_id)));

create policy quality_answers_internal_read on public.quality_form_answers for select to authenticated
using(exists(select 1 from public.quality_form_responses r where r.id=response_id and public.has_module_permission(r.organization_id,'qualidade','READ',r.project_id,null)));
create policy quality_answers_internal_write on public.quality_form_answers for all to authenticated
using(exists(select 1 from public.quality_form_responses r where r.id=response_id and public.has_module_permission(r.organization_id,'qualidade','EDIT',r.project_id,null)))
with check(exists(select 1 from public.quality_form_responses r where r.id=response_id and public.has_module_permission(r.organization_id,'qualidade','EDIT',r.project_id,null)));
create policy quality_answers_client_read on public.quality_form_answers for select to authenticated
using(exists(select 1 from public.quality_form_responses r where r.id=response_id and (r.respondent_user_id=auth.uid() or (r.client_id is not null and public.quality_client_matches(r.client_id,r.project_id)))));

create policy quality_events_internal_read on public.quality_form_events for select to authenticated
using(public.has_module_permission(organization_id,'qualidade','READ',null,null));

create policy quality_documents_storage_internal_read on storage.objects for select to authenticated
using(bucket_id='quality-documents' and public.has_module_permission((storage.foldername(name))[1]::uuid,'qualidade','READ',null,null));
create policy quality_documents_storage_internal_insert on storage.objects for insert to authenticated
with check(bucket_id='quality-documents' and public.has_module_permission((storage.foldername(name))[1]::uuid,'qualidade','EDIT',null,null));
create policy quality_documents_storage_internal_delete on storage.objects for delete to authenticated
using(bucket_id='quality-documents' and public.has_module_permission((storage.foldername(name))[1]::uuid,'qualidade','DELETE',null,null));

create policy quality_attachments_storage_internal_read on storage.objects for select to authenticated
using(bucket_id='quality-form-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'qualidade','READ',null,null));
create policy quality_attachments_storage_internal_insert on storage.objects for insert to authenticated
with check(bucket_id='quality-form-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'qualidade','EDIT',null,null));

revoke all on function public.freeze_quality_form_version() from public,anon,authenticated;
revoke all on function public.quality_client_matches(uuid,uuid) from public,anon;
revoke all on function public.publish_quality_form_version(uuid) from public,anon;
revoke all on function public.review_quality_response(uuid,public.quality_response_status,text) from public,anon;
revoke all on function public.mark_quality_response_submitted(uuid,numeric,text) from public,anon;
grant execute on function public.quality_client_matches(uuid,uuid) to authenticated,service_role;
grant execute on function public.publish_quality_form_version(uuid) to authenticated,service_role;
grant execute on function public.review_quality_response(uuid,public.quality_response_status,text) to authenticated,service_role;
grant execute on function public.mark_quality_response_submitted(uuid,numeric,text) to authenticated,service_role;
