-- Auditoria APEX V5.2.5 — FND-0008.
-- Contadores de acesso deixam de ser incrementados por leitura-modificação-escrita
-- da aplicação e passam a ser somados dentro do banco, sem perda sob concorrência.
--
-- A remoção da função de diagnóstico global (FND-0010) **saiu daqui**. Ela
-- pressupunha que o hardening R3B já estivesse aplicado, porque é ele que tira a
-- função de dentro de `observability_diagnostics_select`. Medido no banco em 4 de
-- agosto de 2026: a policy viva ainda a chama —
--
--   (organization_id is null and stage19_can_read_global_diagnostics())
--
-- — porque `r3b_observability_security_hardening` está no débito congelado de
-- `diretrizes/migrations-aplicadas.json`, sob a S-22. A função não é órfã: é
-- load-bearing. Dropá-la agora abriria o diagnóstico global ou derrubaria a
-- policy, dependendo de o `drop` passar. Fica registrado na T-22.x do inventário,
-- junto do pré-requisito.

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

do $$
begin
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
