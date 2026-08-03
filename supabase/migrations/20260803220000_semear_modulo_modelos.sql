-- Semeadura do módulo `modelos` em `app_modules`.
--
-- A migration da biblioteca (`20260803140000`) escreveu dez guardas
-- `has_module_permission(org, 'modelos', …)` sobre políticas e funções, e
-- **nunca criou a chave `modelos` em `public.app_modules`**. No banco de
-- desenvolvimento a linha existe porque foi inserida à mão durante a
-- construção; num ambiente novo, nascido só das migrations, ela não existiria.
--
-- O efeito seria mudo e total: `has_module_permission` resolve a chave contra
-- `app_modules`, chave ausente devolve zero linhas, `bool_or` sobre zero linhas
-- é `false`. Todas as dez políticas negariam todo mundo — inclusive
-- `SUPER_ADMIN` — e o aplicativo Modelos e Documentações subiria vazio, sem
-- erro nenhum para explicar por quê.
--
-- Os valores abaixo reproduzem exatamente a linha que já está em produção, para
-- que replay e ambiente atual convirjam.

begin;

insert into public.app_modules(
  key, name, description, href, icon_key, display_order, active, sensitive,
  version, category, manifest, default_enabled, is_core
) values (
  'modelos',
  'Modelos e Documentações',
  'Biblioteca única de modelos: propostas, contratos, termos, mensagens e e-mails. Todo aplicativo lê daqui.',
  '/app/modelos',
  'file',
  135,
  true,
  false,
  '1.0.0',
  'Operacional',
  '{}'::jsonb,
  true,
  false
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  href = excluded.href,
  icon_key = excluded.icon_key,
  display_order = excluded.display_order,
  active = true,
  version = excluded.version,
  category = excluded.category,
  manifest = excluded.manifest,
  default_enabled = true,
  deprecated_at = null,
  updated_at = now();

-- O acervo é de leitura geral: toda organização já existente recebe o módulo
-- habilitado, como as demais semeaduras de módulo fazem.
insert into public.organization_modules(organization_id, module_id, status, installed_version, settings, enabled_at)
select o.id, m.id, 'ENABLED', m.version, '{}'::jsonb, now()
from public.organizations o
cross join public.app_modules m
where m.key = 'modelos'
on conflict (organization_id, module_id) do update set
  status = 'ENABLED',
  installed_version = excluded.installed_version,
  enabled_at = coalesce(public.organization_modules.enabled_at, now());

commit;
