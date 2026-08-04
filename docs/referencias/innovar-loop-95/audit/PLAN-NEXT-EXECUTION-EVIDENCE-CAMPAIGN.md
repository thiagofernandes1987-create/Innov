# Próxima execução
1. Rodar o workflow `executable-spec-integration.yaml` em GitHub Actions.
2. Preservar artifacts dos jobs PostgreSQL, Helm/kubeconform e XState.
3. Acrescentar job Redpanda real com health gate e produce/consume.
4. Acrescentar cluster kind/k3d, instalação Helm e `kubectl --dry-run=server`.
5. Executar validação de selectors de NetworkPolicy contra pods reais.
6. Executar game day distribuído e registrar RTO/P50/P95/perda/duplicidade/backlog.
7. Converter os 122 cenários restantes em bindings executáveis por capability, sem usar heurística como evidência final.
