Feature: Tenant isolation

  @REQ-RLS-001 @SCN-BDD-TEN-001
  Scenario: Cross-tenant read is denied
    Given a row belongs to organization A
    When organization B queries the same identifier
    Then the row is not disclosed

  @REQ-TEN-001 @SCN-BDD-TEN-002
  Scenario: Organization context is derived server-side
    Given an authenticated organization context
    When a command contains a conflicting client tenant value
    Then the server uses the authenticated organization context
