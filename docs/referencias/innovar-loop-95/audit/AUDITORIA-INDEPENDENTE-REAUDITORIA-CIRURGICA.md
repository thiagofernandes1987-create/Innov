# Auditoria independente — reauditoria cirúrgica

Data: 2026-07-22

## Veredito

A cobertura canônica permanece em **59,3%**. A meta de 95% não foi atingida.

A rodada corrigiu falhas estáticas reais, mas não acrescentou execução de infraestrutura ou serviços. Por isso não há base para elevar a nota.

## Achados críticos

### A-01 — sobrecarga de função preservava implementação vulnerável

`0002_functions.sql` criava `reserve_quota(uuid,varchar,bigint,bigint)`. A migration posterior criava uma função com `text`. Isso não garante substituição da função original. A correção remove explicitamente a assinatura `varchar` antes de criar a assinatura canônica `text`.

### A-02 — tabelas de transporte sem isolamento RLS

`domain_events`, `outbox_messages` e `consumer_inbox` carregam `organization_id`, mas não estavam cobertas pelas policies tenant-aware. Foram adicionadas RLS forçada e policies.

### A-03 — banco aceitava estratégia não executável

A API e o evento restringiam `storage_strategy` a `JSONB_HYBRID`, mas o DDL aceitava `PROVISIONED_TABLE`. A nova migration restringe o banco à estratégia executável nesta release.

### A-04 — dupla verdade documental

O blueprint preserva percentuais históricos. Foi adicionada uma seção canônica explícita no início, informando que 59,3% é o único valor vigente. Os números históricos permanecem somente para rastreabilidade.

## Evidências reproduzidas

- 22 testes locais: PASS;
- JSON Schemas: validação Draft 2020-12;
- YAML principal: parsing;
- TypeScript: `tsc --noEmit` com código de saída 0.

## Evidências ausentes

- migrations em PostgreSQL limpo;
- teste de rollback;
- tenant crossing com roles sem BYPASSRLS;
- API HTTP integrada;
- broker, replay e DLQ reais;
- Redis e invalidação;
- Helm renderizado/instalado;
- Terraform;
- BDD com step definitions;
- restore e game day.

## Classificação

Especificação executável parcial. Não pronta para produção e não demonstrada como walking slice integrado.
