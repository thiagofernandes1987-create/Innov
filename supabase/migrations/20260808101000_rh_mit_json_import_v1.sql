create table if not exists public.rh_mit_apurations(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 employer_id uuid not null references public.rh_employers(id) on delete restrict,
 reference_month date not null check(extract(day from reference_month)=1),
 version integer not null check(version>0),
 status text not null default 'DRAFT' check(status in('DRAFT','VALIDATED','EXPORTED','IMPORTED','SUPERSEDED','CANCELLED')),
 sem_movimento boolean not null,
 qualificacao_pj integer not null check(qualificacao_pj between 1 and 12),
 tributacao_lucro integer check(tributacao_lucro between 1 and 7),
 variacoes_monetarias integer check(variacoes_monetarias between 1 and 3),
 regime_pis_cofins integer check(regime_pis_cofins between 1 and 4),
 balanco_lucro_real boolean,
 responsible_cpf text not null check(responsible_cpf ~ '^[0-9]{11}$'),
 responsible_ddd text check(responsible_ddd is null or responsible_ddd ~ '^[0-9]{2}$'),
 responsible_phone text check(responsible_phone is null or responsible_phone ~ '^[0-9]{8,9}$'),
 responsible_email text,
 responsible_crc_state text check(responsible_crc_state is null or responsible_crc_state ~ '^[A-Z]{2}$'),
 responsible_crc_number text,
 layout_version text not null default '1.0',
 layout_reference_date date not null default date '2025-02-20',
 exported_filename text,
 exported_sha256 text check(exported_sha256 is null or exported_sha256 ~ '^[a-f0-9]{64}$'),
 exported_at timestamptz,
 imported_at timestamptz,
 evidence_reference text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,employer_id,reference_month,version)
);
create index if not exists rh_mit_apurations_period_idx on public.rh_mit_apurations(organization_id,reference_month,status);

create table if not exists public.rh_mit_special_events(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 apuration_id uuid not null,event_id integer not null check(event_id between 1 and 5),event_day integer not null check(event_day between 1 and 31),event_type integer not null check(event_type between 1 and 6),
 created_at timestamptz not null default now(),unique(apuration_id,event_id),unique(apuration_id,event_day)
);

create table if not exists public.rh_mit_debts(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 apuration_id uuid not null,group_code text not null check(group_code in('Irpj','Csll','Irrf','Ipi','Iof','PisPasep','Cofins','ContribuicoesDiversas','Cpss','RetPagamentoUnificado')),
 debt_id integer not null check(debt_id>0),after_event boolean not null default false,event_id integer,
 revenue_code text not null check(revenue_code ~ '^[0-9]{6}$'),pa_debito integer,ano_postergado integer,trim_postergado integer,ano_debito integer,
 cnpj_estabelecimento text check(cnpj_estabelecimento is null or cnpj_estabelecimento ~ '^[0-9]{6}$'),
 cnpj_incorporacao text check(cnpj_incorporacao is null or cnpj_incorporacao ~ '^([0-9]{6}|[0-9]{14})$'),
 cnpj_scp text check(cnpj_scp is null or cnpj_scp ~ '^[0-9]{14}$'),codigo_municipio_ouro text check(codigo_municipio_ouro is null or codigo_municipio_ouro ~ '^[0-9]{7}$'),
 amount numeric(18,2) not null check(amount>=0),created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),
 unique(apuration_id,debt_id)
);

create table if not exists public.rh_mit_suspensions(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,apuration_id uuid not null,
 suspension_type integer not null check(suspension_type in(1,2)),suspension_reason integer,with_deposit boolean,process_number text not null check(process_number ~ '^([0-9]{17}|[0-9]{20})$'),third_party_process boolean,decision_date integer,court_number integer,judicial_city_code text check(judicial_city_code is null or judicial_city_code ~ '^[0-9]{7}$'),created_at timestamptz not null default now()
);
create table if not exists public.rh_mit_suspended_debts(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,suspension_id uuid not null,debt_row_id uuid not null,amount numeric(18,2) not null check(amount>=0),created_at timestamptz not null default now(),unique(suspension_id,debt_row_id)
);

