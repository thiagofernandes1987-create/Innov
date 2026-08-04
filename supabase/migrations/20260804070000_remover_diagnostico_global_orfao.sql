-- T-37.11 — remove `stage19_can_read_global_diagnostics()`, agora que ela é órfã.
--
-- Pendência da FND-0010 da auditoria APEX V5.2.5. A migration da auditoria
-- (`stage20_atomic_access_counters_and_cleanup`) dropava a função supondo que o
-- hardening R3B já estivesse aplicado — é ele que tira a função de dentro da
-- policy `observability_diagnostics_select`. Medido em 4 de agosto de 2026, o
-- R3B estava no débito congelado da S-22 e a policy ainda chamava a função:
--
--   (organization_id is null and stage19_can_read_global_diagnostics())
--
-- Ela não era órfã, era **load-bearing**, e o `drop` teria falhado por
-- dependência ou aberto o diagnóstico global, dependendo de como passasse. Por
-- isso a remoção saiu daquela migration e ficou esperando o pré-requisito.
--
-- O R3B foi aplicado, com o alcance conferido antes: nenhuma função `SECURITY
-- INVOKER` chama `record_audit_event` nem `write_audit` — as 21 que as usam são
-- todas `definer` —, e a tabela de diagnóstico está vazia, então restringir a
-- leitura global não esconde nada de ninguém hoje.
--
-- Conferido depois, e é o que autoriza este `drop`:
--
--   policies dependentes .... 0
--   funções dependentes ..... 0
--   dependências no catálogo. 0
--
-- A policy passou a ser só o ramo por organização, e `authenticated` deixou de
-- executar as duas RPCs genéricas de auditoria.

begin;

drop function if exists public.stage19_can_read_global_diagnostics();

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'stage19_can_read_global_diagnostics'
  ) then
    raise exception 'A função de diagnóstico global continua existindo após a remoção.';
  end if;

  -- O motivo pelo qual ela pôde sair: a policy não a chama mais. Conferir aqui
  -- impede que uma reintrodução da policy antiga passe despercebida junto.
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and policyname = 'observability_diagnostics_select'
      and qual ilike '%stage19_can_read_global_diagnostics%'
  ) then
    raise exception 'A policy voltou a depender da função de diagnóstico global.';
  end if;
end $$;

commit;
