# Recuperação completa a partir do repositório

Este procedimento existe para reconstruir a Innovar Platform quando um contêiner, máquina local, ambiente de desenvolvimento ou histórico de conversa for perdido.

## 1. Pré-requisitos

- Git;
- Node.js 24 ou superior;
- Corepack;
- pnpm 11.15.0;
- Python 3.13 para a suíte auxiliar de Qualidade;
- acesso ao projeto Supabase correto;
- acesso aos secrets do ambiente;
- LibreOffice headless no host do worker de conversão DOCX;
- acesso ao provider de hospedagem.

## 2. Clonar a fonte oficial

```bash
git clone https://github.com/thiagofernandes1987-create/Innov.git
cd Innov
git checkout main
git pull --ff-only
```

Nunca reconstruir a partir de ZIP antigo quando a `main` estiver disponível.

## 3. Conferir a documentação antes de executar

Ler nesta ordem:

1. `diretrizes/SPEC.md`;
2. `diretrizes/INVENTARIO.md`;
3. `diretrizes/MODULOS.md`;
4. `diretrizes/ARQUITETURA.md`;
5. `diretrizes/ROADMAP.md`;
6. documento histórico da etapa relevante em `docs/`.

## 4. Instalar dependências

```bash
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --no-frozen-lockfile
```

O CI usa a mesma versão de pnpm.

## 5. Configurar ambiente local

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
- rotacionar segredo exposto antes de continuar.

## 6. Reconstruir o banco

### 6.1 Ambiente vazio

Aplicar todas as migrations de `supabase/migrations/` na ordem lexical.

Com Supabase CLI configurado:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Ou aplicar pelo mecanismo oficial do ambiente, mantendo o histórico de migrations.

### 6.2 Ambiente existente

- comparar migrations locais e remotas;
- nunca reaplicar manualmente migration já registrada;
- nunca editar migration aplicada para “corrigir” o ambiente;
- criar nova migration corretiva;
- validar backups antes de mudança destrutiva.

### 6.3 Verificações mínimas

- RLS ativo nas tabelas de negócio;
- módulos instalados nas organizações;
- perfis canônicos criados sem duplicação;
- buckets privados existentes;
- funções anônimas indevidas revogadas;
- índices de FKs e caminhos de RLS;
- migrations da etapa mais recente presentes.

## 7. Buckets a conferir

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

Todos devem permanecer privados. Políticas e limites são definidos por migrations.

## 8. Provisionar homologação

As contas de homologação conhecidas são:

- `admin@innov.eng.br`;
- `cliente@cliente.com`.

As senhas não pertencem ao repositório. Configure:

```env
DEMO_ADMIN_PASSWORD=
DEMO_CLIENT_PASSWORD=
```

Depois execute, em ambiente protegido:

```bash
pnpm provision:homologation
```

Para o E2E da Etapa 11:

```bash
pnpm test:e2e:stage11
```

O provisionamento deve ser idempotente e limitado à homologação.

## 9. Iniciar a aplicação

```bash
pnpm dev
```

Acesso local padrão:

```text
http://localhost:3000
```

## 10. Iniciar workers quando necessários

### Conversão DOCX

```bash
pnpm worker:signature-conversion
```

Requisitos:

- LibreOffice headless disponível;
- acesso ao Supabase;
- Service Role apenas no processo server-side.

### Entrega de assinatura

```bash
pnpm worker:signature-delivery
```

Requisitos:

- `SIGNATURE_EMAIL_WEBHOOK_URL`;
- segredo HMAC correspondente;
- política de retry e idempotência.

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
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

A recuperação não está concluída enquanto algum desses comandos falhar.

## 12. Testes manuais mínimos

### Administrador

- login;
- módulo exibido conforme perfil;
- criação/consulta de orçamento;
- acesso a obra;
- consulta financeira sensível;
- relatório executivo;
- download privado.

### Cliente

- login;
- somente dados próprios;
- proposta/contrato liberados;
- documentos da própria obra;
- formulários atribuídos;
- ausência de custos internos.

### Segurança

- URL direta sem capacidade retorna acesso negado;
- usuário de outra organização não lê dados;
- bucket privado não possui URL pública;
- token bruto não aparece no banco/log;
- Service Role não aparece no bundle do navegador;
- snapshot/documento congelado não aceita alteração.

## 13. Restaurar hospedagem

No provider escolhido:

1. conectar o repositório oficial;
2. selecionar `main` como produção;
3. configurar as variáveis por cofre;
4. usar Node.js compatível;
5. executar build `pnpm build`;
6. validar domínio e HTTPS;
7. executar smoke tests autenticados.

## 14. Restaurar Supabase a partir de backup

Em incidente real:

1. congelar writes ou colocar aplicação em manutenção;
2. identificar o último backup íntegro;
3. restaurar em projeto isolado primeiro;
4. aplicar migrations posteriores necessárias;
5. executar validadores e testes de RLS;
6. comparar contagens e hashes críticos;
7. promover somente após aprovação;
8. registrar incidente e causa.

## 15. Diagnóstico de divergência

Quando o código e o banco divergirem:

- identificar o último commit implantado;
- listar migrations locais e remotas;
- verificar PRs mesclados após o deploy;
- não apagar histórico de migration;
- criar correção reproduzível;
- atualizar `diretrizes/INVENTARIO.md` e o documento da etapa.

## 16. Checklist final de recuperação

- [ ] `main` atualizada;
- [ ] documentação canônica presente;
- [ ] dependências instaladas;
- [ ] secrets configurados fora do Git;
- [ ] migrations sincronizadas;
- [ ] buckets privados;
- [ ] perfis e módulos instalados;
- [ ] workers funcionais;
- [ ] validadores verdes;
- [ ] build verde;
- [ ] login administrador e cliente testados;
- [ ] RLS multiempresa testada;
- [ ] backup/restauração documentados;
- [ ] nenhuma credencial exposta.