alter table public.rh_mit_apurations add constraint rh_mit_apurations_org_id_uq unique(organization_id,id);
alter table public.rh_mit_debts add constraint rh_mit_debts_org_id_uq unique(organization_id,id);
alter table public.rh_mit_suspensions add constraint rh_mit_suspensions_org_id_uq unique(organization_id,id);
alter table public.rh_mit_apurations add constraint rh_mit_employer_tenant_fk foreign key(organization_id,employer_id) references public.rh_employers(organization_id,id) on delete restrict;
alter table public.rh_mit_special_events add constraint rh_mit_events_parent_fk foreign key(organization_id,apuration_id) references public.rh_mit_apurations(organization_id,id) on delete cascade;
alter table public.rh_mit_debts add constraint rh_mit_debts_parent_fk foreign key(organization_id,apuration_id) references public.rh_mit_apurations(organization_id,id) on delete cascade;
alter table public.rh_mit_suspensions add constraint rh_mit_susp_parent_fk foreign key(organization_id,apuration_id) references public.rh_mit_apurations(organization_id,id) on delete cascade;
alter table public.rh_mit_suspended_debts add constraint rh_mit_susp_debt_susp_fk foreign key(organization_id,suspension_id) references public.rh_mit_suspensions(organization_id,id) on delete cascade;
alter table public.rh_mit_suspended_debts add constraint rh_mit_susp_debt_debt_fk foreign key(organization_id,debt_row_id) references public.rh_mit_debts(organization_id,id) on delete restrict;

do $$ declare t text;begin foreach t in array array['rh_mit_apurations','rh_mit_special_events','rh_mit_debts','rh_mit_suspensions','rh_mit_suspended_debts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
 execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
end loop;end$$;

create or replace function public.create_rh_mit_apuration(p_organization_id uuid,p_employer_id uuid,p_reference_month date,p_sem_movimento boolean,p_qualificacao_pj integer,p_tributacao_lucro integer,p_variacoes_monetarias integer,p_regime_pis_cofins integer,p_balanco_lucro_real boolean,p_responsible_cpf text,p_responsible_ddd text,p_responsible_phone text,p_responsible_email text,p_responsible_crc_state text,p_responsible_crc_number text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_version integer;begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from public.rh_employers where id=p_employer_id and organization_id=p_organization_id) then raise exception 'Empregador inválido';end if;
 if extract(day from p_reference_month)<>1 then raise exception 'Competência deve usar o primeiro dia do mês';end if;
 if p_sem_movimento=false and p_variacoes_monetarias is null then raise exception 'Variações monetárias são obrigatórias em apuração com movimento';end if;
 if p_sem_movimento=false and p_qualificacao_pj<>11 and p_tributacao_lucro is null then raise exception 'Tributação do lucro é obrigatória para a qualificação informada';end if;
 perform pg_advisory_xact_lock(hashtext(p_organization_id::text||p_employer_id::text||p_reference_month::text));
 select coalesce(max(version),0)+1 into v_version from public.rh_mit_apurations where organization_id=p_organization_id and employer_id=p_employer_id and reference_month=p_reference_month;
 update public.rh_mit_apurations set status='SUPERSEDED',updated_at=now() where organization_id=p_organization_id and employer_id=p_employer_id and reference_month=p_reference_month and status in('DRAFT','VALIDATED','EXPORTED');
 insert into public.rh_mit_apurations(organization_id,employer_id,reference_month,version,sem_movimento,qualificacao_pj,tributacao_lucro,variacoes_monetarias,regime_pis_cofins,balanco_lucro_real,responsible_cpf,responsible_ddd,responsible_phone,responsible_email,responsible_crc_state,responsible_crc_number,created_by)
 values(p_organization_id,p_employer_id,p_reference_month,v_version,p_sem_movimento,p_qualificacao_pj,p_tributacao_lucro,p_variacoes_monetarias,p_regime_pis_cofins,p_balanco_lucro_real,p_responsible_cpf,p_responsible_ddd,p_responsible_phone,p_responsible_email,p_responsible_crc_state,p_responsible_crc_number,auth.uid()) returning id into v_id;return v_id;
end$$;
grant execute on function public.create_rh_mit_apuration(uuid,uuid,date,boolean,integer,integer,integer,integer,boolean,text,text,text,text,text,text) to authenticated;
