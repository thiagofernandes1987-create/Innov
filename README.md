# Innovar Platform

Plataforma modular da **Innovar Construções e Reformas** para clientes, contratos, obras, qualidade, suprimentos, estoque, financeiro, indicadores e pós-venda.

## Fonte de verdade

Toda informação necessária para recuperar e continuar o projeto está versionada no repositório. O contêiner e o histórico de conversa não são dependências.

Leitura obrigatória:

1. [`diretrizes/SPEC.md`](./diretrizes/SPEC.md);
2. [`diretrizes/INVENTARIO.md`](./diretrizes/INVENTARIO.md);
3. [`diretrizes/MODULOS.md`](./diretrizes/MODULOS.md);
4. [`diretrizes/ARQUITETURA.md`](./diretrizes/ARQUITETURA.md);
5. [`diretrizes/ROADMAP.md`](./diretrizes/ROADMAP.md);
6. [`diretrizes/RECUPERACAO.md`](./diretrizes/RECUPERACAO.md);
7. [`diretrizes/HISTORICO-ETAPAS.md`](./diretrizes/HISTORICO-ETAPAS.md).

Os documentos em `docs/` preservam histórico técnico, homologações e planejamento aprovado.

## Estado atual

**Versão:** `0.17.0`

Consolidado na `main`:

- comercial, orçamento, propostas, contratos, aditivos e assinatura;
- gestão multiobra, planejamento, tarefas, equipes, diário e portal;
- núcleo modular plug-and-play e administração de acessos;
- documentos, Qualidade, FVS, FVM, formulários e pesquisas;
- Compras e Suprimentos;
- Financeiro Operacional;
- Relatórios e Indicadores Executivos;
- Estoque, Inventário e Almoxarifado — Etapa 17, código incorporado pelo PR `#14`.

Follow-up em revisão:

- branch `fix/etapa-17-homologacao-pos-merge`;
- PR `#15`;
- migrations corretivas, locks de concorrência, índices, privilégios, testes e documentação da homologação da Etapa 17;
- Supabase de homologação validado com testes transacionais revertidos;
- merge do PR depende de aprovação explícita.

Fila oficial:

- Etapa 18 — CRM, Clientes e SAC;
- Etapa 19 — Auditoria e observabilidade;
- Etapa 20 — Prontidão de produção;
- Etapa 21 — WMS avançado e automação logística, fiscal e patrimonial.

## Stack

- Next.js 16 e React 19;
- TypeScript estrito;
- Supabase Auth, PostgreSQL, RLS e Storage privado;
- Zod e Vitest;
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

Variáveis conhecidas, sem valores versionados:

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
```

## Banco

Migrations reproduzíveis ficam em `supabase/migrations/` e são aplicadas em ordem lexical. Migration aplicada nunca é editada; correção exige novo arquivo.

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

O CI também executa os validadores das Etapas 9, 12, 12.1, 12.2, 13, 14, 15 e 16.

## Segurança

- Service Role somente no servidor;
- RLS em tabelas de negócio;
- autorização por módulo, capacidade e escopo;
- buckets privados e downloads autenticados;
- MFA AAL2 em ações críticas;
- tokens públicos persistidos apenas por hash;
- saldos derivados, idempotência e imutabilidade;
- custos de estoque mascarados no PostgreSQL;
- movimentos de estoque serializados por advisory lock transacional.

## Recuperação

O procedimento integral está em [`diretrizes/RECUPERACAO.md`](./diretrizes/RECUPERACAO.md). A reconstrução não está concluída enquanto `pnpm validate:docs`, validadores estruturais, lint, TypeScript, testes e build não estiverem verdes.
