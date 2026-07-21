# Recuperação completa a partir do repositório

Este procedimento reconstrói a Innovar Platform após perda de contêiner, máquina, ambiente local ou histórico de conversa.

## 1. Princípio

O GitHub é a fonte canônica. Não reconstruir a partir de memória, conversa, ZIP antigo ou arquivo temporário quando o repositório estiver disponível.

O Git recupera código, migrations, testes, vacinas, documentação e workflows. Segredos, dados reais, conteúdo de buckets, usuários Auth, DNS e backups permanecem externos.

## 2. Pré-requisitos

- Git;
- Node.js 24 ou superior;
- Corepack e `pnpm@11.15.0`;
- Python 3.13;
- acesso ao projeto Supabase correto;
- acesso ao cofre de secrets;
- LibreOffice headless para conversão DOCX;
- acesso ao provedor de hospedagem.

## 3. Clonar

```bash
git clone https://github.com/thiagofernandes1987-create/Innov.git
cd Innov
git checkout main
git pull --ff-only
```

Para recuperar trabalho ainda não incorporado, consultar `diretrizes/INVENTARIO.md` e os PRs em rascunho antes de mudar de branch.

Estado documentado em 21 de julho de 2026:

```text
PR #18 → test/etapa-18-e2e-concorrente-supabase
PR #19 → feature/etapa-19-auditoria-observabilidade
```

O PR #19 está empilhado sobre o PR #18. Nenhum merge deve ser presumido.

## 4. Ordem de leitura

1. `diretrizes/SPEC.md`;
2. `diretrizes/INVENTARIO.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/ARQUITETURA.md`;
5. `diretrizes/ROADMAP.md`;
6. `diretrizes/VACINAS.md`;
7. `diretrizes/HISTORICO-ETAPAS.md`;
8. `docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md`;
9. `docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md`.

## 5. Instalar dependências

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile --reporter=append-only
```

A política transitória de instalação está documentada na VACINA-008. Não alternar somente um workflow para `--frozen-lockfile`.

## 6. Configurar ambiente

```bash
cp .env.example .env.local
```

Configurar por cofre:

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
- não colar credencial em PR, issue, log ou documentação;
- segredo exposto precisa ser rotacionado;
- exemplos documentais usam placeholders explícitos.

## 7. Ambiente GitHub `homologation`

O E2E autenticado e concorrente exige estes secrets no ambiente protegido:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
DEMO_ADMIN_PASSWORD
DEMO_CLIENT_PASSWORD
```

O conector não cria esses secrets. Enquanto estiverem ausentes, o workflow deve falhar antes da instalação e gerar relatório JSON com `blocked_missing_secrets`, sem valores sensíveis.

## 8. Reconstruir o banco

As migrations ficam em:

```text
supabase/migrations/
```

Aplicar em ordem lexical com o mecanismo oficial:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Regras:

- não editar migration aplicada;
- não reaplicar manualmente migration registrada;
- correção usa novo timestamp;
- conferir backup antes de alteração destrutiva;
- ledger remoto precisa corresponder aos arquivos locais;
- executar `pnpm validate:migrations` antes do push.

## 9. Migrations essenciais recentes

### Etapa 17 — Estoque

A lista completa está em `diretrizes/INVENTARIO.md`. A implementação de ativos/inventários está dividida em `_01` a `_04`; a migration monolítica antiga não existe.

### Etapa 18 — CRM, Clientes e SAC

```text
20260721012434_stage18_relationship_schema.sql
20260721012505_stage18_relationship_idempotency.sql
20260721012701_stage18_relationship_security.sql
20260721013434_stage18_relationship_invariants.sql
20260721013534_stage18_crm_functions.sql
20260721013547_stage18_sac_client_actors.sql
20260721013654_stage18_sac_functions.sql
20260721013941_stage18_relationship_queries.sql
20260721014030_stage18_relationship_module.sql
20260721014621_stage18_relationship_performance.sql
20260721015350_stage18_sac_portal_release_guard.sql
20260721020003_stage18_workflow_privilege_hardening.sql
```

### Etapa 19 — Auditoria e Observabilidade

```text
20260721093000_stage19_observability_schema.sql
20260721093100_stage19_observability_security.sql
20260721093200_stage19_observability_functions.sql
20260721093300_stage19_observability_unified_stream.sql
20260721093400_stage19_observability_module_performance.sql
```

