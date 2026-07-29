# VACINA-041 — Alçada não é somente campo

**Estado:** vigente  
**Detectada em:** campanha QA de Propostas, 29 de julho de 2026

## Qual foi o problema

A interface não permitia desconto e o domínio não possuía limite, aprovação,
segregação ou trilha. Adicionar apenas um campo percentual permitiria que a
regra fosse contornada por RPC, API ou edição direta.

## Como ocorreu

Preço final era copiado do orçamento sem uma entidade própria para a decisão de
desconto. Não existiam valor-base, percentual, valor descontado, justificativa,
solicitante, aprovador ou decisão.

## Por que aconteceu

Uma condição comercial foi tratada como cálculo de tela, e não como controle de
negócio com autoridade e evidência.

## Como foi detectado

O usuário solicitou autonomia até 7% e aprovação da diretoria acima desse limite.
A inspeção confirmou que nenhum dos dois caminhos existia.

## Qual foi a solução

- `base_price`, `discount_rate`, `discount_amount` e `sale_price` são gravados;
- até 7% recebe `APPROVED_BY_POLICY`;
- acima de 7% exige justificativa e cria decisão `PENDING`;
- somente `SUPER_ADMIN` ou `DIRECAO` decide;
- solicitante não aprova a própria exceção;
- decisão exige comentário;
- aprovação do desconto não aprova proposta sem PDF final;
- alteração de versão exige nova decisão.

## Varredura e ocorrências equivalentes

A regra foi confrontada com Orçamentos, Propostas, Contratos e auditoria. O
valor aprovado fica congelado no snapshot da proposta e não acompanha mudanças
posteriores do orçamento.

## Prevenção automática

`pnpm validate:flexible-workflows` exige o limiar de 7%, bloqueio de
autoaprovação, dois modos de precificação e máquina de estado que preserva
proposta incompleta como rascunho.

Os cenários PostgreSQL validam 5%, 7%, 8% sem motivo, 8% com motivo,
autoaprovação e decisão por segundo ator.

## Limitações da prevenção

A primeira regra é global em 7%. Perfis com alçadas diferentes exigirão tabela
de políticas por organização, função, moeda, valor e tipo de proposta, sem
remover a segregação registrada aqui.
