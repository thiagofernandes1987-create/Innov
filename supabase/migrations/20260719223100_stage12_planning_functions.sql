begin;

create or replace function public.is_project_client(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1
    from public.projects p
    where p.id=p_project_id
      and p.client_released_at is not null
      and p.client_id is not null
      and public.is_client_owner(p.client_id)
  );
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1
    from public.projects p
    where p.id=p_project_id
      and (
        public.has_org_role(
          p.organization_id,
          array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
        )
        or exists(
          select 1
          from public.project_memberships pm
          where pm.project_id=p.id
            and pm.user_id=auth.uid()
            and pm.active
        )
      )
  );
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1
    from public.projects p
    where p.id=p_project_id
      and (
        public.has_org_role(
          p.organization_id,
          array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO']::public.org_role[]
        )
        or exists(
          select 1
          from public.project_memberships pm
          where pm.project_id=p.id
            and pm.user_id=auth.uid()
            and pm.active
            and pm.role in ('GESTOR_OBRAS','ENGENHEIRO')
        )
      )
  );
$$;

create or replace function public.can_write_daily_log(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1
    from public.projects p
    where p.id=p_project_id
      and (
        public.has_org_role(
          p.organization_id,
          array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO','QUALIDADE']::public.org_role[]
        )
        or exists(
          select 1
          from public.project_memberships pm
          where pm.project_id=p.id
            and pm.user_id=auth.uid()
            and pm.active
            and pm.can_write_daily_logs
        )
      )
  );
$$;

