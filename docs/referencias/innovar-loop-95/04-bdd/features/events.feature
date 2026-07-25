Feature: Domain event delivery

  @REQ-EVT-001 @SCN-BDD-EVT-001
  Scenario: Aggregate and outbox are atomic
    Given a domain command starts a transaction
    When persistence fails before commit
    Then neither aggregate change nor outbox message remains

  @REQ-EVT-002 @SCN-BDD-EVT-002
  Scenario: Duplicate consumer delivery applies one effect
    Given an event has already been processed by a consumer
    When the same event_id is delivered again
    Then the business effect is not applied again
