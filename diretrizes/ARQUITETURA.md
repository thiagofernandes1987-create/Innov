# Arquitetura canônica — Innovar Platform

**Versão:** 0.19.0  
**Atualizado em:** 21 de julho de 2026

## 1. Visão geral

A Innovar Platform é um monólito modular web com banco relacional, autenticação gerenciada, Storage privado, RPCs transacionais e workers especializados.

```text
Navegador
  ↓
Next.js 16 / React 19
  ├─ Server Components
  ├─ Server Actions
  ├─ Route Handlers
  └─ sessão e autorização
  ↓
Supabase
  ├─ Auth
  ├─ PostgreSQL
  ├─ RLS
  ├─ RPCs transacionais
  └─ Storage privado

Workers
  ├─ DOCX → PDF
  └─ entrega de assinatura

Observabilidade
  ├─ trilhas de domínio
  ├─ audit_events transversal
  ├─ fluxo unificado
  ├─ alertas
  ├─ health checks
  └─ diagnósticos
```

## 2. Organização do repositório

```text
app/                    rotas, páginas, actions e APIs
components/             componentes de interface
lib/                    domínio, autorização e integrações
python/                 motor auxiliar de Qualidade
scripts/                validadores, workers e homologação
supabase/migrations/     evolução append-only do banco
supabase/tests/          testes SQL reproduzíveis com ROLLBACK
docs/                   histórico técnico e evidências
diretrizes/             especificação canônica e recuperação
.github/workflows/       CI e homologação
```

## 3. Modularidade plug-and-play

O catálogo existe em `lib/modules/registry.ts` e `app_modules`. Cada aplicativo possui chave estável, rota, categoria, dependências, versão, estado por organização, configurações e matriz de permissões.

Desabilitar módulo preserva dados e bloqueia o acesso funcional. Instaladores atualizam apenas perfis canônicos e nunca sobrescrevem perfis personalizados.

## 4. Autorização

Camadas:

1. sessão autenticada;
2. organização ativa;
3. módulo habilitado;
4. perfil e nível;
5. capacidade;
6. escopo de organização, cliente, obra ou recurso;
7. override `ALLOW`/`DENY`;
8. RLS;
9. política de Storage;
10. autorização interna em RPC privilegiada.

Negação explícita prevalece. Cliente não herda permissões internas. Ações críticas podem exigir MFA AAL2, justificativa, separação de funções, alçada, idempotency key e auditoria.

## 5. Banco e migrations

Convenções:

- UUID;
- timestamps UTC;
- `organization_id` em dados multiempresa;
- `project_id` quando houver obra;
- `client_id` quando houver contexto de cliente;
- constraints para invariantes locais;
- triggers para regras centrais;
- RPC para operações multi-tabela;
- índices em FKs e filtros de RLS;
- migrations append-only em ordem lexical.

Arquivo aplicado nunca é reescrito. Timestamp e nome local precisam coincidir com o ledger remoto. O validador bloqueia timestamp, nome ou conteúdo duplicado e divergência do ledger.

Função `SECURITY DEFINER` usa `search_path` explícito, valida autorização internamente e recebe privilégio mínimo. Helper interno não é exposto como RPC operacional.

## 6. Estoque — Etapa 17

O estoque usa razão imutável:

