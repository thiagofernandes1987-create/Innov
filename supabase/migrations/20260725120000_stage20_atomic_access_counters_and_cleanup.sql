-- Auditoria APEX V5.2.5 — FND-0008 e FND-0010.
-- 1. Contadores de acesso deixam de ser incrementados por leitura-modificação-escrita
--    da aplicação e passam a ser somados dentro do banco, sem perda sob concorrência.
-- 2. Remove a função de diagnóstico global que ficou sem referência depois do
--    hardening R3B da observabilidade.

begin;

create or replace function public.register_quality_public_link_access(p_token_sha256 text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quality_public_links
  set access_count = access_count + 1,
      last_access_at = now()
  where token_sha256 = p_token_sha256
    and revoked_at is null
    and (expires_at is null or expires_at > now());
end;
$$;

revoke all on function public.register_quality_public_link_access(text) from public, anon, authenticated;
grant execute on function public.register_quality_public_link_access(text) to service_role;

create or replace function public.register_procurement_invitation_access(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.procurement_supplier_invitations
  set access_count = access_count + 1,
      opened_at = coalesce(opened_at, now())
  where id = p_invitation_id
    and revoked_at is null;
end;
$$;

revoke all on function public.register_procurement_invitation_access(uuid) from public, anon, authenticated;
grant execute on function public.register_procurement_invitation_access(uuid) to service_role;

-- A policy observability_diagnostics_select deixou de consumir esta função no
-- hardening R3B e nenhuma outra policy ou função a referencia.
drop function if exists public.stage19_can_read_global_diagnostics();

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'stage19_can_read_global_diagnostics'
  ) then
    raise exception 'Função de diagnóstico global ainda existe após a remoção.';
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'register_quality_public_link_access'
  ) then
    raise exception 'Função de contagem do formulário público não foi criada.';
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'register_procurement_invitation_access'
  ) then
    raise exception 'Função de contagem do convite de fornecedor não foi criada.';
  end if;
end $$;

commit;
