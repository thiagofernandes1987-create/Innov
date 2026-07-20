-- Correções identificadas durante a homologação da Etapa 13.

create or replace function public.freeze_quality_form_version()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.frozen_at is not null then
    raise exception 'Versão publicada é imutável; crie uma nova versão.';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
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
  if v_assignment.responses_count>=v_assignment.max_responses then raise exception 'Limite de respostas atingido.'; end if;
  update public.quality_form_responses set status='SUBMITTED',score=p_score,result=p_result,submitted_at=now(),updated_at=now()
  where id=p_response_id returning * into v;
  update public.quality_form_assignments set responses_count=responses_count+1,
    status=case when responses_count+1>=max_responses then 'COMPLETED' else 'OPEN' end,updated_at=now()
  where id=v.assignment_id;
  insert into public.quality_form_events(organization_id,assignment_id,response_id,actor_user_id,event_type,metadata)
  values(v.organization_id,v.assignment_id,v.id,auth.uid(),'RESPONSE_SUBMITTED',jsonb_build_object('score',p_score,'result',p_result));
  return v;
end $$;

drop policy if exists quality_documents_storage_client_read on storage.objects;
create policy quality_documents_storage_client_read on storage.objects for select to authenticated
using(bucket_id='quality-documents' and exists(
  select 1 from public.quality_documents d
  where d.storage_path=name and d.client_visible and d.client_id is not null
    and public.quality_client_matches(d.client_id,d.project_id)
));

drop policy if exists quality_attachments_storage_client_read on storage.objects;
create policy quality_attachments_storage_client_read on storage.objects for select to authenticated
using(bucket_id='quality-form-attachments' and exists(
  select 1 from public.quality_form_answers a
  join public.quality_form_responses r on r.id=a.response_id
  where a.file_storage_path=name
    and (r.respondent_user_id=auth.uid() or (r.client_id is not null and public.quality_client_matches(r.client_id,r.project_id)))
));
