# Próximo ciclo
1. Executar o job PostgreSQL em banco limpo e corrigir qualquer drift real das migrations.
2. Completar assertions de isolamento inserindo fixtures de dois tenants e usando `SET ROLE` nas roles `NOBYPASSRLS`.
3. Iniciar Redpanda real, criar tópico, publicar e consumir pelo protocolo Kafka, não apenas REST controlado.
4. Executar `helm lint`, `helm template` e kubeconform estrito.
5. Instalar em cluster efêmero, validar labels reais e executar `kubectl --dry-run=server`.
6. Executar game day distribuído, medir RTO, P50/P95 e backlog recovery.
7. Somente após evidências integradas recalcular SCI/EEI.
