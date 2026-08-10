do $$
declare
  v_org uuid; v_user uuid; v_e1 uuid; v_e2 uuid; v_batch uuid; v_status text; v_raised boolean;
begin
  insert into auth.users(email) values('rh-esocial-result@innovar.local') returning id into v_user;
  insert into public.organizations(name) values('RH eSocial resultados') returning id into v_org;
  insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
  perform set_config('test.user_id',v_user::text,false);
  perform set_config('test.permission_granted','true',false);

  insert into public.rh_esocial_events(
    organization_id,event_type,event_key,event_group,environment,
    employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,
    layout_version,source_type,signed_xml,payload_sha256,created_by
  ) values(
    v_org,'S-1010','ID-RES-1',1,'RESTRICTED',1,'12345678',1,'12345678','S-1.3','TEST',
    '<eSocial><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></eSocial>',md5('res1')||md5('res1'),v_user
  ) returning id into v_e1;

  insert into public.rh_esocial_events(
    organization_id,event_type,event_key,event_group,environment,
    employer_registration_type,employer_registration_number,
    transmitter_registration_type,transmitter_registration_number,
    layout_version,source_type,signed_xml,payload_sha256,created_by
  ) values(
    v_org,'S-1005','ID-RES-2',1,'RESTRICTED',1,'12345678',1,'12345678','S-1.3','TEST',
    '<eSocial><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></eSocial>',md5('res2')||md5('res2'),v_user
  ) returning id into v_e2;

  v_batch:=public.create_rh_esocial_batch(v_org,array[v_e1,v_e2]);
  perform public.mark_rh_esocial_batch_protocol(v_batch,'1.2.0000000000000099999','201','Recebido');

  -- TESTE 1: aceite exige e persiste recibo individual.
  perform public.apply_rh_esocial_event_result(v_batch,'ID-RES-1','ACCEPTED','1.2.0000000000000011111','201','Sucesso','[]'::jsonb);
  if (select status from public.rh_esocial_events where id=v_e1)<>'ACCEPTED' then raise exception 'ESOCIAL RESULT 1 falhou: evento não aceito'; end if;
  if (select receipt_number from public.rh_esocial_events where id=v_e1)<>'1.2.0000000000000011111' then raise exception 'ESOCIAL RESULT 1 falhou: recibo não persistido'; end if;

  -- TESTE 2: rejeição guarda ocorrências estruturadas.
  perform public.apply_rh_esocial_event_result(
    v_batch,'ID-RES-2','REJECTED',null,'401','Conteúdo inválido',
    '[{"code":"123","description":"Rubrica inexistente","type":"1","location":"/eSocial"}]'::jsonb
  );
  if jsonb_array_length((select occurrences from public.rh_esocial_events where id=v_e2))<>1 then raise exception 'ESOCIAL RESULT 2 falhou: ocorrência ausente'; end if;

  -- TESTE 3: lote termina quando todos os filhos estão terminais, mesmo misturando aceite/rejeição.
  v_status:=public.finalize_rh_esocial_batch_from_events(v_batch);
  if v_status<>'COMPLETED' then raise exception 'ESOCIAL RESULT 3 falhou: lote esperado COMPLETED, obtido %',v_status; end if;

  -- TESTE 4: aceite sem recibo é proibido.
  v_raised:=false;
  begin
    perform public.apply_rh_esocial_event_result(v_batch,'ID-RES-2','ACCEPTED',null,'201','Sucesso','[]'::jsonb);
  exception when others then
    if sqlerrm like '%recibo%' then v_raised:=true; end if;
  end;
  if not v_raised then raise exception 'ESOCIAL RESULT 4 falhou: aceite sem recibo permitido'; end if;

  -- TESTE 5: evento fora do lote não pode receber resultado por este lote.
  v_raised:=false;
  begin
    perform public.apply_rh_esocial_event_result(v_batch,'ID-NAO-EXISTE','REJECTED',null,'401','Falha','[]'::jsonb);
  exception when others then
    if sqlerrm like '%não pertence ao lote%' then v_raised:=true; end if;
  end;
  if not v_raised then raise exception 'ESOCIAL RESULT 5 falhou: resultado órfão aceito'; end if;

  raise notice 'RH eSocial resultados — 5 testes aprovados.';
end$$;
