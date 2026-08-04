# Próximo ciclo priorizado

1. Aplicar migrations 0001–0009 em PostgreSQL limpo e validar rollback.
2. Confirmar disponibilidade de `gen_random_uuid()` ou remover essa dependência.
3. Executar RLS com dois tenants e roles sem `BYPASSRLS`.
4. Integrar `PostgresAdminStore` aos handlers HTTP e executar replay real.
5. Subir Redpanda e validar publish, consume, retry e replay.
6. Executar `helm template`, kubeconform e instalação em cluster efêmero.
7. Realizar game day distribuído e registrar RTO/P95 representativos.
