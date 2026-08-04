# Runbook — Object Definitions

## Sintomas
- aumento de `VERSION_CONFLICT`;
- falha de publicação por schema;
- eventos de transição presos no outbox;
- divergência entre estado da definição e último evento publicado.

## Diagnóstico
1. Correlacionar por `request_id`, tenant e `object_key`.
2. Consultar definição, versão atual, transições e outbox no mesmo tenant.
3. Verificar ETag recebido e `expected_version`.
4. Validar schema contra Draft 2020-12.
5. Confirmar se o evento foi persistido antes de qualquer reprocessamento.

## Ações seguras
- conflito otimista: reler estado e repetir com novo ETag;
- evento pendente: reprocessar outbox de forma idempotente;
- schema inválido: retornar para DRAFT com `reason_code`;
- breaking change: bloquear publicação até aprovação explícita.

## Proibições
- não editar versão `PUBLISHED` diretamente;
- não desabilitar trigger de imutabilidade;
- não executar consultas sem contexto de tenant;
- não publicar evento manual sem vínculo com a transação original.

## Rollback
Rollback funcional ocorre por nova versão ou transição válida. Rollback de migration deve preservar histórico e exige backup verificado. Esta versão não contém procedimento de restore medido; gap permanece aberto.
