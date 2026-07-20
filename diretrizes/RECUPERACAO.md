# Recuperação completa a partir do repositório

Este procedimento reconstrói a Innovar Platform após perda de contêiner, máquina, ambiente local ou histórico de conversa.

## 1. Princípio

O GitHub é a fonte canônica. Não reconstruir a partir de memória, conversa ou ZIP antigo quando o repositório estiver disponível.

## 2. Pré-requisitos

- Git;
- Node.js 24 ou superior;
- Corepack e pnpm 11.15.0;
- Python 3.13;
- acesso ao Supabase correto;
- secrets em cofre externo;
- LibreOffice headless para conversão DOCX;
- acesso ao provider de hospedagem.

## 3. Clonar

```bash
git clone https://github.com/thiagofernandes1987-create/Innov.git
cd Innov
git checkout main
git pull --ff-only
```

Para revisar correções ainda não mescladas, consulte `diretrizes/INVENTARIO.md` antes de mudar de branch.

## 4. Ler antes de executar

1. `diretrizes/SPEC.md`;
2. `diretrizes/INVENTARIO.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/ARQUITETURA.md`;
5. `diretrizes/ROADMAP.md`;
6. `docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`;
7. `docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md`.

## 5. Instalar dependências

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile
```

## 6. Configurar ambiente

```bash
cp .env.example .env.local
```

Preencher por cofre seguro:

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
- segredo exposto precisa ser rotacionado.

## 7. Reconstruir o banco

As migrations ficam em:

```text
supabase/migrations/
```

Aplicar em ordem lexical com o mecanismo oficial do ambiente, por exemplo:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Regras:

- não editar migration aplicada;
- não reaplicar manualmente migration registrada;
- correção usa novo timestamp;
- conferir backup antes de alteração destrutiva;
- ledger remoto precisa corresponder aos arquivos locais.

## 8. Migrations da Etapa 17

O estado canônico possui 18 migrations:

- 16 arquivos de `20260720160000` a `20260720160740`;
- `20260720233052_stage17_inventory_concurrency_locks.sql`;
- `20260720233657_stage17_homologation_balance_project_scope.sql`.

### Histórico de recuperação

Durante a interrupção, as 16 migrations originais haviam sido aplicadas em 28 blocos remotos. O ledger foi reconciliado sem desfazer ou reaplicar DDL:

- versões fracionadas removidas somente do histórico;
- 16 versões canônicas registradas;
- migrations de concorrência e correção mantidas com os números remotos reais.

Em novo ambiente vazio, executar normalmente os 18 arquivos. Em ambiente já homologado, não repetir o reparo de ledger.

## 9. Verificações da Etapa 17

Confirmar:

- 18 tabelas de inventário;
- RLS nas 18;
- seis views `security_invoker`;
- módulo `estoque` 1.0.0;
- oito unidades e seis categorias por organização;
- depósito `ALM-GERAL` e localização `PADRAO`;
- advisory lock por posição;
- view de saldo considerando `POSTED` e originais `REVERSED`;
- trigger de isolamento por obra;
- custos mascarados;
- RPCs sem acesso `anon`.

## 10. Teste transacional reproduzível

Arquivo:

```text
supabase/tests/stage17_inventory_homologation.sql
```

Executar somente em desenvolvimento/homologação. O script cria dados efêmeros e termina com `ROLLBACK`.

Ele valida 14 regras, incluindo saldo, idempotência, imutabilidade, reversão, transferência e isolamento multiempresa/multiobra.

Nunca remover o `ROLLBACK` do arquivo canônico.

## 11. Buckets privados

Conferir os buckets criados pelas etapas históricas:

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
```

A Etapa 17 não adiciona bucket novo.

## 12. Provisionar homologação

Contas permanentes só devem ser criadas por processo protegido:

```bash
pnpm provision:homologation
```

As senhas vêm de `DEMO_ADMIN_PASSWORD` e `DEMO_CLIENT_PASSWORD`. Não registrar valores.

Durante a recuperação da Etapa 17, o Supabase estava sem usuários permanentes; por isso o E2E autenticado pós-Etapa 17 permanece pendente.

## 13. Workers

### Conversão DOCX

```bash
pnpm worker:signature-conversion
```

### Entrega de assinatura

```bash
pnpm worker:signature-delivery
```

Rotinas server-side podem usar Service Role; navegador não.

## 14. Validar código e documentação

```bash
pnpm validate:docs
pnpm validate:stage9
pnpm validate:stage12
pnpm validate:stage12.1
pnpm validate:stage12.2
pnpm validate:stage13
pnpm validate:stage14
pnpm validate:stage15
pnpm validate:stage16
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

A recuperação não está concluída enquanto algum comando falhar.

## 15. Smoke tests manuais

### Administrador

- login e MFA conforme configuração;
- módulos exibidos conforme perfil;
- acesso ao estoque;
- criação de item e entrada;
- reserva, consumo e reversão;
- inventário físico;
- consulta de custos quando autorizado.

### Cliente

- somente dados próprios;
- ausência de custos internos;
- somente documentos e formulários liberados.

### Segurança

- acesso direto sem capacidade negado;
- organização diferente não lê dados;
- depósito exclusivo não cruza obra;
- movimento concluído não é alterado;
- saldo não é editado diretamente;
- bucket privado não possui URL pública;
- Service Role não aparece no bundle.

## 16. Advisors

Executar advisors de segurança e performance após DDL.

Não remover índices somente porque o ambiente vazio informa “unused index”. Não criar política permissiva apenas para eliminar aviso de tabela interna sem policy.

Antes de produção, revisar:

- FKs sem índice;
- políticas RLS com avaliação repetida;
- múltiplas políticas permissivas;
- RPCs `SECURITY DEFINER` e suas checagens internas;
- proteção contra senhas comprometidas;
- métodos adicionais de MFA.

## 17. Restaurar hospedagem

1. conectar o repositório oficial;
2. usar `main` em produção;
3. configurar variáveis por cofre;
4. executar `pnpm build`;
5. validar domínio e HTTPS;
6. executar smoke tests autenticados.

## 18. Estado não recuperado pelo Git

O GitHub não contém deliberadamente:

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
- [ ] documentação lida;
- [ ] dependências instaladas;
- [ ] secrets configurados;
- [ ] migrations e ledger alinhados;
- [ ] RLS e privilégios confirmados;
- [ ] buckets privados confirmados;
- [ ] teste SQL com `ROLLBACK` aprovado;
- [ ] E2E autenticado executado;
- [ ] teste com duas conexões concorrentes executado;
- [ ] advisors revisados;
- [ ] CI verde;
- [ ] backup/restauração verificados antes da produção.
