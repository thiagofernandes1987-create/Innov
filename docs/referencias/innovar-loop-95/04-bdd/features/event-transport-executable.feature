Feature: Transporte de eventos executável
  @REQ-EVT-001 @SCN-BDD-EVT-003
  Scenario: rollback do agregado também remove evento e outbox
    Given uma transação de agregado, evento e outbox
    When a transação sofre rollback
    Then nenhuma das três mudanças permanece

  @REQ-EVT-001 @SCN-BDD-EVT-004
  Scenario: dois publishers não reivindicam a mesma mensagem
    Given uma mensagem pendente no outbox
    When dois publishers reivindicam concorrentemente
    Then somente um publisher recebe a mensagem

  @REQ-DLQ-001 @SCN-BDD-EVT-005
  Scenario: replay de DLQ exige escopo administrativo, motivo e idempotência
    Given uma mensagem aberta na DLQ
    When o replay administrativo é solicitado duas vezes com a mesma chave
    Then somente um efeito de publicação ocorre

  @REQ-EVT-002 @SCN-BDD-EVT-006
  Scenario: consumidor duplicado não reaplica efeito
    Given um evento já processado pelo consumidor
    When o mesmo event_id é entregue novamente
    Then o efeito é aplicado uma única vez
