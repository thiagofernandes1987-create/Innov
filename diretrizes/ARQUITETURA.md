# Arquitetura canônica — Innovar Platform

**Versão:** 0.17.0  
**Atualizado em:** 20 de julho de 2026

## 1. Visão geral

A Innovar Platform é um monólito modular web com banco relacional, autenticação gerenciada, armazenamento privado e workers específicos.

```text
Navegador
  ↓
Next.js 16 / React 19
  ├─ Server Components
  ├─ Server Actions
  ├─ Route Handlers
  └─ sessão/autorização
  ↓
Supabase
  ├─ Auth
  ├─ PostgreSQL
  ├─ RLS
  ├─ RPCs transacionais
  └─ Storage privado

Workers
  ├─ conversão DOCX → PDF
  └─ entrega de assinatura
```

## 2. Organização do repositório

```text
app/                    rotas, páginas, actions e APIs
components/             componentes de interface
lib/                    domínio, autorização e integrações
python/                 motor auxiliar de qualidade
scripts/                validadores, workers e homologação
supabase/migrations/     evolução append-only do banco
supabase/tests/          testes SQL reproduzíveis
docs/                   histórico técnico e evidências
diretrizes/             especificação canônica e recuperação
.github/workflows/       CI e homologação
```

## 3. Modularidade

O catálogo está em `lib/modules/registry.ts` e em `app_modules`.

Cada aplicativo possui:

- chave estável;
- rota-base;
- categoria;
- dependências;
- status por organização;
- versão instalada;
- configurações;
- matriz de permissões.

Desabilitar módulo preserva dados e histórico. Instalações automáticas não sobrescrevem perfis personalizados.

## 4. Autorização

### Camadas

1. sessão autenticada;
2. organização ativa;
3. módulo habilitado;
4. perfil e nível;
5. capacidade;
6. escopo de organização/cliente/obra;
7. override `ALLOW`/`DENY`;
8. RLS;
9. políticas de Storage;
10. autorização interna em RPC privilegiada.

### Precedência

- negação explícita vence permissão;
- escopo específico restringe escopo amplo;
- módulo desabilitado bloqueia acesso;
- dado sensível é mascarado sem capacidade;
- cliente não herda acesso interno.

### Ações críticas

Podem exigir MFA AAL2, justificativa, separação de funções, alçada, idempotency key e auditoria.

## 5. Banco de dados

### Convenções

- `organization_id` em dados multiempresa;
- `project_id` quando pertence a obra;
- UUID;
- timestamps UTC;
- enums para estados fechados;
- constraints para invariantes locais;
- triggers para integridade central;
- RPC para operações de múltiplas tabelas;
- índices em FKs e filtros de RLS.

### Migrations

- append-only;
- arquivo aplicado não é reescrito;
- correção usa novo timestamp;
- aplicação em ordem lexical;
- ledger remoto alinhado ao repositório;
- documentação no mesmo PR.

### Views

- preferir `security_invoker=true`;
- não conceder leitura direta de domínio sensível;
- autorização e mascaramento por RPC;
- snapshots são imutáveis e auditados.

## 6. Arquitetura do Estoque

### Razão imutável

O saldo não é armazenado como campo editável.

```text
inventory_movements 1 ── N inventory_movement_lines
```

Cada linha possui `quantity_delta` assinado. O saldo considera:

- movimentos `POSTED`;
- movimentos originais `REVERSED`;
- movimentos `REVERSAL` como contrapartida.

Essa semântica mantém o original no razão e evita dupla contagem.

### Projeções

```text
inventory_stock_v
inventory_reserved_stock_v
inventory_available_stock_v
inventory_item_totals_v
inventory_asset_current_v
inventory_expiry_alerts_v
```

Todas usam `security_invoker=true` e são consumidas por contratos autorizados.

### Concorrência

A postagem adquire advisory lock transacional por:

```text
organization_id | warehouse_id | location_id | item_id | lot_id
```

A chave é estável e os locks são adquiridos em ordem determinística. Na mesma transação são verificados:

- saldo físico;
- saldo disponível;
- quantidade reservada;
- lote e ativo;
- conservação de transferência;
- consumo de reserva.