create or replace function public.create_project_from_contract(
  p_contract_id uuid,
  p_code text,
  p_name text,
  p_planned_start date,
  p_planned_end date,
  p_address_line text default null,
  p_city text default null,
  p_state text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_contract public.contracts;
  v_project_id uuid;
begin
  select * into v_contract
  from public.contracts
  where id=p_contract_id
  for update;

  if not found then raise exception 'Contrato não encontrado'; end if;
  if v_contract.status not in ('SIGNED','ACTIVE','AMENDED') then
    raise exception 'O contrato precisa estar assinado ou ativo';
  end if;
  if not public.has_org_role(
    v_contract.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;
  if p_planned_end < p_planned_start then
    raise exception 'Período planejado inválido';
  end if;

  insert into public.projects(
    organization_id,client_id,contract_id,code,name,status,planned_start,planned_end,
    address_line,city,state,manager_id,created_by
  ) values (
    v_contract.organization_id,v_contract.client_id,v_contract.id,
    upper(trim(p_code)),trim(p_name),'PLANNING',p_planned_start,p_planned_end,
    p_address_line,p_city,p_state,auth.uid(),auth.uid()
  ) returning id into v_project_id;

  insert into public.project_memberships(
    organization_id,project_id,user_id,role,active,can_edit_schedule,
    can_write_daily_logs,can_release_client_content,created_by
  ) values (
    v_contract.organization_id,v_project_id,auth.uid(),'GESTOR_OBRAS',true,true,true,true,auth.uid()
  ) on conflict(project_id,user_id) do nothing;

  update public.contracts
  set project_id=v_project_id
  where id=v_contract.id;

  perform public.write_audit(
    v_contract.organization_id,'PROJECT',v_project_id,'CREATE_FROM_CONTRACT',
    jsonb_build_object('contract_id',v_contract.id),v_project_id
  );
  return v_project_id;
end;
$$;

create or replace function public.recalculate_project_progress(p_project_id uuid)
returns numeric
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_org uuid;
  v_progress numeric(7,6);
  v_planned numeric(7,6);
  v_today date:=current_date;
begin
  select organization_id into v_org
  from public.projects
  where id=p_project_id;

  if not public.can_manage_project(p_project_id) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(
    case
      when sum(case when status <> 'CANCELED' then weight else 0 end)>0
      then sum(case when status <> 'CANCELED' then weight*progress else 0 end)
        / sum(case when status <> 'CANCELED' then weight else 0 end)
      else avg(case when status <> 'CANCELED' then progress end)
    end,
    0
  ) into v_progress
  from public.project_tasks
  where project_id=p_project_id;

  select coalesce(avg(
    case
      when planned_start is null or planned_end is null then 0
      when v_today < planned_start then 0
      when v_today >= planned_end then 1
      when planned_end=planned_start then 1
      else greatest(
        0,
        least(1,(v_today-planned_start)::numeric/nullif((planned_end-planned_start),0))
      )
    end
  ),0) into v_planned
  from public.project_tasks
  where project_id=p_project_id
    and status <> 'CANCELED';

  update public.projects
  set progress=v_progress,updated_at=now()
  where id=p_project_id;

  insert into public.project_progress_snapshots(
    organization_id,project_id,snapshot_date,planned_progress,actual_progress,source,created_by
  ) values (
    v_org,p_project_id,current_date,v_planned,v_progress,'SYSTEM',auth.uid()
  )
  on conflict(project_id,snapshot_date,source)
  do update set
    planned_progress=excluded.planned_progress,
    actual_progress=excluded.actual_progress,
    created_at=now();

  perform public.write_audit(
    v_org,'PROJECT',p_project_id,'RECALCULATE_PROGRESS',
    jsonb_build_object('planned',v_planned,'actual',v_progress),p_project_id
  );
  return v_progress;
end;
$$;

create or replace function public.move_project_task(
  p_task_id uuid,
  p_status public.task_status,
  p_progress numeric default null,
  p_reason text default null
) returns public.project_tasks
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_task public.project_tasks;
begin
  select * into v_task
  from public.project_tasks
  where id=p_task_id
  for update;

  if not found then raise exception 'Tarefa não encontrada'; end if;
  if not public.can_manage_project(v_task.project_id) then
    raise exception 'Acesso negado';
  end if;
  if p_progress is not null and (p_progress < 0 or p_progress > 1) then
    raise exception 'Progresso deve estar entre zero e um';
  end if;
  if p_status='BLOCKED' and nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'Motivo do bloqueio obrigatório';
  end if;

  update public.project_tasks set
    status=p_status,
    progress=coalesce(p_progress,case when p_status='COMPLETED' then 1 else progress end),
    blocked_reason=case when p_status='BLOCKED' then p_reason else null end,
    actual_start=case
      when p_status='IN_PROGRESS' then coalesce(actual_start,current_date)
      else actual_start
    end,
    actual_end=case
      when p_status='COMPLETED' then coalesce(actual_end,current_date)
      else actual_end
    end,
    updated_at=now()
  where id=p_task_id
  returning * into v_task;

  perform public.recalculate_project_progress(v_task.project_id);
  perform public.write_audit(
    v_task.organization_id,'PROJECT_TASK',v_task.id,'MOVE_STATUS',
    jsonb_build_object('status',v_task.status,'progress',v_task.progress,'reason',p_reason),
    v_task.project_id
  );
  return v_task;
end;
$$;

create or replace function public.create_schedule_baseline(
  p_project_id uuid,
  p_name text,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_org uuid;
  v_id uuid;
  v_version integer;
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'Acesso negado';
  end if;

  select organization_id into v_org
  from public.projects
  where id=p_project_id;

  select coalesce(max(version_number),0)+1 into v_version
  from public.schedule_baselines
  where project_id=p_project_id;

  update public.schedule_baselines
  set status='SUPERSEDED'
  where project_id=p_project_id
    and status='FROZEN';

  insert into public.schedule_baselines(
    organization_id,project_id,version_number,name,status,notes,
    created_by,frozen_by,frozen_at
  ) values (
    v_org,p_project_id,v_version,trim(p_name),'FROZEN',p_notes,
    auth.uid(),auth.uid(),now()
  ) returning id into v_id;

  insert into public.schedule_baseline_tasks(
    organization_id,baseline_id,task_id,planned_start,planned_end,duration_days,weight
  )
  select organization_id,v_id,id,planned_start,planned_end,duration_days,weight
  from public.project_tasks
  where project_id=p_project_id;

  perform public.write_audit(
    v_org,'SCHEDULE_BASELINE',v_id,'FREEZE',
    jsonb_build_object('version',v_version),p_project_id
  );
  return v_id;
end;
$$;

create or replace function public.submit_daily_log(p_daily_log_id uuid)
returns public.daily_logs
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v public.daily_logs;
begin
  select * into v
  from public.daily_logs
  where id=p_daily_log_id
  for update;

  if not found then raise exception 'Diário não encontrado'; end if;
  if not public.can_write_daily_log(v.project_id) then
    raise exception 'Acesso negado';
  end if;
  if v.status not in ('DRAFT','REJECTED') then
    raise exception 'Estado inválido para envio';
  end if;

  update public.daily_logs set
    status='SUBMITTED',
    submitted_by=auth.uid(),
    submitted_at=now(),
    rejection_reason=null,
    updated_at=now()
  where id=v.id
  returning * into v;

  perform public.write_audit(
    v.organization_id,'DAILY_LOG',v.id,'SUBMIT',
    jsonb_build_object('date',v.log_date),v.project_id
  );
  return v;
end;
$$;

create or replace function public.decide_daily_log(
  p_daily_log_id uuid,
  p_approve boolean,
  p_reason text default null,
  p_release_client boolean default false
) returns public.daily_logs
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v public.daily_logs;
begin
  select * into v
  from public.daily_logs
  where id=p_daily_log_id
  for update;

  if not found then raise exception 'Diário não encontrado'; end if;
  if not public.can_manage_project(v.project_id) then
    raise exception 'Acesso negado';
  end if;
  if v.status<>'SUBMITTED' then
    raise exception 'Somente diário enviado pode ser decidido';
  end if;
  if not p_approve and nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'Motivo da rejeição obrigatório';
  end if;

  update public.daily_logs set
    status=case when p_approve then 'APPROVED' else 'REJECTED' end,
    approved_by=case when p_approve then auth.uid() else null end,
    approved_at=case when p_approve then now() else null end,
    rejection_reason=case when p_approve then null else p_reason end,
    client_visible=case when p_approve then p_release_client else false end,
    updated_at=now()
  where id=v.id
  returning * into v;

  perform public.write_audit(
    v.organization_id,'DAILY_LOG',v.id,
    case when p_approve then 'APPROVE' else 'REJECT' end,
    jsonb_build_object('reason',p_reason,'client_visible',v.client_visible),
    v.project_id
  );
  return v;
end;
$$;

create or replace function public.release_project_document_version(p_version_id uuid)
returns public.project_document_versions
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v public.project_document_versions;
begin
  select * into v
  from public.project_document_versions
  where id=p_version_id
  for update;

  if not found then raise exception 'Versão não encontrada'; end if;
  if not public.can_manage_project(v.project_id) then
    raise exception 'Acesso negado';
  end if;
  if nullif(v.sha256,'') is null then
    raise exception 'Hash SHA-256 obrigatório';
  end if;

  update public.project_document_versions set
    status='RELEASED',
    approved_by=coalesce(approved_by,auth.uid()),
    approved_at=coalesce(approved_at,now()),
    client_released_at=now()
  where id=v.id
  returning * into v;

  update public.project_documents set
    status='RELEASED',
    current_version_id=v.id,
    client_visible=true,
    updated_at=now()
  where id=v.document_id;

  perform public.write_audit(
    v.organization_id,'PROJECT_DOCUMENT_VERSION',v.id,'RELEASE_TO_CLIENT',
    jsonb_build_object('sha256',v.sha256),v.project_id
  );
  return v;
end;
$$;

create or replace function public.prevent_frozen_baseline_mutation()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if exists(
    select 1
    from public.schedule_baselines
    where id=old.baseline_id
      and status='FROZEN'
  ) then
    raise exception 'Baseline congelada é imutável';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create trigger schedule_baseline_tasks_immutable
before update or delete on public.schedule_baseline_tasks
for each row execute function public.prevent_frozen_baseline_mutation();

create or replace function public.prevent_released_document_mutation()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if old.status='RELEASED' then
    raise exception 'Versão liberada é imutável';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create trigger project_document_versions_immutable
before update or delete on public.project_document_versions
for each row execute function public.prevent_released_document_mutation();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  (
    'project-documents','project-documents',false,52428800,
    array[
      'application/pdf','image/jpeg','image/png','image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  ),
  (
    'daily-log-media','daily-log-media',false,157286400,
    array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','application/pdf']
  )
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

commit;
