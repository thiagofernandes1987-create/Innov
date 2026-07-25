Feature: Command idempotency

  @REQ-IDEMP-002 @SCN-BDD-IDEMP-001
  Scenario: Same key and payload replays the original response
    Given a completed command with an idempotency key
    When the same key and payload are submitted again
    Then the original response is returned

  @REQ-IDEMP-003 @SCN-BDD-IDEMP-002
  Scenario: Same key with a different payload is rejected
    Given a completed command with an idempotency key
    When the same key is reused with a different payload
    Then the API returns a deterministic conflict

  @REQ-IDEMP-001 @REQ-IDEMP-002 @SCN-BDD-IDEMP-003
  Scenario: Concurrent command with the same key reports operation in progress
    Given an idempotent command is still running
    When the same key and payload are submitted concurrently
    Then the duplicate request reports operation in progress
