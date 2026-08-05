-- Sprint W-11 — testes PostgreSQL de identidades e contatos.

insert into public.whatsapp_contacts(
  id,organization_id,account_id,wa_id,phone_e164,display_name
) values(
  '11000000-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  '10000000-0000-0000-0000-000000000001',
  '5511999990003','+5511999990003','Contato Duplicado'
);

insert into public.whatsapp_conversations(
  id,organization_id,account_id,contact_id
) values(
  '12000000-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  '10000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000003'
);

-- 1. PN observado vincula ao contato canônico sem duplicá-lo.
do $$
declare identity_row public.channel_contact_identities%rowtype;
begin
  identity_row:=public.observe_channel_contact_identity(
    '10000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    'WHATSAPP_PN','5511999990001@s.whatsapp.net','5511999990001@s.whatsapp.net',null,now()
  );
  if identity_row.contact_id<>'11000000-0000-0000-0000-000000000001'
     or identity_row.link_status<>'OBSERVED' then raise exception 'Observação PN inválida.'; end if;
  raise notice 'W-11 identidade PN observada aprovada';
end;
$$;

-- 2. LID observado permanece identidade separada do mesmo contato.
do $$
declare identity_row public.channel_contact_identities%rowtype;
begin
  identity_row:=public.observe_channel_contact_identity(
    '10000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    'WHATSAPP_LID','700000000001@lid','700000000001@lid',null,now()
  );
  if identity_row.namespace<>'WHATSAPP_LID' or (
    select count(*) from public.channel_contact_identities
    where contact_id='11000000-0000-0000-0000-000000000001' and active
  )<>2 then raise exception 'LID duplicou ou substituiu PN.'; end if;
  raise notice 'W-11 identidade LID separada aprovada';
end;
$$;

-- 3. Alias PN/LID só é confirmado quando ambos pertencem ao mesmo contato.
do $$
declare pn_id uuid; lid_id uuid; alias_row public.channel_identity_alias_links%rowtype;
begin
  select id into pn_id from public.channel_contact_identities
    where contact_id='11000000-0000-0000-0000-000000000001' and namespace='WHATSAPP_PN';
  select id into lid_id from public.channel_contact_identities
    where contact_id='11000000-0000-0000-0000-000000000001' and namespace='WHATSAPP_LID';
  alias_row:=public.confirm_channel_identity_alias(
    pn_id,lid_id,jsonb_build_object('source','synthetic-fixture')
  );
  if alias_row.status<>'CONFIRMED' or alias_row.confidence<>'CONFIRMED' then
    raise exception 'Alias não foi confirmado.';
  end if;
  raise notice 'W-11 alias PN LID confirmado aprovado';
end;
$$;

-- 4. Reobservação em outro contato gera conflito e não move a identidade.
do $$
declare identity_row public.channel_contact_identities%rowtype;
begin
  identity_row:=public.observe_channel_contact_identity(
    '10000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000003',
    'WHATSAPP_PN','5511999990001@s.whatsapp.net','5511999990001@s.whatsapp.net',null,now()
  );
  if identity_row.link_status<>'CONFLICT'
     or identity_row.contact_id<>'11000000-0000-0000-0000-000000000001' then
    raise exception 'Conflito moveu identidade indevidamente.';
  end if;
  raise notice 'W-11 conflito observado sem merge aprovado';
end;
$$;

-- 5. Confirmação cross-contact falha fechado.
do $$
declare source_id uuid; target_id uuid;
begin
  select id into source_id from public.channel_contact_identities
    where contact_id='11000000-0000-0000-0000-000000000001' and namespace='WHATSAPP_PN';
  target_id:=(public.observe_channel_contact_identity(
    '10000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000003',
    'WHATSAPP_LID','700000000003@lid','700000000003@lid',null,now()
  )).id;
  begin
    perform public.confirm_channel_identity_alias(source_id,target_id,'{}'::jsonb);
    raise exception 'Alias cross-contact foi confirmado.';
  exception when others then
    if position('CONTACT_CONFIRMATION_REQUIRED' in sqlerrm)=0 then raise; end if;
  end;
  raise notice 'W-11 vínculo observado distinto de confirmado aprovado';
