-- Etapa 18 — homologação transacional reproduzível de CRM, Cliente 360 e SAC.
-- Executar somente em desenvolvimento/homologação. Termina com ROLLBACK.

begin;

create temp table stage18_test_results(
  test_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

do $$
declare
  v_internal uuid:=gen_random_uuid();
  v_client_user uuid:=gen_random_uuid();
  v_other_internal uuid:=gen_random_uuid();
  v_org uuid;
  v_other_org uuid;
  v_profile uuid;
  v_other_profile uuid;
  v_client uuid;
  v_other_client uuid;
  v_project_released uuid;
  v_project_hidden uuid;
  v_lead public.crm_leads;
  v_lead_again public.crm_leads;
  v_conversion jsonb;
  v_conversion_again jsonb;
  v_opportunity public.opportunities;
  v_ticket public.sac_tickets;
  v_ticket_again public.sac_tickets;
  v_client_ticket public.sac_tickets;
  v_message public.sac_ticket_messages;
  v_category uuid;
  v_detail_internal jsonb;
  v_detail_client jsonb;
  v_portal jsonb;
  v_count integer;
  v_error text;
begin
  insert into auth.users(
    id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
    created_at,updated_at,is_sso_user,is_anonymous
  ) values
    (v_internal,'authenticated','authenticated','stage18-internal-'||replace(v_internal::text,'-','')||'@example.invalid',now(),'{}','{}',now(),now(),false,false),
    (v_client_user,'authenticated','authenticated','stage18-client-'||replace(v_client_user::text,'-','')||'@example.invalid',now(),'{}','{}',now(),now(),false,false),
    (v_other_internal,'authenticated','authenticated','stage18-other-'||replace(v_other_internal::text,'-','')||'@example.invalid',now(),'{}','{}',now(),now(),false,false);

  insert into public.organizations(legal_name,trade_name,created_by)
  values('Homologação Etapa 18','Homologação 18',v_internal)
  returning id into v_org;
  insert into public.organizations(legal_name,trade_name,created_by)
  values('Outra organização Etapa 18','Outra 18',v_other_internal)
  returning id into v_other_org;

  select id into v_profile from public.access_profiles
  where organization_id=v_org and base_role='SUPER_ADMIN' and active
  order by system desc,created_at limit 1;
  select id into v_other_profile from public.access_profiles
  where organization_id=v_other_org and base_role='SUPER_ADMIN' and active
  order by system desc,created_at limit 1;

  insert into public.organization_memberships(organization_id,user_id,role,active,access_profile_id)
  values
    (v_org,v_internal,'SUPER_ADMIN',true,v_profile),
    (v_other_org,v_other_internal,'SUPER_ADMIN',true,v_other_profile);

  select count(*) into v_count
  from public.organization_modules om
  join public.app_modules am on am.id=om.module_id
  where om.organization_id=v_org and am.key in ('crm','clientes','sac') and om.status='ENABLED';
  insert into stage18_test_results values(
    'module_installation',v_count=3,'módulos habilitados='||v_count
  );

  select count(*) into v_count from public.sac_categories
  where organization_id=v_org and active;
  insert into stage18_test_results values(
    'default_sac_categories',v_count=6,'categorias='||v_count
  );

  perform set_config('request.jwt.claim.sub',v_internal::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',v_internal,'role','authenticated','aal','aal2')::text,
    true
  );
  execute 'set local role authenticated';

  v_lead:=public.create_crm_lead(
    v_org,'Cliente Homologação',null,'cliente18@example.invalid','12999991818',
    '12345678909','INDICACAO','Campanha 18','Construção residencial',850000,
    'São José dos Campos','SP',v_internal,now()+interval '1 day','Teste',true,
    'FORMULARIO','stage18-lead-idem'
  );
  v_lead_again:=public.create_crm_lead(
    v_org,'Ignorado',null,'ignorado@example.invalid',null,null,
    'SITE',null,'Ignorado',1,null,null,v_internal,null,null,false,null,
    'stage18-lead-idem'
  );
  insert into stage18_test_results values(
    'lead_idempotency',v_lead.id=v_lead_again.id,
    'mesmo lead='||(v_lead.id=v_lead_again.id)
  );

  begin
    perform public.create_crm_lead(
      v_org,'Duplicado',null,'cliente18@example.invalid',null,null,
      'SITE',null,'Reforma',100000,null,null,v_internal,null,null,false,null,
      'stage18-lead-duplicate'
    );
    v_error:=null;
  exception when others then v_error:=sqlerrm;
  end;
  insert into stage18_test_results values(
    'lead_duplicate_block',v_error like '%Já existe lead ativo%',coalesce(v_error,'sem erro')
  );

  v_lead:=public.move_crm_lead_stage(v_lead.id,'CONTACTED','Contato realizado');
  v_lead:=public.move_crm_lead_stage(v_lead.id,'QUALIFIED','Demanda validada');
  insert into stage18_test_results values(
    'lead_workflow',v_lead.stage='QUALIFIED','estágio='||v_lead.stage
  );

  v_conversion:=public.convert_crm_lead(v_lead.id,true,'Casa Alto Padrão',900000);
  v_conversion_again:=public.convert_crm_lead(v_lead.id,true,'Ignorado',1);
  v_client:=(v_conversion->>'clientId')::uuid;
  insert into stage18_test_results values(
    'lead_conversion_idempotency',
    (v_conversion_again->>'idempotent')::boolean
      and v_conversion_again->>'clientId'=v_conversion->>'clientId'
      and v_conversion_again->>'opportunityId'=v_conversion->>'opportunityId',
    v_conversion_again::text
  );

  insert into public.projects(
    organization_id,client_id,code,name,status,progress,client_released_at,created_by
  ) values(v_org,v_client,'H18-A','Obra liberada','ACTIVE',0.35,now(),v_internal)
  returning id into v_project_released;
  insert into public.projects(
    organization_id,client_id,code,name,status,progress,created_by
  ) values(v_org,v_client,'H18-B','Obra interna','PLANNING',0,v_internal)
  returning id into v_project_hidden;

  select * into v_opportunity from public.move_crm_opportunity_stage(
    (v_conversion->>'opportunityId')::uuid,'NEGOTIATION','Condições em análise'
  );
  insert into stage18_test_results values(
    'opportunity_workflow',v_opportunity.stage='NEGOTIATION' and v_opportunity.probability=80,
    'estágio='||v_opportunity.stage||', probabilidade='||v_opportunity.probability
  );

  begin
    update public.opportunities set stage='WON' where id=v_opportunity.id;
    v_error:=null;
  exception when others then v_error:=sqlerrm;
  end;
  insert into stage18_test_results values(
    'direct_opportunity_stage_block',v_error is not null,coalesce(v_error,'sem erro')
  );

  select id into v_category from public.sac_categories
  where organization_id=v_org and code='GARANTIA';

  v_ticket:=public.create_sac_ticket(
    v_org,v_client,v_project_released,null,v_category,'Infiltração',
    'Verificar origem e executar correção.','PHONE','HIGH','stage18-ticket-idem'
  );
  v_ticket_again:=public.create_sac_ticket(
    v_org,v_client,v_project_released,null,v_category,'Ignorado','Ignorado',
    'PHONE','LOW','stage18-ticket-idem'
  );
  insert into stage18_test_results values(
    'ticket_idempotency',v_ticket.id=v_ticket_again.id,
    'mesmo chamado='||(v_ticket.id=v_ticket_again.id)
  );

  perform public.add_sac_ticket_message(
    v_ticket.id,'INTERNAL','Nota técnica interna.','stage18-message-internal'
  );
  perform public.add_sac_ticket_message(
    v_ticket.id,'CLIENT','Solicitação recebida.','stage18-message-client'
  );
  perform public.register_sac_ticket_attachment(
    v_ticket.id,null,v_org::text||'/'||v_ticket.id::text||'/interno.pdf',
    'interno.pdf','application/pdf',1024,repeat('a',64),false
  );
  perform public.register_sac_ticket_attachment(
    v_ticket.id,null,v_org::text||'/'||v_ticket.id::text||'/publico.jpg',
    'publico.jpg','image/jpeg',2048,repeat('b',64),true
  );

  begin
    update public.sac_tickets set status='RESOLVED' where id=v_ticket.id;
    v_error:=null;
  exception when others then v_error:=sqlerrm;
  end;
  insert into stage18_test_results values(
    'direct_ticket_status_block',v_error is not null,coalesce(v_error,'sem erro')
  );

  v_ticket:=public.assign_sac_ticket(v_ticket.id,v_internal);
  v_ticket:=public.transition_sac_ticket(v_ticket.id,'WAITING_CLIENT','Aguardando acesso');
  v_ticket:=public.transition_sac_ticket(v_ticket.id,'IN_PROGRESS','Acesso confirmado');
  v_ticket:=public.transition_sac_ticket(v_ticket.id,'RESOLVED','Correção concluída');
  v_ticket:=public.transition_sac_ticket(v_ticket.id,'CLOSED','Atendimento validado');
  insert into stage18_test_results values(
    'ticket_workflow',v_ticket.status='CLOSED' and v_ticket.resolved_at is not null,
    'status='||v_ticket.status
  );

  begin
    update public.sac_ticket_messages set body='Alterado' where ticket_id=v_ticket.id;
    v_error:=null;
  exception when others then v_error:=sqlerrm;
  end;
  insert into stage18_test_results values(
    'ticket_history_immutable',v_error is not null,coalesce(v_error,'sem erro')
  );

  v_detail_internal:=public.get_sac_ticket_detail(v_ticket.id);
  insert into stage18_test_results values(
    'internal_ticket_detail',
    jsonb_array_length(v_detail_internal->'messages')=2
      and jsonb_array_length(v_detail_internal->'attachments')=2
      and jsonb_array_length(v_detail_internal->'events')>0,
    'mensagens='||jsonb_array_length(v_detail_internal->'messages')
  );

  execute 'reset role';

  insert into public.clients(
    organization_id,user_id,type,legal_name,email,status,created_by
  ) values(v_other_org,null,'PERSON','Outro cliente','outro@example.invalid','ACTIVE',v_other_internal)
  returning id into v_other_client;

  update public.clients set user_id=v_client_user where id=v_client;
  perform set_config('request.jwt.claim.sub',v_client_user::text,true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',v_client_user,'role','authenticated')::text,
    true
  );
  execute 'set local role authenticated';

  v_portal:=public.get_client_portal_relationship();
  v_detail_client:=public.get_sac_ticket_detail(v_ticket.id);
  insert into stage18_test_results values(
    'client_portal_filter',
    jsonb_array_length(v_portal->'projects')=1
      and jsonb_array_length(v_detail_client->'messages')=1
      and jsonb_array_length(v_detail_client->'attachments')=1
      and jsonb_array_length(v_detail_client->'events')=0,
    'obras='||jsonb_array_length(v_portal->'projects')
  );

  begin
    perform public.create_sac_ticket(
      v_org,v_client,v_project_hidden,null,v_category,'Obra oculta',
      'Não deve ser vinculada pelo portal.','PORTAL','NORMAL','stage18-hidden-project'
    );
    v_error:=null;
  exception when others then v_error:=sqlerrm;
  end;
  insert into stage18_test_results values(
    'hidden_project_block',v_error like '%não está liberada%',coalesce(v_error,'sem erro')
  );

  v_client_ticket:=public.create_sac_ticket(
    v_org,v_client,v_project_released,null,v_category,'Dúvida de garantia',
    'Confirmar prazo.','PORTAL','NORMAL','stage18-client-ticket'
  );
  v_message:=public.add_sac_ticket_message(
    v_client_ticket.id,'INTERNAL','Mensagem enviada pelo cliente.','stage18-client-message'
  );
  insert into stage18_test_results values(
    'client_message_visibility',v_message.visibility='CLIENT',
    'visibilidade='||v_message.visibility
  );

  select count(*) into v_count from public.clients where organization_id=v_other_org;
  insert into stage18_test_results values(
    'multi_company_isolation',v_count=0,'linhas de outra organização='||v_count
  );

  select count(*) into v_count from public.opportunities;
  insert into stage18_test_results values(
    'client_pipeline_hidden',v_count=0,'oportunidades visíveis='||v_count
  );

  execute 'reset role';
end $$;

select * from stage18_test_results order by test_name;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from stage18_test_results where not passed;
  if v_failed>0 then
    raise exception 'Homologação Etapa 18 falhou em % teste(s).',v_failed;
  end if;
end $$;

rollback;
