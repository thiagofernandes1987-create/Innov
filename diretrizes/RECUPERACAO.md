# Recuperação completa a partir do repositório

> ## Estado conhecido
>
> O replay integral de migrations continua um gate obrigatório e deve falhar fechado quando o conjunto local não reconstruir um PostgreSQL limpo. Não tratar documentação, ledger parcial ou CI estrutural como substituto de `pnpm test:db:replay`.

Este procedimento reconstrói a Innovar Platform após perda de contêiner, máquina local, ambiente de desenvolvimento ou histórico de conversa.

## 1. Princípio

O GitHub é a fonte canônica. Não reconstruir por memória, conversa, ZIP antigo ou arquivo temporário quando o repositório estiver disponível.

O Git recupera código, migrations, testes, vacinas, documentação e workflows. Não recupera secrets, dados reais, usuários Auth, buckets, DNS, KMS/HSM, credenciais de provider, número autorizado, sessão real ou backups físicos.

## 2. Estado canônico

Antes de executar qualquer comando, ler `diretrizes/ESTADO-ATUAL.json`.

Estado estável:

- base: `main`;
- versão: `0.19.0`;
- última etapa incorporada: 19;
- próxima etapa oficial: 20;
- produção: não liberada.

Execução paralela da Etapa 22:

- branch `feature/etapa-22-provider-whatsapp-web-baileys`;
- PR `#40`, draft e não mesclado;
- escopo técnico/documental fechado;
- piloto `HOLD`;
- produção `NOT_AUTHORIZED`.

## 3. Clonar e identificar o estado

```bash
git clone https://github.com/thiagofernandes1987-create/Innov.git
cd Innov
git checkout main
git pull --ff-only
git rev-parse HEAD
```

Para revisar a Etapa 22, trocar explicitamente para a branch registrada no manifesto. Não implantar uma branch experimental por engano.

## 4. Ler antes de executar

1. `diretrizes/SPEC.md`;
2. `diretrizes/ESTADO-ATUAL.json`;
3. `diretrizes/INVENTARIO.md`;
4. `diretrizes/MODULOS.md`;
5. `diretrizes/ARQUITETURA.md`;
6. `diretrizes/ROADMAP.md`;
7. `diretrizes/VACINAS.md`;
8. `docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/ENCERRAMENTO-W22.md`;
9. `docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/DECISAO-PRODUCAO-W22.md`.

## 5. Pré-requisitos

- Git;
- Node.js 24;
- Corepack e `pnpm@11.15.0`;
- Python 3.13;
- PostgreSQL compatível;
- Supabase CLI quando necessário;
- Docker para smoke e testes isolados;
- acesso ao projeto correto e ao cofre de secrets;
- LibreOffice headless para conversão DOCX;
- acesso autorizado aos providers externos, quando aplicável.

