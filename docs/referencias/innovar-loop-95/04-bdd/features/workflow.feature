Feature: Workflow behavior

  @REQ-WF-001 @SCN-BDD-WF-001
  Scenario: Complete draft can be submitted
    Given a draft has required fields and the expected version
    When submit is requested
    Then the workflow enters review

  @REQ-WF-001 @SCN-BDD-WF-002
  Scenario: Rejection without a reason is denied
    Given a workflow is under review
    When rejection is requested without a reason
    Then the transition is rejected

  @REQ-APP-001 @SCN-BDD-WF-003
  Scenario: Approval over limit requires approval path
    Given the amount exceeds the direct approval limit
    When the workflow is submitted
    Then it waits for approval rather than completing directly
