Feature: Object definition lifecycle
  @REQ-META-003 @SCN-BDD-LIFE-001
  Scenario: Publish an object under the expected version
    Given a valid object definition in review
    When publish is requested with the expected version
    Then the published transition is accepted and persisted

  @REQ-CONC-001 @REQ-META-003 @SCN-BDD-LIFE-002
  Scenario: Reject a stale transition
    Given an object definition version has advanced
    When a transition uses a stale expected version
    Then the transition is rejected with VERSION_CONFLICT

  @REQ-META-001 @SCN-BDD-LIFE-003
  Scenario: Reject mutation of a published version
    Given an object version is published
    When a mutation is attempted
    Then the immutable version trigger rejects it
