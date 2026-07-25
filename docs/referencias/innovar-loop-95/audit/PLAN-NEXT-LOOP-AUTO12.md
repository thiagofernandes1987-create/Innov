# Próximo ciclo
1. Executar `scripts/test_postgres_event_transport.py` com PostgreSQL 16 limpo e `TEST_DATABASE_URL`.
2. Executar Redpanda e preservar saída de `rpk cluster health`, produce e consume.
3. Executar Helm, kubeconform e instalação em cluster efêmero.
4. Validar NetworkPolicies contra labels/pods reais.
5. Instalar dependências pinadas do XState e executar o harness.
6. Converter os 123 cenários restantes em bindings rastreáveis, por capability.
7. Executar carga e game day distribuído, preservando RTO/P50/P95/perda/duplicidade/backlog.