## 10. Verificar o banco

Confirmar:

- RLS habilitada nas tabelas de negócio;
- módulos instalados por organização;
- RPCs operacionais sem acesso `anon`;
- funções `SECURITY DEFINER` com `search_path` e autorização interna;
- FKs com índice líder;
- buckets privados;
- dados sensíveis sem leitura ampla;
- ledger remoto alinhado.

Etapa 19:

- cinco tabelas `observability_*`;
- `audit_events` com módulo, severidade, origem, ator, request, deduplicação, hashes e retenção;
- módulo `auditoria` habilitado;
- acesso padrão somente para Super Administrador, Direção e Administrador;
- cliente sem acesso;
- eventos e health checks append-only;
- `sanitize_audit_json` redigindo chaves sensíveis;
- `get_observability_events` normalizando 12 origens.

## 11. Testes SQL reproduzíveis

Executar somente em desenvolvimento ou homologação:

```text
supabase/tests/stage17_inventory_homologation.sql
supabase/tests/stage18_relationship_homologation.sql
supabase/tests/stage19_observability_homologation.sql
```

Todos criam dados artificiais e terminam com `ROLLBACK`. Nunca remover o `ROLLBACK` dos arquivos canônicos.

## 12. Provisionar homologação

```bash
pnpm provision:homologation
```

Contas conhecidas:

```text
admin@innov.eng.br
cliente@cliente.com
```

Senhas ficam somente em secrets. O provisionamento é idempotente e restrito à homologação.

## 13. Workers

```bash
pnpm worker:signature-conversion
pnpm worker:signature-delivery
```

Workers podem usar Service Role somente no servidor e precisam registrar falhas sem expor payload sensível.

## 14. Validar código e documentação

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

### Administrador

- login e MFA conforme configuração;
- aplicativos exibidos conforme perfil;
- CRM, Cliente 360, SAC, estoque e relatórios;
- `/app/auditoria` visível somente quando autorizado;
- fluxo de eventos filtrável;
- alerta reconhecido e resolvido com motivo;
- snapshot de saúde registrado;
- configuração de regra e retenção protegida.

### Cliente

- somente dados próprios;
- somente obras e documentos liberados;
- nenhuma mensagem ou anexo interno;
- ausência do aplicativo de auditoria;
- pipeline comercial oculto.

### Segurança

- acesso direto sem capacidade negado;
- organização diferente não lê dados;
- estado crítico não muda por update direto;
- eventos append-only não são alterados;
- payload sensível aparece como `[REDACTED]`;
- bucket privado sem URL pública;
- Service Role não aparece no bundle.

## 16. Advisors

Executar advisors de segurança e performance após DDL.

Revisar:

- FKs sem índice;
- RLS com avaliação repetida;
- múltiplas políticas permissivas;
- funções `SECURITY DEFINER`;
- privilégios herdados por `PUBLIC` ou `anon`;
- proteção contra senhas comprometidas;
- métodos adicionais de MFA.

Não remover índice apenas porque ambiente vazio informa `unused index`. Registrar achados reproduzíveis em `observability_diagnostics` quando a Etapa 19 estiver aplicada.

## 17. Restaurar hospedagem

1. conectar o repositório oficial;
2. usar `main` em produção;
3. configurar variáveis por cofre;
4. executar `pnpm build`;
5. validar domínio e HTTPS;
6. executar smoke tests autenticados.

## 18. Estado não recuperado pelo Git

- valores de secrets;
- conteúdo de buckets;
- dados reais do banco;
- usuários reais do Auth;
- DNS;
- credenciais de providers;
- backups físicos.

Esses itens exigem cofre e backup externos.

## 19. Checklist final de recuperação

- [ ] código clonado da fonte oficial;
- [ ] branch/PR correto identificado;
- [ ] documentação canônica lida;
- [ ] dependências instaladas;
- [ ] secrets configurados;
- [ ] migrations e ledger alinhados;
- [ ] RLS e privilégios confirmados;
- [ ] buckets privados confirmados;
- [ ] testes SQL com `ROLLBACK` aprovados;
- [ ] E2E autenticado executado;
- [ ] concorrência real executada;
- [ ] advisors revisados;
- [ ] vacinas validadas;
- [ ] CI verde;
- [ ] backup/restauração verificados antes da produção.
