# Inventário canônico — Innovar Platform

**Atualizado em:** 22 de julho de 2026  
**Base estável:** `main`  
**Commit estável:** `55f4d56`  
**Branch funcional ativa:** `feature/etapa-20-prontidao-producao`  
**PR funcional:** `#23`, empilhado sobre o PR `#22`  
**Versão:** 0.19.0  
**Produção:** não liberada

## 1. Repositório e runtime

- repositório: `thiagofernandes1987-create/Innov`;
- pnpm `11.15.0`;
- Node.js `>=24`;
- Python `3.13` no CI;
- Next.js 16, React 19 e TypeScript;
- Supabase Auth, PostgreSQL, RLS e Storage;
- projeto de homologação: `wyeojufebtwblsubkunr`;
- CI estável da `main`: run `29885340336`, `success`;
- CI atual da Etapa 20: run `29913636056`, `success`.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa |
|---|---|---|---|
| `dashboard` | Início | operacional; fundação visual revisada | 12.1/20 |
| `crm` | CRM e Vendas | implementado e homologado | 18 |
| `clientes` | Clientes | Cliente 360 multiobra implementado | 18 |
| `obras` | Obras | operacional | 12 |
| `planejamento` | Planejamento | operacional | 12 |
| `tarefas` | Tarefas | operacional | 12 |
| `diario` | Diário de Obras | operacional; antimalware pendente | 12/20 |
| `equipes` | Equipes | operacional | 12 |
| `orcamentos` | Orçamentos | operacional | 9 |
| `propostas` | Propostas | operacional | 9 |
| `contratos` | Contratos | operacional | 9 |
| `aditivos` | Aditivos | operacional | 9 |
| `assinaturas` | Assinaturas | sandbox; provider jurídico pendente | 9/12.2/20 |
| `documentos` | Documentos | operacional; antimalware pendente | 12/13/20 |
| `qualidade` | Qualidade | operacional; antimalware pendente | 13/20 |
| `compras` | Compras e Suprimentos | operacional; antimalware pendente | 14/20 |
| `estoque` | Estoque, Inventário e Almoxarifado | homologado; concorrência real aprovada | 17/20 |
| `financeiro` | Financeiro Operacional | operacional; antimalware pendente | 15/20 |
| `sac` | Pós-venda e SAC | homologado; quarentena integrada na branch, homologação pendente | 18/20 |
| `relatorios` | Relatórios e Indicadores | operacional | 16 |
| `auditoria` | Auditoria e Observabilidade | homologado e incorporado | 19 |
| `administracao` | Administração | operacional | 12.1 |

## 3. Documentação canônica

```text
diretrizes/
├── README.md
├── SPEC.md
├── ESTADO-ATUAL.json
├── INVENTARIO.md
├── MODULOS.md
├── ARQUITETURA.md
├── ROADMAP.md
├── RECUPERACAO.md
├── VACINAS.md
├── vacinas/
├── UI-UX-PRO-MAX.md
├── PADRAO-DOCUMENTACAO.md
└── HISTORICO-ETAPAS.md
```

Documentos técnicos atuais:

```text
docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md
docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md
docs/ETAPA-18-CRM-CLIENTES-SAC.md
docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md
docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md
docs/ETAPA-20-PRONTIDAO-PRODUCAO.md
docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md
docs/ETAPA-20-BACKUP-RESTAURACAO.md
docs/ETAPA-20-PROTECAO-ANEXOS.md
docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md
```

## 4. Etapa 17 — Estoque

### Código principal

```text
lib/inventory/domain.ts
lib/inventory/server.ts
app/actions/inventory.ts
app/actions/inventory-extra.ts
app/actions/inventory-stocktake.ts
components/inventory/*
app/app/estoque/**
app/inventory.css
scripts/validate-stage17.mjs
supabase/tests/stage17_inventory_homologation.sql
```

### Estado técnico

- 18 tabelas com RLS;
- seis views `security_invoker=true`;
- saldos físico, reservado e disponível derivados;
- movimentos concluídos imutáveis;
- reversão vinculada;
- advisory locks por posição;
- custos protegidos;
- 14 testes transacionais com `ROLLBACK`;
- migrations alinhadas ao ledger.

### Concorrência de produção homologada na Etapa 20

```text
workflow: 29889168656
status: passed
cleanup: passed
saldo inicial: 10
duas saídas concorrentes: 6 + 6
postagens aprovadas: 1
postagens rejeitadas: 1
saldo após disputa: 4
saldo após cleanup: 0
```

O advisory lock serializou as transações e o banco rejeitou a segunda saída por estoque disponível insuficiente.

### Pendência restante

- carga e volumetria prolongadas.

## 5. Etapa 18 — CRM, Clientes e SAC

- 10 tabelas com RLS;
- pipeline interno;
- Cliente 360 multiobra;
- SAC interno e portal;
- bucket `crm-sac-attachments` privado;
- anexos com SHA-256;
- estados críticos por RPC;
- zero RPC operacional para `anon`;
- E2E concorrente run `29883182240` aprovado;
- `cleanup: passed`;
- PR `#18` mesclado.

### Hardening de anexos na Etapa 20

