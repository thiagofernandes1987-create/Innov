create table if not exists public.rh_documents(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 worker_id uuid references public.rh_workers(id) on delete restrict,employment_id uuid references public.rh_employments(id) on delete restrict,
 category text not null check(category in('PERSONAL','ADMISSION','CONTRACT','PAYROLL','VACATION','LEAVE','BENEFIT','SST','TERMINATION','COMPLIANCE','OTHER')),
 title text not null,description text,sensitivity text not null default 'STANDARD' check(sensitivity in('STANDARD','FINANCIAL','SENSITIVE','CLINICAL','JUDICIAL')),
 status text not null default 'DRAFT' check(status in('DRAFT','ACTIVE','ARCHIVED','CANCELLED')),visible_to_worker boolean not null default false,
 retention_until date,legal_hold boolean not null default false,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.rh_document_versions(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,document_id uuid not null,
 version integer not null check(version>0),status text not null default 'ACTIVE' check(status in('ACTIVE','PUBLISHED','SUPERSEDED','REVOKED')),
 original_name text not null,mime_type text not null check(mime_type in('application/pdf','image/jpeg','image/png')),byte_size bigint not null check(byte_size>0 and byte_size<=20971520),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),storage_path text not null,uploaded_by uuid references auth.users(id) on delete set null,uploaded_at timestamptz not null default now(),published_by uuid references auth.users(id) on delete set null,published_at timestamptz,revoked_at timestamptz,reason text,
 unique(document_id,version),unique(organization_id,storage_path)
);
create table if not exists public.rh_document_access_log(
 id bigserial primary key,organization_id uuid not null references public.organizations(id) on delete restrict,document_version_id uuid not null,actor_user_id uuid references auth.users(id) on delete set null,access_kind text not null check(access_kind in('VIEW','DOWNLOAD','SIGNED_URL')),worker_self_service boolean not null default false,accessed_at timestamptz not null default now()
);
alter table public.rh_documents add constraint rh_documents_org_id_uq unique(organization_id,id);
alter table public.rh_document_versions add constraint rh_document_versions_org_id_uq unique(organization_id,id);
alter table public.rh_documents add constraint rh_documents_worker_tenant_fk foreign key(organization_id,worker_id) references public.rh_workers(organization_id,id) on delete restrict;
alter table public.rh_documents add constraint rh_documents_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_document_versions add constraint rh_document_versions_document_fk foreign key(organization_id,document_id) references public.rh_documents(organization_id,id) on delete cascade;
alter table public.rh_document_access_log add constraint rh_document_access_version_fk foreign key(organization_id,document_version_id) references public.rh_document_versions(organization_id,id) on delete restrict;
create index if not exists rh_documents_worker_idx on public.rh_documents(organization_id,worker_id,status,category);
create index if not exists rh_document_versions_doc_idx on public.rh_document_versions(organization_id,document_id,version desc);

alter table public.rh_documents enable row level security;alter table public.rh_document_versions enable row level security;alter table public.rh_document_access_log enable row level security;
create policy rh_documents_read on public.rh_documents for select to authenticated using(
 (case when sensitivity in('CLINICAL','JUDICIAL') then public.has_module_permission(organization_id,'rh','READ',null,'sensitive') else public.has_module_permission(organization_id,'rh','READ',null,null) end)
 or (visible_to_worker and worker_id is not null and exists(select 1 from public.rh_worker_user_links l where l.organization_id=rh_documents.organization_id and l.worker_id=rh_documents.worker_id and l.user_id=auth.uid() and l.active and l.valid_from<=current_date and(l.valid_to is null or l.valid_to>=current_date)))
);
create policy rh_documents_write on public.rh_documents for all to authenticated using(case when sensitivity in('CLINICAL','JUDICIAL') then public.has_module_permission(organization_id,'rh','EDIT',null,'sensitive') else public.has_module_permission(organization_id,'rh','EDIT',null,null) end) with check(case when sensitivity in('CLINICAL','JUDICIAL') then public.has_module_permission(organization_id,'rh','EDIT',null,'sensitive') else public.has_module_permission(organization_id,'rh','EDIT',null,null) end);
create policy rh_document_versions_read on public.rh_document_versions for select to authenticated using(exists(select 1 from public.rh_documents d where d.id=document_id and d.organization_id=rh_document_versions.organization_id));
create policy rh_document_versions_write on public.rh_document_versions for all to authenticated using(exists(select 1 from public.rh_documents d where d.id=document_id and d.organization_id=rh_document_versions.organization_id and(case when d.sensitivity in('CLINICAL','JUDICIAL') then public.has_module_permission(d.organization_id,'rh','EDIT',null,'sensitive') else public.has_module_permission(d.organization_id,'rh','EDIT',null,null) end))) with check(exists(select 1 from public.rh_documents d where d.id=document_id and d.organization_id=rh_document_versions.organization_id and(case when d.sensitivity in('CLINICAL','JUDICIAL') then public.has_module_permission(d.organization_id,'rh','EDIT',null,'sensitive') else public.has_module_permission(d.organization_id,'rh','EDIT',null,null) end)));
create policy rh_document_access_internal on public.rh_document_access_log for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,'sensitive'));

