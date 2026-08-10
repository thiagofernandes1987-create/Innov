\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

do $$
declare
  existing_id uuid;
  original_created_at timestamptz;
  updated public.channel_bot_profiles;
begin
  select id,created_at into existing_id,original_created_at
  from public.channel_bot_profiles
  where organization_id='11111111-1111-1111-1111-111111111111'
    and name='Assistente de obra';

  updated := public.upsert_channel_bot_profile(
    '11111111-1111-1111-1111-111111111111',
    'Assistente de obra',
    'Perfil pausado para revisão',
    false,
    'OPENAI',
    'modelo-configurado',
    'Produza somente rascunhos objetivos e nunca invente prazos, valores ou compromissos.',
    'LEXICAL',
    array['SEARCH_CANONICAL','READ_PROJECT_STATUS']::text[],
    450,
    9000,
    90,
    '41000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000001',
    existing_id
  );

  if updated.id <> existing_id then raise exception 'Edição criou outro perfil'; end if;
  if updated.enabled_for_drafts then raise exception 'Perfil não foi pausado'; end if;
  if updated.description <> 'Perfil pausado para revisão' or updated.max_output_tokens <> 450 then
    raise exception 'Campos editáveis não foram atualizados';
  end if;
  if updated.created_at <> original_created_at then raise exception 'Histórico de criação foi perdido'; end if;
  if updated.autonomy_mode <> 'DRAFT_ONLY' or not updated.review_required or updated.send_allowed then
    raise exception 'Edição alterou guardas de autonomia';
  end if;
  raise notice 'edição e pausa sem perda de identidade aprovadas';
end $$;

\echo 'Teste PostgreSQL de edição de bot aprovado: 1 controle.'
