Feature: Concurrency controls

  @REQ-CONC-001 @SCN-BDD-CONC-001
  Scenario: Only one optimistic update wins
    Given two writers use the same expected version
    When both updates are committed concurrently
    Then only one update succeeds

  @REQ-QUOTA-001 @SCN-BDD-CONC-002
  Scenario: Quota reservation is atomic
    Given a tenant is one unit below its quota
    When two reservations race for the final unit
    Then at most one reservation succeeds
