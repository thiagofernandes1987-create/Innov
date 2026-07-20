# Innovar Platform

Plataforma modular da **Innovar Construções e Reformas** para o ciclo completo de clientes, contratos, obras, qualidade, suprimentos, estoque, financeiro e indicadores.

**Versão:** `0.17.0`  
**Estado:** Etapa 17 implementada na `main`, aplicada e homologada tecnicamente no Supabase  
**Produção:** ainda não liberada

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

Evidências da etapa atual:

- [`docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`](./docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md);
- [`docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md`](./docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md).

## Estado consolidado

- orçamentos, propostas, contratos, aditivos e assinatura;
- gestão multiobra, EAP, cronograma, tarefas, equipes e diário;
- módulos plug-and-play e perfis configuráveis;
- PDF/DOCX, campos de assinatura, evidências e entrega;
- qualidade, FVS, FVM, formulários e pesquisas;
- compras e suprimentos;
- financeiro operacional;
- relatórios e indicadores;
- estoque, reservas, ativos e inventário físico;
- documentação canônica recuperável.

## Etapa 17

O estoque utiliza razão imutável:

```text
saldo físico = soma das linhas de movimentos POSTED e originais REVERSED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

A contrapartida `REVERSAL` neutraliza o movimento original. O saldo não é editável diretamente.

Homologação registrada:

- 18 tabelas com RLS;
- seis views `security_invoker`;
- advisory locks por posição de estoque;
- importação idempotente;
- isolamento multiempresa e multiobra;
- 14 testes transacionais aprovados com `ROLLBACK`;
- ledger remoto reconciliado com 18 migrations canônicas.

## Próximas etapas

- Etapa 18 — consolidação de CRM, Clientes e SAC;
- Etapa 19 — auditoria e observabilidade unificadas;
- Etapa 20 — prontidão de produção;
- Etapa 21 — WMS avançado e automação logística.

A Etapa 21 inclui endereçamento automatizado, RFID, ressuprimento automático, roteirização, integração fiscal de entrada e depreciação contábil oficial.

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

Valores secretos nunca são versionados.

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

Teste SQL reproduzível:

```text
supabase/tests/stage17_inventory_homologation.sql
```

Ele deve ser executado somente em desenvolvimento/homologação e termina com `ROLLBACK`.

## Banco

Migrations ficam em `supabase/migrations/` e são aplicadas em ordem lexical. Migration aplicada nunca é reescrita; correções usam novo timestamp.

## Segurança

- Service Role somente no servidor;
- RLS nas tabelas de negócio;
- autorização por módulo, capacidade e escopo;
- buckets sensíveis privados;
- URLs assinadas ou rotas autenticadas;
- MFA AAL2 nas ações configuradas;
- documentos, snapshots e movimentos concluídos imutáveis;
- tokens públicos armazenados somente por hash;
- auditoria, idempotência e locks transacionais.

## Limitações para produção

Permanecem necessários:

- E2E autenticado com contas permanentes de homologação;
- teste concorrente com duas conexões reais;
- proteção contra senhas comprometidas;
- opções adicionais de MFA;
- revisão jurídica, contábil e LGPD;
- pentest, backup/restauração e observabilidade.

## Recuperação

O projeto não depende do histórico da conversa nem de contêiner persistente. Consulte [`diretrizes/RECUPERACAO.md`](./diretrizes/RECUPERACAO.md).
