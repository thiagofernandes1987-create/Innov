-- Semeia o aplicativo RH/DP no catálogo canônico de módulos.
-- Sem esta linha, has_module_permission(...,'rh',...) devolve false para todos
-- em um ambiente criado apenas pelas migrations.
begin;

insert into public.app_modules(
  key, name, description, href, icon_key, display_order, active, sensitive,
  version, category, manifest, default_enabled, is_core
) values (
  'rh',
  'Recursos Humanos e DP',
  'Empregados, admissão, jornada, folha, SST e obrigações digitais.',
  '/app/rh',
  'users',
  175,
  true,
  true,
  '0.1.0',
  'Recursos Humanos',
  '{"dependencies":["documentos","financeiro"]}'::jsonb,
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
  sensitive = excluded.sensitive,
  version = excluded.version,
  category = excluded.category,
  manifest = excluded.manifest,
  default_enabled = excluded.default_enabled,
  is_core = excluded.is_core,
  deprecated_at = null,
  updated_at = now();

insert into public.organization_modules(
  organization_id, module_id, status, installed_version, settings, enabled_at
)
select o.id, m.id, 'ENABLED', m.version, '{}'::jsonb, now()
from public.organizations o
cross join public.app_modules m
where m.key = 'rh'
on conflict (organization_id, module_id) do update set
  status = 'ENABLED',
  installed_version = excluded.installed_version,
  enabled_at = coalesce(public.organization_modules.enabled_at, now());

commit;
