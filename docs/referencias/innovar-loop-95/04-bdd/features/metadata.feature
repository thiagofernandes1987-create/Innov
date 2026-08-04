Feature: Metadata definitions

  @REQ-META-001 @SCN-BDD-META-001
  Scenario: Published object versions are immutable
    Given an object version is published
    When mutation is attempted
    Then the immutable version is rejected

  @REQ-QUOTA-001 @SCN-BDD-META-002
  Scenario: Object creation beyond quota is rejected
    Given a tenant has reached the object quota
    When another object is created
    Then quota enforcement rejects the command

  @REQ-META-002 @SCN-BDD-META-003
  Scenario: Invalid object key is rejected
    Given an object key violates the canonical pattern
    When object creation is requested
    Then contract validation rejects the key
