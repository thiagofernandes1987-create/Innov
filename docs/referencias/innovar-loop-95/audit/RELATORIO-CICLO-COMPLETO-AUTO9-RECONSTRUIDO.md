# Relatório do ciclo completo AUTO9 reconstruído

Data: 2026-07-22
Base recuperada: `INNOVAR_EXECUTABLE_SPEC_EXECUTION_EVIDENCE_CAMPAIGN_2026-07-22.zip`.

## Resultado

- SCI Event Transport: 84,4%.
- SCI global: não calculado.
- Meta de 95%: não atingida.
- Suíte local: 51 testes aprovados.
- Validação agregada: PARTIAL.
- Compatibilidade de eventos: PASS.
- Helm estático: PASS.
- SDK drift: PASS.

## Correções reaplicadas

1. O validador agregado deixou de usar o campo `unbound` de uma única feature como cobertura global.
2. O inventário global registra 10 arquivos, 140 cenários, 18 indícios lexicais de binding e 122 cenários descritivos ou não mapeados.
3. A validação retorna `PARTIAL` quando há cobertura BDD incompleta ou bloqueios externos.
4. O statechart `event-transport` foi registrado no catálogo de migração com política `stop_and_alert`.
5. Foram adicionados dois testes anti-regressão.

## Gaps mantidos abertos

- 122 cenários sem binding executável comprovado.
- 2 cenários bloqueados por PostgreSQL.
- XState oficial não executado neste ambiente.
- migrations 0001–0009 não aplicadas em PostgreSQL real.
- RLS não testada com duas roles NOBYPASSRLS.
- adapter PostgreSQL não executado contra schema real.
- Redpanda real não iniciado.
- helm template, kubeconform e instalação não executados.
- NetworkPolicies não verificadas contra pods reais.
- game day distribuído não realizado.
