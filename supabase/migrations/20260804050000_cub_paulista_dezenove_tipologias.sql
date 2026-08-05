-- T-37.4 — as dezenove tipologias do CUB paulista, e não uma só.
--
-- O banco tinha duas linhas, ambas R8-N: o leitor lia a **notícia** mensal, e a
-- notícia publica só o CUB representativo. A tela lista o que existe na tabela,
-- logo oferecia um item. Não faltava esquema — faltava fonte.
--
-- A fonte é a série histórica oficial, o `.xlsx` do botão "Download da série
-- histórica" de `sindusconsp.com.br/servicos/cub/`. Arquivo lido:
--
--   Cub-Serie-Historica-Julho-26.xlsx   481.518 bytes
--   SHA-256 671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f
--
-- Conferido antes de semear, e é o que autoriza estes números:
--
--   * as dezenove tipologias **fecham ao centavo** — global igual a mão de obra
--     mais material mais despesas administrativas, em todas;
--   * o R8-N de 2026-07-01 sai em R$ 2.231,37, o mesmo valor que a página do
--     SindusCon-SP publica. Duas fontes independentes, mesmo número.
--
-- A série é **sem desoneração**. O valor desonerado é publicado apenas para o
-- R8-N, na notícia, e continua vindo por lá — por isso a linha desonerada de
-- 06/2026 permanece como está.

