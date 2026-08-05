-- Sprint W-12 — testes PostgreSQL de referências de mídia segura.

-- 1. Registro guarda somente referência, hash e metadados.
do $$
declare media public.channel_media_references%rowtype;
begin
  media:=public.register_channel_media_reference(
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    '13000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','provider-media-1','DOCUMENT','application/pdf',
    'contrato.pdf','contrato.pdf',12,repeat('a',64),
    'pending/org/media-1',jsonb_build_object('ocr',false,'transcription',false)
  );
  if media.security_state<>'QUARANTINED' or media.clean_object_path is not null then
    raise exception 'Registro inicial inválido: %',media;
  end if;
  raise notice 'W-12 referência sem binário aprovada';
end;
$$;

-- 2. Duplicação pelo provider retorna a mesma referência.
do $$
declare first_id uuid; repeated public.channel_media_references%rowtype;
begin
  select id into first_id from public.channel_media_references where provider_media_id='provider-media-1';
  repeated:=public.register_channel_media_reference(
    '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',
    '13000000-0000-0000-0000-000000000001','META_CLOUD','phone-1','provider-media-1',
    'DOCUMENT','application/pdf','outro.pdf','outro.pdf',12,repeat('a',64),
    'pending/org/media-other','{}'::jsonb
  );
  if repeated.id<>first_id then raise exception 'Provider media duplicou referência.'; end if;
  raise notice 'W-12 idempotência provider media aprovada';
end;
$$;

-- 3. Scan só inicia a partir de QUARANTINED/ERROR.
do $$
declare media_id uuid; scanned public.channel_media_references%rowtype;
begin
  select id into media_id from public.channel_media_references where provider_media_id='provider-media-1';
  scanned:=public.begin_channel_media_scan(media_id,'clamav');
  if scanned.security_state<>'SCANNING' then raise exception 'Scan não iniciou.'; end if;
  begin
    perform public.begin_channel_media_scan(media_id,'clamav');
    raise exception 'Scan concorrente foi aceito.';
  exception when others then
    if position('MEDIA_NOT_SCANNABLE' in sqlerrm)=0 then raise; end if;
  end;
  raise notice 'W-12 claim de scan aprovado';
end;
$$;

-- 4. CLEAN exige objeto privado promovido e MIME detectado.
do $$
declare media_id uuid; clean public.channel_media_references%rowtype;
begin
  select id into media_id from public.channel_media_references where provider_media_id='provider-media-1';
  clean:=public.complete_channel_media_scan(
    media_id,'CLEAN','application/pdf',null,'clean/org/media-1',true
  );
  if clean.security_state<>'CLEAN' or clean.clean_object_path is null or not clean.metadata_redacted then
    raise exception 'Promoção clean inválida: %',clean;
  end if;
  raise notice 'W-12 promoção após antivírus aprovada';
end;
$$;

-- 5. Referência CLEAN é deduplicada por hash/tamanho na mesma organização.
do $$
declare existing_id uuid; duplicate public.channel_media_references%rowtype;
begin
  select id into existing_id from public.channel_media_references where provider_media_id='provider-media-1';
  duplicate:=public.register_channel_media_reference(
    '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',null,
    'META_CLOUD','phone-1','provider-media-2','DOCUMENT','application/pdf',
    'duplicado.pdf','duplicado.pdf',12,repeat('a',64),'pending/org/media-2','{}'::jsonb
  );
  if duplicate.id<>existing_id then raise exception 'Deduplicação clean falhou.'; end if;
  raise notice 'W-12 hash e deduplicação aprovados';
end;
$$;

-- 6. Mídia bloqueada não recebe clean path nem pode ser promovida.
do $$
declare blocked public.channel_media_references%rowtype;
begin
  blocked:=public.register_channel_media_reference(
    '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',null,
    'META_CLOUD','phone-1','provider-malware','DOCUMENT','application/pdf',
    'malware.pdf','malware.pdf',13,repeat('b',64),'pending/org/malware','{}'::jsonb
  );
  perform public.begin_channel_media_scan(blocked.id,'clamav');
  blocked:=public.complete_channel_media_scan(
    blocked.id,'BLOCKED','application/pdf','EICAR-Test-Signature',null,false
  );
  if blocked.security_state<>'BLOCKED' or blocked.clean_object_path is not null then
    raise exception 'Malware foi liberado.';
  end if;
  begin
    update public.channel_media_references set security_state='CLEAN',clean_object_path='clean/forbidden'
      where id=blocked.id;
    raise exception 'Bloqueado foi promovido.';
  exception when others then
    if position('BLOCKED_MEDIA_CANNOT_PROMOTE' in sqlerrm)=0 then raise; end if;
  end;
  raise notice 'W-12 malware bloqueado aprovado';
end;
$$;

-- 7. Somente CLEAN pode originar URL assinada no backend.
do $$
declare clean_id uuid; blocked_id uuid;
begin
  select id into clean_id from public.channel_media_references where provider_media_id='provider-media-1';
  select id into blocked_id from public.channel_media_references where provider_media_id='provider-malware';
  if public.assert_channel_media_clean(clean_id)<>'clean/org/media-1' then raise exception 'Clean path incorreto.'; end if;
  begin
    perform public.assert_channel_media_clean(blocked_id);
    raise exception 'Blocked forneceu referência assinável.';
  exception when others then
    if position('MEDIA_NOT_CLEAN' in sqlerrm)=0 then raise; end if;
  end;
  raise notice 'W-12 gate de URL assinada aprovado';
end;
$$;

-- 8. Escopo cross-tenant é rejeitado.
do $$
begin
  perform public.register_channel_media_reference(
    '22222222-2222-2222-2222-222222222222','10000000-0000-0000-0000-000000000001',null,
    'META_CLOUD','phone-1','cross-tenant','DOCUMENT','application/pdf',
    'cross.pdf','cross.pdf',10,repeat('c',64),'pending/cross','{}'::jsonb
  );
  raise exception 'Mídia cross-tenant foi aceita.';
exception when others then
  if position('MEDIA_SCOPE_MISMATCH' in sqlerrm)=0 then raise; end if;
  raise notice 'W-12 isolamento multiempresa aprovado';
end;
$$;

-- 9. Base64, payload bruto e segredos são proibidos no banco.
do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='channel_media_references'
      and column_name in ('base64','raw_payload','binary_data','file_bytes','secret','token')
  ) then raise exception 'Coluna binária/base64/segredo encontrada.'; end if;
  begin
    perform public.register_channel_media_reference(
      '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',null,
      'META_CLOUD','phone-1','unsafe-policy','DOCUMENT','application/pdf',
      'unsafe.pdf','unsafe.pdf',10,repeat('d',64),'pending/unsafe',jsonb_build_object('base64','AAAA')
    );
    raise exception 'Base64 em policy foi aceito.';
  exception when others then
    if position('UNSAFE_MEDIA_POLICY' in sqlerrm)=0 then raise; end if;
  end;
  raise notice 'W-12 ausência de base64 persistente aprovada';
end;
$$;

-- 10. Escrita direta é revogada e RLS forçada.
do $$
begin
  if has_table_privilege('authenticated','public.channel_media_references','INSERT')
     or has_table_privilege('authenticated','public.channel_media_references','UPDATE') then
    raise exception 'Authenticated possui escrita direta em mídia.';
  end if;
  if not exists(
    select 1 from pg_class where oid='public.channel_media_references'::regclass
      and relrowsecurity and relforcerowsecurity
  ) then raise exception 'RLS de mídia não está forçada.'; end if;
  raise notice 'W-12 RLS e privilégio mínimo aprovados';
end;
$$;
