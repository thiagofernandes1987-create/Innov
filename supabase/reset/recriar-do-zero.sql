-- Recria o schema `public` vazio, com os privilégios de fábrica do Supabase.
--
-- ## Por que este arquivo existe, e por que fora de `migrations/`
--
-- Ele **não é** uma migration: não descreve um passo da evolução do esquema,
-- descreve o ponto zero. Se estivesse em `supabase/migrations/` seria aplicado
-- pelo lote e apagaria o banco no meio da sequência.
--
-- ## Quando é usado
--
-- Decidido pelo proprietário em 13/08/2026, na S-79. O `jpqoje…` tinha **144
-- migrations aplicadas, 49 delas sem arquivo nenhum no repositório** — nomes de
-- uma geração anterior (`stage121_…` contra `stage12_1_…` do repositório).
--
-- Essas 49 criaram tabelas e funções que os arquivos do repositório também
-- criam, com outro nome de migration. Aplicar as 178 pendentes por cima colide
-- em `already exists`, e é quase certamente o que deixou a branch em
-- `MIGRATIONS_FAILED` desde 22/07/2026.
--
-- O proprietário confirmou duas vezes que o banco não tem conteúdo a preservar
-- — *"o banco de dados não tem nada"*, *"só contas inventadas"*. Recriar do zero
-- e aplicar as 273 em ordem produz um banco que **é** o repositório, em vez de
-- um banco que ninguém consegue descrever.
--
-- ## O que este arquivo NÃO toca
--
--   auth.users        as contas sobrevivem; o que some é a linha delas em
--                     `public`, que a semeadura de homologação recria
--   storage           medido em 13/08/2026: 0 buckets, 0 objetos
--   extensions,       schemas do fornecedor, fora do alcance das migrations
--   vault, realtime
--
-- ## Os privilégios de fábrica
--
-- O bloco final replica o que um projeto Supabase novo tem. Isso inclui os
-- privilégios largos a `anon` e `authenticated` que a VACINA-059 registra como
-- perigosos — e é **de propósito**: as migrations foram escritas contra esse
-- ponto de partida, e várias delas revogam o que não deve ficar. Partir de um
-- estado mais fechado faria o lote se comportar aqui de um jeito que não se
-- repete em nenhum outro ambiente.

begin;

drop schema if exists public cascade;
create schema public;

alter schema public owner to pg_database_owner;
comment on schema public is 'standard public schema';

grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;

-- O histórico tem de ir junto. Schema vazio com histórico cheio faz o próximo
-- `ledger:atualizar` declarar aplicadas 144 migrations que não existem mais —
-- e é o pior desfecho possível, porque o CI passaria a comparar o repositório
-- com uma ficção.
delete from supabase_migrations.schema_migrations;

commit;
