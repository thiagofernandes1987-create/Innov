# Arquitetura canônica — Innovar Platform

**Versão:** 0.18.0  
**Atualizado em:** 21 de julho de 2026

## 1. Visão geral

A Innovar Platform é um monólito modular web com banco relacional, autenticação gerenciada, Storage privado e workers especializados.

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
```

## 2. Organização do repositório

```text
app/                    rotas, páginas, actions e APIs
components/             componentes de interface
lib/                    domínio, autorização e integrações
python/                 motor auxiliar de Qualidade
scripts/                validadores, workers e homologação
supabase/migrations/     evolução append-only do banco
supabase/tests/          testes SQL reproduzíveis com rollback
docs/                   histórico técnico e evidências
diretrizes/             especificação canônica e recuperação
.github/workflows/       CI
```

## 3. Modularidade plug-and-play

O catálogo existe em `lib/modules/registry.ts` e `app_modules`. Cada aplicativo possui chave, rota, categoria, dependências, versão, estado por organização, configurações e matriz de permissões.

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

Negação explícita prevalece. Cliente não herda permissões internas. Dados sensíveis são mascarados ou recusados. Ações críticas podem exigir MFA AAL2, justificativa, separação de funções, alçada, idempotency key e auditoria.

## 5. Banco e migrations

Convenções:

- UUID;
- timestamps UTC;
- `organization_id` em dados multiempresa;
- `project_id` quando houver obra;
- constraints para invariantes locais;
- triggers para regras centrais;
- RPC para operações multi-tabela;
- índices em FKs e filtros de RLS.

Migrations são append-only, aplicadas em ordem lexical. Arquivo aplicado nunca é reescrito. O timestamp e o nome local precisam coincidir com o ledger remoto do Supabase.

O validador `scripts/validate-supabase-migrations.mjs` bloqueia:

- timestamp duplicado;
- nome lógico duplicado;
- conteúdo SQL duplicado;
- migrations canônicas ausentes;
- versões locais divergentes do ledger remoto.

Função `SECURITY DEFINER` usa `search_path` explícito, valida autorização internamente e recebe privilégio mínimo. Helper interno não é exposto como RPC operacional.

## 6. CRM, Cliente 360 e SAC — Etapa 18

### Fluxo

```text
lead → qualificação → oportunidade → cliente 360
→ múltiplas obras e contratos → atendimento → pós-venda → avaliação
```

### CRM

- `crm_leads` registra origem, campanha, interesse, orçamento, responsável e follow-up;
- duplicidade é verificada por documento, e-mail e telefone normalizados;
- criação e conversão são idempotentes;
- conversão reutiliza cliente existente quando possível;
- `opportunities` mantém valor, probabilidade, previsão e motivo de perda;
- `crm_opportunity_stage_history` é append-only;
- estados críticos só mudam por RPC;
- pipeline é exclusivamente interno.

### Cliente 360

`get_client_360` agrega cadastro, contatos, consentimentos, oportunidades, contratos, obras, chamados e atividades. Um cliente pode possuir diversas obras abertas, em planejamento ou concluídas.

Dados sensíveis, como documento, observações internas e valores, dependem da capacidade `sensitive`. O portal usa contrato separado e não recebe o pipeline comercial.

### SAC e pós-venda

```text
abertura → triagem → atendimento → espera → resolução → encerramento → avaliação
```

- categorias possuem SLA de primeira resposta e resolução;
- chamado pode vincular cliente, obra e contrato;
- cliente só vincula obra ou contrato já liberado no portal;
- mensagens são `INTERNAL` ou `CLIENT`;
- anexos possuem visibilidade, autoria e SHA-256;
- eventos são append-only;
- estados e atribuição mudam somente por RPC;
- avaliação é única e permitida após resolução.

### Portal do cliente

- consulta apenas o cliente autenticado;
- mostra somente obras com `client_released_at`;
- não mostra oportunidades, eventos, mensagens internas ou anexos internos;
- permite abrir ocorrência, enviar mensagem, tirar foto/anexar arquivo e avaliar;
- upload é autorizado pela sessão, executado no servidor e compensado se a gravação falhar.

### Storage da Etapa 18

Bucket privado:

```text
crm-sac-attachments
```

Caminho:

```text
organization_id/ticket_id/uuid-nome-do-arquivo
```

Até 25 MB. Tipos: PDF, DOCX, JPEG, PNG e WebP. Download usa rota autenticada e URL assinada por 60 segundos.

## 7. Estoque — Etapa 17

### Razão imutável

```text
inventory_movements 1 ── N inventory_movement_lines
```

O saldo considera movimentos `POSTED`, originais `REVERSED` e contrapartidas `REVERSAL`. O original permanece no razão e não há edição direta de saldo.

Views:

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

A postagem adquire advisory lock por:

```text
organization_id | warehouse_id | location_id | item_id | lot_id
```

Após o lock, a transação reavalia físico, reservado, disponível, lote, ativo, transferência e consumo de reserva.

### Isolamento multiobra

Depósito exclusivo possui `project_id`. Movimento, reserva, importação ou ativo não pode usar depósito exclusivo de outra obra.

### Compras, ativos e inventário

Somente quantidade aceita do recebimento entra no estoque. Ativos possuem patrimônio, custódia, devolução e manutenção. Inventário físico segue abertura, congelamento, contagem, revisão, aprovação e ajuste rastreável.

## 8. Dados sensíveis

Proteção em camadas:

1. capacidade `sensitive`;
2. RLS;
3. privilégio por coluna;
4. RPC com mascaramento;
5. Server Components;
6. logs sem valor sensível.

Custos de estoque, valores financeiros, documentos pessoais e observações internas não possuem exposição ampla.

## 9. Storage e documentos

- buckets privados;
- caminho por organização e recurso;
- upload valida sessão, módulo, tipo, tamanho, contexto e hash;
- download por URL assinada curta ou rota autenticada;
- falha remove objeto órfão quando possível;
- antimalware é requisito de produção.

Exigem versão, congelamento ou contrapartida:

- orçamento aprovado;
- proposta liberada;
- contrato/aditivo enviado ou assinado;
- baseline;
- formulário publicado;
- documento liberado;
- PDF final;
- snapshot;
- movimento e inventário postados;
- custódia encerrada;
- consentimento, mensagem, evento e histórico comercial.

## 10. Integrações

- assinatura: adapter interno, sandbox e contratos de providers; webhook HMAC e idempotente;
- e-mail: fila/worker;
- DOCX: conversão LibreOffice headless, original preservado;
- Compras → Financeiro: compromisso idempotente;
- Compras → Estoque: recebimento aceito gera entrada idempotente;
- CRM → Cliente: conversão idempotente;
- Cliente → Obras/Contratos: visão multiobra;
- SAC → Qualidade/Pesquisas: distribuição posterior por formulário;
- módulos → Relatórios: contratos analíticos autorizados.

## 11. Frontend

- TypeScript estrito;
- Server Components por padrão;
- Server Actions para mutações;
- Client Components apenas para interação necessária;
- validação server-side;
- erro sem SQL ou secrets;
- acessibilidade e responsividade;
- alternativa a drag-and-drop;
- estados vazios e acesso negado explícitos.

## 12. Auditoria e advisors

Operações críticas registram organização, cliente/obra/recurso, ator, evento, data, estado seguro, idempotency key ou hash. Logs não armazenam senha, token bruto, Service Role, documento integral ou dado pessoal desnecessário.

Avisos do advisor são classificados:

- RPC `SECURITY DEFINER` é aceitável quando constitui fronteira intencional com autorização interna;
- índice `unused` não é removido em ambiente vazio;
- dívidas globais de RLS, initplan e observabilidade entram nas Etapas 19/20.

## 13. CI e testes

Ordem mínima:

1. documentação;
2. ledger de migrations;
3. validadores estruturais;
4. lint;
5. typecheck;
6. testes TypeScript;
7. testes Python;
8. build.

Testes SQL reproduzíveis:

```text
supabase/tests/stage17_inventory_homologation.sql
supabase/tests/stage18_relationship_homologation.sql
```

Ambos usam dados artificiais e terminam com `ROLLBACK`.

## 14. Recuperabilidade

A reconstrução exige clone do GitHub, secrets externos, migrations ordenadas, ledger compatível, dependências, validadores, workers e smoke tests. Procedimento detalhado: [`RECUPERACAO.md`](./RECUPERACAO.md).
