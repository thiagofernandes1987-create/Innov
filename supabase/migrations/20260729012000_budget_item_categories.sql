-- Rodada 02: classificação operacional dos itens do orçamento.

alter table public.budget_items
  add column item_category text not null default 'MATERIAL';

alter table public.budget_items
  add constraint budget_items_item_category_check
  check (item_category in (
    'MATERIAL',
    'LABOR',
    'EQUIPMENT',
    'SERVICE',
    'SUBCONTRACT',
    'FIXED_COST',
    'REFERENCE',
    'OTHER'
  ));

create index budget_items_category_idx
  on public.budget_items(budget_version_id, item_category, sequence);

comment on column public.budget_items.item_category is
  'Natureza operacional: material, mão de obra, equipamento, serviço, subempreita, custo fixo, referência ou outro.';
