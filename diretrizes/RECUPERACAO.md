# Recuperação completa a partir do repositório

Este procedimento reconstrói a Innovar Platform após perda de contêiner, máquina local, ambiente de desenvolvimento ou histórico de conversa.

## 1. Princípio

O GitHub é a fonte canônica. Não reconstruir por memória, conversa, ZIP antigo ou arquivo temporário quando o repositório estiver disponível.

O Git recupera código, migrations, testes, vacinas, documentação e workflows. Segredos, dados reais, conteúdo de buckets, usuários Auth, DNS e backups permanecem externos.

## 2. Estado canônico atual

Antes de executar qualquer comando, ler `diretrizes/ESTADO-ATUAL.json`.

Estado registrado em 22 de julho de 2026:

- base estável: `main`;
- versão: `0.19.0`;
- última etapa concluída: 19;
- próxima etapa: 20;
- PRs `#18`, `#19` e `#20` mesclados;
- E2E concorrente da Etapa 18: `passed`;
- CI estável: `success`;
- produção: ainda não liberada.

## 3. Clonar e identificar o estado

```bash
git clone https://github.com/thiagofernandes1987-create/Innov.git
cd Innov
git checkout main
git pull --ff-only
git rev-parse HEAD
```

Comparar o SHA recuperado com o manifesto. Branch de etapa somente deve ser usada quando estiver registrada como ativa e possuir PR correspondente.

## 4. Ler antes de executar

1. `diretrizes/SPEC.md`;
2. `diretrizes/ESTADO-ATUAL.json`;
3. `diretrizes/INVENTARIO.md`;
4. `diretrizes/MODULOS.md`;
5. `diretrizes/ARQUITETURA.md`;
6. `diretrizes/ROADMAP.md`;
7. `diretrizes/VACINAS.md`;
8. `diretrizes/UI-UX-PRO-MAX.md`, quando existir na branch da Etapa 20;
9. `diretrizes/HISTORICO-ETAPAS.md`;
10. documentos técnicos atuais em `docs/`.

## 5. Pré-requisitos

- Git;
- Node.js 24 ou superior;
- Corepack e `pnpm@11.15.0`;
- Python 3.13;
- Supabase CLI quando necessário;
- acesso ao projeto Supabase correto;
- acesso ao cofre de secrets;
- LibreOffice headless para conversão DOCX;
- acesso à hospedagem e aos provedores externos.

## 6. Dependências

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile --reporter=append-only
```

A política transitória deve ser igual no CI e na homologação até a revisão formal do lockfile na Etapa 20.

## 7. Ambiente

```bash
cp .env.example .env.local
```

Configurar por cofre, nunca por documentação ou commit:

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

Regras:

- `.env.local` não é versionado;
- Service Role somente no servidor;
- segredo não aparece em PR, issue, log ou conversa;
- segredo exposto é rotacionado antes da continuidade;
- conta de homologação não reutiliza senha de produção.

## 8. Reconstruir o banco

As migrations vivem exclusivamente em:

```text
supabase/migrations/
```

Aplicar em ordem lexical:

```bash
supabase link --project-ref <PROJECT_REF>
pnpm validate:migrations
supabase db push
```

Regras inegociáveis:

- migration aplicada nunca é editada;
- correção exige novo timestamp;
- não reaplicar manualmente migration registrada;
- comparar arquivos locais com `supabase_migrations.schema_migrations`;
- não criar nome lógico duplicado ou SQL duplicado com timestamp diferente;
- backup obrigatório antes de alteração destrutiva.

## 9. Confirmar a Etapa 17 — Estoque

- 18 tabelas com RLS;
- seis views `security_invoker` sem leitura direta;
- saldo derivado e movimentos imutáveis;
- advisory lock por posição;
- custos mascarados;
- isolamento multiempresa e multiobra;
- teste `supabase/tests/stage17_inventory_homologation.sql` com `ROLLBACK`.

Pendências produtivas permanecem na Etapa 20: concorrência real com múltiplas conexões, carga, backup e restauração.

## 10. Confirmar a Etapa 18 — CRM, Clientes e SAC

- 10 tabelas novas com RLS;
- pipeline comercial interno;
- Cliente 360 multiobra;
- SAC interno e portal;
- mensagens e anexos internos ocultos do cliente;
- bucket privado `crm-sac-attachments`;
- zero RPC operacional para `anon`;
- FKs indexadas;
- teste SQL com `ROLLBACK`;
- workflow `.github/workflows/stage18-concurrent-e2e.yml`.

Evidência funcional consolidada:

```text
run: 29883182240
status: passed
cleanup: passed
```

O cleanup preserva históricos append-only e registra `immutable_history` sem falhar por uma restrição legítima.

## 11. Confirmar a Etapa 19 — Auditoria e Observabilidade

Seis migrations alinhadas ao ledger remoto:

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
```

