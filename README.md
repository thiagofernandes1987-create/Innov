# Innovar Platform

Plataforma modular da **Innovar Construções e Reformas** para CRM, clientes, contratos, obras, qualidade, suprimentos, estoque, financeiro, indicadores, SAC e auditoria.

**Versão:** `0.22.0`  
**Base estável:** `main` — Projeto RH/DP, gateway de mensageria e portões anti-regressão incorporados em 10/08/2026  
**Produção:** ainda não liberada

## Fonte de verdade

Toda informação necessária para recuperar e continuar o projeto está versionada no repositório. Contêiner, máquina local e histórico da conversa não são dependências.

Leitura obrigatória:

0. [`CLAUDE.md`](./CLAUDE.md) e [`diretrizes/LEIA-PRIMEIRO.md`](./diretrizes/LEIA-PRIMEIRO.md) — método de trabalho e mapa de tudo;
1. [`diretrizes/SPEC.md`](./diretrizes/SPEC.md);
2. [`diretrizes/INVENTARIO.md`](./diretrizes/INVENTARIO.md);
3. [`diretrizes/MODULOS.md`](./diretrizes/MODULOS.md);
4. [`diretrizes/ARQUITETURA.md`](./diretrizes/ARQUITETURA.md);
5. [`diretrizes/ROADMAP.md`](./diretrizes/ROADMAP.md);
6. [`diretrizes/RECUPERACAO.md`](./diretrizes/RECUPERACAO.md);
7. [`diretrizes/VACINAS.md`](./diretrizes/VACINAS.md);
8. [`diretrizes/HISTORICO-ETAPAS.md`](./diretrizes/HISTORICO-ETAPAS.md);
9. [`diretrizes/MAPA-TECNOLOGICO.md`](./diretrizes/MAPA-TECNOLOGICO.md) — qual linguagem responde por qual camada, com a medição ao lado de cada afirmação. Normativo: nenhuma linguagem nova entra sem ADR (§37);
10. [`diretrizes/PROVA-POR-SABOTAGEM.md`](./diretrizes/PROVA-POR-SABOTAGEM.md) — portão que nunca foi visto reprovando não foi provado.

Documentos técnicos atuais:

- [`docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`](./docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md);
- [`docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md`](./docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md);
- [`docs/ETAPA-18-CRM-CLIENTES-SAC.md`](./docs/ETAPA-18-CRM-CLIENTES-SAC.md);
- [`docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md`](./docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md);
- [`docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md`](./docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md).

## Estado consolidado

- orçamentos, propostas, contratos, aditivos e assinatura;
- gestão multiobra, EAP, cronograma, tarefas, equipes e diário;
- módulos plug-and-play e perfis configuráveis;
- PDF/DOCX, campos de assinatura, evidências e entrega;
- qualidade, FVS, FVM, formulários e pesquisas;
- compras e suprimentos;
- estoque, reservas, ativos e inventário físico;
- financeiro operacional;
- relatórios e indicadores;
- CRM, Cliente 360 multiobra e SAC;
- WhatsApp e atendimento, com gateway de mensageria isolado;
- Recursos Humanos e Departamento Pessoal — vínculo, jornada, folha, SST e obrigações digitais;
- documentação canônica recuperável.

## Portões anti-regressão

O repositório não depende de o agente ser perfeito; ele é construído para descobrir quando não foi. Além de `lint`, `typecheck`, `test` e `test:python`, **54 validadores** rodam no CI. Dois deles medem população e só permitem que o número caia:

| portão | o que mede |
| --- | --- |
| `pnpm validate:exports-mortos` | export que ninguém importa — o `U1000` do `staticcheck`, sem trocar de linguagem |
| `pnpm validate:assercoes` | teto de asserção fraca; `.not.toContain` sobre a serialização inteira **não** conta, porque é a forma exaustiva |

Débito aceito vive datado e com motivo em `diretrizes/EXPORTS-MORTOS-ACEITOS.json` e `diretrizes/ASSERCOES-FRACAS-ACEITAS.json` — nunca em exceção silenciosa.

Regra que antecede os portões: **portão que nunca foi visto reprovando não foi provado**. Ver [`diretrizes/PROVA-POR-SABOTAGEM.md`](./diretrizes/PROVA-POR-SABOTAGEM.md).

## Etapa 18

A Etapa 18 foi incorporada à `main` e homologada tecnicamente:

- lead → oportunidade → cliente → obra → pós-venda;
- Cliente 360 com múltiplas obras;
- SAC interno e no portal;
- mensagens e anexos internos protegidos;
- SLA, satisfação e eventos append-only;
- bucket privado `crm-sac-attachments`;
- zero RPC operacional para `anon`.

O E2E concorrente do PR `#18` está implementado, mas depende dos cinco secrets do ambiente GitHub `homologation`. Nenhum valor é hardcodado ou solicitado na conversa.

## Etapa 19

A branch `feature/etapa-19-auditoria-observabilidade` implementa e já homologou no Supabase:

- fluxo unificado de 12 origens;
- `correlation_id`, request ID e deduplicação;
- sanitização recursiva de payloads;
- eventos e health checks append-only;
- alertas reconhecíveis e resolvíveis;
- seis health checks;
- diagnósticos estruturados e retenção;
- diagnósticos globais visíveis somente para interno autorizado;
- seis tabelas com RLS;
- 16 FKs e zero FK sem índice;
- seis migrations alinhadas ao ledger remoto;
- zero função da Etapa 19 executável por `anon`.

O PR `#19` permanece em rascunho por estar empilhado sobre o PR `#18`.

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

Valores secretos nunca são versionados.

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

Migrations ficam em `supabase/migrations/`, em ordem lexical. Migration aplicada nunca é reescrita; correção exige novo timestamp. O ledger local é validado contra duplicidade de timestamp, nome lógico e conteúdo SQL.

## Validação

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm validate:stage19
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

Testes SQL reproduzíveis:

```text
supabase/tests/stage17_inventory_homologation.sql
supabase/tests/stage18_relationship_homologation.sql
supabase/tests/stage19_observability_homologation.sql
```

Eles usam dados artificiais e terminam com `ROLLBACK`.

## Segurança

- Service Role somente no servidor;
- RLS em tabelas de negócio;
- autorização por módulo, capacidade e escopo;
- buckets privados e downloads autenticados;
- MFA AAL2 quando configurado;
- tokens públicos armazenados somente por hash;
- documentos, snapshots, eventos e movimentos concluídos imutáveis;
- sanitização de senha, token, authorization e secrets;
- auditoria, idempotência e locks transacionais;
- nenhuma credencial em código ou documentação.

## Próximas etapas

- concluir o E2E concorrente da Etapa 18 após configuração dos secrets;
- estabilizar o PR empilhado da Etapa 19;
- Etapa 20 — prontidão de produção, retenção automatizada, telemetria externa, pentest, backup/restauração e publicação controlada;
- Etapa 21 — WMS avançado e automação logística.

## Recuperação

O projeto não depende do histórico da conversa nem de contêiner persistente. Consulte [`diretrizes/RECUPERACAO.md`](./diretrizes/RECUPERACAO.md) e não considere a reconstrução concluída enquanto documentação, ledger, validadores, lint, tipos, testes e build não estiverem verdes.
