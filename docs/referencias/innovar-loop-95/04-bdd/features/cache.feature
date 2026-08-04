Feature: Metadata cache behavior

  @REQ-CACHE-001 @SCN-BDD-CACHE-001
  Scenario: Metadata invalidation removes stale entries
    Given cached metadata exists for an object version
    When metadata.changed.v1 is consumed
    Then the stale cache entry is removed

  @REQ-CACHE-001 @SCN-BDD-CACHE-002
  Scenario: Redis unavailable does not fabricate a successful invalidation
    Given the cache dependency is unavailable
    When metadata invalidation is attempted
    Then the operation reports dependency unavailability
