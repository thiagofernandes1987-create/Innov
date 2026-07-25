Feature: SLA business time

  @REQ-SLA-001 @SCN-BDD-SLA-001
  Scenario: Paused time is excluded
    Given an SLA clock is paused with a reason
    When wall-clock time advances
    Then paused time is not added to business elapsed time

  @REQ-SLA-001 @SCN-BDD-SLA-002
  Scenario: Holidays are excluded
    Given the explicit business calendar marks a holiday
    When elapsed business time is calculated
    Then the holiday contributes no business seconds
