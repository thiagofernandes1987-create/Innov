# Campanha QA por personas — Rodada 01

**Data:** 28 de julho de 2026  
**Branch:** `main`  
**Ambientes:** Supabase de homologação/produção técnica e deployment Vercel `innov`  
**Estado da campanha:** em andamento — esta rodada não encerra a auditoria geral

## 1. Objetivo

Exercitar a plataforma como profissionais reais, atravessando módulos e setores,
com três tipos de cenário:

- normal: o fluxo cotidiano completo;
- otimista: entradas válidas e conclusão sem exceção;
- pessimista/negativo: falta, conflito, dado inválido, ator indevido ou estado
  incompatível.

O ciclo aplicado foi:

```text
QA reproduz
→ Tech Lead separa sintoma e causa raiz
→ consulta VACINAS.md
→ Dev corrige em migration/código
→ Supabase recebe a migration
→ QA repete o mesmo cenário
→ documentação e vacina são atualizadas
```

As passagens foram executadas como papéis separados dentro da mesma campanha.
Não houve alegação de agentes externos independentes.

## 2. Regra de evidência

Todos os dados operacionais hipotéticos foram criados dentro de transações com
`ROLLBACK`. Portanto:

- funções, RLS, guards, triggers e cálculos foram realmente executados;
- nenhum cliente, orçamento, pedido, recebimento ou chamado fictício permaneceu;
- `PASS` significa que o cenário terminou e suas condições foram consultadas;
- teste bloqueado por configuração ou ambiente não é convertido em sucesso.

## 3. Base de custo da rodada

Para o cenário comercial foi utilizada a referência oficial do SindusCon-SP:

| Referência | Data-base | Valor |
|---|---|---:|
| CUB R8-N sem desoneração | junho/2026 | R$ 2.221,44/m² |
| CUB R8-N com desoneração | junho/2026 | R$ 2.146,08/m² |

O ensaio usou 100 m² sem desoneração:

```text
100 × R$ 2.221,44 = R$ 222.144,00 de custo direto de referência
R$ 222.144,00 × 1,25 = R$ 277.680,00 de preço de venda no cenário
```

O CUB foi tratado como referência global de coerência, não como composição
analítica de itens. A cotação unitária de dobradiças na rodada de Compras é dado
hipotético de fornecedor, identificado como tal, e não foi apresentada como
preço SindusCon.

## 4. Ambientes e baseline

- Supabase ativo e saudável;
- 21 aplicativos registrados e habilitados na organização;
- duas contas internas de homologação e uma conta de cliente;
- deployment Vercel da `main` concluído;
- contêiner da sessão sem resolução DNS para o host Supabase;
- execução de banco realizada pelo canal de administração do Supabase com JWT
  simulado e `ROLLBACK`;
- organização real sem responsáveis operacionais P1–P16 atribuídos.

A ausência de responsáveis é `BLOCKED_CONFIGURATION`, não aprovação do
roteamento real.

## 5. Matriz desta rodada

| Fluxo | Personas | Cenários | Resultado |
|---|---|---|---|
| orçamento → proposta → cliente → contrato → assinatura → obra → financeiro | P11, P1, P15, P14, P8, P4 | normal e negativas intermediárias | `PASS` depois de três correções |
| snapshot executivo de relatórios | P13/P16 | normal | `PASS` |
| falta de material e notificação | P3, P10, P8, P9, P7, P2 | pessimista | mecanismo `PASS`; organização `BLOCKED_CONFIGURATION` |
| compra → aprovação → pedido → recebimento → estoque → financeiro | P9, P10, P4, P8 | normal e autoaprovação | `PASS` depois de três correções |
| diário de obra com foto e aprovação | P3, P8, P15 | normal e rejeição inválida | `PASS` |
| planejamento, baseline e bloqueio | P2, P8, P3 | normal e bloqueio sem motivo | `PASS` |
| criação de pipeline por preset | P6/P1/P5 | normal e preset inválido | `PASS` |
| chamado de garantia pelo portal | P15, P5, P12, P8 | normal e negativas | `PASS` |

## 6. Evidências principais

### 6.1 Comercial e contratos

Resultado final:

```json
{
  "result": "PASS",
  "direct_cost": 222144,
  "sale_price": 277680,
  "client_audit": 1,
  "contract_status": "SIGNED",
  "signature_events": 4,
  "project_created": true,
  "finance_entry_created": true,
  "finance_total": 277680,
  "installments": 10
}
```

### 6.2 Relatórios

- snapshot `COMPLETED`;
- SHA-256 com 64 caracteres;
- nenhum erro de geração.

### 6.3 Falta de material

Evento:

```text
field.blocked
ator: P3
obrigação: P10
recorte configurado: P8, P9, P10, P7, P2
```

Com responsabilidades temporárias e reversíveis, a caixa do destinatário P8
recebeu uma notificação. O ator P3 não leu a caixa do outro usuário, confirmando
o isolamento por RLS.

### 6.4 Compras, estoque e financeiro

Resultado final:

```json
{
  "result": "PASS",
  "self_approval_blocked": true,
  "self_approval_error": "Quem selecionou a cotação não pode decidir a própria aprovação.",
  "order_total": 474.60,
  "receipt_status": "ACCEPTED",
  "movement_status": "POSTED",
  "inventory_balance": 24,
  "finance_total": 474.60,
  "installments": 1
}
```

### 6.5 Diário de obra

- uma atividade;
- uma foto de 200 KiB;
- rejeição sem motivo bloqueada;
- diário `APPROVED`;
- `client_visible=true` somente depois da aprovação.