Confirmar:

- seis tabelas com RLS;
- 13 políticas e seis gatilhos não internos;
- fluxo unificado de 12 origens;
- sanitização recursiva;
- zero função da Etapa 19 executável por `anon`;
- diagnósticos globais somente para membro interno autorizado;
- 16 FKs e zero FK sem índice líder;
- seis health checks;
- alertas `OPEN → ACKNOWLEDGED → RESOLVED`;
- eventos append-only;
- teste `supabase/tests/stage19_observability_homologation.sql` com `ROLLBACK`.

## 12. Buckets privados

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
```

A Etapa 19 não cria bucket nem armazena arquivo bruto de log.

## 13. Workers

```bash
pnpm worker:signature-conversion
pnpm worker:signature-delivery
```

Rotinas técnicas podem usar Service Role somente no servidor. Rotinas de expiração e retenção exigem execução server-side autorizada.

## 14. Validar a reconstrução

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage9
pnpm validate:stage12
pnpm validate:stage12.1
pnpm validate:stage12.2
pnpm validate:stage13
pnpm validate:stage14
pnpm validate:stage15
pnpm validate:stage16
pnpm validate:stage17
pnpm validate:stage18
pnpm validate:stage19
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

A recuperação não está concluída enquanto algum comando falhar.

## 15. Smoke tests

### Interno

- login e perfil correto;
- módulos exibidos conforme acesso;
- operações comerciais e SAC;
- estoque, financeiro e relatórios;
- painel de auditoria;
- alerta reconhecido e resolvido;
- health snapshot;
- diagnóstico global visível somente a interno autorizado.

### Cliente

- somente cadastro, obras liberadas e chamados próprios;
- mensagem e anexo interno ausentes;
- ausência dos módulos internos;
- ausência de custos e diagnósticos globais.

### Segurança

- organização diferente não lê dados;
- RPC anônima é negada;
- Service Role não aparece no bundle;
- bucket privado não possui URL pública;
- estado protegido não muda por escrita direta;
- payload de auditoria não contém senha ou token;
- migrations e ledger estão alinhados.

## 16. Advisors

Executar advisors de segurança e performance após DDL.

Não criar policy permissiva apenas para silenciar aviso nem remover índice por `unused` em banco vazio. Classificar funções `SECURITY DEFINER`, FKs sem índice, `auth_rls_initplan`, policies sobrepostas, função anônima, proteção de senhas e MFA.

Dívidas globais antigas pertencem à Etapa 20.

## 17. Estado que o Git não recupera

- valores de secrets;
- conteúdo dos buckets;
- dados operacionais reais;
- usuários reais do Auth;
- DNS;
- credenciais de providers;
- backups físicos;
- configuração externa de telemetria.

Esses itens exigem cofre e backup externos.

## 18. Checklist final de recuperação

- [ ] código clonado da fonte oficial;
- [ ] `ESTADO-ATUAL.json` conferido;
- [ ] branch e PR ativos identificados;
- [ ] diretrizes lidas;
- [ ] dependências instaladas;
- [ ] secrets configurados por cofre;
- [ ] migrations e ledger alinhados;
- [ ] RLS, privilégios e índices confirmados;
- [ ] buckets privados confirmados;
- [ ] testes SQL com `ROLLBACK` aprovados;
- [ ] E2E autenticado confirmado;
- [ ] advisors revisados;
- [ ] `pnpm validate:docs` aprovado;
- [ ] `pnpm validate:vaccines` aprovado;
- [ ] validadores estruturais aprovados;
- [ ] lint, typecheck, testes e build verdes;
- [ ] backup/restauração testados antes de produção;
- [ ] documentação compatível com o commit implantado.
