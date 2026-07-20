# Etapa 15 — Financeiro Operacional

## Objetivo

Entregar o ciclo financeiro operacional da plataforma:

`contrato/pedido/medição → lançamento → parcelas → aprovação → liquidação → fluxo de caixa por obra`.

A Etapa 9 permanece responsável por formação de preço, propostas, contratos e aditivos. A Etapa 15 transforma esses compromissos em contas operacionais reais.

## Escopo entregue

- contas a pagar e receber;
- lançamentos manuais;
- importação idempotente de pedidos de compra;
- importação idempotente do cronograma base de contratos;
- parcelas com vencimento, juros, multa, desconto, valor liquidado e saldo;
- aprovação financeira;
- liquidação parcial ou integral;
- comprovantes privados;
- categorias financeiras;
- centros de custo;
- contas de caixa, banco ou carteira digital;
- medições de obra;
- retenções e deduções;
- recebível automático após aprovação da medição;
- fluxo de caixa mensal previsto e realizado;
- saldo acumulado e necessidade máxima de caixa;
- auditoria por eventos;
- módulo plug-and-play sensível.

## Domínio persistido

Tabelas:

1. `finance_categories`
2. `finance_cost_centers`
3. `finance_cash_accounts`
4. `finance_measurements`
5. `finance_measurement_items`
6. `finance_entries`
7. `finance_installments`
8. `finance_approvals`
9. `finance_settlements`
10. `finance_attachments`
11. `finance_events`

Visões:

- `finance_entry_balances_v`
- `finance_cash_flow_monthly_v`

Bucket privado:

- `finance-attachments`

## Estados dos lançamentos

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `PARTIALLY_SETTLED`
- `SETTLED`
- `OVERDUE`
- `CANCELED`

A soma das parcelas deve ser igual ao total do lançamento antes do envio para aprovação.

## Aprovação

O lançamento em rascunho gera uma aprovação pendente. A decisão exige simultaneamente:

- acesso ao módulo financeiro;
- capacidade `approve`;
- capacidade para visualizar dados sensíveis.

Rejeição devolve o lançamento ao rascunho. Aprovação libera as parcelas para baixa.

## Liquidação

Cada baixa registra:

- parcela;
- valor;
- data e hora;
- forma de pagamento ou recebimento;
- conta de caixa opcional;
- referência;
- observações;
- comprovante opcional.

O banco bloqueia valores acima do saldo da parcela. O status do lançamento é recalculado após cada baixa.

## Integração com Compras

Um pedido aprovado pode gerar uma única conta a pagar. A função:

`create_finance_entry_from_procurement_order`

copia obra, fornecedor, valor, moeda, condições e referência do pedido. O parcelamento é criado server-side e a importação é idempotente.

## Integração com Contratos

Um contrato válido pode gerar um único cronograma financeiro base. A função:

`create_finance_entry_from_contract`

usa o valor consolidado, incluindo aditivos aplicados. Receitas adicionais ou por avanço físico devem ser registradas por medição.

## Medições

A medição contém:

- obra;
- contrato;
- cliente;
- período;
- vencimento;
- itens medidos;
- quantidades anteriores, atuais e acumuladas;
- preço unitário;
- valor bruto;
- retenções;
- deduções;
- valor líquido.

A aprovação da medição cria automaticamente uma conta a receber aprovada e uma parcela no vencimento informado.

## Fluxo de caixa

O fluxo mensal combina:

- parcelas para o previsto;
- liquidações para o realizado.

Indicadores:

- entrada prevista;
- saída prevista;
- saldo previsto;
- entrada realizada;
- saída realizada;
- saldo realizado;
- menor saldo projetado;
- necessidade máxima de caixa;
- meses com saldo negativo.

O fluxo pode ser consolidado ou filtrado por obra.

## Segurança

- RLS em todas as tabelas;
- módulo marcado como sensível;
- leitura exige `can_view_sensitive`;
- escrita exige nível `EDIT` e acesso sensível;
- aprovação exige `can_approve`;
- Storage privado;
- comprovantes servidos por URL assinada de curta duração;
- Service Role somente no servidor;
- eventos financeiros rastreáveis;
- visões com `security_invoker=true`.

## Perfis padrão

- Super Admin: completo;
- Direção: completo e aprovação;
- Administrador: completo e aprovação;
- Financeiro: completo e aprovação;
- Orçamentista: leitura sensível e exportação;
- demais perfis: sem acesso inicial.

## Rotas

- `/app/financeiro`
- `/app/financeiro/lancamentos`
- `/app/financeiro/lancamentos/novo`
- `/app/financeiro/lancamentos/[id]`
- `/app/financeiro/medicoes`
- `/app/financeiro/medicoes/nova`
- `/app/financeiro/medicoes/[id]`
- `/app/financeiro/fluxo-de-caixa`
- `/app/financeiro/configuracoes`
- `/api/financeiro/anexos/[id]`

## Fora da Etapa 15

- conciliação bancária automática;
- importação OFX;
- CNAB;
- Open Finance;
- PIX cobrança automatizado;
- emissão de boleto;
- emissão de nota fiscal;
- escrituração contábil;
- plano de contas contábil completo;
- integração com bancos;
- contas recorrentes automáticas;
- tesouraria multiempresa avançada.
