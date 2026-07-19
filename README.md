# Innovar Platform

Plataforma digital da **Innovar Construções e Reformas**, empresa de construção civil de alto padrão em Campos do Jordão.

## Etapa atual

Branch: `feature/etapa-09-financeiro-contratos`

A Etapa 9 estabelece a base persistida para:

- orçamentos e versões imutáveis;
- custos diretos, indiretos e fixos;
- taxa administrativa;
- BDI e memória de cálculo;
- markup multiplicador e divisor;
- margem, lucro, capital investido, ROI e payback;
- cenários financeiros;
- validações contra dupla contagem;
- aprovações e alçadas;
- propostas comerciais;
- contratos e versões;
- aditivos;
- envelopes e eventos de assinatura eletrônica;
- versões comerciais liberadas ao portal do cliente;
- auditoria financeira e contratual.

## Stack

- Next.js 16;
- React 19;
- TypeScript;
- Supabase Auth, PostgreSQL e Storage;
- Row Level Security;
- Zod;
- Vitest;
- pnpm.

## Início rápido

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Variáveis mínimas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
SIGNATURE_PROVIDER=sandbox
SIGNATURE_WEBHOOK_SECRET=
```

Aplique a migration em `supabase/migrations` antes de testar persistência.

## Rotas iniciais

```text
/login
/app/orcamentos
/app/orcamentos/[id]
/cliente/orcamentos
```

## Segurança

- nenhuma Service Role é enviada ao navegador;
- dados internos e comerciais são separados;
- cliente não visualiza custos, BDI interno, markup, margem, lucro ou ROI;
- aprovações críticas exigem política de alçada e sessão MFA AAL2;
- documentos comerciais devem permanecer em buckets privados;
- versões aprovadas, enviadas ou assinadas são imutáveis;
- assinatura `sandbox` serve apenas para homologação e não possui validade jurídica externa.

## Contas de homologação

As contas abaixo foram solicitadas para homologação, mas não são criadas automaticamente pelo frontend:

- administrador: `admin@innov.eng.br`;
- cliente: `cliente@cliente.com`.

As senhas devem ser configuradas apenas no ambiente de homologação, por script server-side ou painel do Supabase, e alteradas antes de qualquer publicação.

## Status

Esta branch é uma base de desenvolvimento. Antes de produção, executar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Também são obrigatórios testes reais de RLS, MFA, isolamento entre clientes, geração de PDF, webhooks e assinatura eletrônica.
