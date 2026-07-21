# VACINA-003 — Ledger local de migrations alinhado ao Supabase

## Sintoma

CI, `db push` ou recuperação falha mesmo quando o schema remoto parece correto. O Git contém SQL duplicado com timestamps diferentes dos registrados em `supabase_migrations.schema_migrations`.

## Causa raiz

Uma migration foi aplicada pelo conector com versão gerada diferente do nome local, ou o mesmo conteúdo permaneceu em mais de um arquivo. O banco e o repositório passaram a descrever históricos diferentes.

## Vacina

- consultar o ledger remoto imediatamente após cada aplicação;
- renomear no Git para a versão exata registrada, sem alterar o SQL;
- nunca manter duas versões do mesmo nome lógico ou conteúdo;
- nunca reescrever migration aplicada;
- correção posterior usa novo timestamp;
- executar `scripts/validate-supabase-migrations.mjs` antes dos validadores de etapa.

## Aplicação transversal

Aplicada nas Etapas 17 e 18. A reconciliação removeu versões locais duplicadas e alinhou os arquivos às versões remotas reais.

## Teste preventivo

`pnpm validate:migrations` bloqueia:

- timestamp duplicado;
- nome lógico duplicado;
- conteúdo SQL duplicado;
- migration canônica ausente;
- reintrodução de versões locais obsoletas.

## Critério de encerramento

O conjunto de arquivos locais e o ledger remoto representam a mesma sequência append-only, e uma reconstrução limpa não tenta reaplicar DDL já registrado.
