# Inventário canônico — Innovar Platform

**Atualizado em:** 04 de agosto de 2026  
**Base estável:** `main`  
**Versão estável:** 0.19.0  
**Última etapa incorporada:** 19  
**Próxima etapa oficial:** 20 — Prontidão de Produção  
**Produção:** não liberada

## 1. Repositório e runtimes

- repositório: `thiagofernandes1987-create/Innov`;
- Node.js `>=24`;
- pnpm `11.15.0`;
- Python `3.13` no CI;
- Next.js 16, React 19 e TypeScript;
- Supabase Auth, PostgreSQL, RLS e Storage privado;
- monólito modular web e workers especializados;
- gateway de mensagens em `apps/messaging-gateway`;
- branch experimental da Etapa 22: `feature/etapa-22-provider-whatsapp-web-baileys`;
- PR `#40`: draft, aberto, não mesclado e pendente de revisão.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado |
|---|---|---|
| `dashboard` | Início | operacional; fundação visual revisada |
| `crm` | CRM e Vendas | implementado e homologado na Etapa 18 |
| `clientes` | Clientes | Cliente 360 multiobra implementado |
| `obras` | Obras | operacional |
| `planejamento` | Planejamento | operacional |
| `tarefas` | Tarefas | operacional |
| `diario` | Diário de Obras | operacional; hardening produtivo ainda depende da Etapa 20 |
| `equipes` | Equipes | operacional |
| `orcamentos` | Orçamentos | operacional |
| `propostas` | Propostas | operacional |
| `contratos` | Contratos | operacional |
| `aditivos` | Aditivos | operacional |
| `assinaturas` | Assinaturas | sandbox; provider jurídico pendente |
| `documentos` | Documentos | operacional; expansão de antimalware pendente |
| `qualidade` | Qualidade | operacional; expansão de antimalware pendente |
| `compras` | Compras e Suprimentos | operacional |
| `estoque` | Estoque, Inventário e Almoxarifado | homologado tecnicamente; carga prolongada pendente |
| `financeiro` | Financeiro Operacional | operacional |
| `sac` | Pós-venda e SAC | homologado; proteção de anexos em evolução na Etapa 20 |
| `whatsapp` | WhatsApp e Atendimento | Meta Cloud preservado; arquitetura multiprovider experimental no PR `#40`; produção não autorizada |
| `relatorios` | Relatórios e Indicadores | operacional |
| `auditoria` | Auditoria e Observabilidade | homologado e incorporado na Etapa 19 |
| `administracao` | Administração | operacional |

## 3. Documentação canônica

```text
diretrizes/
├── SPEC.md
├── ESTADO-ATUAL.json
├── INVENTARIO.md
├── MODULOS.md
├── ARQUITETURA.md
├── ROADMAP.md
├── RECUPERACAO.md
├── VACINAS.md
└── vacinas/
```

Documentos da Etapa 22:

```text
docs/ETAPA-22-WHATSAPP-OMNICHANNEL.md
docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/
├── INVENTARIO.md
├── EVIDENCIAS-W01.md ... EVIDENCIAS-W22.md
├── ENCERRAMENTO-W22.md
├── DECISAO-PRODUCAO-W22.md
├── MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md
└── runbooks e contratos técnicos
```

## 4. Etapas estáveis

### Etapa 17 — Estoque

- 18 tabelas com RLS;
- saldos físico, reservado e disponível derivados;
- movimentos concluídos imutáveis;
- advisory locks por posição;
- recebimento de Compras idempotente;
- 14 testes transacionais com `ROLLBACK`;
- concorrência real aprovada na Etapa 20;
- backup e restauração lógica testados.

### Etapa 18 — CRM, Clientes e SAC

- pipeline comercial interno;
- Cliente 360 multiobra;
- SAC interno e portal;
- mensagens internas ocultas do cliente;
- anexos privados e SHA-256;
- estados críticos por RPC;
- E2E concorrente autenticado e cleanup aprovados.

### Etapa 19 — Auditoria e observabilidade

