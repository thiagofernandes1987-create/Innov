# VACINA-022 — Persona e autorização coerentes

**Estado:** aplicada
**Detectada em:** S-30, runner de cenários das 16 personas

## Qual foi o problema

A matriz dizia que o cliente (P15) originava o evento de decisão ou contexto,
mas a RPC aceitava somente membros internos. A rotina era válida no documento e
impossível no produto. Ao liberar o cliente sem outra regra, ele poderia tentar
representar uma profissão interna.

## Como ocorreu

O domínio de notificações foi modelado a partir de profissões. A autorização
inicial tratou “evento operacional” como sinônimo de “evento interno”, embora
uma das dezesseis profissões seja externa e use o portal.

## Por que aconteceu

Persona, papel de associação e identidade do ator foram validados em camadas
separadas, sem uma invariável que obrigasse as três a concordar.

## Como foi detectado

O teste PostgreSQL executou a rotina pessimista da P15 sob a identidade real de
um membro `CLIENTE`. A RPC negou a criação; depois da primeira correção, a RLS
também escondia do cliente o fato que ele próprio havia criado.

## Qual foi a solução

- P15 só pode ser atribuída a associação ativa com papel `CLIENTE`;
- uma associação `CLIENTE` não pode receber P1–P14 ou P16;
- cliente origina somente evento cujo catálogo declara P15 como ator;
- profissional interno não pode se passar por cliente;
- o autor sempre lê o próprio fato, sem ganhar acesso aos fatos internos;
- a página administrativa e o banco aplicam a mesma regra.

## Ocorrência adicional — aceite de proposta em 28/07/2026

A campanha QA reproduziu a mesma causa raiz fora do domínio de notificações.
`accept_proposal` validava corretamente `is_client_owner()` e gravava o aceite,
mas chamava `write_audit`, cujo ator padrão é `INTERNAL`. O livro de auditoria
recusava a transação inteira com “Organização inválida para auditoria”.

A solução vigente foi reaplicada, sem criar um segundo padrão:

- o aceite permanece exclusivo do proprietário do cliente;
- `record_audit_event` recebe `actor_type='CLIENT'` e o `client_id` real;
- o portal não ganha leitura do livro interno;
- a identidade administrativa confirma o evento com ator, cliente e recurso;
- o cenário segue até contrato, assinatura, obra e financeiro.

## Varredura e ocorrências equivalentes

As dezesseis rotinas foram cruzadas com os papéis. P15 é a única cadeira
externa. A divulgação de notificações continua separada: cliente destinatário
só recebe recorte com `client_approved = true`.

A ocorrência de aceite também levou à revisão das RPCs externas que escrevem
auditoria. `rate_sac_ticket` já usa `is_client_owner`; novos fluxos externos não
podem chamar o atalho interno `write_audit`.

## Prevenção automática

`pnpm test:db:operations` executa 14 casos, incluindo criação legítima da P15,
tentativa de representar o SAC, leitura do fato próprio e isolamento dos demais
fatos. A migration mantém guard no cadastro de responsabilidades.

O E2E comercial passa a exigir que o aceite gere evento com
`actor_type='CLIENT'`, `actor_user_id` do cliente e `client_id` correspondente.

## Limitações da prevenção

O teste prova a fronteira de papel e organização. Consentimento, termos do
portal e rate limiting são controles de outra camada.