end;
$$;

-- 6. Merge com versão obsoleta é rejeitado.
do $$
begin
  perform public.merge_channel_contacts(
    '11000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000001',0,0,'Merge sintético inválido'
  );
  raise exception 'Merge obsoleto foi aceito.';
exception when others then
  if position('CONTACT_VERSION_CONFLICT' in sqlerrm)=0 then raise; end if;
  raise notice 'W-11 concorrência de merge aprovada';
end;
$$;

-- 7. Merge transacional move conversa e aliases, preservando o contato fonte inativo.
do $$
declare source_version bigint; target_version bigint; audit_row public.channel_contact_merge_audit%rowtype;
begin
  select identity_version into source_version from public.whatsapp_contacts
    where id='11000000-0000-0000-0000-000000000003';
  select identity_version into target_version from public.whatsapp_contacts
    where id='11000000-0000-0000-0000-000000000001';
  audit_row:=public.merge_channel_contacts(
    '11000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000001',
    source_version,target_version,'Deduplicação sintética confirmada'
  );
  if audit_row.moved_conversations<>1
     or exists(select 1 from public.whatsapp_contacts where id=audit_row.source_contact_id and active)
     or not exists(select 1 from public.whatsapp_contacts where id=audit_row.source_contact_id and merged_into_contact_id=audit_row.target_contact_id)
     or not exists(select 1 from public.whatsapp_conversations where id='12000000-0000-0000-0000-000000000003' and contact_id=audit_row.target_contact_id)
  then raise exception 'Merge transacional incompleto: %',audit_row; end if;
  raise notice 'W-11 merge transacional com histórico aprovado';
end;
$$;

-- 8. Alias do contato fonte foi preservado ou supersedido, nunca apagado.
do $$
begin
  if not exists(
    select 1 from public.channel_contact_identities
    where normalized_id='700000000003@lid'
      and (contact_id='11000000-0000-0000-0000-000000000001' or superseded_by is not null)
  ) then raise exception 'Alias desapareceu no merge.'; end if;
  raise notice 'W-11 aliases históricos preservados aprovados';
end;
$$;

-- 9. Cache version aumenta após observação, confirmação e merge.
do $$
declare cache_version bigint;
begin
  select version into cache_version from public.channel_identity_cache_versions
    where organization_id='11111111-1111-1111-1111-111111111111';
  if cache_version is null or cache_version<5 then raise exception 'Cache não foi invalidado: %',cache_version; end if;
  raise notice 'W-11 cache versionado aprovado';
end;
$$;

-- 10. Organização diferente não pode observar identidade em contato alheio.
do $$
begin
  perform public.observe_channel_contact_identity(
    '20000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000001',
    'WHATSAPP_LID','800000000002@lid','800000000002@lid',null,now()
  );
  raise exception 'Cross-tenant foi aceito.';
exception when others then
  if position('IDENTITY_CONTACT_SCOPE_MISMATCH' in sqlerrm)=0 then raise; end if;
  raise notice 'W-11 isolamento multiempresa aprovado';
end;
$$;

-- 11. Relações técnicas não duplicam tabela de contatos.
do $$
begin
  if exists(
    select 1 from information_schema.tables
    where table_schema='public' and table_name in ('channel_contacts','channel_customers')
  ) then raise exception 'Domínio paralelo de contatos encontrado.'; end if;
  if has_table_privilege('authenticated','public.channel_identity_alias_links','INSERT')
     or has_table_privilege('authenticated','public.channel_contact_merge_audit','UPDATE') then
    raise exception 'Privilégio técnico direto indevido.';
  end if;
  raise notice 'W-11 domínio único e privilégio mínimo aprovados';
end;
$$;
