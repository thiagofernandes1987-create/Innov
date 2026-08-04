-- Evidência pública oficial publicada em 01/07/2026:
-- https://sindusconsp.com.br/cub-paulista-registra-maior-alta-de-2026-em-junho/
-- Os hashes são do payload canônico de cada linha, não do HTML mutável da página.

insert into public.cost_reference_snapshots(
  source_key, source_name, region, reference_code,
  base_date, publication_date, tax_relief, unit,
  total_cost, materials_cost, labor_cost, administrative_cost, equipment_cost,
  monthly_change_rate, year_change_rate, twelve_month_change_rate,
  source_url, source_sha256, raw_payload
) values
(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R8-N',
  date '2026-06-01', date '2026-07-01', false, 'm²',
  2221.44, null, null, null, null,
  0.0224, 0.0459, 0.0650,
  'https://sindusconsp.com.br/cub-paulista-registra-maior-alta-de-2026-em-junho/',
  'b29ce1466472bb6f34fffbc4010dda5683976145476ca05e49eecdfa968f69f3',
  jsonb_build_object(
    'evidence', 'CUB representativo da construção paulista R8-N sem desoneração',
    'publishedAt', '2026-07-01T20:20:05-03:00',
    'retrievalMode', 'official-publication-seed'
  )
),
(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R8-N',
  date '2026-06-01', date '2026-07-01', true, 'm²',
  2146.08, 892.29, 1192.01, 61.78, null,
  0.0220, 0.0646, 0.0838,
  'https://sindusconsp.com.br/cub-paulista-registra-maior-alta-de-2026-em-junho/',
  '64774109e638fb9a44b16d51a823903b7c1ca57751d05d9263d9bad4159fb814',
  jsonb_build_object(
    'evidence', 'CUB representativo da construção paulista R8-N com desoneração',
    'publishedAt', '2026-07-01T20:20:05-03:00',
    'retrievalMode', 'official-publication-seed'
  )
)
on conflict (source_key, region, reference_code, base_date, tax_relief)
do update set
  source_name = excluded.source_name,
  publication_date = excluded.publication_date,
  unit = excluded.unit,
  total_cost = excluded.total_cost,
  materials_cost = excluded.materials_cost,
  labor_cost = excluded.labor_cost,
  administrative_cost = excluded.administrative_cost,
  equipment_cost = excluded.equipment_cost,
  monthly_change_rate = excluded.monthly_change_rate,
  year_change_rate = excluded.year_change_rate,
  twelve_month_change_rate = excluded.twelve_month_change_rate,
  source_url = excluded.source_url,
  source_sha256 = excluded.source_sha256,
  raw_payload = excluded.raw_payload,
  retrieved_at = now();
