# Próximo ciclo após AUTO11

1. Criar binding manifest determinístico para todos os cenários Gherkin e converter o primeiro lote de cenários críticos em steps executáveis.
2. Executar migrations 0001–0012 em PostgreSQL 16 limpo e preservar logs/checksums.
3. Executar suíte RLS com duas roles `NOBYPASSRLS` e dois tenants.
4. Executar adapter PostgreSQL contra o schema real.
5. Executar runtime oficial XState e testes de transição/persistência.
6. Subir Redpanda, validar produção, consumo, deduplicação, retry e DLQ.
7. Rodar Helm, kubeconform e dry-run de API Server.
8. Aplicar NetworkPolicies e provar allow/deny com pods de teste.
9. Realizar game day distribuído com RTO, P50, P95, perda, duplicidade e backlog recovery.