### Isolamento multiobra

- depósito geral não possui obra fixa;
- depósito exclusivo possui `project_id`;
- movimento, reserva, importação ou ativo não pode usar depósito exclusivo de outra obra;
- trigger central `validate_inventory_project_scope` aplica a regra.

### Compras

```text
recebimento aceito
→ mapeamento de item e fator
→ importação idempotente
→ movimento PROCUREMENT_RECEIPT
```

Somente quantidade aceita entra. Quantidade rejeitada permanece no domínio de Compras.

### Ativos

Ativo individualizado possui entrada física, patrimônio/série, custódia, devolução e manutenção. Custódia encerrada não é reescrita.

### Inventário físico

```text
abrir → congelar esperado → contar/recontar
→ revisar → aprovar → ajustar → encerrar
```

Inventário postado é imutável.

## 7. Dados sensíveis

Proteção em camadas:

1. capacidade `sensitive`;
2. RLS;
3. privilégios por coluna;
4. RPC com mascaramento;
5. Server Components;
6. logs sem valores sensíveis.

No estoque, custo de referência, custo de movimento, aquisição e manutenção não possuem leitura direta ampla.

## 8. Storage

- buckets sensíveis privados;
- caminho por organização e recurso;
- upload valida tipo, tamanho e contexto;
- download por URL assinada curta ou rota autenticada;
- hash e metadados no banco;
- falha remove órfão quando possível;
- antimalware é requisito de produção.

A Etapa 17 não adiciona bucket.

## 9. Documentos e imutabilidade

Exigem versão ou congelamento:

- orçamento aprovado;
- proposta liberada;
- contrato/aditivo enviado ou assinado;
- baseline;
- formulário publicado;
- documento liberado;
- PDF final;
- snapshot;
- movimento de estoque postado;
- inventário postado;
- custódia encerrada.

Correção cria nova versão, evento ou contrapartida.

## 10. Integrações

### Assinatura

Adapter interno, sandbox e contratos para providers. Webhook exige HMAC, timestamp, replay protection e idempotência.

### E-mail

Fila/worker e webhook HMAC.

### DOCX

Conversão em LibreOffice headless. Original preservado.

### Compras → Financeiro

Pedido aprovado pode originar compromisso idempotente.

### Compras → Estoque

Recebimento aceito gera entrada idempotente sem reescrever o recebimento.

### Módulos → Relatórios

Relatórios consomem RPC/view autorizada, não tabelas internas diretamente.

## 11. Frontend

- TypeScript estrito;
- server-side por padrão;
- client component só para interação;
- validação server-side;
- erro sem SQL/secrets;
- acessibilidade;
- alternativa a drag-and-drop;
- responsividade para campo;
- estados vazios e acesso negado explícitos.

## 12. Observabilidade e auditoria

Operações críticas registram organização, obra/recurso, ator, evento, data, estado seguro, idempotency key ou hash.

Logs não armazenam senha, token bruto, Service Role, documento integral ou dado pessoal desnecessário.

## 13. Advisors

Aviso do advisor precisa ser classificado, não silenciado indiscriminadamente.

- RPC `SECURITY DEFINER` é aceitável quando representa fronteira intencional, possui `search_path` explícito e autorização interna;
- tabela interna pode ter RLS sem policy de usuário quando acesso ocorre apenas por RPC/worker/trigger;
- índice não deve ser removido por “unused” em ambiente vazio;
- FKs sem índice, RLS initplan e políticas permissivas legadas entram nas Etapas 19/20.

## 14. CI e testes

Ordem:

1. documentação;
2. validadores estruturais;
3. lint;
4. typecheck;
5. testes TypeScript;
6. testes Python;
7. build.

A Etapa 17 também possui `supabase/tests/stage17_inventory_homologation.sql`, executado em homologação dentro de transação com `ROLLBACK`.

## 15. Recuperabilidade

A reconstrução exige:

- clone do GitHub;
- secrets externos;
- migrations ordenadas;
- ledger compatível;
- dependências;
- validadores;
- workers;
- teste SQL e smoke tests.

Procedimento detalhado: [`RECUPERACAO.md`](./RECUPERACAO.md).
