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
