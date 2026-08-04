# Expand-contract

## Expand

```sql
ALTER TABLE metadata.records ADD COLUMN search_text text NULL;
CREATE INDEX CONCURRENTLY metadata_records_search_text_trgm
ON metadata.records USING gin (search_text gin_trgm_ops);
```

## Backfill

Lotes de 1000, checkpoint por `(organization_id,id)`:

```sql
UPDATE metadata.records
SET search_text = values::text
WHERE organization_id = $1
  AND id > $2
  AND search_text IS NULL
ORDER BY id
LIMIT 1000;
```

A implementação deve usar seleção de IDs em CTE, pois PostgreSQL não aceita `LIMIT` diretamente em `UPDATE`.

## Verify

```sql
SELECT count(*) FROM metadata.records WHERE search_text IS NULL;
```

## Cutover

Nova aplicação passa a ler `search_text` quando cobertura for 100% e divergência zero.

## Contract

Remover leitura legada somente após duas versões compatíveis. Remoção de coluna exige migration posterior e janela de rollback encerrada.
