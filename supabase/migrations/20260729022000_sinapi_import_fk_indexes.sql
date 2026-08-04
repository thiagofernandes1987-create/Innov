-- VACINA-021 e VACINA-039: o catálogo mensal cresce em milhares de linhas.
-- As FKs de rastreabilidade precisam de cobertura para exclusão, inspeção e
-- diagnóstico de um lote sem varredura integral das tabelas de custos.

create index if not exists cost_catalog_items_import_batch_idx
  on public.cost_catalog_items(import_batch_id)
  where import_batch_id is not null;

create index if not exists cost_composition_versions_import_batch_idx
  on public.cost_composition_versions(import_batch_id)
  where import_batch_id is not null;
