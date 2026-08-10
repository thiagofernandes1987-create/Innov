do $$
declare
  v_org uuid;v_user uuid;v_e1 uuid;v_e2 uuid;v_other uuid;v_batch uuid;v_raised boolean;v_many uuid[];
begin
  insert into auth.users(email) values('rh-esocial@innovar.local') returning id into v_user;
  insert into public.organizations(name) values('RH eSocial teste') returning id into v_org;
  insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
  perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);

  insert into public.rh_esocial_events(
    organization_id,event_type,event_key,event_group,environment,employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,layout_version,source_type,signed_xml,payload_sha256,created_by
  ) values(
    v_org,'S-1010','ID-E1',1,'RESTRICTED',1,'12345678',1,'12345678','S-1.3','TEST','<eSocial><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></eSocial>',md5('e1')||md5('e1'),v_user
  ) returning id into v_e1;
  insert into public.rh_esocial_events(
    organization_id,event_type,event_key,event_group,environment,employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,layout_version,source_type,signed_xml,payload_sha256,created_by
  ) values(
    v_org,'S-1005','ID-E2',1,'RESTRICTED',1,'12345678',1,'12345678','S-1.3','TEST','<eSocial><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></eSocial>',md5('e2')||md5('e2'),v_user
  ) returning id into v_e2;

  -- TESTE 1: dois eventos homogêneos formam lote e ficam BATCHED.
  v_batch:=public.create_rh_esocial_batch(v_org,array[v_e1,v_e2]);
  if (select count(*) from public.rh_esocial_batch_events where batch_id=v_batch)<>2 then raise exception 'ESOCIAL 1 falhou: lote sem dois eventos';end if;
  if exists(select 1 from public.rh_esocial_events where id in(v_e1,v_e2) and status<>'BATCHED') then raise exception 'ESOCIAL 1 falhou: eventos não marcados BATCHED';end if;

  -- TESTE 2: protocolo muda lote/eventos para os estados posteriores ao recebimento.
  perform public.mark_rh_esocial_batch_protocol(v_batch,'1.2.000000000000001','201','Lote recebido');
  if (select status from public.rh_esocial_batches where id=v_batch)<>'PROTOCOL_RECEIVED' then raise exception 'ESOCIAL 2 falhou: lote sem protocolo';end if;
  if exists(select 1 from public.rh_esocial_events where id in(v_e1,v_e2) and status<>'SENT') then raise exception 'ESOCIAL 2 falhou: eventos não marcados SENT';end if;

  -- TESTE 3: misturar outro empregador é bloqueado.
  insert into public.rh_esocial_events(
    organization_id,event_type,event_key,event_group,environment,employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,layout_version,source_type,signed_xml,payload_sha256,created_by
  ) values(
    v_org,'S-1010','ID-OTHER',1,'RESTRICTED',1,'99999999',1,'12345678','S-1.3','TEST','<eSocial><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></eSocial>',md5('other')||md5('other'),v_user
  ) returning id into v_other;
  -- cria novo evento compatível porque E1 já foi enviado.
  insert into public.rh_esocial_events(
    organization_id,event_type,event_key,event_group,environment,employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,layout_version,source_type,signed_xml,payload_sha256,created_by
  ) values(
    v_org,'S-1010','ID-E3',1,'RESTRICTED',1,'12345678',1,'12345678','S-1.3','TEST','<eSocial><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></eSocial>',md5('e3')||md5('e3'),v_user
  ) returning id into v_e1;
  v_raised:=false;
  begin perform public.create_rh_esocial_batch(v_org,array[v_e1,v_other]);exception when others then if sqlerrm like '%mesmo tenant, ambiente, empregador, transmissor e grupo%' then v_raised:=true;end if;end;
  if not v_raised then raise exception 'ESOCIAL 3 falhou: empregadores diferentes entraram no mesmo lote';end if;

  -- TESTE 4: limite de 50 é aplicado antes da criação do lote.
  select array_agg(id order by id) into v_many
  from(
    insert into public.rh_esocial_events(
      organization_id,event_type,event_key,event_group,environment,employer_registration_type,employer_registration_number,
      transmitter_registration_type,transmitter_registration_number,layout_version,source_type,signed_xml,payload_sha256,created_by
    )
    select v_org,'S-1010','ID-MANY-'||g,1,'RESTRICTED',1,'12345678',1,'12345678','S-1.3','TEST',
      '<eSocial><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></eSocial>',md5('many-'||g)||md5('many-'||g),v_user
    from generate_series(1,51) g returning id
  ) inserted;
  v_raised:=false;
  begin perform public.create_rh_esocial_batch(v_org,v_many);exception when others then if sqlerrm like '%entre 1 e 50%' then v_raised:=true;end if;end;
  if not v_raised then raise exception 'ESOCIAL 4 falhou: lote com 51 eventos foi aceito';end if;

  raise notice 'RH eSocial — 4 testes de lote/protocolo aprovados.';
end$$;
