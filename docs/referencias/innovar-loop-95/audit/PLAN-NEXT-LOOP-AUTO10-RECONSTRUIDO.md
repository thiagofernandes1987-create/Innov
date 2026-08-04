# Plano do Próximo Ciclo

1. Executar PostgreSQL 16 limpo e aplicar migrations 0001–0009.
2. Executar testes RLS com duas roles NOBYPASSRLS e dois tenants.
3. Executar PostgresAdminStore contra o schema aplicado.
4. Subir Redpanda real e validar produce/consume/replay.
5. Executar helm lint, helm template, kubeconform e dry-run server.
6. Instalar em cluster efêmero e validar selectors de NetworkPolicy.
7. Executar statechart no runtime oficial XState.
8. Converter cenários prioritários de Gherkin em bindings executáveis.
9. Executar game day distribuído com RTO, perda, duplicidade e backlog.
10. Recalcular SCI somente com as novas evidências preservadas.
