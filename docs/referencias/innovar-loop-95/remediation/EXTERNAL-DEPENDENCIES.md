# Plano detalhado de validações e decisões externas — INNOVAR AUTO12-R2

## Sumário
1. Regra de encerramento
2. PostgreSQL e RLS
3. Redpanda/Kafka
4. Dependências npm e XState
5. GitHub Actions e proteção
6. OCI, SBOM, assinatura e provenance
7. Helm e Kubernetes
8. Terraform/OpenTofu
9. Observabilidade, carga e game day
10. Governança jurídica e organizacional
11. Cadeia de custódia

## 1. Regra de encerramento
Nenhum item desta seção pode mudar para PASS por edição documental. Cada execução deve registrar: hash do pacote, commit, comando, versões, ambiente, timestamps, exit code, saída integral, artefatos gerados, responsável e SHA-256 das evidências.

## 2. PostgreSQL e RLS
**Achados:** AUD-SQL-001 e AUD-SQL-002.  
**Pré-requisitos:** PostgreSQL 16 descartável; credencial administrativa apenas para bootstrap; duas roles de aplicação `NOBYPASSRLS`; Python e psycopg na versão aprovada.  
**Comando-base:** `TEST_DATABASE_URL=postgresql://... python scripts/test_postgres_event_transport.py`.  
**Critérios:** migrations 0001–0013; colunas finais `organization_id`; policies com `app.current_organization_id`; tenant A não acessa B; ausência de contexto falha fechado; roles sem BYPASSRLS; claims concorrentes sem duplicidade; adapter real executado.  
**Evidências:** saída integral, `SELECT version()`, roles, policies, schema dump sanitizado, resultado de concorrência e hashes.  
**Rollback:** banco e roles exclusivos do teste devem ser removidos. Produção não deve ser usada.

## 3. Redpanda/Kafka
**Achado:** AUD-EVT-002.  
**Pré-requisitos:** broker autorizado, `rpk` ou cliente equivalente, credenciais, TLS/SASL quando aplicável e tópicos correspondentes aos sete addresses AsyncAPI.  
**Procedimento:** validar schemas; produzir e consumir cada tipo; propagar correlation/causation/organization IDs; testar duplicidade, retry, ordenação, DLQ e replay.  
**Critérios:** nenhum efeito duplicado; nenhuma perda; mensagens inválidas rejeitadas; replay auditável; offsets e consumer groups registrados.  
**Evidências:** versões, configuração sanitizada, offsets, payloads sanitizados, logs e hashes.

## 4. Dependências npm e XState
**Achados:** AUD-STATE-002, AUD-SDK-001 e AUD-LOCK-001.  
**Pré-requisitos:** acesso a registry confiável ou cache corporativo; revisão das dependências diretas e transitivas.  
**Comandos:** gerar `package-lock.json` nos diretórios `06-sdk/typescript` e `tools/xstate-runtime`; revisar integridade; executar `npm ci --ignore-scripts --no-audit --no-fund`; depois `npm test`/`npm run build`. Gerar lock Python com hashes a partir de fonte aprovada.  
**Critérios:** instalação limpa não altera locks; XState oficial passa; SDK compila e testa; scanners não detectam vulnerabilidade acima da política sem exceção aprovada.

## 5. GitHub Actions e proteção
**Achado:** AUD-CI-001.  
**Pré-requisitos:** repositório GitHub autorizado e permissões administrativas.  
**Procedimento:** publicar branch; executar workflow; configurar required checks, proteção contra force-push, review obrigatório, CODEOWNERS, ambientes protegidos e OIDC.  
**Critérios:** jobs locais e PostgreSQL/Helm executam; token padrão é somente leitura; nenhum secret em PR não confiável; branches protegidas impedem merge com gate falho.  
**Evidências:** URLs/IDs da execução, configuração exportada, logs, commit e attestations.

## 6. OCI, SBOM, assinatura e provenance
**Achado:** AUD-SUP-001.  
**Pré-requisitos:** registry OCI, identidade OIDC ou chave gerenciada e imagens construídas.  
**Procedimento:** construir; obter digest; substituir tags por `repository@sha256:<digest>`; gerar SPDX/CycloneDX; assinar e atestar; verificar antes do deploy.  
**Critérios:** todos os validadores de imagem passam; assinatura e provenance apontam ao mesmo digest e commit; exceções têm owner e expiração.

## 7. Helm e Kubernetes
**Achado:** AUD-INF-001.  
**Pré-requisitos:** Helm, kubeconform, kubectl e cluster efêmero.  
**Comandos:** `helm lint`; `helm template`; `kubeconform -strict`; instalação em namespace isolado.  
**Critérios:** schemas válidos; selectors coerentes; probes saudáveis; SecurityContext; PDB/HPA; default deny; tráfego permitido e negado comprovados; uninstall limpo.  
**Evidências:** rendered manifest, versões, eventos, smoke tests, NetworkPolicy tests e hashes.

## 8. Terraform/OpenTofu
**Achado:** AUD-INF-002.  
**Decisões necessárias:** provedor, regiões, managed/self-hosted, rede, IAM, KMS, DNS, state backend, HA/DR e orçamento.  
**Só depois:** aprovar ADR e criar módulos reais; executar `tofu fmt`, `validate`, `plan` e policy checks. Um scaffold genérico não fecha o achado.

## 9. Observabilidade, carga e game day
**Achado:** AUD-OBS-001.  
**Pré-requisitos:** serviços implantados, tráfego representativo e backend de métricas/traces/logs.  
**Procedimento:** definir SLIs calculáveis; executar carga; induzir falhas; medir backlog, p50/p95/p99, taxa de erro, RTO/RPO e recuperação.  
**Critérios:** janela, população e fórmulas registradas; resultados repetíveis; nenhum RTO local em processo tratado como produtivo.

## 10. Governança jurídica e organizacional
Os documentos de inventário, retenção e DSAR foram criados, mas exigem validação de base legal, controlador/operador, owners, prazos e processo real. A aprovação jurídica não é inferida pelo pacote.

## 11. Cadeia de custódia
Cada evidência externa deve usar `schemas/evidence-record.schema.json`, registrar `execution_level` realmente atingido e manter o nível requerido separadamente quando bloqueada. Evidência sem hash, ambiente, comando e resultado não fecha achado.