```text
inventory_movements 1 ── N inventory_movement_lines
saldo físico = movimentos válidos
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

Movimento concluído não é editado; correção ocorre por reversão. A postagem adquire advisory lock por organização, depósito, localização, item e lote. Depósito exclusivo de obra não pode ser usado por outra obra.

## 7. CRM, Cliente 360 e SAC — Etapa 18

```text
lead → qualificação → oportunidade → cliente 360
→ múltiplas obras e contratos → atendimento → pós-venda → avaliação
```

- leads e conversão idempotentes;
- pipeline exclusivamente interno;
- cliente pode possuir diversas obras abertas ou concluídas;
- portal mostra somente obras liberadas;
- mensagens e anexos `INTERNAL` não aparecem ao cliente;
- anexos possuem SHA-256;
- estados críticos mudam somente por RPC;
- eventos e históricos são append-only.

## 8. Auditoria e Observabilidade — Etapa 19

### 8.1 Princípio

A Etapa 19 não copia nem substitui as trilhas de domínio. Ela normaliza as origens em leitura e usa `audit_events` somente para eventos transversais que não possuem trilha própria.

Fontes unificadas:

```text
audit_events
permission_change_events
signature_events
document_access_logs
quality_form_events
procurement_events
finance_events
report_events
inventory_events
sac_ticket_events
crm_opportunity_stage_history
crm_activities
```

### 8.2 Contrato comum

```text
id
organization_id
project_id
client_id
module_key
event_type
severity
source
actor_user_id
actor_type
resource_type
resource_id
action
result
message
metadata
correlation_id
occurred_at
origin_table
```

Filtros: organização, módulo, severidade, texto, período, correlação e paginação.

### 8.3 Correlação e idempotência

- `correlation_id` conecta eventos da mesma operação distribuída;
- `request_id` identifica a requisição técnica;
- `deduplication_key` é única por organização;
- repetição retorna o evento existente;
- obra, cliente, ator e recurso permanecem disponíveis para investigação.

### 8.4 Sanitização

`sanitize_audit_json` percorre objetos e arrays antes da persistência e da leitura normalizada. Chaves relacionadas a senha, token, authorization, secret, Service Role, private key, access key, refresh token ou cookie recebem `[REDACTED]`.

Não armazenar:

- senha;
- token bruto;
- Service Role;
- cookie;
- IP em texto puro;
- user-agent em texto puro;
- payload bruto do provider de assinatura;
- documento pessoal integral sem necessidade explícita.

IP e user-agent podem ser registrados somente como SHA-256.

### 8.5 Imutabilidade

- `audit_events`: append-only para usuários;
- `observability_health_checks`: append-only;
- diagnósticos não podem ser apagados por usuários;
- reconhecimento e resolução de alertas ocorrem por RPC;
- cada transição de alerta cria novo evento de auditoria.

### 8.6 Alertas

Regras possuem:

- módulo opcional;
- padrão de evento;
- severidade mínima;
- quantidade mínima;
- janela temporal;
- cooldown.

Workflow:

```text
OPEN → ACKNOWLEDGED → RESOLVED
```

Eventos críticos criam alerta mesmo sem regra específica. Reconhecimento e resolução exigem motivo e capacidade administrativa.

### 8.7 Health checks

O snapshot atual verifica:

1. conectividade do banco;
2. conversão de documentos de assinatura;
3. entrega de cópias assinadas;
4. geração de relatórios;
5. SLA do SAC;
6. diagnósticos pendentes.

Estados:

```text
HEALTHY
DEGRADED
UNHEALTHY
UNKNOWN
```

### 8.8 Diagnósticos

`observability_diagnostics` recebe achados reproduzíveis de:

- FK sem índice;
- RLS com avaliação repetida;
- políticas permissivas sobrepostas;
- privilégio indevido de função;
- divergência de migration;
- outros advisors estruturados.

O registro é idempotente por organização, tipo, objeto e código.

### 8.9 Retenção

A política aceita 30 a 3650 dias. `audit_events` recebe `retention_until`. A exclusão automática não pertence à Etapa 19; será implementada na Etapa 20 com dry-run, preservação de eventos críticos, exportação e retenção legal.

### 8.10 Autorização

- leitura: módulo `auditoria`, capacidade `read`;
- configuração e transições: capacidade `administer`;
- perfis padrão: Super Administrador, Direção e Administrador;
- cliente: sem acesso;
- RPCs: sem execução para `anon`;
- Service Role: somente operações técnicas explicitamente concedidas.

## 9. Dados sensíveis

Proteção em camadas:

1. capacidade `sensitive`;
2. RLS;
3. privilégio por coluna;
4. RPC com mascaramento/sanitização;
5. Server Components;
6. logs sem valor sensível.

Custos, valores financeiros, documentos pessoais, observações internas e payloads de integração não possuem exposição ampla.

## 10. Storage e documentos

- buckets privados;
- caminho por organização e recurso;
- upload valida sessão, módulo, tipo, tamanho, contexto e hash;
- download por URL assinada curta ou rota autenticada;
- falha remove objeto órfão quando possível;
- antimalware é requisito da Etapa 20.

A Etapa 19 não cria bucket nem armazena arquivo de log.

## 11. Frontend

- TypeScript estrito;
- Server Components por padrão;
- Server Actions para mutações;
- Client Components apenas quando necessários;
- validação server-side;
- erro sem SQL ou secrets;
- acessibilidade e responsividade;
- estados vazios e acesso negado explícitos.

## 12. CI e testes

Ordem mínima:

1. documentação;
2. vacinas;
3. ledger de migrations;
4. validadores estruturais;
5. lint;
6. typecheck;
7. testes TypeScript;
8. testes Python;
9. build.

Testes SQL:

```text
supabase/tests/stage17_inventory_homologation.sql
supabase/tests/stage18_relationship_homologation.sql
supabase/tests/stage19_observability_homologation.sql
```

Usam dados artificiais e terminam com `ROLLBACK`.

## 13. Recuperabilidade

A reconstrução exige clone do GitHub, secrets externos, migrations ordenadas, ledger compatível, dependências, validadores, workers e smoke tests. Procedimento detalhado: [`RECUPERACAO.md`](./RECUPERACAO.md).
