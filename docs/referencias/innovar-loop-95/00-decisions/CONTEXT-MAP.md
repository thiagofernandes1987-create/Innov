# Context Map canônico

| Contexto upstream | Contexto downstream | Relação | Contrato | Consistência |
|---|---|---|---|---|
| Identity | Tenant & Entitlements | Customer/Supplier | JWT claims | forte por request |
| Tenant & Entitlements | Object Runtime | Conformist | policy decision | forte |
| Object Runtime | Work OS | Published Language | domain events | eventual |
| Workflow | Approval | Customer/Supplier | command + event | forte/eventual |
| Domain Apps | Event Platform | Open Host Service | outbox envelope | at-least-once |
| Event Platform | Projections | Published Language | AsyncAPI | eventual |
| Solution Packaging | Object Runtime | Anticorruption Layer | package plan | forte por instalação |
| Experience Runtime | Platform APIs | Conformist | OpenAPI | request/response |
| Construction Pack | Platform Kernel | Customer | capabilities | não acopla core |

Escrita direta cross-context é proibida. Cada row de negócio possui owner context explícito.