- fluxo unificado sem duplicar trilhas de domínio;
- sanitização e idempotência;
- `correlation_id`;
- alertas, health checks e diagnósticos;
- retenção configurável;
- acesso sensível restrito;
- incorporada à `main`.

## 5. Etapa 20 — Prontidão de Produção

**Estado:** em andamento no manifesto estável.  
**Produção:** bloqueada.

Concluído parcialmente: fundação UI/UX, concorrência de estoque, backup/restauração lógica e proteção local de anexos do SAC.

Pendente: provider real de segurança, Auth/MFA, telemetria externa, retenção completa, incidentes, antimalware nos demais módulos, provider jurídico, pentest, revisão jurídica/LGPD, carga prolongada e publicação controlada.

## 6. Etapa 21 — WMS avançado

Planejada após a conclusão da Etapa 20: endereçamento automatizado, RFID em tempo real, ressuprimento automático governado, roteirização logística, integração fiscal de entrada e depreciação contábil oficial.

## 7. Etapa 22 — WhatsApp multiprovider

### 7.1 Estado do provider oficial

Meta Cloud permanece preservado e é o único runtime WhatsApp implementado no monólito. A arquitetura original de contas, contatos, conversas, mensagens, bindings, webhooks e fontes canônicas continua válida.

### 7.2 Provider experimental

- provider: `WHATSAPP_WEB_BAILEYS`;
- pacote: `@whiskeysockets/baileys@7.0.0-rc13`;
- localização: workspace `apps/messaging-gateway`;
- adapter confinado;
- bootstrap produtivo: não registrado;
- runtime padrão: `FakeChannelClient`;
- conexão externa: não executada;
- QR/pairing: `BLOCKED_NOT_EXECUTED`;
- sessão real: `BLOCKED_NOT_EXECUTED`;
- número autorizado: `BLOCKED_NOT_EXECUTED`.

### 7.3 Capacidades técnicas comprovadas

- contratos provider-neutral e capability matrix;
- gateway isolado com HMAC, replay guard e container endurecido;
- session store cifrado, lease, single writer e fencing sintéticos;
- ingress persist-before-dispatch;
- outbox, retry, circuit breaker, rate limit, DLQ e reconciliação;
- PN/LID, mídia segura e inbox multiprovider;
- playbooks canônicos e reprodução histórica;
- IA `DRAFT_ONLY`, handoff persistente e plugins governados;
- threat model, scanner de segredos, SBOM e incidentes;
- métricas, traces, alertas, dashboard e runbooks;
- chaos e performance sintéticos.

### 7.4 Sprints W-19 a W-22

| Sprint | Estado técnico | Limite real |
|---|---|---|
| W-19 | chaos, integração e benchmarks sintéticos aprovados | E2E com número, QR e pairing `BLOCKED_NOT_EXECUTED` |
| W-20 | controles de homologação fail-closed aprovados | homologação real `BLOCKED_NOT_EXECUTED` |
| W-21 | SLOs, abort criteria, flags e rollback aprovados | piloto real em `HOLD` e `NOT_EXECUTED` |
| W-22 | reconciliação canônica e decisão final | PR permanece draft até revisão |

### 7.5 Decisão

- piloto: `HOLD`;
- produção: `NOT_AUTHORIZED`;
- revisão jurídica/SBOM: pendente;
- KMS/HSM: pendente;
- PR `#40`: draft, aberto, não mesclado.

## 8. Variáveis conhecidas

Somente nomes e defaults não sensíveis são versionados:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
GATEWAY_HMAC_SECRET=
```

## 9. CI

Gates mínimos:

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage22
node scripts/run-messaging-loop-gates.mjs
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build:messaging-gateway
pnpm test:container:messaging-gateway
pnpm build
```

## 10. Recuperação e limites

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

Git não recupera secrets, usuários Auth, dados reais, buckets, DNS, KMS/HSM, credenciais de provider, sessão real, número autorizado ou backups físicos. Esses itens exigem cofre, backup e autorização externos.
