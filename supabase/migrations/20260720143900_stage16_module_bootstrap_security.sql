-- Etapa 16 — remove exposição direta dos inicializadores modulares antigos.

revoke all on function public.ensure_organization_module_defaults(uuid) from public,anon,authenticated;
revoke all on function public.ensure_organization_module_defaults_trigger() from public,anon,authenticated;

grant execute on function public.ensure_organization_module_defaults(uuid) to service_role;

-- A função de trigger continua sendo executada internamente pelo PostgreSQL
-- durante a criação de organizações; não necessita permissão RPC para usuários.
