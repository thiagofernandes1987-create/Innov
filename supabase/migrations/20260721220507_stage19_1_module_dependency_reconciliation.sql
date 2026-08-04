-- Etapa 19.1 — reconcilia a topologia modular canônica sem reescrever migrations aplicadas.
begin;

insert into public.app_module_dependencies(
  module_id,
  depends_on_module_id,
  minimum_version,
  required
)
select module.id, dependency.id, '1.0.0', true
from (values
  ('obras','clientes'),
  ('planejamento','obras'),
  ('tarefas','obras'),
  ('diario','obras'),
  ('equipes','obras'),
  ('orcamentos','clientes'),
  ('propostas','orcamentos'),
  ('contratos','propostas'),
  ('aditivos','contratos'),
  ('assinaturas','documentos'),
  ('qualidade','obras'),
  ('compras','obras'),
  ('compras','qualidade'),
  ('estoque','compras'),
  ('estoque','obras'),
  ('financeiro','obras'),
  ('financeiro','contratos'),
  ('financeiro','compras'),
  ('sac','clientes'),
  ('relatorios','obras'),
  ('auditoria','administracao')
) dependency_map(module_key, dependency_key)
join public.app_modules module on module.key=dependency_map.module_key
join public.app_modules dependency on dependency.key=dependency_map.dependency_key
on conflict(module_id,depends_on_module_id) do update set
  minimum_version=excluded.minimum_version,
  required=excluded.required;

commit;