- migration `20260722104500_stage20_sac_attachment_security.sql` versionada, ainda não aplicada;
- upload interno e portal passam por `secureUpload` na branch;
- validação de MIME, tamanho, nome e assinatura dos bytes;
- quarentena `file-quarantine` privada;
- ClamAV `INSTREAM` fail-closed;
- promoção somente após `CLEAN`;
- RPC exige `scanId`, provider e instante de análise;
- anexos antigos permanecem `LEGACY` sem evidência artificial;
- portal recebe somente anexos `CLEAN`;
- download assinado por 60 segundos e sem cache;
- E2E local ClamAV run `29913636268` aprovado;
- artefato `8526935275`;
- provider real e E2E de homologação pendentes.

## 6. Etapa 19 — Auditoria e Observabilidade

- seis tabelas com RLS;
- 13 políticas e seis gatilhos não internos;
- 16 FKs e zero sem índice líder;
- fluxo unificado de 12 origens;
- sanitização e idempotência;
- alertas e seis health checks;
- diagnósticos globais protegidos;
- zero função acessível por `anon`;
- teste com `ROLLBACK`;
- CI verde;
- PRs `#19` e `#20` mesclados.

Migrations:

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
```

## 7. Etapa 20 — Prontidão de Produção

**Estado:** em implementação.

### Fundação UI/UX e CI concluída

```text
diretrizes/UI-UX-PRO-MAX.md
docs/ETAPA-20-PRONTIDAO-PRODUCAO.md
scripts/validate-stage20.mjs
app/globals.css
app/stage20.css
app/app/layout.tsx
app/app/page.tsx
.github/workflows/ci.yml
```

- identidade `Arquitetura em operação`;
- azul profundo, cobre e materiais naturais;
- link de salto, foco visível e alvos de 44px;
- dashboard responsivo sem métricas inventadas;
- forced colors e redução de movimento;
- prevenção contra rosa/fúcsia;
- CI completo run `29913636056` verde.

### Concorrência real concluída

```text
scripts/run-stage20-inventory-concurrency-e2e.mjs
.github/workflows/stage20-inventory-concurrency-e2e.yml
docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md
```

- duas sessões independentes;
- uma postagem e uma rejeição;
- saldo não negativo;
- cleanup com saldo zero;
- artefato `8517620520`;
- `VACINA-013` criada.

### Backup e restauração concluídos no escopo lógico

- run `29911179764` aprovado;
- artefato `8526039714`;
- dump custom de `1.812.078` bytes e `2.798` objetos;
- RTO observado de `201` segundos;
- snapshots equivalentes e smoke tests aprovados;
- dump efêmero removido;
- retenção durável, PITR, buckets e Auth permanecem pendentes.

### Proteção de anexos integrada na branch

```text
lib/file-security/domain.ts
lib/file-security/server.ts
components/file-security/file-security-status.tsx
scripts/run-stage20-file-security-e2e.mjs
.github/workflows/stage20-file-security-e2e.yml
.github/workflows/stage20-file-security-provider-health.yml
supabase/migrations/20260722104500_stage20_sac_attachment_security.sql
```

- SAC integrado à quarentena;
- assinatura dos bytes além do MIME;
- estados `LEGACY` e `CLEAN` persistidos;
- UI com estados semânticos e ação `Analisar e enviar`;
- fixture limpa liberada e EICAR bloqueado;
- E2E run `29913636268` e artefato `8526935275` aprovados;
- migration e provider real ainda não ativados em homologação.

### Próxima frente

`attachment_provider_homologation`.

### Escopo pendente

- provider ClamAV real e health check;
- aplicação coordenada da migration e da aplicação;
- E2E real do SAC e reanálise de legados;
- antimalware nos demais módulos;
- retenção durável, PITR, buckets e Auth;
- provider jurídico;
- telemetria e retenção;
- incidentes;
- proteção contra senhas comprometidas;
- MFA adicional;
- carga prolongada;
- pentest;
- revisão jurídica, contábil e LGPD;
- publicação controlada.

## 8. Storage privado

```text
commercial-documents
contract-documents
project-documents
daily-log-media
signature-artifacts
quality-documents
quality-form-attachments
procurement-attachments
finance-attachments
crm-sac-attachments
file-quarantine
```

`file-quarantine` deve permanecer privado. Objetos `PENDING`, `SCANNING`, `BLOCKED` ou `ERROR` nunca recebem URL funcional para o usuário.

## 9. Variáveis conhecidas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
SIGNATURE_PROVIDER=
SIGNATURE_WEBHOOK_SECRET=
SIGNATURE_EMAIL_WEBHOOK_URL=
DEMO_ADMIN_PASSWORD=
DEMO_CLIENT_PASSWORD=
SUPABASE_DB_URL=
SUPABASE_RESTORE_DB_URL=
SUPABASE_RESTORE_CONFIRMATION=
FILE_SECURITY_PROVIDER=clamav
FILE_SECURITY_QUARANTINE_BUCKET=file-quarantine
CLAMAV_HOST=
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=15000
ALLOW_INSECURE_FILE_SCANNER=false
```

Somente nomes e finalidades são versionados.

## 10. CI

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm validate:stage19
pnpm validate:stage20
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
pnpm test:e2e:stage20:file-security
```

## 11. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

O Git não recupera secrets, usuários reais, dados operacionais, buckets, DNS, credenciais de providers ou backups físicos.
