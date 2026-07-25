# Plano cirúrgico do próximo ciclo

1. Subir PostgreSQL efêmero e aplicar migrations `0001` a `0006` em ordem.
2. Detectar funções sobrecarregadas em `pg_proc` e provar que só a assinatura canônica existe.
3. Executar testes RLS com duas organizações e roles sem `BYPASSRLS`.
4. Implementar API HTTP mínima para create/publish/update com idempotência persistida.
5. Executar concorrência real com duas transações e `expected_version` igual.
6. Renderizar Helm com `helm template` e validar com schema Kubernetes.
7. Converter os sete comportamentos únicos em BDD executável; remover cenários artificiais repetidos.
8. Só recalcular cobertura após as evidências acima.
