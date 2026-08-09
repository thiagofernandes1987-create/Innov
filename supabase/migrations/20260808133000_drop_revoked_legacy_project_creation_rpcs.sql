begin;

-- As versões v1 e v2 foram explicitamente revogadas em
-- 20260729214500_revoke_legacy_project_creation_rpcs.sql porque não criam todas
-- as memberships nem aplicam as invariantes da v3.
--
-- Auditoria de 2026-08-08 confirmou:
-- - runtime atual chama apenas create_independent_project_v3;
-- - v1/v2 não possuem objetos dependentes no Postgres;
-- - anon/authenticated já não possuem EXECUTE;
-- - manter as funções fisicamente expande a superfície de manutenção sem
--   oferecer compatibilidade útil.
--
-- A premissa é revalidada no deploy: a porta v3 precisa existir e continuar
-- executável por authenticated. Os DROP usam RESTRICT implícito; qualquer nova
-- dependência dos contratos antigos aborta a migration.
do $$
declare
  v_v3 oid;
begin
  v_v3 := to_regprocedure(
    'public.create_independent_project_v3(uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text)'
  );

  if v_v3 is null then
    raise exception
      'create_independent_project_v3 ausente; não é seguro remover v1/v2';
  end if;

  if not has_function_privilege('authenticated', v_v3, 'EXECUTE') then
    raise exception
      'create_independent_project_v3 deixou de ser executável por authenticated; reclassifique antes de remover v1/v2';
  end if;
end;
$$;

drop function if exists public.create_independent_project(
  uuid, uuid, text, text, text, text, text,
  date, date, date, numeric, date, numeric,
  text, text, text, text, uuid, text
);

drop function if exists public.create_independent_project_v2(
  uuid, uuid, text, text, text, text, text,
  date, date, date, numeric, date, numeric,
  text, text, text, text, text, uuid, text
);

commit;
