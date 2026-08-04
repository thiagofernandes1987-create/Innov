# INNOVAR AUTO12-R2 — Suplemento de auditoria e remediação

## Sumário
1. Escopo
2. Fontes canônicas
3. Alterações executadas
4. Inventário completo
5. Evidência local
6. Limites externos
7. Interpretação de métricas

## 1. Escopo
Este suplemento cobre arquivos de fonte, scripts, testes, features BDD, shell, evidências, documentação, contratos e artefatos de infraestrutura. Ele complementa o consolidado técnico anterior, que cobria apenas extensões selecionadas.

## 2. Fontes canônicas
A identidade da release é definida em `RELEASE-MANIFEST.yaml`. `STATUS.md` é derivado dessa identidade. Relatórios de ciclos anteriores são históricos.

## 3. Alterações executadas
Consulte `remediation/REMEDIATION-REGISTER.yaml`, `remediation/ROUND2-CHANGE-MANIFEST.json` e `remediation/ROUND2-REMEDIATION-REPORT.md`.

## 4. Inventário completo
O inventário hashado da árvore remediada está em `audit/round2/ROUND2-FILE-INVENTORY.json`. Caches e arquivos temporários são proibidos.

## 5. Evidência local
Os resultados são registrados em `audit/round2/ROUND2-VALIDATION-SUMMARY.json`. Um PASS só descreve o nível de execução indicado no próprio controle.

## 6. Limites externos
PostgreSQL, Redpanda, XState oficial com lock verificado, Helm/kubeconform/Kubernetes, OCI e SLO operacional permanecem externos. Consulte `remediation/EXTERNAL-DEPENDENCIES.md`.

## 7. Interpretação de métricas
SCI e EEI globais permanecem `NOT_CALCULATED`. Nenhum percentual global foi criado nesta rodada.
