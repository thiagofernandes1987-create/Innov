@execution-evidence
Feature: Reproducible execution evidence
  Rule: Evidence is tenant isolated and append-only
    @REQ-NFR-001 @SCN-BDD-EVID-001
    Scenario: Record a passing gate with artifact checksum
      Given a tenant execution evidence context
      When a PASS result with a valid SHA-256 is recorded
      Then the evidence is queryable by campaign and gate
    @REQ-NFR-001 @SCN-BDD-EVID-002
    Scenario: Reject an invalid checksum
      Given a tenant execution evidence context
      When evidence is submitted with a malformed checksum
      Then validation rejects the evidence
    @REQ-NFR-001 @SCN-BDD-EVID-003
    Scenario: Reject mutation of recorded evidence
      Given an execution evidence record exists
      When an update is attempted
      Then the database trigger rejects the mutation
    @REQ-NFR-001 @SCN-BDD-EVID-004
    Scenario: Reject deletion of recorded evidence
      Given an execution evidence record exists
      When a deletion is attempted
      Then the database trigger rejects the mutation
    @REQ-RLS-001 @SCN-BDD-EVID-005
    Scenario: Hide evidence from another tenant
      Given evidence belongs to tenant A
      When tenant B lists execution evidence
      Then no tenant A evidence is disclosed
  Rule: Runtime configuration is validated before deployment
    @REQ-NFR-001 @SCN-BDD-EVID-006
    Scenario: Accept a complete development configuration
      Given the canonical execution environment example
      When environment validation runs
      Then validation passes
    @REQ-NFR-001 @SCN-BDD-EVID-007
    Scenario: Reject a pool with maximum below minimum
      Given an invalid database pool configuration
      When environment validation runs
      Then validation fails closed
    @REQ-NFR-001 @SCN-BDD-EVID-008
    Scenario: Reject retry maximum below retry base
      Given an invalid retry configuration
      When environment validation runs
      Then validation fails closed
  Rule: External integration evidence never defaults to pass
    @REQ-NFR-001 @SCN-BDD-EVID-009
    Scenario: PostgreSQL unavailable is blocked
      Given TEST_DATABASE_URL is absent
      When the PostgreSQL evidence gate runs
      Then the gate exits BLOCKED
    @REQ-NFR-001 @SCN-BDD-EVID-010
    Scenario: Kubernetes unavailable is blocked
      Given kubectl is unavailable
      When the distributed game day starts
      Then the game day exits BLOCKED
    @REQ-STATE-001 @SCN-BDD-EVID-011
    Scenario: XState package unavailable is blocked
      Given the official XState runtime is unavailable
      When the XState evidence gate runs
      Then the gate exits BLOCKED
    @REQ-NFR-001 @SCN-BDD-EVID-012
    Scenario: SDK generation is deterministic
      Given the OpenAPI contract is unchanged
      When the SDK operation manifest is generated twice
      Then both generated artifacts are byte identical
