# Docker harness status

- `api` is a self-contained reference `event_admin` build and requires a signed trusted-proxy context secret.
- `postgres`, `redis`, `redpanda` and exposed ports are restricted to `127.0.0.1` and explicit development/integration profiles.
- `worker` remains `BLOCKED_UNTIL_DIGEST_AND_LOCK`: the package intentionally does not fabricate a PostgreSQL driver lock or OCI digest without a trusted registry.
- Do not treat successful Compose parsing as proof of service integration.