### 6.6 Planejamento

- três tarefas A–B–C;
- duas dependências FS;
- baseline `FROZEN` com três tarefas;
- tarefa não pode ser bloqueada sem motivo;
- bloqueio com “Aprovação do cliente pendente” aceito.

### 6.7 Pipelines

- preset `cliente_comercial` criado;
- seis etapas;
- 27 códigos de data;
- preset desconhecido bloqueado com lista dos presets válidos.

### 6.8 SAC

- chamado aberto pelo cliente com origem forçada para `PORTAL`;
- categoria Garantia aplicou prioridade `HIGH`, primeira resposta em 8 horas e
  resolução em 72 horas;
- mensagem do cliente não pôde ser marcada como interna;
- primeira resposta registrada;
- nota 6 bloqueada;
- nota 5 aceita;
- fechamento sem motivo bloqueado;
- mensagem após fechamento bloqueada;
- oito eventos visíveis ao ator interno;
- chamado final `CLOSED`.

## 7. Problemas encontrados e correções

### F-01 — aceite do cliente abortava auditoria

**Causa:** `accept_proposal` validava P15, mas auditava como ator `INTERNAL`.  
**Vacina:** reaplicação da VACINA-022.  
**Correção:** auditoria explícita `CLIENT`, com `client_id` real.  
**Migration:** `20260728232000_accept_proposal_client_audit.sql`.

### F-02 — `digest()` fora do `search_path`

**Causa:** funções `SECURITY DEFINER` chamavam função de extensão sem schema.  
**Vacina:** VACINA-032.  
**Correção:** `extensions.digest` em assinatura e relatórios.  
**Migration:** `20260728233000_qualify_pgcrypto_functions.sql`.

### F-03 — sandbox concluía envelope, mas não contrato

**Causa:** sandbox e webhook duplicavam a transição com efeitos diferentes.  
**Vacina:** VACINA-033.  
**Correção:** RPC única `complete_signature_business_state`.  
**Migration:** `20260728234000_signature_business_completion.sql`.

### F-04 — autoaprovação de compra

**Causa:** capacidade de aprovar era confundida com independência.  
**Vacina:** VACINA-034.  
**Correção:** solicitante e selecionador não podem decidir a aprovação.  
**Migration:** `20260728235500_procurement_segregation_of_duties.sql`.

### F-05 — `CASE` textual em coluna enum

**Causa:** ramos de `CASE` eram resolvidos como `text`.  
**Vacina:** VACINA-035.  
**Correção:** casts explícitos em Recebimento e Diário.  
**Migration:** `20260729000500_typed_enum_state_transitions.sql`.

### F-06 — importação de estoque usava coluna inexistente

**Causa:** consulta presumiu `created_at` em `procurement_receipt_items`.  
**Vacina:** VACINA-036.  
**Correção:** ordem por `procurement_request_items.line_number`.  
**Migration:** `20260729001500_inventory_receipt_line_order.sql`.

## 8. Estado de notificações reais

O catálogo de eventos e o roteamento estão implementados, mas a organização
Innovar possui zero linhas em `operational_responsibilities`. Consequências:

- profissional não consegue originar evento como persona;
- o sistema não possui destinatário nominal;
- alertas não representam a operação real;
- atribuir todas as personas às contas administrativas seria falsa evidência.

Para remover o bloqueio é necessário cadastrar pessoas reais, persona exercida,
escopo de obra, substituto e SLA. Até isso ocorrer, a conclusão é:

```yaml
resultado: BLOCKED_CONFIGURATION
componente: responsabilidades operacionais da organização Innovar
motivo: nenhuma pessoa real atribuída às personas P1-P16
```

## 9. Itens ainda não avaliados em profundidade

Não foram declarados aprovados nesta rodada:

- upload real de PDF pela interface e gateway de segurança;
- conversão assíncrona de documentos e artefato final;
- assinatura por provedor externo real;
- propostas e contratos com múltiplos signatários e recusa;
- aditivo completo após a centralização da assinatura;
- cronograma com folga total, nivelamento, PERT, DSM e corrente crítica;
- qualidade FVS/FVM, instrumento vencido, lote e CAPA;
- estoque com lote, validade, conversão de unidade, rejeição parcial,
  inventário físico e concorrência;
- compras com múltiplos fornecedores, equalização completa, fornecedor único,
  fracionamento de alçada e entrega atrasada;
- financeiro com aprovação independente, baixa parcial, estorno, conciliação,
  conta bancária alterada e inadimplência;
- anexos reais do SAC e reincidência;
- permissões detalhadas de cada uma das 16 personas;
- testes visuais autenticados em todos os breakpoints;
- Object Runtime e Studio;
- papéis P17–P22 ainda declarados como lacunas.

Esses itens permanecem `NOT_ASSESSED`, `PARTIAL` ou `BLOCKED_EXTERNAL`, conforme
o caso. A campanha não está concluída.

## 10. Próxima rodada obrigatória

1. provisionar responsabilidades reais ou uma organização exclusiva de QA;
2. consolidar os cenários SQL desta rodada em runner reproduzível no GitHub
   Actions;
3. executar uploads e documentos no deployment autenticado;
4. aprofundar Qualidade, Financeiro, Estoque e Planejamento;
5. repetir advisors, CI, Vercel e logs após cada correção;
6. manter o loop até não haver `FAIL` e até cada `NOT_ASSESSED` ter teste ou
   justificativa material.
