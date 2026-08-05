# Inventário canônico — Innovar Platform

**Atualizado em:** 3 de agosto de 2026  
**Base estável:** `main`  
**Commit-base da branch:** `ecf80482`  
**Branch funcional ativa:** `feature/etapa-22-whatsapp-omnichannel`  
**PR funcional:** `#39` — rascunho  
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
- branch atual não está mesclada nem homologada.

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
| `modelos` | Modelos e Documentações | biblioteca única de modelos, lida por todos os aplicativos; tipo classifica, Administração libera por aplicativo | 32 |
| `qualidade` | Qualidade | operacional; antimalware pendente | 13/20 |
| `compras` | Compras e Suprimentos | operacional; antimalware pendente | 14/20 |
| `estoque` | Estoque, Inventário e Almoxarifado | homologado; concorrência real aprovada | 17/20 |
| `financeiro` | Financeiro Operacional | operacional; antimalware pendente | 15/20 |
| `sac` | Pós-venda e SAC | homologado; quarentena integrada na branch da Etapa 20 | 18/20 |
| `whatsapp` | WhatsApp e Atendimento | implementação em branch; não homologado; Cloud API oficial | 22 |
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

Documentos técnicos principais:

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
docs/ETAPA-22-WHATSAPP-OMNICHANNEL.md
docs/ANALISE-REFERENCIAS-WHATSAPP-OPEN-SOURCE-2026-08-03.md
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

### Concorrência homologada

```text
status: passed
cleanup: passed
saldo inicial: 10
duas saídas concorrentes: 6 + 6
postagens aprovadas: 1
postagens rejeitadas: 1
saldo após disputa: 4
saldo após cleanup: 0
```

Pendência: carga e volumetria prolongadas.

## 5. Etapa 18 — CRM, Clientes e SAC

- 10 tabelas com RLS;
- pipeline interno;
- Cliente 360 multiobra;
- SAC interno e portal;
- bucket `crm-sac-attachments` privado;
- anexos com SHA-256;
- estados críticos por RPC;
- zero RPC operacional para `anon`;
- E2E concorrente aprovado;
- `cleanup: passed`.

### Hardening de anexos na Etapa 20

- upload interno e portal passam por `secureUpload` na branch;
- validação de MIME, tamanho, nome e assinatura dos bytes;
- quarentena `file-quarantine` privada;
- ClamAV `INSTREAM` fail-closed;
- promoção somente após `CLEAN`;
- anexos antigos permanecem `LEGACY`;
- portal recebe somente anexos `CLEAN`;
- provider real e E2E de homologação permanecem pendentes.

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
- incorporada à `main`.

## 7. Etapa 20 — Prontidão de Produção

**Estado:** em implementação; produção não liberada.

### Concluído no escopo da branch

- fundação UI/UX e CI;
- concorrência real do estoque;
- backup e restauração lógica em ambiente isolado;
- proteção de anexos do SAC com quarentena e antimalware local;
- health check HMAC do provider de segurança.

### Pendente

- provider ClamAV real e health check em homologação;
- aplicação coordenada das migrations;
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

## 8. Etapa 22 — WhatsApp e Atendimento

**Estado:** implementação inicial no PR de rascunho `#39`; não homologada.

### Arquitetura

```text
modelos/documentos versionados
        ↓
whatsapp_content_bindings
        ↓
resolução no envio
        ↓
snapshot + versão + SHA-256
        ↓
Meta Cloud API
        ↓
webhook HMAC + status + auditoria
```

### Código principal

```text
app/app/whatsapp/page.tsx
app/actions/whatsapp.ts
app/api/webhooks/whatsapp/route.ts
lib/whatsapp/domain.ts
lib/whatsapp/client.ts
lib/whatsapp/source-resolver.ts
lib/whatsapp/server.ts
scripts/validate-stage22.mjs
tests/whatsapp-domain.test.ts
supabase/migrations/20260803190000_stage22_whatsapp_omnichannel.sql
supabase/migrations/20260803191000_stage22_whatsapp_hardening.sql
supabase/migrations/20260803192000_stage22_whatsapp_status_guard.sql
```

### Estado técnico atual

- aplicativo registrado em `lib/modules/registry.ts`;
- sete tabelas com RLS;
- contas, contatos, conversas, mensagens, bindings, status e webhooks;
- mensagens padrão referenciam modelos e documentos existentes;
- texto, template e documento privado;
- janela de 24 horas validada na aplicação e no banco;
- HMAC SHA-256 no webhook;
- idempotência por payload e por envio;
- histórico sem exclusão direta;
- estados de entrega monotônicos em TypeScript e PostgreSQL;
- cliente oficial preparado para verificar número, registrar telefone e assinar WABA;
- nenhum token ou segredo versionado;
- nenhum runtime de `whatsapp-web.js`, Puppeteer ou Baileys.

### Referências avaliadas

- `ArnasDon/wacrm`: principal referência de padrões, licença MIT;
- `evolution-foundation/evolution-api`: referência multiprovider/event-driven, uso direto sujeito a condições adicionais;
- `sebferreira/WhatsControl`: referência visual; código não incorporado;
- `wwebjs/whatsapp-web.js`: não aprovado como canal produtivo.

### Pendências P0

- aplicar migrations em homologação;
- configurar as quatro variáveis do provider;
- verificar número e registrar telefone/WABA;
- sincronizar templates e qualidade;
- integrar mídia recebida à quarentena;
- testar isolamento multiempresa e escopo por obra;
- E2E com número de teste da Meta;
- CI completo verde;
- revisão de UX mobile/desktop;
- política de retenção LGPD.

## 9. Storage privado

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

## 10. Variáveis conhecidas

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
FILE_SECURITY_PROVIDER=
FILE_SECURITY_QUARANTINE_BUCKET=file-quarantine
FILE_SECURITY_SCANNER_URL=
FILE_SECURITY_SCANNER_SECRET=
CLAMAV_HOST=
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=15000
ALLOW_INSECURE_FILE_SCANNER=false
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

Somente nomes, defaults não sensíveis e finalidades são versionados.

## 11. CI

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm validate:stage19
pnpm validate:stage20
pnpm validate:stage22
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

O PR da Etapa 22 permanece em rascunho até todos os gates aplicáveis ficarem verdes.

## 12. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

O Git não recupera secrets, usuários reais, dados operacionais, buckets, DNS, credenciais de providers ou backups físicos.
