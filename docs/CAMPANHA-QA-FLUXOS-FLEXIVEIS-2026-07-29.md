# Campanha QA — Projetos e propostas flexíveis

**Data:** 29 de julho de 2026  
**Branch:** `main`  
**Estado:** rodada funcional concluída; campanha geral de módulos continua

## 1. Escopo

Esta rodada corrigiu os bloqueios relatados em Planejamento, Propostas,
Orçamentos, menus, busca e campos de formulário:

- projeto sem proposta, orçamento ou contrato;
- implantação de obra já em andamento;
- proposta por valor fixo;
- proposta a partir de orçamento calculado;
- desconto com alçada até 7%;
- aprovação independente acima de 7%;
- busca com filtros por URL e chips;
- pesquisa por nome, código, contato, e-mail, telefone, cidade e bairro;
- contraste de `select`, `option`, inputs e estados desabilitados;
- resumo financeiro sem sobreposição;
- navegação interna dos aplicativos.

## 2. Ciclo executado

```text
reproduzir bloqueio
→ consultar VACINAS.md
→ corrigir schema/RPC
→ aplicar migration no Supabase
→ conectar formulário e carteira
→ executar cenários com JWT real simulado
→ ROLLBACK
→ corrigir estados encontrados no reteste
→ adicionar validador e CI
→ conferir build Vercel
→ conferir runtime e índices novos
```

## 3. Migrations

- `20260729163500_flexible_projects_proposals_discounts.sql`;
- `20260729170500_project_district_and_flexible_rpc_v2.sql`;
- `20260729171500_discount_decision_preserves_proposal_readiness.sql`;
- `20260729173500_discount_decision_fk_indexes.sql`.

A última migration reaplicou a VACINA-021 e adicionou índices de cobertura para
`proposal_id`, `requested_by` e `decided_by` na trilha de alçada comercial.

## 4. Cenários executados no Supabase

Todos foram executados dentro de transação com `ROLLBACK`.

### 4.1 Projeto independente e obra anterior

- projeto em andamento criado sem contrato, proposta ou orçamento;
- progresso inicial de 35%;
- data de corte registrada;
- custo histórico de R$ 125.000,00 registrado;
- bairro `Capivari` persistido;
- tentativa de obra anterior sem data de corte bloqueada.

### 4.2 Proposta fixa — desconto dentro da alçada

```text
valor-base: R$ 100.000,00
desconto: 5%
valor final: R$ 95.000,00
status do desconto: APPROVED_BY_POLICY
```

A proposta permaneceu em rascunho porque não possuía PDF final.

### 4.3 Proposta fixa — desconto acima da alçada

- 8% sem justificativa: bloqueado;
- 8% com justificativa: decisão `PENDING`;
- solicitante tentando aprovar: bloqueado;
- segundo ator com papel de diretoria: desconto aprovado;
- valor final: R$ 92.000,00;
- sem PDF final, proposta continuou `DRAFT` mesmo com desconto aprovado.

### 4.4 Proposta por orçamento

Uma versão congelada em `APPROVAL_PENDING`, com preço positivo, gerou proposta
em rascunho. O orçamento em aprovação pode preparar proposta, mas não pode ser
liberado ao cliente até a aprovação.

### 4.5 Evidência resumida

```json
{
  "result": "PASS",
  "project_entry_mode": "IN_PROGRESS",
  "project_progress": 0.35,
  "district": "Capivari",
  "fixed_5_final_price": 95000,
  "fixed_5_discount_status": "APPROVED_BY_POLICY",
  "fixed_8_final_price": 92000,
  "fixed_8_discount_status": "APPROVED",
  "fixed_8_proposal_status_without_pdf": "DRAFT",
  "missing_cutoff_blocked": true,
  "missing_reason_blocked": true,
  "self_approval_blocked": true
}
```

## 5. Interface

### Planejamento

- botão `Novo projeto/obra`;
- criação independente, em andamento, histórica ou importada;
- cliente e responsável opcionais;
- data de corte e custo histórico;
- busca por projeto, cliente, tarefa, responsável, telefone, e-mail, cidade e
  bairro;
- filtros por situação, origem, cidade e bairro.

### Propostas

- modo `BUDGET` e `FIXED`;
- lista somente versões congeladas, calculadas e utilizáveis;
- preço-base, desconto e preço final visíveis;
- justificativa obrigatória acima de 7%;
- painel de decisão da diretoria;
- busca por código, cliente, contato, telefone, e-mail e cidade;
- filtros por situação, modo de precificação e cidade.

### Orçamentos

- busca compartilhada;
- filtros por situação, cliente, valor mínimo/máximo e margem mínima;
- KPIs refletem o conjunto filtrado;
- resumo financeiro ocupa coluna própria e passa a fluxo normal abaixo de
  1180 px, sem cobrir composição ou formulários.

### Contraste e navegação

- `option` e `optgroup` usam fundo e primeiro plano semânticos;
- campos desabilitados preservam contraste;
- menus internos de Obras, Planejamento, Orçamentos e Propostas foram ampliados
  apenas com rotas reais;
- filtros ativos aparecem em chips e ficam reproduzíveis na URL.

## 6. Prevenção

Novo portão:

```bash
pnpm validate:flexible-workflows
```

O validador confere banco, ações, formulários, filtros, menus, contraste,
responsividade do resumo e índices das decisões de desconto. Está no preflight
e na etapa de qualidade do CI.

Vacinas registradas:

- VACINA-040 — fluxo não obriga documento anterior;
- VACINA-041 — alçada não é somente campo.

Vacina reaplicada:

- VACINA-021 — FKs operacionais precisam de índice de cobertura.

## 7. Verificação pós-deploy

- deployment consolidado da `main`: `READY` no Vercel;
- erros de runtime no recorte posterior à publicação: zero;
- migrations aplicadas no Supabase;
- FKs novas da alçada revisadas e indexadas;
- nenhum dado dos cenários QA permaneceu no banco.

A tentativa de executar o validador em um checkout local desta sessão foi
bloqueada por falha de resolução DNS do ambiente. Isso não foi contado como
aprovação. A evidência executada desta rodada é o build do Vercel e os cenários
PostgreSQL no Supabase.

## 8. Segurança e limitações

As novas RPCs aparecem no advisor como `SECURITY DEFINER` executáveis por
`authenticated`. Isso é intencional nesta rodada porque elas atravessam tabelas
com escrita direta restrita e executam guards internos de organização, papel,
identidade e segregação. Não houve revogação em massa.

Permanecem fora da conclusão desta rodada:

- política configurável de alçada por perfil e valor;
- edição de proposta após criação e nova versão;
- upload autenticado pelo navegador no deployment protegido;
- filtros server-side paginados para bases muito grandes;
- micro-gadgets do launcher em todos os aplicativos;
- revisão visual completa de cada aplicativo;
- equipes e recursos completos no Planejamento.

Esses itens continuam na campanha geral e não foram convertidos em `PASS`.
