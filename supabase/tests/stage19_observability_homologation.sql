-- Etapa 19 — homologação transacional de auditoria e observabilidade.
-- Executar somente em desenvolvimento/homologação. Termina com ROLLBACK.
begin;

create temp table stage19_test_results(test_name text primary key,passed boolean not null,detail text not null) on commit drop;
grant select,insert,update,delete on stage19_test_results to authenticated;

do $$
declare
  v_user uuid:=gen_random_uuid();v_other_user uuid:=gen_random_uuid();v_org uuid;v_other_org uuid;v_profile uuid;v_other_profile uuid;
  v_event uuid;v_event_again uuid;v_alert uuid;v_payload jsonb;v_count integer;v_error text;v_hash text:=repeat('a',64);
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous) values
    (v_user,'authenticated','authenticated','stage19-'||replace(v_user::text,'-','')||'@example.invalid',now(),'{}','{}',now(),now(),false,false),
    (v_other_user,'authenticated','authenticated','stage19-other-'||replace(v_other_user::text,'-','')||'@example.invalid',now(),'{}','{}',now(),now(),false,false);
  insert into public.organizations(legal_name,trade_name,created_by) values('Homologação Etapa 19','Homologação 19',v_user) returning id into v_org;
  insert into public.organizations(legal_name,trade_name,created_by) values('Outra Etapa 19','Outra 19',v_other_user) returning id into v_other_org;
  select id into v_profile from public.access_profiles where organization_id=v_org and base_role='SUPER_ADMIN' and active limit 1;
  select id into v_other_profile from public.access_profiles where organization_id=v_other_org and base_role='SUPER_ADMIN' and active limit 1;
  insert into public.organization_memberships(organization_id,user_id,role,active,access_profile_id) values
    (v_org,v_user,'SUPER_ADMIN',true,v_profile),(v_other_org,v_other_user,'SUPER_ADMIN',true,v_other_profile);

  select count(*) into v_count from public.organization_modules om join public.app_modules am on am.id=om.module_id
    where om.organization_id=v_org and am.key='auditoria' and om.status='ENABLED';
  insert into stage19_test_results values('module_installation',v_count=1,'módulos='||v_count);
  select count(*) into v_count from public.observability_alert_rules where organization_id=v_org and active;
  insert into stage19_test_results values('default_alert_rules',v_count=2,'regras='||v_count);

  perform set_config('request.jwt.claim.sub',v_user::text,true);perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_user,'role','authenticated','aal','aal2')::text,true);
  execute 'set local role authenticated';

  v_event:=public.record_audit_event(v_org,'auditoria','stage19.test.created','homologation',null,'CREATE','SUCCESS','CRITICAL','APPLICATION','Evento de teste.',
    null,jsonb_build_object('password','nao-pode-aparecer','nested',jsonb_build_object('token','segredo','safe','ok')),
    jsonb_build_object('authorization','Bearer proibido','safe','ok'),null,null,null,'request-stage19','stage19-idempotent','INTERNAL',v_hash,v_hash);
  v_event_again:=public.record_audit_event(v_org,'auditoria','stage19.test.replayed','homologation',null,'CREATE','SUCCESS','INFO','APPLICATION','Replay.',
    null,null,'{}',null,null,null,'request-stage19-2','stage19-idempotent','INTERNAL',null,null);
  insert into stage19_test_results values('event_idempotency',v_event=v_event_again,'mesmo evento='||(v_event=v_event_again));

  select after_data into v_payload from public.audit_events where id=v_event;
  insert into stage19_test_results values('recursive_sanitization',v_payload->>'password'='[REDACTED]' and v_payload#>>'{nested,token}'='[REDACTED]' and v_payload#>>'{nested,safe}'='ok',v_payload::text);
  select id into v_alert from public.observability_alerts where audit_event_id=v_event;
  insert into stage19_test_results values('critical_alert',v_alert is not null,coalesce(v_alert::text,'ausente'));

  v_payload:=public.get_observability_events(v_org,'auditoria',null,'stage19',null,now()-interval '1 hour',now()+interval '1 hour',1,50);
  insert into stage19_test_results values('unified_stream',(v_payload->>'total')::integer>=1,'total='||(v_payload->>'total'));

  begin update public.audit_events set message='alterado' where id=v_event;v_error:=null;exception when others then v_error:=sqlerrm;end;
  insert into stage19_test_results values('audit_append_only',v_error is not null and (v_error like '%imutável%' or v_error like '%permission denied%'),coalesce(v_error,'sem erro'));

  perform public.acknowledge_observability_alert(v_alert,'Análise iniciada');
  perform public.resolve_observability_alert(v_alert,'Causa identificada e corrigida');
  select count(*) into v_count from public.observability_alerts where id=v_alert and status='RESOLVED' and resolved_by=v_user;
  insert into stage19_test_results values('alert_workflow',v_count=1,'resolvido='||v_count);

  v_payload:=public.run_observability_health_snapshot(v_org);
  select count(*) into v_count from public.observability_health_checks where organization_id=v_org;
  insert into stage19_test_results values('health_snapshot',v_count=6 and v_payload?'checkedAt','checks='||v_count);

  execute 'reset role';
  perform set_config('request.jwt.claim.sub',v_other_user::text,true);perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_other_user,'role','authenticated','aal','aal2')::text,true);
  execute 'set local role authenticated';
  begin perform public.get_observability_dashboard(v_org,24);v_error:=null;exception when others then v_error:=sqlerrm;end;
  insert into stage19_test_results values('multi_company_isolation',v_error like '%Acesso negado%',coalesce(v_error,'sem erro'));
end $$;

select * from stage19_test_results order by test_name;
do $$ begin if exists(select 1 from stage19_test_results where not passed) then raise exception 'Etapa 19 reprovada: %',
  (select string_agg(test_name||'='||detail,'; ' order by test_name) from stage19_test_results where not passed);end if;end $$;
rollback;