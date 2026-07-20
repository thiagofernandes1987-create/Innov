# Recuperação completa a partir do repositório

Este procedimento reconstrói a Innovar Platform quando contêiner, máquina local, ambiente de desenvolvimento ou histórico de conversa for perdido.

## 1. Fonte oficial

```bash
git clone https://github.com/thiagofernandes1987-create/Innov.git
cd Innov
```

Para recuperar o estado estável:

```bash
git checkout main
git pull --ff-only
```

Para recuperar a Etapa 17 ainda não incorporada:

```bash
git checkout feature/etapa-17-estoque-inventario-almoxarifado
git pull --ff-only
```

Nunca reconstruir a partir de ZIP antigo quando o repositório estiver disponível.

## 2. Documentação obrigatória

Ler nesta ordem:

1. `diretrizes/SPEC.md`;
2. `diretrizes/INVENTARIO.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/ARQUITETURA.md`;
5. `diretrizes/ROADMAP.md`;
6. `diretrizes/HISTORICO-ETAPAS.md`;
7. documento técnico da etapa relevante em `docs/`.

Para a etapa atual:

- `docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`.

Planejamento posterior, sem implementação atual:

- `docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`.

## 3. Pré-requisitos

- Git;
- Node.js 24 ou superior;
- Corepack;
- pnpm 11.15.0;
- Python 3.13;
- acesso ao projeto Supabase correto;
- acesso aos secrets do ambiente;
- LibreOffice headless para o worker DOCX;
- acesso ao provider de hospedagem.

## 4. Instalar dependências

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile
```

## 5. Configurar ambiente

```bash
cp .env.example .env.local
```

Preencher por cofre seguro:

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

Regras:

- não enviar `.env.local` ao Git;
- não colar Service Role em issue, PR ou documentação;
- não usar senha de produção em homologação;
- rotacionar segredo exposto antes de continuar;
- nunca enviar `SUPABASE_SERVICE_ROLE_KEY` ao navegador.

## 6. Reconstruir o banco

As migrations reproduzíveis ficam em:

```text
supabase/migrations/
```

Aplicar em ordem lexical.

Com Supabase CLI configurado:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Regras para ambiente existente:

- comparar migrations locais e remotas;
- nunca reaplicar manualmente migration registrada;
- nunca editar migration aplicada;
- criar nova migration corretiva;
- validar backup antes de mudança destrutiva.

### Migrations da Etapa 17

A faixa atual começa em:

```text
20260720160000_stage17_inventory_schema.sql
```

e termina em:

```text
20260720160740_stage17_inventory_state_guards.sql
```

A lista integral está em `diretrizes/INVENTARIO.md`.

## 7. Verificações mínimas do banco

- RLS ativo nas tabelas de negócio;
- módulos instalados nas organizações;
- perfis canônicos sem duplicação;
- buckets privados existentes;
- funções anônimas indevidas revogadas;
- índices de FKs e caminhos de RLS;
- migrations da etapa mais recente presentes;
- views internas sem acesso direto;
- colunas sensíveis mascaradas.

### Verificações da Etapa 17

- 18 tabelas de estoque;
- seis views derivadas;
- módulo `estoque` versão `1.0.0`;
- unidades, categorias, `ALM-GERAL` e `PADRAO` instalados;
- saldo não editável diretamente;
- movimentos postados imutáveis;
- importação de recebimento idempotente;
- RLS multiempresa e multiobra;
- custos sensíveis protegidos.

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

A Etapa 17 e o planejamento da Etapa 21 não adicionam bucket atual. Todos os buckets existentes permanecem privados.

## 9. Provisionar homologação

Contas conhecidas:

- `admin@innov.eng.br`;
- `cliente@cliente.com`.

Senhas não pertencem ao repositório:

```env
DEMO_ADMIN_PASSWORD=
DEMO_CLIENT_PASSWORD=
```

Em ambiente protegido:

```bash
pnpm provision:homologation
pnpm test:e2e:stage11
```

O provisionamento é idempotente e restrito à homologação.

## 10. Iniciar aplicação e workers

```bash
pnpm dev
```

Workers existentes:

```bash
pnpm worker:signature-conversion
pnpm worker:signature-delivery
```

A rotina `expire_inventory_reservations` deve ser executada somente por processo server-side autorizado quando o agendamento for adotado.

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

## 12. Smoke test da Etapa 17

1. confirmar módulo e dados padrão;
2. cadastrar item;
3. criar entrada e postar;
4. verificar saldo físico;
5. criar reserva e verificar disponível;
6. consumir reserva;
7. tentar saldo negativo;
8. transferir entre depósitos;
9. reverter movimento;
10. importar o mesmo recebimento duas vezes;
11. confirmar que quantidade rejeitada não entrou;
12. cadastrar ativo, entregar e devolver;
13. abrir inventário, contar, aprovar e contabilizar;
14. testar acesso entre organizações;
15. testar custo com e sem capacidade sensível;
16. confirmar bloqueio de `anon`;
17. confirmar imutabilidade de movimento concluído.

Testes estruturais devem usar transações revertidas quando possível. Testes de RLS usam identidades reais de homologação.

## 13. Restaurar hospedagem

1. conectar o repositório oficial;
2. usar `main` em produção;
3. usar branch de etapa somente em ambiente de homologação/revisão;
4. configurar variáveis por cofre;
5. executar `pnpm build`;
6. validar domínio e HTTPS;
7. executar smoke tests autenticados.

## 14. Restaurar Supabase a partir de backup

1. congelar writes ou colocar aplicação em manutenção;
2. identificar o último backup íntegro;
3. restaurar primeiro em projeto isolado;
4. comparar migrations e schema;
5. executar validadores e smoke tests;
6. somente depois promover o ambiente restaurado.

## 15. Estado que não vive no Git

O repositório não contém deliberadamente:

- valores de secrets;
- usuários reais do Auth;
- dados reais do banco;
- conteúdo dos buckets;
- DNS;
- credenciais de provedores;
- backups físicos;
- dispositivos RFID ou configurações da futura Etapa 21.

Esses elementos precisam de cofre, backup e inventário externo.

## 16. Checklist final de recuperação

- [ ] código obtido do repositório;
- [ ] branch correta selecionada;
- [ ] diretrizes lidas;
- [ ] secrets configurados por cofre;
- [ ] migrations aplicadas em ordem;
- [ ] RLS e privilégios conferidos;
- [ ] storage privado conferido;
- [ ] módulos e perfis carregados;
- [ ] workers necessários configurados;
- [ ] `pnpm validate:docs` aprovado;
- [ ] `pnpm validate:stage17` aprovado quando a branch estiver ativa;
- [ ] lint, typecheck, testes e build aprovados;
- [ ] smoke tests concluídos;
- [ ] documentação compatível com o commit implantado.