create or replace function public.publish_rh_document_version(p_version_id uuid,p_visible_to_worker boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_doc uuid;v_sensitive text;v_worker uuid;begin
 select v.organization_id,v.document_id,d.sensitivity,d.worker_id into v_org,v_doc,v_sensitive,v_worker from public.rh_document_versions v join public.rh_documents d on d.id=v.document_id where v.id=p_version_id for update;
 if v_org is null then raise exception 'Versão não encontrada';end if;if not(case when v_sensitive in('CLINICAL','JUDICIAL') then public.has_module_permission(v_org,'rh','READ',null,'sensitive') else public.has_module_permission(v_org,'rh','READ',null,'approve') end) then raise exception 'FORBIDDEN';end if;
 if p_visible_to_worker and v_worker is null then raise exception 'Documento sem trabalhador não pode ser publicado no Meu RH';end if;
 update public.rh_document_versions set status='SUPERSEDED' where document_id=v_doc and status='PUBLISHED' and id<>p_version_id;
 update public.rh_document_versions set status='PUBLISHED',published_by=auth.uid(),published_at=now(),revoked_at=null where id=p_version_id;
 update public.rh_documents set status='ACTIVE',visible_to_worker=p_visible_to_worker,updated_at=now() where id=v_doc;
end$$;
grant execute on function public.publish_rh_document_version(uuid,boolean) to authenticated;

create or replace function public.get_my_rh_documents()
returns table(document_id uuid,version_id uuid,category text,title text,description text,mime_type text,original_name text,byte_size bigint,sha256 text,published_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select d.id,v.id,d.category,d.title,d.description,v.mime_type,v.original_name,v.byte_size,v.sha256,v.published_at
 from public.rh_documents d join public.rh_document_versions v on v.document_id=d.id and v.organization_id=d.organization_id and v.status='PUBLISHED'
 join public.rh_worker_user_links l on l.organization_id=d.organization_id and l.worker_id=d.worker_id and l.user_id=auth.uid() and l.active and l.valid_from<=current_date and(l.valid_to is null or l.valid_to>=current_date)
 where d.status='ACTIVE' and d.visible_to_worker order by v.published_at desc,d.title;
$$;grant execute on function public.get_my_rh_documents() to authenticated;

create or replace function public.authorize_rh_document_download(p_version_id uuid)
returns table(organization_id uuid,storage_path text,original_name text,mime_type text,worker_self_service boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.rh_document_versions%rowtype;d public.rh_documents%rowtype;v_self boolean:=false;begin
 select * into v from public.rh_document_versions where id=p_version_id;if v.id is null then return;end if;select * into d from public.rh_documents where id=v.document_id;
 if (case when d.sensitivity in('CLINICAL','JUDICIAL') then public.has_module_permission(d.organization_id,'rh','READ',null,'sensitive') else public.has_module_permission(d.organization_id,'rh','READ',null,null) end) then v_self:=false;
 elsif d.visible_to_worker and v.status='PUBLISHED' and d.worker_id is not null and exists(select 1 from public.rh_worker_user_links l where l.organization_id=d.organization_id and l.worker_id=d.worker_id and l.user_id=auth.uid() and l.active and l.valid_from<=current_date and(l.valid_to is null or l.valid_to>=current_date)) then v_self:=true;
 else return;end if;
 insert into public.rh_document_access_log(organization_id,document_version_id,actor_user_id,access_kind,worker_self_service) values(d.organization_id,v.id,auth.uid(),'SIGNED_URL',v_self);
 return query select d.organization_id,v.storage_path,v.original_name,v.mime_type,v_self;
end$$;grant execute on function public.authorize_rh_document_download(uuid) to authenticated;

do $$begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rh-documents','rh-documents',false,20971520,array['application/pdf','image/jpeg','image/png']::text[]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
 end if;
 if to_regclass('storage.objects') is not null and not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='rh_documents_internal') then
  execute 'create policy rh_documents_internal on storage.objects for all to authenticated using (bucket_id=''rh-documents'' and public.has_module_permission((storage.foldername(name))[1]::uuid,''rh'',''READ'',null,null)) with check (bucket_id=''rh-documents'' and public.has_module_permission((storage.foldername(name))[1]::uuid,''rh'',''EDIT'',null,null))';
 end if;
end$$;
