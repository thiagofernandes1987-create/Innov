-- Etapa 12.2 — tokens com hash e fila explícita de conversão DOCX.

create table if not exists public.signature_access_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  signer_id uuid not null references public.signature_signers(id) on delete cascade,
  token_sha256 text not null unique check(token_sha256 ~ '^[a-f0-9]{64}$'),
  document_sha256 text not null check(document_sha256 ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  max_attempts integer not null default 20 check(max_attempts > 0),
  attempts integer not null default 0 check(attempts >= 0),
  last_used_at timestamptz,
  revoked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(envelope_id,signer_id)
);

create table if not exists public.signature_conversion_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_version_id uuid not null unique references public.signature_document_versions(id) on delete cascade,
  status public.signature_conversion_status not null default 'PENDING',
  provider text not null default 'LIBREOFFICE_WORKER',
  attempts integer not null default 0 check(attempts >= 0),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signature_access_tokens_active_idx
  on public.signature_access_tokens(token_sha256,expires_at)
  where revoked_at is null and completed_at is null;
create index if not exists signature_conversion_jobs_pending_idx
  on public.signature_conversion_jobs(next_attempt_at,created_at)
  where status in ('PENDING','FAILED');

create or replace function public.lock_signature_conversion_job(p_worker_id text)
returns public.signature_conversion_jobs
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_job public.signature_conversion_jobs;
begin
  select * into v_job
  from public.signature_conversion_jobs
  where status in ('PENDING','FAILED')
    and next_attempt_at<=now()
    and(locked_at is null or locked_at<now()-interval '15 minutes')
  order by created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.signature_conversion_jobs
  set status='PROCESSING',attempts=attempts+1,locked_at=now(),locked_by=p_worker_id,updated_at=now()
  where id=v_job.id
  returning * into v_job;

  update public.signature_document_versions
  set conversion_status='PROCESSING',conversion_error=null
  where id=v_job.document_version_id;

  return v_job;
end;
$$;

create or replace function public.complete_signature_conversion_job(
  p_job_id uuid,
  p_rendered_pdf_path text,
  p_rendered_pdf_sha256 text,
  p_page_count integer
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_job public.signature_conversion_jobs;
begin
  if p_rendered_pdf_sha256 !~ '^[a-f0-9]{64}$' or p_page_count<1 then
    raise exception 'Resultado de conversão inválido';
  end if;
  select * into v_job from public.signature_conversion_jobs where id=p_job_id for update;
  if not found or v_job.status<>'PROCESSING' then raise exception 'Job não está em processamento'; end if;

  update public.signature_document_versions
  set rendered_pdf_path=p_rendered_pdf_path,
      rendered_pdf_sha256=p_rendered_pdf_sha256,
      page_count=p_page_count,
      conversion_status='READY',
      conversion_error=null
  where id=v_job.document_version_id;

  update public.signature_conversion_jobs
  set status='READY',completed_at=now(),locked_at=null,locked_by=null,last_error=null,updated_at=now()
  where id=v_job.id;
  return true;
end;
$$;

create or replace function public.fail_signature_conversion_job(
  p_job_id uuid,
  p_error text,
  p_retry_after interval default interval '15 minutes'
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_job public.signature_conversion_jobs;
begin
  select * into v_job from public.signature_conversion_jobs where id=p_job_id for update;
  if not found then raise exception 'Job não encontrado'; end if;
  update public.signature_document_versions
  set conversion_status='FAILED',conversion_error=left(p_error,2000)
  where id=v_job.document_version_id;
  update public.signature_conversion_jobs
  set status='FAILED',last_error=left(p_error,2000),next_attempt_at=now()+p_retry_after,
      locked_at=null,locked_by=null,updated_at=now()
  where id=p_job_id;
  return true;
end;
$$;
