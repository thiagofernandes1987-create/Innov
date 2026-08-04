# Relatório — Reconstrução AUTO5

## Proveniência

Base utilizada: `INNOVAR_EXECUTABLE_SPEC_EVENT_TRANSPORT_AUTO4_2026-07-22.zip`.

As alterações AUTO5 foram reaplicadas porque o pacote anterior expirou. Nenhuma evidência antiga foi aceita sem nova execução local.

## Alterações reaplicadas

1. Hardening SQL de outbox e inbox.
2. Runtime administrativo PostgreSQL para DLQ e replay.
3. Escopo obrigatório `events.admin` nos handlers HTTP.
4. Adapter PostgreSQL de referência.
5. Hardening de segurança, probes e encerramento no Deployment Helm.
6. NetworkPolicy de egress documentada.
7. Seis testes anti-regressão.

## Defeito encontrado durante a reconstrução

Após exigir `events.admin`, os step definitions e o game day falharam com HTTP 401 porque ainda não enviavam o escopo. Os dois clientes foram corrigidos e reexecutados.

## Evidências

- suíte principal: 41/41;
- BDD executável: 4/4;
- compatibilidade de eventos: PASS;
- Helm estático: PASS;
- TypeScript: PASS;
- game day local: PASS, RTO observado registrado no JSON de auditoria.

## Cobertura

SCI Event Transport: 84,4%. A plataforma inteira não foi calculada.

## Gaps abertos

- migrations não aplicadas em PostgreSQL real;
- RLS não exercitada com roles reais;
- adapter PostgreSQL não integrado ao servidor em ambiente real;
- Redpanda não iniciado;
- `helm template`, kubeconform e instalação não executados;
- NetworkPolicies dependem das labels do ambiente;
- game day distribuído pendente.
