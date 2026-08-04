# Relatório do ciclo — restauração do objetivo e métricas anti-regressão

**Data:** 2026-07-22  
**Fonte:** pacote `INNOVAR_EXECUTABLE_SPEC_REAUDITORIA_CIRURGICA_2026-07-22.zip`

## Decisão

O blueprint volta a ser medido como uma especificação técnica executável, e não somente como arquitetura conceitual nem somente como implementação implantada.

Foram separados três indicadores:

1. **SCI:** completude da especificação por capability e faceta;
2. **EEI:** evidência de execução reproduzível;
3. **RQI:** sinais objetivos de regressão entre versões.

## Estado mensurável

- SCI: `NOT_CALCULATED`. Não foi atribuído percentual sem inventário item a item.
- EEI: 59,3% preservado apenas como baseline histórico da régua anterior.
- Fonte canônica: uma.
- Valores vigentes conflitantes encontrados: zero.
- Testes locais: 22 aprovados, zero falhas.
- TypeScript: compilação aprovada.
- Gherkin: 136 cenários descritivos; não tratados como executados.
- Blueprint atualizado: sim.
- ZIP atualizado: sim.

## Artefatos adicionados

- `00-decisions/METRICS-AND-ANTI-REGRESSION.yaml`
- `00-decisions/DELIVERY-AND-CANONICAL-SOURCE.md`
- `traceability/COVERAGE-BASELINE.yaml`
- `scripts/measure_spec.py`
- `audit/METRICS-SNAPSHOT.json`

## Critério de regressão

Uma versão regride quando remove ou enfraquece uma diretriz técnica ou sua evidência sem ADR e substituição equivalente, quando aumenta falhas/referências quebradas, quando introduz mais de uma fonte canônica ou quando reduz a rastreabilidade.

## Próximo passo

Inventariar as capabilities canônicas e preencher a matriz capability × 18 facetas. Somente então calcular o primeiro SCI defensável e versionado.
