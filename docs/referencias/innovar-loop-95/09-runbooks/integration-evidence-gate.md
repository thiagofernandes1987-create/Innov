# Gate de evidência integrada

## Regra fail-closed
Código 77 significa **BLOCKED**, nunca PASS. A cobertura não pode subir por existência de script, workflow ou manifesto.

## PostgreSQL
1. Provisionar PostgreSQL limpo suportado.
2. Definir `TEST_DATABASE_URL` para role proprietária temporária.
3. Executar `python scripts/test_postgres_event_transport.py`.
4. Aceitar somente saída `POSTGRES_EVENT_TRANSPORT: PASS`.
5. Preservar versão do servidor, logs e hash das migrations.

O gate aplica `0001–0009`, RLS, executa `gen_random_uuid()`, confirma UUID v4, cria duas roles `NOBYPASSRLS`, verifica RLS, exercita claims concorrentes e chama o adapter PostgreSQL.

## Redpanda
1. Iniciar `05-infra/docker/docker-compose.event-transport.yml`.
2. Aguardar `rpk cluster health --exit-when-healthy`.
3. Criar tópico versionado, publicar envelope, consumir e confirmar offset.
4. Derrubar o broker, acumular outbox, restaurar e executar replay.
5. Registrar perda, duplicação de efeito, RTO e P95.

## Helm e Kubernetes
1. `helm lint 05-infra/helm`.
2. `helm template innovar 05-infra/helm --namespace innovar > rendered.yaml`.
3. `kubeconform -strict -summary -kubernetes-version 1.31.0 rendered.yaml`.
4. Validar targets: `scripts/validate_networkpolicy_targets.sh`.
5. Instalar em namespace efêmero e executar `kubectl rollout status`.
6. Usar `kubectl --dry-run=server` para cobrir validações não feitas pelo kubeconform.

## Evidência mínima
- comandos completos;
- versões das ferramentas;
- timestamps UTC;
- stdout/stderr;
- exit codes;
- SHA-256 do pacote e das migrations;
- resultado distinguindo PASS, FAIL e BLOCKED.
