-- RLS não cobre TRUNCATE. E 213 tabelas davam TRUNCATE a anon e authenticated.
--
-- A plataforma inteira apoia a proteção de dado em RLS: política por tabela,
-- `force row level security`, e o privilégio bruto deixado no padrão do
-- Supabase. Para `select`, `insert`, `update` e `delete` isso funciona — a
-- política é avaliada linha a linha e nega quem não pode.
--
-- **`TRUNCATE` não passa por política nenhuma.** É comando de tabela, não de
-- linha, e o PostgreSQL não aplica row security a ele. Medido em banco local,
-- com a proteção no máximo:
--
--   RLS habilitada e forçada, única política `for select ... using (false)`,
--   `grant select, truncate` para `authenticated`:
--     antes: 2 linhas | erro no truncate: nenhum | depois: 0 linhas
--
-- Hoje o caminho público é o PostgREST, que não emite `TRUNCATE` — então isto
-- não é uma porta aberta agora. É um privilégio que nenhum papel da aplicação
-- usa, guardado atrás de uma única suposição sobre o que o gateway emite. O
-- dia em que existir conexão direta, função `security invoker` com SQL
-- dinâmico ou um recurso novo do fornecedor que execute SQL do chamador, o
-- estrago é a tabela inteira — e RLS não avisa.
--
-- `TRIGGER` e `REFERENCES` vão junto pelo mesmo motivo: nenhum papel da
-- aplicação cria trigger ou chave estrangeira em tempo de execução.
--
-- Registrado na VACINA-059.

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- Tabela nova não pode nascer com o privilégio de volta. O padrão do Supabase
-- é concedido por `alter default privileges` do papel que cria os objetos.
-- Papel que esta sessão não tem alçada para alterar é anotado e segue: a
-- primeira versão incluía `supabase_admin` e a migration inteira foi recusada
-- com 42501 — derrubar tudo por causa do padrão de um papel deixaria as 213
-- tabelas de hoje exatamente como estavam.
do $$
declare
  v_papel text;
  v_sem_alcance text := '';
begin
  foreach v_papel in array array['postgres', current_user]
  loop
    if exists (select 1 from pg_roles where rolname = v_papel) then
      begin
        execute format(
          'alter default privileges for role %I in schema public revoke truncate, trigger, references on tables from anon, authenticated',
          v_papel
        );
      exception when insufficient_privilege then
        v_sem_alcance := v_sem_alcance || v_papel || ' ';
      end;
    end if;
  end loop;
  if v_sem_alcance <> '' then
    raise notice 'Sem alçada para alterar o padrão dos papéis: %', v_sem_alcance;
  end if;
end;
$$;

-- Documento emitido: a imutabilidade estava só na ausência de política -------
--
-- `emitted_documents` guarda o texto resolvido de um contrato, uma proposta ou
-- um laudo. O inventário dizia "tabela sem UPDATE"; na verdade a tabela tinha
-- `grant update, delete` e era a **ausência de política** de UPDATE, sob RLS
-- forçada, que segurava. Funciona — e depende de ninguém acrescentar um dia uma
-- política `for all`. Com o privilégio revogado, as duas coisas precisam dar
-- errado ao mesmo tempo para o documento emitido virar editável.
revoke update, delete on public.emitted_documents from anon, authenticated;

-- Verificação embutida -------------------------------------------------------
do $$
declare
  v_restantes integer;
  v_amostra text;
begin
  select count(*), string_agg(distinct table_name, ', ' order by table_name)
    into v_restantes, v_amostra
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES');

  if v_restantes > 0 then
    raise exception 'Ainda há % concessão(ões) de TRUNCATE/TRIGGER/REFERENCES a anon ou authenticated: %',
      v_restantes, left(v_amostra, 300);
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'emitted_documents'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('UPDATE', 'DELETE')
  ) then
    raise exception 'emitted_documents ainda aceita UPDATE ou DELETE por privilégio.';
  end if;

  -- O que **não** pode ter sido derrubado junto: a leitura e a escrita normais
  -- da aplicação continuam de pé, porque é a RLS que decide quem passa.
  if not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'projects'
      and grantee = 'authenticated' and privilege_type = 'SELECT'
  ) then
    raise exception 'A revogação levou junto o SELECT da aplicação — isto derruba o produto.';
  end if;

  raise notice 'Privilégios: TRUNCATE, TRIGGER e REFERENCES revogados de anon e authenticated; leitura da aplicação intacta.';
end;
$$;
