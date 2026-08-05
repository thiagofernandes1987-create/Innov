-- O contador de não lidas deixa de ser somado pela aplicação.
--
-- O webhook fazia leitura-modificação-escrita:
--
--   .select("id,unread_count,client_id")            -- lê
--   ...
--   .update({ unread_count: Number(conversation.unread_count ?? 0) + 1 })
--
-- É exatamente o padrão que a FND-0008 da auditoria APEX V5.2.5 removeu da
-- plataforma em `stage20_atomic_access_counters_and_cleanup`, e ele voltou aqui
-- por outra porta. A diferença é que desta vez o concorrente é a **própria
-- Meta**: o webhook reentrega o mesmo evento quando não recebe 200 a tempo, e
-- duas entregas simultâneas leem o mesmo valor, somam um em cima do mesmo
-- número e gravam o mesmo resultado. Uma das duas mensagens some da contagem.
--
-- O sintoma é o pior tipo: a conversa aparece com "2 não lidas" quando são 3.
-- Ninguém abre chamado para um número que parece plausível, e quem confia na
-- contagem para priorizar atendimento prioriza errado.
--
-- A soma passa a acontecer **dentro do banco**, onde o `update` de uma
-- transação enxerga o valor já comprometido pela outra. A RPC também move o
-- registro da mensagem recebida para um lugar só: quem grava a mensagem
-- carimba a conversa, e as duas coisas não podem divergir.

begin;

create or replace function public.registrar_mensagem_recebida_whatsapp(
  p_conversation_id uuid,
  p_recebida_em timestamptz
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_contagem integer;
begin
  -- Só o importador do webhook chama, e ele roda como `service_role`. A
  -- conversa pertence a uma organização, mas a contagem não é decisão de
  -- alçada: é consequência de a mensagem ter chegado.
  if coalesce(auth.role(), current_user) not in ('postgres', 'service_role') then
    raise exception 'Registro de mensagem recebida exige service_role.';
  end if;

  update public.whatsapp_conversations
  set unread_count = unread_count + 1,
      status = case when status = 'CLOSED' then 'OPEN' else status end,
      last_customer_message_at = greatest(coalesce(last_customer_message_at, p_recebida_em), p_recebida_em),
      last_message_at = greatest(coalesce(last_message_at, p_recebida_em), p_recebida_em),
      updated_at = now()
  where id = p_conversation_id
  returning unread_count into v_contagem;

  if not found then
    raise exception 'Conversa % não encontrada.', p_conversation_id;
  end if;

  return v_contagem;
end;
$function$;

revoke all on function public.registrar_mensagem_recebida_whatsapp(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.registrar_mensagem_recebida_whatsapp(uuid, timestamptz)
  to service_role;

-- `greatest` nas duas datas, e não atribuição direta: a Meta **não garante
-- ordem** de entrega. Um evento atrasado com carimbo antigo chegando depois de
-- um recente faria a conversa "voltar no tempo", e a lista ordenada por última
-- mensagem embaralharia sozinha.

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'registrar_mensagem_recebida_whatsapp'
  ) then
    raise exception 'A função de registro de mensagem recebida não foi criada.';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'whatsapp_conversations'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'A conversa do WhatsApp voltou a ser gravável fora do importador.';
  end if;
end $$;

commit;
