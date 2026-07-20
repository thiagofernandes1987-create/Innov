# Arquitetura canônica — Innovar Platform

## 1. Visão geral

A Innovar Platform é um monólito modular web com banco relacional, autenticação gerenciada, armazenamento privado e workers específicos.

```text
Navegador
  ↓
Next.js 16 / React 19
  ├─ Server Components
  ├─ Server Actions
  ├─ Route Handlers
  └─ Proxy de sessão/autorização
  ↓
Supabase
  ├─ Auth
  ├─ PostgreSQL
  ├─ RLS
  └─ Storage privado

Workers
  ├─ conversão DOCX → PDF
  └─ entrega de mensagens de assinatura
```

## 2. Organização do repositório

```text
app/                    rotas, páginas, actions e APIs
components/             componentes de interface
lib/                    domínio, autorização, integrações e utilitários
python/                 motor auxiliar de qualidade
scripts/                validadores, workers e homologação
supabase/migrations/     evolução reproduzível do banco
docs/                   histórico técnico por etapa
diretrizes/             fonte canônica de produto e recuperação
.github/workflows/       CI e homologação
```

## 3. Modularidade

O catálogo está em `lib/modules/registry.ts` e no banco em `app_modules`.

Um aplicativo possui:

- chave estável;
- rota-base;
- categoria;
- dependências;
- status por organização;
- versão instalada;
- manifesto/configurações;
- matriz de permissões por perfil.

A remoção visual de um aplicativo não remove dados. Desabilitar módulo impede acesso funcional, mas preserva histórico conforme políticas de retenção.

## 4. Autorização

### 4.1 Camadas

1. sessão autenticada;
2. organização ativa;
3. módulo habilitado;
4. perfil e nível de acesso;
5. capacidade granular;
6. escopo de organização/cliente/obra;
7. override individual `ALLOW`/`DENY`;
8. RLS no banco;
9. políticas de Storage;
10. checagem interna em RPCs privilegiadas.

### 4.2 Precedência

- negação explícita vence permissão;
- escopo mais específico restringe escopo amplo;
- usuário sem módulo habilitado não acessa a rota;
- usuário sem capacidade sensível recebe valores mascarados ou erro;
- cliente nunca herda acesso interno.

### 4.3 Ações críticas

Podem exigir:

- MFA AAL2;
- justificativa;
- separação de funções;
- alçada;
- idempotency key;
- evento de auditoria.

## 5. Banco de dados

### 5.1 Convenções

- `organization_id` em dados multiempresa;
- `project_id` quando o dado pertence a uma obra;
- UUID como identificador;
- timestamps em UTC;
- enums para estados fechados;
- constraints para invariantes locais;
- triggers apenas quando a regra precisa ser central e transacional;
- RPC para operações de múltiplas tabelas;
- índices em FKs e filtros frequentes de RLS.

### 5.2 Migrations

- migrations são append-only;
- arquivo aplicado não é reescrito como correção de ambiente;
- correção usa nova migration;
- timestamps precisam ser únicos e crescentes;
- migration inclui schema, segurança, privilégios, índices e instaladores quando aplicável;
- alterações de módulo atualizam documentação no mesmo PR.

### 5.3 Views analíticas

- preferir `security_invoker=true`;
- não conceder leitura direta quando a view expõe domínio transversal sensível;
- encapsular autorização e mascaramento em RPC;
- não duplicar dados operacionais mutáveis em tabelas analíticas;
- snapshots são exceção imutável e auditada.

## 6. Storage

- buckets sensíveis são privados;
- caminho inclui organização e, quando aplicável, obra/entidade;
- upload valida tipo, tamanho e contexto;
- download usa URL assinada curta ou rota autenticada;
- metadados e hash ficam no banco;
- falha transacional remove arquivo órfão quando possível;
- antivírus é requisito antes da produção externa.

## 7. Documentos e imutabilidade

Itens que exigem versão e/ou congelamento:

- orçamento aprovado;
- proposta liberada;
- contrato enviado/assinado;
- aditivo assinado;
- baseline de obra;
- schema de formulário publicado;
- documento liberado ao cliente;
- PDF final de assinatura;
- snapshot de relatório.

Mudança após congelamento cria nova versão, nunca edição silenciosa.

## 8. Integrações

### 8.1 Assinatura

Adapter interno suporta `sandbox` e contratos para providers externos. Webhook exige HMAC, timestamp, proteção contra replay e idempotência.

### 8.2 E-mail

Entrega de assinatura é desacoplada por fila/worker e webhook HMAC. Nenhuma credencial fica no cliente.

### 8.3 LibreOffice

Conversão DOCX ocorre em worker headless. Original é preservado; resultado e logs possuem estado de processamento.

### 8.4 Compras → Financeiro

Pedido aprovado pode originar compromisso financeiro por importação idempotente.

### 8.5 Compras → Estoque

Na Etapa 17, recebimento aceito deve gerar entrada de estoque por operação idempotente, sem alterar retroativamente o recebimento.

### 8.6 Módulos → Relatórios

Relatórios consomem contratos analíticos autorizados, não tabelas internas diretamente na interface.

## 9. Frontend

- TypeScript estrito;
- componentes server-side por padrão;
- client components apenas quando houver interação real;
- formulários com validação server-side;
- mensagens de erro sem expor SQL ou segredo;
- acessibilidade de teclado;
- alternativa textual a drag-and-drop;
- responsividade para uso em obra;
- estados vazios, carregamento e acesso negado explícitos.

## 10. Observabilidade e auditoria

Cada operação crítica deve registrar, conforme domínio:

- organização;
- obra/entidade;
- ator;
- evento;
- data;
- estado anterior/novo quando seguro;
- idempotency key ou hash;
- metadados mínimos.

Logs não guardam:

- senha;
- token bruto;
- Service Role;
- documento integral;
- assinatura biométrica em texto;
- dados pessoais além do necessário.

## 11. CI

Ordem mínima:

1. instalar dependências;
2. validar documentação;
3. validar estruturas das etapas;
4. lint;
5. typecheck;
6. testes TypeScript;
7. testes Python;
8. build.

A documentação é uma dependência de entrega, não uma tarefa posterior.

## 12. Recuperabilidade

A reconstrução exige somente:

- clone do GitHub;
- secrets configurados fora do repositório;
- aplicação ordenada das migrations;
- instalação das dependências;
- execução dos validadores;
- inicialização dos workers necessários.

O procedimento detalhado está em [`RECUPERACAO.md`](./RECUPERACAO.md).
