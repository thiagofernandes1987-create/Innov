# Innovar Platform

Plataforma modular da **Innovar Construções e Reformas** para o ciclo completo de clientes, contratos, obras, qualidade, suprimentos, estoque, financeiro e indicadores.

## Fonte de verdade

Toda especificação necessária para recuperar e continuar o projeto está versionada em [`diretrizes/`](./diretrizes/README.md).

Leitura obrigatória:

1. [`diretrizes/SPEC.md`](./diretrizes/SPEC.md);
2. [`diretrizes/INVENTARIO.md`](./diretrizes/INVENTARIO.md);
3. [`diretrizes/MODULOS.md`](./diretrizes/MODULOS.md);
4. [`diretrizes/ARQUITETURA.md`](./diretrizes/ARQUITETURA.md);
5. [`diretrizes/ROADMAP.md`](./diretrizes/ROADMAP.md);
6. [`diretrizes/RECUPERACAO.md`](./diretrizes/RECUPERACAO.md);
7. [`diretrizes/HISTORICO-ETAPAS.md`](./diretrizes/HISTORICO-ETAPAS.md).

Documentos em `docs/` preservam histórico técnico e planejamento aprovado.

## Estado atual

**Versão da branch da etapa:** `0.17.0`

Consolidado na `main` até a Etapa 16:

- orçamentos, propostas, contratos, aditivos e assinatura;
- homologação com Supabase Auth/MFA;
- gestão multiobra, EAP, cronograma, tarefas, equipes e diário;
- núcleo modular plug-and-play e perfis configuráveis;
- assinatura avançada de PDF/DOCX;
- qualidade, FVS, FVM, formulários e pesquisas;
- compras e suprimentos;
- financeiro operacional;
- relatórios e indicadores executivos;
- documentação canônica e recuperável.

Em execução:

- **Etapa 17 — Estoque, Inventário e Almoxarifado**;
- branch `feature/etapa-17-estoque-inventario-almoxarifado`;
- PR `#14`, rascunho, sem merge;
- CI e homologação ainda obrigatórios.

Fila posterior:

- Etapa 18 — CRM, Clientes e SAC;
- Etapa 19 — Auditoria e observabilidade;
- Etapa 20 — Prontidão de produção;
- Etapa 21 — WMS avançado e automação logística, fiscal e patrimonial.

Plano da Etapa 21:

- [`docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`](./docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md).

## Stack

- Next.js 16;
- React 19;
- TypeScript;
- Supabase Auth, PostgreSQL e Storage;
- Row Level Security;
- Zod;
- Vitest;
- Python para o motor auxiliar de Qualidade;
- pnpm 11.15.0.

## Início rápido

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Variáveis conhecidas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
SIGNATURE_PROVIDER=sandbox
SIGNATURE_WEBHOOK_SECRET=
SIGNATURE_EMAIL_WEBHOOK_URL=
DEMO_ADMIN_PASSWORD=
DEMO_CLIENT_PASSWORD=
```

Valores secretos nunca são versionados.

## Banco

Migrations reproduzíveis ficam em:

```text
supabase/migrations/
```

Aplique em ordem lexical. Não edite migration já aplicada; crie nova migration corretiva.

## Validação

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

O CI também executa validadores estruturais das Etapas 9, 12, 12.1, 12.2, 13, 14, 15 e 16.

## Segurança

- Service Role somente no servidor;
- RLS nas tabelas de negócio;
- autorização por módulo, capacidade e escopo;
- buckets sensíveis privados;
- URLs assinadas ou rotas autenticadas;
- MFA AAL2 em ações críticas;
- documentos, snapshots e movimentos concluídos imutáveis;
- tokens públicos armazenados somente por hash;
- auditoria e idempotência nos fluxos críticos;
- saldos derivados e não editáveis diretamente.

## Homologação

Contas conhecidas:

- `admin@innov.eng.br`;
- `cliente@cliente.com`.

Senhas são configuradas somente por secret e precisam ser rotacionadas antes de publicação.

## Recuperação

O projeto não depende do histórico de conversa ou de contêiner persistente. O procedimento completo está em [`diretrizes/RECUPERACAO.md`](./diretrizes/RECUPERACAO.md).
