# Arquitetura canônica — Innovar Platform

## 1. Visão geral

A Innovar Platform é um monólito modular web com banco relacional, autenticação gerenciada, armazenamento privado e workers especializados.

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
  └─ Storage privado

Workers
  ├─ DOCX → PDF
  └─ entrega de assinatura
```

## 2. Repositório

```text
app/                    rotas, páginas, actions e APIs
components/             interface
lib/                    domínio, autorização e integrações
python/                 motor auxiliar de Qualidade
scripts/                validadores, workers e homologação
supabase/migrations/     evolução append-only do banco
docs/                   histórico técnico
diretrizes/             fonte canônica e recuperação
.github/workflows/       CI
```

## 3. Modularidade

O catálogo vive em `lib/modules/registry.ts` e `app_modules`. Cada aplicativo possui chave, rota, categoria, dependências, versão, estado por organização e matriz de permissões. Desabilitar módulo preserva os dados e bloqueia o acesso funcional.

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
9. Storage;
10. checagem interna em RPC.

Negação explícita prevalece. Valor sensível é mascarado ou recusado. Cliente não herda acesso interno. Ações críticas podem exigir MFA AAL2, justificativa, alçada, separação de funções, idempotency key e auditoria.

## 5. Banco e migrations

Convenções:

- UUID;
- timestamps UTC;
- `organization_id` em dados multiempresa;
- `project_id` quando houver obra;
- enums para estados fechados;
- constraints para invariantes locais;
- triggers para regras centrais e transacionais;
- RPC para operações multi-tabela;
- índices em FKs e filtros de RLS.

Migrations são append-only, com timestamps únicos e crescentes. Arquivo aplicado nunca é reescrito. Correção inclui nova migration, documentação e validador no mesmo PR.

Função `SECURITY DEFINER` usa `search_path` explícito, valida autorização e recebe privilégio mínimo. Helper interno não é RPC pública.

## 6. Estoque: razão, projeções e concorrência

O estoque não possui coluna de saldo editável.

```text
saldo físico = soma das linhas de movimentos POSTED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

As views `inventory_stock_v`, `inventory_reserved_stock_v`, `inventory_available_stock_v`, `inventory_item_totals_v`, `inventory_asset_current_v` e `inventory_expiry_alerts_v` usam `security_invoker=true` e não são concedidas diretamente ao navegador.

### Postagem

`post_inventory_movement`:

1. bloqueia o cabeçalho do movimento;
2. calcula uma chave para cada posição `organização + depósito + localização + item + lote`;
3. ordena as chaves;
4. adquire `pg_advisory_xact_lock`;
5. reavalia físico, reservado e disponível;
6. valida sinal, lote, ativo, transferência e reserva;
7. posta o movimento;
8. atualiza a reserva;
9. registra evento.

O lock evita que duas transações validem simultaneamente o mesmo saldo antigo. A segunda transação aguarda e reavalia o saldo após a primeira.

### Imutabilidade

- movimento `DRAFT` não altera saldo;
- movimento `POSTED` não aceita edição ou exclusão;
- correção ocorre por reversão vinculada;
- inventário contabilizado é imutável;
- custódia encerrada preserva responsável, obra e entrega.

### Segurança

- 18 tabelas com RLS;
- custos sem leitura direta;
- escrita de custo exige capacidade sensível;
- zero RPC operacional para `anon`;
- 101 FKs com índice líder;
- vínculos incompatíveis entre organização, obra, depósito, item, lote, reserva, recebimento e ativo são bloqueados.

## 7. Views, relatórios e snapshots

- preferir `security_invoker=true`;
- não conceder leitura direta a contratos analíticos sensíveis;
- encapsular autorização e mascaramento em RPC;
- não duplicar estado operacional mutável;
- snapshot é exceção imutável e auditada.

## 8. Storage

- buckets sensíveis privados;
- caminhos incluem organização e entidade;
- upload valida tipo, tamanho e contexto;
- download por URL assinada curta ou rota autenticada;
- metadados e hash no banco;
- falha remove arquivo órfão quando possível;
- antimalware obrigatório antes de produção.

## 9. Documentos e imutabilidade

Orçamento aprovado, proposta liberada, contrato enviado/assinado, aditivo assinado, baseline, schema publicado, documento liberado, PDF final e snapshot concluído são versionados ou congelados. Mudança cria nova versão.

## 10. Integrações

- assinatura: adapter `sandbox` e contrato para providers externos; webhook HMAC e idempotente;
- e-mail: fila/worker sem credencial no cliente;
- LibreOffice: conversão headless com original preservado;
- Compras → Financeiro: pedido aprovado pode gerar compromisso idempotente;
- Compras → Estoque: somente quantidade aceita gera entrada idempotente;
- módulos → Relatórios: consumo por contratos analíticos autorizados.

## 11. Frontend

- TypeScript estrito;
- Server Components por padrão;
- Client Components apenas para interação;
- validação server-side;
- erro sem SQL ou segredo;
- teclado e alternativa a drag-and-drop;
- responsividade para campo;
- estados de vazio, carregamento e acesso negado.

## 12. Auditoria

Operação crítica registra organização, obra/entidade, ator, evento, data, idempotency key/hash e metadados mínimos. Logs não guardam senha, token bruto, Service Role, documento integral ou dado pessoal desnecessário.

## 13. CI

Ordem mínima:

1. dependências;
2. documentação;
3. validadores estruturais;
4. lint;
5. typecheck;
6. testes TypeScript;
7. testes Python;
8. build.

## 14. Recuperabilidade

A reconstrução depende de clone do GitHub, secrets externos, migrations ordenadas, dependências, validadores e workers. O procedimento completo está em [`RECUPERACAO.md`](./RECUPERACAO.md).
