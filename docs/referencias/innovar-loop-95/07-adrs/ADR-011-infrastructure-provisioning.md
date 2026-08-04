# ADR-011 — Infrastructure provisioning boundary

**Status:** OPEN_EXTERNAL_DECISION

Helm describes workloads but not the cloud/network/database/broker/registry substrate. Creating generic Terraform/OpenTofu modules without provider, regions, SLA, network topology, IAM, state backend, encryption and managed-service decisions would fabricate completeness.

## Decision required outside this environment

- cloud/provider and accounts;
- regions and failure domains;
- managed versus self-hosted PostgreSQL/Redpanda/Redis;
- network, DNS and ingress;
- IAM/OIDC and secrets manager;
- remote state, locking and encryption;
- backup/restore and disaster recovery objectives;
- cost and environment isolation.

After approval, implementation must pass `tofu fmt`, `tofu validate`, policy checks and a reviewed plan before any apply.