## 6. Dependências

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile --ignore-scripts --reporter=append-only
pnpm validate:messaging-lockfile
```

O Baileys deve resolver exatamente `7.0.0-rc13` no workspace `apps/messaging-gateway`. Lifecycle scripts permanecem bloqueados.

## 7. Ambiente

```bash
cp .env.example .env.local
```

Configurar valores apenas por cofre. Regras:

- `.env.local` não é versionado;
- Service Role somente no servidor;
- segredo não aparece em PR, issue, log ou conversa;
- segredo exposto é rotacionado;
- ambiente experimental não reutiliza credenciais produtivas;
- gateway deve falhar fechado sem HMAC válido.

## 8. Reconstruir o banco

As migrations vivem exclusivamente em:

```text
supabase/migrations/
```

Aplicar em ordem lexical:

```bash
supabase link --project-ref <PROJECT_REF>
pnpm validate:migrations
pnpm test:db:replay
supabase db push
```

Regras:

- migration aplicada nunca é editada;
- correção exige novo timestamp;
- comparar arquivos com `supabase_migrations.schema_migrations`;
- replay em banco limpo precisa passar;
- backup obrigatório antes de DDL destrutivo;
- funções privilegiadas usam `search_path` explícito e privilégio mínimo.

## 9. Confirmar os domínios estáveis

### Estoque

- saldos derivados;
- movimentos imutáveis;
- advisory locks;
- teste com `ROLLBACK`;
- concorrência e backup/restauração conforme evidências da Etapa 20.

### CRM, Clientes e SAC

- Cliente 360 multiobra;
- mensagens internas invisíveis ao cliente;
- anexos privados;
- estados por RPC;
- E2E concorrente e cleanup aprovados.

### Auditoria

- fluxo unificado;
- sanitização;
- idempotência;
- alertas e health checks;
- diagnósticos e retenção;
- nenhuma RPC operacional para `anon`.

## 10. Recuperar a Etapa 22

### 10.1 Build e gates

```bash
pnpm validate:stage22
pnpm validate:messaging-boundaries
pnpm validate:messaging-storage
pnpm validate:messaging-gateway
pnpm validate:messaging-session-store
pnpm validate:messaging-runtime
pnpm validate:messaging-ingress
pnpm validate:messaging-outbox
node scripts/run-messaging-loop-gates.mjs
node scripts/validate-messaging-w22-closure.mjs
pnpm test
pnpm lint
pnpm typecheck
pnpm build:messaging-gateway
pnpm test:container:messaging-gateway
pnpm build
```

### 10.2 Gateway

O `messaging-gateway` deve iniciar com:

- usuário non-root;
- filesystem read-only;
- limites de recursos;
- HMAC e replay guard;
- health/readiness/metrics;
- `FakeChannelClient` por padrão;
- nenhuma rede externa no smoke test.

Não registrar o adapter Baileys no bootstrap durante recuperação. O código reconstruído não recupera sessão real, QR, pairing, número ou autorização operacional.

### 10.3 Credenciais e sessão

O repositório recupera somente contratos, migrations e testes do session store. Material real depende de KMS/HSM, banco autorizado e backup externo.

Se houver suspeita de comprometimento:

1. manter feature flag desligada;
2. revogar lease;
3. bloquear workers;
4. executar purge auditado das credenciais;
5. rotacionar chaves externas;
6. registrar incidente;
7. não tentar reaproveitar sessão suspeita.

### 10.4 Restore sintético

Reexecutar testes de lease, fencing, key update, restart e restore em infraestrutura isolada. Resultado sintético não é evidência de recuperação de uma sessão WhatsApp real.

## 11. Storage privado

Buckets permanecem privados. Objetos `PENDING`, `SCANNING`, `BLOCKED` ou `ERROR` nunca recebem URL funcional. Confirmar quarentena, antivírus, MIME real, SHA-256 e expiração de URLs assinadas.

## 12. Workers

```bash
pnpm worker:signature-conversion
pnpm worker:signature-delivery
```

Workers de mensagens só podem ser ativados por decisão operacional posterior e com feature flags, leases, rate limits e runbooks aprovados.

## 13. Validar a reconstrução

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm validate:stage19
pnpm validate:stage20
pnpm validate:stage22
node scripts/run-messaging-loop-gates.mjs
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

A recuperação não está concluída enquanto algum comando falhar.

## 14. Smoke tests

### Interno

- login, organização e perfil corretos;
- módulos conforme acesso;
- operações comerciais, SAC, estoque e auditoria;
- gateway saudável com cliente fake;
- inbox sintética sem vazamento de conteúdo;
- alertas reconhecidos e resolvidos.

### Cliente

- somente cadastro, obras liberadas e chamados próprios;
- conteúdo interno ausente;
- custos, diagnósticos e ferramentas internas ausentes.

### Segurança

- cross-tenant negado;
- RPC anônima negada;
- Service Role ausente do bundle;
- bucket sem URL pública;
- segredo e conteúdo de mensagem ausentes de logs;
- HMAC inválido negado;
- replay negado;
- Baileys não registrado no runtime;
- produção permanece `NOT_AUTHORIZED`.

## 15. Estado que o Git não recupera

- secrets e chaves KMS/HSM;
- dados operacionais reais;
- usuários Auth;
- conteúdo de buckets;
- DNS e configuração externa;
- credenciais de providers;
- sessão, QR, pairing ou número real;
- autorizações jurídicas e operacionais;
- backups físicos e PITR;
- evidência de homologação ou piloto real.

## 16. Checklist final de recuperação

- [ ] código clonado da fonte oficial;
- [ ] `ESTADO-ATUAL.json` conferido;
- [ ] branch e PR identificados;
- [ ] diretrizes lidas;
- [ ] dependências instaladas sem lifecycle scripts;
- [ ] secrets configurados por cofre;
- [ ] migrations, ledger e replay alinhados;
- [ ] RLS, privilégios e índices confirmados;
- [ ] buckets privados confirmados;
- [ ] testes SQL aprovados;
- [ ] `pnpm validate:docs` aprovado;
- [ ] `pnpm validate:vaccines` aprovado;
- [ ] gates W-22 aprovados;
- [ ] lint, typecheck, testes e builds verdes;
- [ ] purge de sessão ensaiado em fixture;
- [ ] decisão de produção conferida como `NOT_AUTHORIZED`;
- [ ] documentação compatível com o commit revisado.
