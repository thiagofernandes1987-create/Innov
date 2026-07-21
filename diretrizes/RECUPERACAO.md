# Recuperação completa a partir do repositório

Este procedimento reconstrói a Innovar Platform quando contêiner, máquina local, ambiente de desenvolvimento ou histórico de conversa for perdido.

## 1. Fonte oficial

```bash
git clone https://github.com/thiagofernandes1987-create/Innov.git
cd Innov
git checkout main
git pull --ff-only
```

Para recuperar as correções ainda em revisão da Etapa 17:

```bash
git checkout fix/etapa-17-homologacao-pos-merge
git pull --ff-only
```

O PR correspondente é `#15`. Nunca usar ZIP antigo quando o GitHub estiver disponível.

## 2. Documentação obrigatória

Ler nesta ordem:

1. `diretrizes/SPEC.md`;
2. `diretrizes/INVENTARIO.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/ARQUITETURA.md`;
5. `diretrizes/ROADMAP.md`;
6. `diretrizes/HISTORICO-ETAPAS.md`;
7. `docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`;
8. `docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md`.

## 3. Pré-requisitos

- Git;
- Node.js 24+;
- Corepack e pnpm 11.15.0;
- Python 3.13;
- acesso ao Supabase correto;
- acesso ao cofre de secrets;
- LibreOffice headless para conversão DOCX;
- acesso à hospedagem.

## 4. Dependências

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile
```

## 5. Ambiente

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

- `.env.local` não vai para o Git;
- Service Role somente no servidor;
- segredo exposto é rotacionado antes da continuidade;
- senha de produção não é reutilizada em homologação.

## 6. Reconstruir o banco

Migrations ficam exclusivamente em:

```text
supabase/migrations/
```

Aplicar em ordem lexical:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Nunca editar migration já aplicada. Comparar migrations locais e remotas; correção exige novo arquivo.

### Faixa final da Etapa 17

Começa em:

```text
20260720160000_stage17_inventory_schema.sql
```

Termina, no PR `#15`, em:

```text
20260720161000_stage17_inventory_rpc_privileges.sql
```

A lista completa está em `diretrizes/INVENTARIO.md`. O histórico remoto também deve conter a correção de escopo de saldo por obra registrada durante a homologação.

## 7. Verificações do banco

- 18 tabelas de estoque com RLS;
- seis views internas sem acesso direto;
- módulo `estoque` versão `1.0.0`;
- 101 FKs sem lacuna de índice líder;
- zero RPC operacional de estoque executável por `anon`;
- custos sem leitura direta;
- unidades, categorias, `ALM-GERAL` e `PADRAO` no bootstrap;
- movimentos postados imutáveis;
- saldo derivado e bloqueio de saldo negativo;
- locks transacionais em postagem;
- isolamento multiempresa e multiobra.

## 8. Buckets privados

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

A Etapa 17 não cria bucket novo.

## 9. Homologação

Contas conhecidas:

- `admin@innov.eng.br`;
- `cliente@cliente.com`.

Senhas ficam somente em secrets. O provisionamento oficial continua idempotente e restrito ao ambiente de homologação.

Os testes pós-merge da Etapa 17 criaram identidades, organizações, obras, itens e movimentos apenas em transações revertidas. Confirmaram bootstrap, saldo, reservas, idempotência, reversão, inventário, RLS e custo protegido.

Limitação: o conector não abriu duas conexões simultâneas sem credenciais explícitas. O teste concorrente realmente paralelo deve ser executado na Etapa 20.

## 10. Aplicação e workers

```bash
pnpm dev
pnpm worker:signature-conversion
pnpm worker:signature-delivery
```

`expire_inventory_reservations` deve ser acionada apenas por processo server-side autorizado quando houver agendamento.

## 11. Validar a reconstrução

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

## 12. Smoke test do estoque

1. confirmar módulo e dados padrão;
2. cadastrar item e depósito;
3. criar entrada e postar;
4. criar reserva e consumir parcialmente;
5. tentar saída acima do disponível;
6. reverter movimento;
7. repetir importação do mesmo recebimento;
8. confirmar que quantidade rejeitada não entrou;
9. cadastrar, entregar e devolver ativo;
10. abrir, contar, aprovar e contabilizar inventário;
11. testar acesso entre organizações;
12. testar custo com e sem capacidade sensível;
13. confirmar bloqueio de `anon`;
14. confirmar imutabilidade;
15. executar disputa realmente simultânea em teste de carga antes de produção.

## 13. O que não vive no Git

- valores de secrets;
- usuários e dados reais;
- conteúdo dos buckets;
- backups físicos;
- DNS e credenciais de provedores;
- dispositivos RFID e configurações da futura Etapa 21.

## 14. Checklist final de recuperação

- [ ] código obtido do GitHub;
- [ ] branch correta selecionada;
- [ ] diretrizes lidas;
- [ ] secrets configurados por cofre;
- [ ] migrations comparadas e aplicadas;
- [ ] RLS, privilégios e índices conferidos;
- [ ] buckets privados conferidos;
- [ ] módulos e perfis carregados;
- [ ] workers configurados;
- [ ] `pnpm validate:docs` aprovado;
- [ ] validadores estruturais aprovados;
- [ ] lint, typecheck, testes e build aprovados;
- [ ] smoke tests concluídos;
- [ ] documentação compatível com o commit implantado.