insert into public.cost_reference_snapshots(
  source_key, source_name, region, reference_code,
  base_date, publication_date, tax_relief, unit,
  total_cost, materials_cost, labor_cost, administrative_cost, equipment_cost,
  monthly_change_rate, year_change_rate, twelve_month_change_rate,
  source_url, source_sha256, raw_payload
) values
(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R1-B',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2186.73, 933.26, 1133.81, 119.66, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '6cae230adbcd68e082ac6a4abe591cd5d07f93851b6a596b8e310d21da53ba67',
  '{"evidence": "Residência unifamiliar, 1 pavimento, padrão baixo", "familia": "RESIDENCIAL", "padraoDeAcabamento": "BAIXO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'PP-4B',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2042.62, 1055.24, 955.56, 31.82, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'f5bf99b872983c1a854e26df2b9e8a69caab2087bf48793aa47d8c8bf339090c',
  '{"evidence": "Prédio popular, 4 pavimentos, padrão baixo", "familia": "RESIDENCIAL", "padraoDeAcabamento": "BAIXO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R8-B',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  1945.55, 1019.04, 897.88, 28.63, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '9767217270d5de38e8192e5a6a035a0d89dbf495fc4306dc5501283ec88d2634',
  '{"evidence": "Residência multifamiliar, 8 pavimentos, padrão baixo", "familia": "RESIDENCIAL", "padraoDeAcabamento": "BAIXO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'PIS',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  1519.47, 717.76, 772.04, 29.67, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'bf1fa56842c53598634ac8f9836e38d69d1202cceb1b2affc76b6b74f02a40d9',
  '{"evidence": "Projeto de interesse social", "familia": "ESPECIAL", "padraoDeAcabamento": null, "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R1-N',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2681.61, 970.19, 1599.07, 112.35, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'ab8835c4c660fd444706e3a305c4d0c0769a4490b3fd72cba77337303a5082cf',
  '{"evidence": "Residência unifamiliar, 1 pavimento, padrão normal", "familia": "RESIDENCIAL", "padraoDeAcabamento": "NORMAL", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'PP-4N',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2498.31, 949.97, 1413.62, 134.72, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '3ce418bc3a55aa9791a0596d518b5142ba0a68a6e431fbd96d74e84e8f31a23a',
  '{"evidence": "Prédio popular, 4 pavimentos, padrão normal", "familia": "RESIDENCIAL", "padraoDeAcabamento": "NORMAL", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R8-N',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2231.37, 897.01, 1272.21, 62.15, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'f549cbe0728743cb57749200b7fa9af238be399392d6093d20d56bc7ab653dfd',
  '{"evidence": "Residência multifamiliar, 8 pavimentos, padrão normal", "familia": "RESIDENCIAL", "padraoDeAcabamento": "NORMAL", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R16-N',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2168.48, 892.50, 1224.54, 51.44, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '973ba907968072d4a573517d73a7b2f3655e43df26afda2e99fb424d9a5ddf01',
  '{"evidence": "Residência multifamiliar, 16 pavimentos, padrão normal", "familia": "RESIDENCIAL", "padraoDeAcabamento": "NORMAL", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R1-A',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  3242.79, 1401.19, 1735.39, 106.21, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '530d816652b83e89ad5a8bee5bcc89e3a39b85a20dffd67c0dc459c277d483f6',
  '{"evidence": "Residência unifamiliar, 1 pavimento, padrão alto", "familia": "RESIDENCIAL", "padraoDeAcabamento": "ALTO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R8-A',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2618.33, 1203.70, 1341.34, 73.29, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'e107b87a269079dad780853e79c9d75b702c95f71e2f2fca95986d553fbbd2e6',
  '{"evidence": "Residência multifamiliar, 8 pavimentos, padrão alto", "familia": "RESIDENCIAL", "padraoDeAcabamento": "ALTO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'R16-A',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2835.37, 1264.26, 1507.54, 63.57, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '5489a3e7cdb5d9172b24bfecc44785772146d2b73f29d6a7113852bee7222fae',
  '{"evidence": "Residência multifamiliar, 16 pavimentos, padrão alto", "familia": "RESIDENCIAL", "padraoDeAcabamento": "ALTO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'CAL-8N',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2587.16, 1081.88, 1422.01, 83.27, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'ff6332cdb53dee6ebf927e234874d31f86e1ce4315a293ad946010fcdd9c74b4',
  '{"evidence": "Comercial andares livres, 8 pavimentos, padrão normal", "familia": "COMERCIAL", "padraoDeAcabamento": "NORMAL", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'CSL-8N',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2230.85, 885.97, 1279.14, 65.74, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'd9ba88a32e8a5f4ced082186c3f2e9f583692a003f6e255d5e63f8c56cdfca47',
  '{"evidence": "Comercial salas e lojas, 8 pavimentos, padrão normal", "familia": "COMERCIAL", "padraoDeAcabamento": "NORMAL", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'CSL-16N',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2976.33, 1200.24, 1702.35, 73.74, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'c50762014a6e8b0a1759daef6a24c8b604aec346c62253ba8394ffde912bce2e',
  '{"evidence": "Comercial salas e lojas, 16 pavimentos, padrão normal", "familia": "COMERCIAL", "padraoDeAcabamento": "NORMAL", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'CAL-8A',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2737.41, 1218.67, 1435.46, 83.28, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'a049c71b500f6d508fff62ee26d5f7a1ee1bfb6db1c2d104c192a39acda540cf',
  '{"evidence": "Comercial andares livres, 8 pavimentos, padrão alto", "familia": "COMERCIAL", "padraoDeAcabamento": "ALTO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'CSL-8A',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2401.30, 1022.23, 1313.33, 65.74, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '6eff6039f543e10b6b997de08d72afc3a6ce3d4e46183c4367a492bf730cfe1d',
  '{"evidence": "Comercial salas e lojas, 8 pavimentos, padrão alto", "familia": "COMERCIAL", "padraoDeAcabamento": "ALTO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'CSL-16A',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  3139.51, 1317.19, 1748.58, 73.74, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '8645da209cecd645dc72b3072a42b21658ec76ec50c138e9991d0c27e573b78a',
  '{"evidence": "Comercial salas e lojas, 16 pavimentos, padrão alto", "familia": "COMERCIAL", "padraoDeAcabamento": "ALTO", "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'RP1Q',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  2382.75, 842.51, 1540.24, 0.00, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  '5b6ee3cc09b0451af4512a29a8f1e5f9cb4ee66a00b0e8bdaecf5f0b745448c2',
  '{"evidence": "Residência popular, 1 quarto", "familia": "RESIDENCIAL", "padraoDeAcabamento": null, "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
),(
  'SINDUSCON_SP_CUB', 'SindusCon-SP', 'SP', 'GI',
  date '2026-07-01', date '2026-08-01', false, 'm²',
  1263.81, 552.51, 711.30, 0.00, null,
  null, null, null,
  'https://sindusconsp.com.br/wp-content/uploads/2026/08/Cub-Serie-Historica-Julho-26.xlsx',
  'ccb4e76eb64e0b3453eeddaf118baa0c1b341d34cb8d5ee9b7fd07182a39ea42',
  '{"evidence": "Galpão industrial", "familia": "ESPECIAL", "padraoDeAcabamento": null, "retrievalMode": "serie-historica-oficial", "arquivoSha256": "671aff2497e5b2bb1a4da21c5060a5df5ab7ce43920d3b4829affd84c0e7566f"}'::jsonb
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
  source_url = excluded.source_url,
  source_sha256 = excluded.source_sha256,
  raw_payload = excluded.raw_payload,
  retrieved_at = now();
