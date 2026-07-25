# INNOVAR EXECUTABLE SPEC AUTO12
## Inventário Mestre — Rodada 1

**Objeto:** `INNOVAR_EXECUTABLE_SPEC_AUTO12_100_RODADAS_2026-07-22.zip`  
**SHA-256:** `a38dfbac3ff539c1adc1aa4b1a692f4fc2661b5b0ffa0056faaefe73d03b0fb7`  
**Total de arquivos:** **355**

## Sumário
- [1. Inventário por extensão](#1-inventário-por-extensão)
- [2. Inventário por domínio](#2-inventário-por-domínio)
- [3. Contratos e componentes](#3-contratos-e-componentes)
- [4. Evidências executadas](#4-evidências-executadas)
- [5. Inventário integral](#5-inventário-integral)

## 1. Inventário por extensão

| Extensão | Quantidade |
|---|---:|
| `.txt` | 94 |
| `.md` | 83 |
| `.json` | 46 |
| `.py` | 35 |
| `.yaml` | 30 |
| `.pyc` | 19 |
| `.sql` | 13 |
| `.ts` | 13 |
| `.feature` | 11 |
| `.sh` | 3 |
| `.example` | 2 |
| `.js` | 2 |
| `.yml` | 2 |
| `.puml` | 1 |
| `.tmp` | 1 |

## 2. Inventário por domínio

| Domínio | Arquivos |
|---|---:|
| `audit` | 161 |
| `tests` | 25 |
| `scripts` | 21 |
| `05-infra` | 20 |
| `02-events` | 18 |
| `01-db` | 14 |
| `04-bdd` | 13 |
| `00-decisions` | 10 |
| `07-adrs` | 10 |
| `06-sdk` | 9 |
| `03-statecharts` | 7 |
| `01-api` | 5 |
| `05-config` | 5 |
| `[raiz]` | 5 |
| `bdd_steps` | 5 |
| `02-commands` | 4 |
| `09-runbooks` | 4 |
| `traceability` | 4 |
| `06-adapters` | 3 |
| `event_admin` | 3 |
| `capabilities` | 2 |
| `event_publisher` | 2 |
| `reference_runtime` | 2 |
| `tools` | 2 |
| `.github` | 1 |

## 3. Contratos e componentes

- OpenAPI `3.1.0`: **12 operações**, 13 component schemas.
- AsyncAPI `3.0.0`: **7 canais**, 6 operações, 4 canais sem operação.
- PostgreSQL: **19 tabelas**, 23 definições de função, 3 triggers, 17 policies detectadas.
- Statecharts: **5 máquinas**, 2 registradas.
- BDD: **11 features**, 152 cenários, 38 corpos únicos.
- Terraform/OpenTofu: **0 arquivos**.


### 3.1 Operações OpenAPI

| Método | Path | operationId | Responses |
|---|---|---|---|
| POST | `/v1/objects` | `createObjectDefinition` | 201, 409, 422, 429 |
| GET | `/v1/objects` | `listObjectDefinitions` | 200 |
| POST | `/v1/objects/{objectKey}/records` | `createRecord` | 201, 409, 422 |
| GET | `/v1/objects/{objectKey}/records` | `listRecords` | 200 |
| PATCH | `/v1/objects/{objectKey}/records/{recordId}` | `updateRecord` | 200, 401, 403, 409, 412, 428 |
| GET | `/v1/work-inbox` | `getWorkInbox` | 200 |
| POST | `/v1/objects/{objectKey}/transitions` | `transitionObjectDefinition` | 200, 401, 403, 409, 412, 422, 428 |
| GET | `/v1/admin/events/dlq` | `listDeadLetters` | 200, 401, 403 |
| POST | `/v1/admin/events/dlq/{deadLetterId}/replay` | `replayDeadLetter` | 202, 409, 422 |
| POST | `/v1/admin/events/dlq/{deadLetterId}/resolution` | `resolveDeadLetter` | 200, 409, 422 |
| GET | `/v1/admin/execution-evidence` | `listExecutionEvidence` | 200, 401, 403 |
| POST | `/v1/admin/execution-evidence` | `recordExecutionEvidence` | 201, 409, 422 |

### 3.2 Operações AsyncAPI 3

| Operação | Action | Canal |
|---|---|---|
| `publishMetadataObjectCreated` | `send` | `#/channels/metadataObjectCreated` |
| `consumeMetadataObjectCreated` | `receive` | `#/channels/metadataObjectCreated` |
| `publishMetadataObjectTransitioned` | `send` | `#/channels/metadataObjectTransitioned` |
| `consumeMetadataObjectTransitioned` | `receive` | `#/channels/metadataObjectTransitioned` |
| `publishExecutionEvidenceRecorded` | `send` | `#/channels/executionEvidenceRecorded` |
| `consumeExecutionEvidenceRecorded` | `receive` | `#/channels/executionEvidenceRecorded` |

### 3.3 Tabelas SQL

| Tabela | Fonte |
|---|---|
| `platform.organizations` | `01-db/migrations/0001_core.sql` |
| `platform.idempotency_store` | `01-db/migrations/0001_core.sql` |
| `platform.domain_events` | `01-db/migrations/0001_core.sql` |
| `platform.domain_events_default` | `01-db/migrations/0001_core.sql` |
| `platform.outbox_messages` | `01-db/migrations/0001_core.sql` |
| `platform.consumer_inbox` | `01-db/migrations/0001_core.sql` |
| `platform.tenant_quotas` | `01-db/migrations/0001_core.sql` |
| `metadata.object_definitions` | `01-db/migrations/0001_core.sql` |
| `metadata.object_versions` | `01-db/migrations/0001_core.sql` |
| `metadata.object_fields` | `01-db/migrations/0001_core.sql` |
| `metadata.records` | `01-db/migrations/0001_core.sql` |
| `work.work_items` | `01-db/migrations/0001_core.sql` |
| `work.work_item_user_state` | `01-db/migrations/0001_core.sql` |
| `platform.state_machine_instances` | `01-db/migrations/0003_runtime_hardening.sql` |
| `platform.state_machine_transitions` | `01-db/migrations/0003_runtime_hardening.sql` |
| `platform.dead_letter_messages` | `01-db/migrations/0003_runtime_hardening.sql` |
| `platform.dead_letter_replays` | `01-db/migrations/0009_dlq_admin_runtime.sql` |
| `execution_evidence` | `01-db/migrations/0010_execution_evidence_ledger.sql` |
| `runtime_configuration_audit` | `01-db/migrations/0012_runtime_configuration_audit.sql` |

## 4. Evidências executadas nesta Rodada

| Verificação | Resultado | Observação |
|---|---|---|
| validate_all.py | **PASS** | Retornou 0, resultado interno PARTIAL devido BDD |
| unittest tests | **PASS** | 70 testes |
| unittest bdd_steps | **PASS** | 8 testes |
| BDD event transport | **PARTIAL** | 2 PASS, 2 BLOCKED PostgreSQL |
| SDK drift | **PASS** | dist corresponde ao gerado |
| TypeScript SDK compile | **PASS** | tsc global 5.8.3 |
| pytest | **FAIL** | INTERNALERROR por sys.exit(77) na coleta |
| PostgreSQL | **BLOCKED** | TEST_DATABASE_URL ausente |
| Helm oficial/kubeconform/Kubernetes | **BLOCKED** | ferramentas/cluster ausentes |
| XState npm runtime | **BLOCKED** | dependências não resolvidas no ambiente |

## 5. Inventário integral

| # | Caminho | Bytes | SHA-256 |
|---:|---|---:|---|
| 1 | `.github/workflows/executable-spec-integration.yaml` | 1843 | `7e1bcf96fd38095da1ffe43d714266a833fe5da74dfd92daf79f1bb164c28b46` |
| 2 | `00-decisions/ARCHITECTURE-GOVERNANCE.md` | 698 | `2b518c1c19be29c3b833c38c02d8c44201a8136ac9f3979cd9ff3168fdcbb7a9` |
| 3 | `00-decisions/CONTEXT-MAP.md` | 987 | `8edfd8c248ebb3e07f525f69551c7a7ca3c16a62762fe12dda11beecf23d9440` |
| 4 | `00-decisions/CONVENTIONS.md` | 1294 | `caf94a57bbbadbc1f19eccfe7d732ae678888576e59c37980a0e06d823a84c4a` |
| 5 | `00-decisions/COVERAGE-CHECKLIST.yaml` | 1056 | `ddf20dfaf987635b8f7bb018549e7c06bba18be1379b12e22ccdd7407e0f6845` |
| 6 | `00-decisions/DELIVERY-AND-CANONICAL-SOURCE.md` | 1003 | `ebb63a3133cee46d55f0e53d84cbd999121dd9b0387648d793dca0a59c669d14` |
| 7 | `00-decisions/INVARIANTS.yaml` | 1107 | `a657f5417db1dc82b87c1b5b9d522786c6430d252af5da0a7a075263da6fa9fa` |
| 8 | `00-decisions/METRICS-AND-ANTI-REGRESSION.yaml` | 2966 | `f8bfa69ab34db2af2bfebb5bccf14d8fd7181b38c3d478aac3d26bbee6835fec` |
| 9 | `00-decisions/NFR-SLO-CATALOG.yaml` | 612 | `799c8ed035c010173ec5ffd8e1787274fa035331e8d21a59539962c0b471518f` |
| 10 | `00-decisions/error-catalog.yaml` | 870 | `cd3e5842f03663fd020b3f32c5830397b2444afe6478a11de06d35e52d0b66bb` |
| 11 | `00-decisions/requirements.yaml` | 1274 | `ba7d6deead5adcc039b50cdc9644f01c4cdc9f4c31006a03519ec84a0adb6aa8` |
| 12 | `01-api/openapi.yaml` | 19303 | `c0a5111fc88cb4912b09631a472ec890c3d9ad8e3164f8886bd72fc06e0d5f21` |
| 13 | `01-api/schemas/dlq-replay-request.schema.json` | 451 | `498ad210ad50f5551a191127601b5ec052ddb4e1a9920b7d6992eea9cd958145` |
| 14 | `01-api/schemas/dlq-resolution-request.schema.json` | 417 | `5b8cb60c7ae6c1193f73a4589ceaa3b465b58a6af76050abbe8f7feb544d12e1` |
| 15 | `01-api/schemas/execution-evidence.schema.json` | 678 | `40d89a60bfa58205c4e962b736e318f4677e39b8fcf1657c159257147c44fa5c` |
| 16 | `01-api/schemas/transition-request.schema.json` | 1030 | `b685c896b152086560525df179689aec6dc12957e31529f51356f1ccb099a498` |
| 17 | `01-db/migrations/0001_core.sql` | 9780 | `54843efa8ba64a5b7d3456d45122216c1c01584e9f491b787e2fa3b8b1410b58` |
| 18 | `01-db/migrations/0002_functions.sql` | 1618 | `07a269b94c3ab4d24557439a77de2320e07c25ee3b59655ce323c48f98c9a06f` |
| 19 | `01-db/migrations/0003_runtime_hardening.sql` | 1948 | `0c0fb1664f7f16dfd444d781e2229baeaf32a96ca48752431859c04ef3752dde` |
| 20 | `01-db/migrations/0004_evidence_hardening.sql` | 2759 | `12634aeae65c640aa6eb1183e6df6267464e2c8867b798be16f59631735d56ce` |
| 21 | `01-db/migrations/0005_security_contract_hardening.sql` | 1557 | `96f8669d4e13cf3afbe28656cf2e475359f6e7ecb7892c7d1aed65822e37986a` |
| 22 | `01-db/migrations/0006_tenancy_and_function_signature_hardening.sql` | 3366 | `b17b2e74739ac038964dac3dcb5bc92d08b6524e17734aa78f08a86b490ad919` |
| 23 | `01-db/migrations/0007_event_transport_execution.sql` | 8482 | `32dd201966ae0b574379bd3b1b56a0588dca1c97faab7db9752d0c79bca61ce6` |
| 24 | `01-db/migrations/0008_event_transport_security_and_retry_hardening.sql` | 6143 | `4c56676f555cbff4eb66ee1ce60cc0dce8b97ce34fcd69718e715ddb228a04d6` |
| 25 | `01-db/migrations/0009_dlq_admin_runtime.sql` | 5306 | `2eb641fa40477643dd7d42abf5410c6e70b75b16f4749e76acfa71a79b88bdb2` |
| 26 | `01-db/migrations/0010_execution_evidence_ledger.sql` | 1228 | `8b8408d96c63f43c6c76a436a367b3cbc7c2de65342d42fd454cd4b00cb77528` |
| 27 | `01-db/migrations/0011_event_transport_operational_triggers.sql` | 798 | `3d0b3dcbd09a2260ad7d63db208b50d7fd038b3500d8133a16c58338985f2a65` |
| 28 | `01-db/migrations/0012_runtime_configuration_audit.sql` | 771 | `5c2781344ace8c1e432931892dcf00d19c427a768d58d046a7b311298d1bf7b6` |
| 29 | `01-db/migrations/EXPAND-CONTRACT-PLAYBOOK.md` | 911 | `edabbda3673912a0c07d079d87b3bfce57c7df5ea55acc187d2c8cac3211fbe9` |
| 30 | `01-db/rls/0001_rls.sql` | 3874 | `d780ea1ace741318f9a14178ace40f59fe8e781276470599be7140bd49dd3c6e` |
| 31 | `02-commands/schemas/create-object.command.v1.schema.json` | 940 | `83894d82929115140acc68a4376ce0031857a39587b58bb5297cfd3d8a37c116` |
| 32 | `02-commands/schemas/create-record.command.v1.schema.json` | 410 | `089f02b2f69d25f38ffb6529f17b3b21b55d4324cddebcb26fde21877b1a54ad` |
| 33 | `02-commands/schemas/publish-object.command.v1.schema.json` | 557 | `f62b73654215b66b89983508245b4c4ffa3a2eec1e556227130014783c3f946d` |
| 34 | `02-commands/schemas/update-record.command.v1.schema.json` | 489 | `a2cb6b9478f01d56f230076f9b8ff33df6652ac6a8e0bcaabb071cc1c458c369` |
| 35 | `02-events/RETRY-IDEMPOTENCY.md` | 941 | `80ea222483b9f985bd7a8b882caa880fdab24729509d08ba79aab98dba433c71` |
| 36 | `02-events/asyncapi.yaml` | 3007 | `7fd5f1bb38253ca590e86b973afa86bc938ac4f09caec6e472e08aab1fb9d264` |
| 37 | `02-events/compatibility-baseline/envelope.v1.schema.json` | 2492 | `4adbbe22143f138ad9b6ca984124c4d94062a1a341db9a7ab2dd476b7694b763` |
| 38 | `02-events/compatibility-baseline/metadata/metadata.object.created.v1.schema.json` | 690 | `edb73dd1e9359ed1d5ded571dcf980f1cdaf659b8451cd42574890ef5c0a45cf` |
| 39 | `02-events/compatibility-baseline/metadata/metadata.object.published.v1.schema.json` | 560 | `a146d5bf826bc2495af13f683c4801934372b72b9928960607a14d42c5a8b48a` |
| 40 | `02-events/compatibility-baseline/metadata/metadata.object.transitioned.v1.schema.json` | 1024 | `90f7a0ce657b71a9938723c64ce30bee6ca8993e448f22fbe51852604bb1e011` |
| 41 | `02-events/compatibility-baseline/metadata/metadata.record.created.v1.schema.json` | 597 | `ed53832ef5c22a4d05e887ff26fddb977434e45ddc05a61f73ebcfae51ac5838` |
| 42 | `02-events/compatibility-baseline/platform/platform.quota.exceeded.v1.schema.json` | 589 | `d094e5b541b8de1639e49943ad28d6591491f899c7492f87d5f11cea42edf43e` |
| 43 | `02-events/compatibility-baseline/platform/work.item.projected.v1.schema.json` | 819 | `3d2471f0fd0d4b8cf9db235473c071fac3a9e7d8eb3aaae3a2d63170d6eaf1ec` |
| 44 | `02-events/compatibility-policy.yaml` | 443 | `9b0a04fadc86a46597f80433838b560e4e5dc64925a40e0a3e7a21a257aa058e` |
| 45 | `02-events/schemas/envelope.v1.schema.json` | 2492 | `4adbbe22143f138ad9b6ca984124c4d94062a1a341db9a7ab2dd476b7694b763` |
| 46 | `02-events/schemas/metadata/metadata.object.created.v1.schema.json` | 690 | `edb73dd1e9359ed1d5ded571dcf980f1cdaf659b8451cd42574890ef5c0a45cf` |
| 47 | `02-events/schemas/metadata/metadata.object.published.v1.schema.json` | 560 | `a146d5bf826bc2495af13f683c4801934372b72b9928960607a14d42c5a8b48a` |
| 48 | `02-events/schemas/metadata/metadata.object.transitioned.v1.schema.json` | 1024 | `90f7a0ce657b71a9938723c64ce30bee6ca8993e448f22fbe51852604bb1e011` |
| 49 | `02-events/schemas/metadata/metadata.record.created.v1.schema.json` | 597 | `ed53832ef5c22a4d05e887ff26fddb977434e45ddc05a61f73ebcfae51ac5838` |
| 50 | `02-events/schemas/platform/execution.evidence.recorded.v1.schema.json` | 712 | `ff21afc2fe83d1568f058fccb5352323a2ec932958fd59597c0e8a1ae71099b6` |
| 51 | `02-events/schemas/platform/platform.quota.exceeded.v1.schema.json` | 589 | `d094e5b541b8de1639e49943ad28d6591491f899c7492f87d5f11cea42edf43e` |
| 52 | `02-events/schemas/platform/work.item.projected.v1.schema.json` | 819 | `3d2471f0fd0d4b8cf9db235473c071fac3a9e7d8eb3aaae3a2d63170d6eaf1ec` |
| 53 | `03-statecharts/STATE-MIGRATION-REGISTRY.yaml` | 329 | `5f8d8e0bce5e7a1c08b092b6125513c1e8f9f93a495afe45d37f117f04003fdf` |
| 54 | `03-statecharts/plantuml/workflow.puml` | 556 | `39e747fdc5764850b83a1d70644b4a957d270934998df1e2724d9b8f29335a47` |
| 55 | `03-statecharts/xstate/approval.machine.ts` | 1816 | `ae0466b439a08d2a87af7d3b9d86a544773d6ec7b2fe8e7b8815b429be2c9655` |
| 56 | `03-statecharts/xstate/event-transport.machine.ts` | 1728 | `ac648eefe15e3eceedc6cd14d46b2c7d9dfb3cde0fa3eccce2df6c25175b9fe9` |
| 57 | `03-statecharts/xstate/object-definition.machine.ts` | 1610 | `3520beae76dd1808cd09c0cb35334d84d8ad2eb976fafc9814342904d0cb79e1` |
| 58 | `03-statecharts/xstate/sla.machine.ts` | 1561 | `066b63c1b247d4e2d54725fdfe389973ee19f31053528f22f05e80893be47b42` |
| 59 | `03-statecharts/xstate/workflow.machine.ts` | 2083 | `b2cdc397bfa72745a0c92f728c4c660bdb5d07180ff9caa6634adb967ad1d4fe` |
| 60 | `04-bdd/BINDING-REGISTRY.yaml` | 165 | `5cd3ceb623f5f6758e779baad83ab6d7582371458ae7429f63e84ecc09625f54` |
| 61 | `04-bdd/README.md` | 272 | `55a006d5ef7b7503a6ed54abc226fcd1a7a7ef0987a4ee82aca7f55574664a69` |
| 62 | `04-bdd/features/cache.feature` | 2976 | `bc5b264a16d9e4535dfd8082612310060db87499dae07eb2f06fd7c9d751897c` |
| 63 | `04-bdd/features/concurrency.feature` | 3437 | `f8d6fb8eb380596174771022cb56a3401c0ba406deb0b38a1bf797d703974d2e` |
| 64 | `04-bdd/features/event-transport-executable.feature` | 985 | `633c8c19a52cc7bdefff12664eb09b70707b24b9d15669e26fdbbc4213968860` |
| 65 | `04-bdd/features/events.feature` | 2872 | `01b15b2b7d9a3149f76dc6fd31f35a6b00b1cea20cdaa5587625131f63007bec` |
| 66 | `04-bdd/features/execution-evidence.feature` | 2449 | `55bb981b3e1aa919e06d54f85896066dc51f38aff0422e620f2284ff055eb65e` |
| 67 | `04-bdd/features/idempotency.feature` | 5404 | `ca94a1aad12779489a5b2289ad60a97999a9faa0118bf27419178d7a2647eebb` |
| 68 | `04-bdd/features/metadata.feature` | 4512 | `a363230c639c12b478dfa6b245dfa3e57d4322a2bfcbd9158c396dff5055f644` |
| 69 | `04-bdd/features/object-lifecycle.feature` | 900 | `15f3c992db29b7b98e387476af4113d1907f2cdbbc418d2f8be7434ff5eff09d` |
| 70 | `04-bdd/features/sla.feature` | 2701 | `7f9cd8195b9eebfd9619407a327c4f3eded6788ab8c9ebb116532f771e1ffb13` |
| 71 | `04-bdd/features/tenancy.feature` | 3384 | `3e559b54a3d8a83f50f8de58f884889ffb8268d9f34a27d12150cad805d01b8c` |
| 72 | `04-bdd/features/workflow.feature` | 4463 | `707a1462e99bca04914257dc2a1e4b80984d5130a191f12ba42b829342ad6b11` |
| 73 | `05-config/.env.example` | 682 | `7b630d8cc7103060403f0e4416894ca78f7bd45feb478627357748921f719d48` |
| 74 | `05-config/.env.execution-evidence.example` | 664 | `47172175b5398a9c9a30bc5acfa8c174759963d6f681b8b1a53efb0c1cdae6fc` |
| 75 | `05-config/CACHE-POLICY.md` | 642 | `e40b1bbe32642a93d0e3db72761e39d994dabc36aa08f7d737983f77a576e2b5` |
| 76 | `05-config/config.schema.json` | 2008 | `293bd1f1bb6a6ca8a91a35d831ae64af766d663c868c4da92c227cdad6b08066` |
| 77 | `05-config/execution-evidence-env.schema.json` | 2220 | `26945ba1fb8654f0fa3f008aa370a78ac8304ee75bf38b95d5e4b608102ab4c8` |
| 78 | `05-infra/contracts/dependency-label-contract.yaml` | 719 | `77ee2d744fdc92560928b226cd238526536d4b9419bf9c26d9f50722167271ec` |
| 79 | `05-infra/docker/docker-compose.event-transport.yml` | 870 | `4b76c7b3b365ff4aa5891c45e49a658ad67cad40204c10b0f5dc279b7b14cd7f` |
| 80 | `05-infra/docker/docker-compose.yml` | 1051 | `7f69a58908d2af8e83087529dd5922382d9c08b4c225efbf6ecf5fe0941c6f6d` |
| 81 | `05-infra/helm/Chart.yaml` | 142 | `8c2660fa98fec649a2f77bf7bcdb8023badc9e66453d575ccbb4bbdc888fce3e` |
| 82 | `05-infra/helm/templates/configmap.yaml` | 275 | `6d3f5baa58c7039013615a5772ed9d1cccf9aab2a81627ab5c7157c0fac34505` |
| 83 | `05-infra/helm/templates/deployment.yaml` | 1093 | `d4d1281248ac92d8a7a534958d3a4bc958b013bfd54b93f0968f57c9032ef659` |
| 84 | `05-infra/helm/templates/event-publisher-deployment.yaml` | 2007 | `05e62b7a91a49f5c3884ee4cdf59ffe9ee0bd764b7f2bc3f56750881edafcdb8` |
| 85 | `05-infra/helm/templates/event-publisher-hpa.yaml` | 670 | `44e7cb264811e6ec70432e7b21489db9b8d2dae1dd4064e17dc5bd025520a445` |
| 86 | `05-infra/helm/templates/networkpolicy.yaml` | 1730 | `77e4c136627cb17d6f919e4e03327e61c42da6ef5e6fbd392e498babc59a05d8` |
| 87 | `05-infra/helm/templates/pdb.yaml` | 197 | `2ebd9cb6e1fde1117ac31bf75d3aa22a2c73d2db12b2033171aefee6c6ae24dd` |
| 88 | `05-infra/helm/templates/service.yaml` | 205 | `036e20eba0b93b78bc2c3367060dc5973da201cfdf41605d19eeba548c1706b5` |
| 89 | `05-infra/helm/templates/serviceaccount.yaml` | 110 | `5e84a1913126b80859e776de38675375bbb2252fb4e55deadb1aa600c5eb49ad` |
| 90 | `05-infra/helm/templates/worker-deployment.yaml` | 1036 | `38969c4f9f9041a04a2b891105bb34940c5e903ec80f96dbe252fc366e299126` |
| 91 | `05-infra/helm/values.yaml` | 1335 | `852371da04c3e22232c8f11b9691652f8588d208bcec23327fd1e8ab82ff2646` |
| 92 | `05-infra/kubernetes/execution-evidence-job.yaml` | 1138 | `fffc31f8e525f13effa953b8842577dde7c6b66f95ce787a3ac0466b0324f990` |
| 93 | `05-infra/kubernetes/networkpolicy-evidence-default-deny.yaml` | 210 | `7b27029ffe8760dfd9a75668d6653c7ae4b5f581b2883a05dba468116c08c163` |
| 94 | `05-infra/kubernetes/networkpolicy-evidence-egress.yaml` | 809 | `549407096f5253ec9b7f07704e58e2472482ae152db6643ea92b5026349d4623` |
| 95 | `05-infra/runbooks/break-glass.md` | 582 | `886d37dcec5b0815f70f8a22b67ad08bd8e518145d63f2a468f71d5be3079163` |
| 96 | `05-infra/runbooks/dlq.md` | 753 | `25c47027f4eff71d81ae5873348feb2662f76e15e71e987b6caafd2bf1b8155c` |
| 97 | `05-infra/runbooks/worker-queue-stalled.md` | 494 | `35d9a20905c936e9e32088f84373a1c0810d6a52143847be9991fc5f0b1acd17` |
| 98 | `06-adapters/contracts/cache.ts` | 322 | `883df8ea663f61412239c98786c7b2931e5149544ba40287b7cefe694535be01` |
| 99 | `06-adapters/contracts/event-bus.ts` | 314 | `9dae496bbcc7abe5c377ceb03332e2313a1b3144ff31146c76d6603b19f168c2` |
| 100 | `06-adapters/contracts/storage.ts` | 331 | `7b5af13adfbf4ec84732d2ee9b8fa32d3cdf9a8a16064c5926df93ef79cbe24a` |
| 101 | `06-sdk/generated/openapi-operations.json` | 1603 | `7eb971df6192be4132c07e930bec414e0630efdaa2500ee5d7cfcf4d889988ea` |
| 102 | `06-sdk/typescript/dist/index.d.ts` | 1861 | `47058bd9dda91b5cd524f5919925a755a7d88e479f09a674e0f40a55668bfdb2` |
| 103 | `06-sdk/typescript/dist/index.js` | 2384 | `df40526389c24158a9e7831945b0f108633f139e15a1f4ffa72a5d442b3f971c` |
| 104 | `06-sdk/typescript/dist/lifecycle.d.ts` | 420 | `2fb0eb2243a2685dc14d8753d5c2dfa6455a5712529ea2d2c74ca3817c6a31c4` |
| 105 | `06-sdk/typescript/dist/lifecycle.js` | 583 | `1d08869afdd56ad17358badc3038aab6b295598e7318cfbe38f66e60aa6d768c` |
| 106 | `06-sdk/typescript/package.json` | 318 | `b8a04569d69113f639fadd5c34d4ba4741f8be8bcb9695426895585597814aa9` |
| 107 | `06-sdk/typescript/src/index.ts` | 3834 | `4d03f810e99edc65a9b287c8e6fbc8943874fd7e15d5c15a117e9bc70d93828b` |
| 108 | `06-sdk/typescript/src/lifecycle.ts` | 820 | `ec63b59459dc9d936fb2f437b574e0824edb766f348163d522f0f40761c72114` |
| 109 | `06-sdk/typescript/tsconfig.json` | 213 | `7d3a808dbd8bf72cda3ab79baf65f89b346a06ddfeb8b3cbea10e7e6a5f9c5da` |
| 110 | `07-adrs/ADR-001-tenancy.md` | 320 | `1a45729d1c39e9a65321d9725e8ee3bbaf6a8ad4c1dfe1fc97b158f4f549b5d7` |
| 111 | `07-adrs/ADR-002-object-storage.md` | 351 | `041c9a0a533897b05d6033bcfff63b55eb4263b162358543f0a6ec25f658f1f6` |
| 112 | `07-adrs/ADR-003-concurrency.md` | 286 | `d3905317b2fda6a78e0925feaccbe5751a2628975f7f3a882719c1d87e0dccd5` |
| 113 | `07-adrs/ADR-004-idempotency.md` | 268 | `e4acdc5485c03073678e1dbfedfca8c198e3757fe1cc33d85913989ecc2a60cd` |
| 114 | `07-adrs/ADR-005-events.md` | 245 | `d7cad68ef8f92d4d3edcab621650acd90f5f00d920ebca7a0ac6bc08c39f4315` |
| 115 | `07-adrs/ADR-006-cache.md` | 254 | `ca4b7d1aece77104d70284e854ddd563e77cf8def10dd6d96e28f9cc646dda03` |
| 116 | `07-adrs/ADR-007-api.md` | 264 | `b4f8b0e7bf4b8d7e4fc8cc3bfdc4fbe43dee62b1c31fdc4c3e8c206eee66b630` |
| 117 | `07-adrs/ADR-008-statecharts.md` | 256 | `1ea800d6dc2ac95a65b6671fbc9603e5aa57f6febf90e55fd677ab581e3efd05` |
| 118 | `07-adrs/ADR-009-migrations.md` | 270 | `56db0de2f2081b11f804bf0a0e3614dc4d6842213bf8db0ef1862f5001daebe9` |
| 119 | `07-adrs/ADR-010-i18n.md` | 269 | `04b6d83a900fe107918a299d4c7d3c4be9d360709f9c27ff79037799b0749aa9` |
| 120 | `09-runbooks/event-transport-game-day.md` | 1186 | `874b918ffc29014c511d0d689f3ccfa7fc871c0e7b63846728d447abb762e458` |
| 121 | `09-runbooks/execution-evidence-campaign-v2.md` | 1171 | `90626a7f6e5cea252caf6db4a0696c00f203857366dac7eea3e9a23badd8f273` |
| 122 | `09-runbooks/integration-evidence-gate.md` | 1645 | `c2aad52cfcba0f125cc839e39af059b31bbf48727da99a549562ca0ce57a56fc` |
| 123 | `09-runbooks/object-definitions.md` | 1281 | `a4c806514e46eadac01991ae859651943649e3bdac30b4ac44730aadceb696ec` |
| 124 | `INNOVAR_PLATFORM_BLUEPRINT_EXECUTAVEL.md` | 49711 | `71cc6bf787d3b4d38f48cd371ae7d2ebc237f94e5174c1bfebece53d593f93bf` |
| 125 | `README.md` | 816 | `7ba2ec54baeaa46a80ed287b8a34c5c2a090edd5cd9a38aa412a0bedc033d013` |
| 126 | `SHA256SUMS.txt` | 35667 | `721c8814b0a481879aa34fc056f99cfd2fd416d9ac6a81112e7308666f3a39be` |
| 127 | `STATUS.md` | 370 | `2984ca7d7a8b6e06f42e2353f6cebe59b8f0e3b3adfcdadef8f2f850b41f8071` |
| 128 | `audit/AUDITORIA-IMPARCIAL-RESTART-4-LOOPS.md` | 3790 | `0256dad6f2f3f1758340dfefc7648535bf02fb656e10d29fce3964df13abeaee` |
| 129 | `audit/AUDITORIA-INDEPENDENTE-AUTO10-RECONSTRUIDO.md` | 1053 | `e1abb5e32dfdcb5a631a252efa7a11dec4cd4acb1e5b3111cf335f47e63495ca` |
| 130 | `audit/AUDITORIA-INDEPENDENTE-AUTO11.md` | 1146 | `0401905e19a23af2b0f6c69587507df58a20adb9f1ac38df4f8de74d7b8951cf` |
| 131 | `audit/AUDITORIA-INDEPENDENTE-AUTO12.md` | 413 | `cd93ac3c3e0d3c1590d661d35d6a2ead481471c97a6d1d61444815c08db1a1a3` |
| 132 | `audit/AUDITORIA-INDEPENDENTE-AUTO6.md` | 1036 | `5d92fa6d0248afcf4240a7b834ce8578d797e146e27f44d4b166378618fcc9bc` |
| 133 | `audit/AUDITORIA-INDEPENDENTE-AUTO9-RECONSTRUIDO.md` | 680 | `ef37d8c3704073b8bd802538209d9bb32a81f62a023e6532f4fd596488b571b4` |
| 134 | `audit/AUDITORIA-INDEPENDENTE-CICLO-ATUAL.md` | 2248 | `5da742780709c9588a5e3b3da369cbe7868d293ea57714b73c67dec045b42743` |
| 135 | `audit/AUDITORIA-INDEPENDENTE-CICLO-AUTO4.md` | 1394 | `e6ae6eb953d966c4d3de740f096cf8966f98cf0bc01a0e1756f757545a2adeef` |
| 136 | `audit/AUDITORIA-INDEPENDENTE-EVENT-TRANSPORT-FOCUS.md` | 1131 | `769acfeebeeb1adc7a8f7fe8f664357010381eab7d0229d5e9b0658b9b5d54ca` |
| 137 | `audit/AUDITORIA-INDEPENDENTE-EVENT-TRANSPORT-GAMEDAY.md` | 996 | `e7432df5cbed2162ffd0379ac2588f6c3a6a7d67199f1282ab405d1640fc51ff` |
| 138 | `audit/AUDITORIA-INDEPENDENTE-REAUDITORIA-CIRURGICA.md` | 2045 | `49df32c5cac6d623aa71bce35809be11ef9745e91c85853c5ac6ecbbbbd8a76c` |
| 139 | `audit/AUDITORIA-INDEPENDENTE-RECONSTRUCAO-AUTO5.md` | 1128 | `71e33e22ed70e2892bb5746beed5b929639c92ffbde1a31ae383907207a24f2b` |
| 140 | `audit/AUDITORIA-INDEPENDENTE-REINICIO-CIRURGICO.md` | 1803 | `50a119a06119e6446703ebd4715bca9baf35a37f5a3406c07cd2827e0034ebcf` |
| 141 | `audit/AUDITORIA-METRICAS-ANTI-REGRESSAO.md` | 894 | `aed01829c411233724685bb71b4b1fc609e30525fdf7f1d1ef3c6d73aa755073` |
| 142 | `audit/AUDITORIA-VERTICAL-OBJECT-DEFINITIONS.md` | 1138 | `111b8d0803e961df1effecfe349a6e9a7542a0771bfc01cb240130aac26f435b` |
| 143 | `audit/AUTO10-EVENT-COMPATIBILITY.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 144 | `audit/AUTO10-HELM-STATIC.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 145 | `audit/AUTO10-SDK-DRIFT.txt` | 59 | `ed4e78d6c7074c0e4b3c717ba9a0676997b452ad82602d4aae7f8135d8ea92f7` |
| 146 | `audit/AUTO10-TESTS.txt` | 7827 | `7769ccc6facbbc3b72525828145c22303e60ae11e8cfeee3c8786a02816d6405` |
| 147 | `audit/AUTO10-TRACEABILITY-MATRIX.txt` | 64 | `f7eeeea702cae9b5dc8ef3c74b5bb353335f30a7332a7f980c25791f276b9e19` |
| 148 | `audit/AUTO10-VALIDATE-ALL.txt` | 11668 | `130a83853239bfe53bab756a65386676e9873442ff68fe154dc1a244ac0d4ba7` |
| 149 | `audit/AUTO11-BASELINE-TESTS.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 150 | `audit/AUTO11-ENV-CONTRACT.txt` | 48 | `b56555268148cf92b1eef8e5ba4878a2b41cd16dee322b478a26c9bdd4715aa9` |
| 151 | `audit/AUTO11-EVENT-COMPATIBILITY.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 152 | `audit/AUTO11-EXECUTION-PREFLIGHT.txt` | 21 | `7d3c3c852c85bef59dcbb4b86aeb7bc2bdbee280b040c9d0a729bc9f32fcdee6` |
| 153 | `audit/AUTO11-GHERKIN-COVERAGE.txt` | 160 | `509c981f2fbe58508ca4b7972bcadb9b6b369bcef333b9d5845b20cbf864bb1c` |
| 154 | `audit/AUTO11-HELM-STATIC.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 155 | `audit/AUTO11-REQUIREMENT-TRACEABILITY.txt` | 87 | `7651f769e249723bba868d2dbb7d639703f634efd5d13b8607ee577f95bea346` |
| 156 | `audit/AUTO11-SDK-DRIFT.txt` | 763 | `c03e093f80d9e24188999c05fd2a41f884ee887e79a61c5d49ebecb095d10ae9` |
| 157 | `audit/AUTO11-TESTS.txt` | 48 | `98ad020670e818182307ffde346382a40d45e6d08f334ff60dbb1bd8b2acda69` |
| 158 | `audit/AUTO11-TRACEABILITY.txt` | 64 | `f7eeeea702cae9b5dc8ef3c74b5bb353335f30a7332a7f980c25791f276b9e19` |
| 159 | `audit/AUTO11-VALIDATE-ALL.txt` | 14208 | `5379c2393d423d267a344e2cb4b3cf9c3a59c1508508d004be439685b622c3d1` |
| 160 | `audit/AUTO12-100-ROUND-CAMPAIGN.json` | 25178 | `8db05f9fa77f33a1457cbc78d3cd39521026fe5ff4f839b45b6f267c0c0e745c` |
| 161 | `audit/AUTO12-BASELINE-TESTS.txt` | 9642 | `c03e5ae8ed06587fb7d30abe288b7daf92037c06c46306f829a68b49973b6bd5` |
| 162 | `audit/AUTO12-BASELINE-VALIDATE-ALL.txt` | 14208 | `36d6ba46d7d6629ed50598177783c3577f0d38e2e755f0f3ef108f2e0cf8d2bd` |
| 163 | `audit/AUTO12-CAMPAIGN-CONSOLE.txt` | 39 | `39de8a4b4745907ba7ace9d158eb9e276b40d33f1903681d3ffc3c9cc31d442e` |
| 164 | `audit/AUTO12-EVENT-COMPATIBILITY.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 165 | `audit/AUTO12-FINAL-TESTS.txt` | 9973 | `bb3d3145d7264cd0cbe36c3e3901df11f836de08d768974385c01c030187c228` |
| 166 | `audit/AUTO12-GAMEDAY-RUNTIME.txt` | 37 | `dc02775abe27fa266a5a08a966333073154736384312eaf3a5bbc3d651262ca6` |
| 167 | `audit/AUTO12-GHERKIN.json` | 160 | `509c981f2fbe58508ca4b7972bcadb9b6b369bcef333b9d5845b20cbf864bb1c` |
| 168 | `audit/AUTO12-HELM-STATIC.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 169 | `audit/AUTO12-LOAD-RUNTIME.txt` | 28 | `d0cd9d1026ea51eb8b02d343e5d13772d9eb459f788fe2082cdaeab76ecea866` |
| 170 | `audit/AUTO12-POSTGRES-RUNTIME.txt` | 62 | `7c302b708761658d7641c5ed4a786e835ca199365c861d768dc36a62ceeaf1f1` |
| 171 | `audit/AUTO12-SDK-DRIFT.txt` | 59 | `ed4e78d6c7074c0e4b3c717ba9a0676997b452ad82602d4aae7f8135d8ea92f7` |
| 172 | `audit/AUTO12-TRACEABILITY.txt` | 64 | `f7eeeea702cae9b5dc8ef3c74b5bb353335f30a7332a7f980c25791f276b9e19` |
| 173 | `audit/AUTO9-EVENT-COMPATIBILITY.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 174 | `audit/AUTO9-HELM-STATIC.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 175 | `audit/AUTO9-PREFLIGHT.json` | 503 | `0178eca32906afe2209687cadc1835890d5c4d6eed0167fa413cd198282f35dd` |
| 176 | `audit/AUTO9-SDK-DRIFT.txt` | 68 | `2ed9e3417f7d405a2e5859e5e8c341f5bfc11dadd5105298f6e094a7189f29bc` |
| 177 | `audit/AUTO9-TESTS-FINAL.txt` | 7191 | `9fbfd0a78b499db2764f192771798d13adaf1a1f0f7361415b07046b43e5dc63` |
| 178 | `audit/AUTO9-VALIDATE-ALL-FINAL.txt` | 10967 | `bdeba36d60dc8d726698bc18a60ebf77a03358c74eddf0ea3128eaf1ecb6bf63` |
| 179 | `audit/BDD-BASELINE-AUTO6.txt` | 1538 | `420d0c086dc44883c10c93a2dd319b8fc8974596477fc50c8f824f9d1fdb659d` |
| 180 | `audit/BDD-FINAL-AUTO6.txt` | 1538 | `cbe29363750938032691323770e4af6e556165859334c6e8819e839d88c970a7` |
| 181 | `audit/BDD-GHERKIN-BINDING-RESULT.json` | 1538 | `cbe29363750938032691323770e4af6e556165859334c6e8819e839d88c970a7` |
| 182 | `audit/BDD-GHERKIN-BINDING-RESULT.txt` | 1538 | `902f3b708e243b9fb9aeca5b9da64483278d0133476160532bc183970a0d917f` |
| 183 | `audit/BDD-STEPS-REBUILD-AUTO5.txt` | 752 | `59294fb5e240017cf0252949a554bf49f0275db636a666870525654245171716` |
| 184 | `audit/BDD-STEPS-RESULT.txt` | 550 | `34afbb09e3a1a61729440011ffa0b93064818769f150b82ff08f03b800c9d6a0` |
| 185 | `audit/COMPARATIVO-VERTICAL-1.md` | 733 | `4d7e960da7523aed7c32d6f1fe9343d77cabc7baf1167881ba3d7dccb25cc264` |
| 186 | `audit/EVENT-COMPATIBILITY-AUTO4.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 187 | `audit/EVENT-COMPATIBILITY-BASELINE-AUTO6.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 188 | `audit/EVENT-COMPATIBILITY-FINAL-AUTO6.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 189 | `audit/EVENT-COMPATIBILITY-FINAL-REBUILD-AUTO5.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 190 | `audit/EVENT-COMPATIBILITY-GAMEDAY.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 191 | `audit/EVENT-COMPATIBILITY-REBUILD-AUTO5.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 192 | `audit/EVIDENCE-CAMPAIGN-EVENT-COMPATIBILITY.txt` | 27 | `5b13346872586b537058933cd1463b53df7ce2137fa4fa7adbecd93e3b752cb1` |
| 193 | `audit/EVIDENCE-CAMPAIGN-FINAL-TESTS.txt` | 6813 | `a19c0f64ea94a5631a3af2d5934e8e99da3468d569cb59b2cab0e2f23e13e1fd` |
| 194 | `audit/EVIDENCE-CAMPAIGN-GHERKIN-COVERAGE.json` | 24561 | `12a51cdd622dd9297364efced26d9fe84aafc3ca85e79540c5e35a3c5c17a642` |
| 195 | `audit/EVIDENCE-CAMPAIGN-GHERKIN-COVERAGE.txt` | 160 | `37354ab66c961f81b5a28b92e5ce853a29654dca0a17b0113f085bc6290537ec` |
| 196 | `audit/EVIDENCE-CAMPAIGN-HELM-STATIC.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 197 | `audit/EVIDENCE-CAMPAIGN-LOCAL-TESTS.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 198 | `audit/EVIDENCE-CAMPAIGN-POSTGRES.txt` | 75 | `a54ec810ed4449f8f8ef3517e25796e6a5d13591d4c04b001203c96eb672ae59` |
| 199 | `audit/EVIDENCE-CAMPAIGN-PREFLIGHT.json` | 503 | `0178eca32906afe2209687cadc1835890d5c4d6eed0167fa413cd198282f35dd` |
| 200 | `audit/EVIDENCE-CAMPAIGN-SDK-DRIFT.txt` | 59 | `ed4e78d6c7074c0e4b3c717ba9a0676997b452ad82602d4aae7f8135d8ea92f7` |
| 201 | `audit/EVIDENCE-CAMPAIGN-SDK-TSC.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 202 | `audit/EVIDENCE-CAMPAIGN-XSTATE-RUNTIME.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 203 | `audit/EVIDENCE-RUBRIC.md` | 699 | `c702946201c2f8547e3d5e81258625c7cbae74f37e429df18197dce0d05f6ab3` |
| 204 | `audit/EXTERNAL-PREFLIGHT-AUTO6.json` | 503 | `0178eca32906afe2209687cadc1835890d5c4d6eed0167fa413cd198282f35dd` |
| 205 | `audit/GAMEDAY-CONSOLE-REBUILD-AUTO5.txt` | 389 | `72a69a333e47492bc217843cddd216d5bf3909ff3e594db6cd719243ff5ded5c` |
| 206 | `audit/GAMEDAY-CONSOLE.txt` | 363 | `658ccb2974b8e46dd9f46a8dd919705cb096ef58cdb495b942cd7cda485309ae` |
| 207 | `audit/GAMEDAY-REBUILD-AUTO5.json` | 389 | `72a69a333e47492bc217843cddd216d5bf3909ff3e594db6cd719243ff5ded5c` |
| 208 | `audit/GAMEDAY-RESULT-EVENT-TRANSPORT.json` | 389 | `72a69a333e47492bc217843cddd216d5bf3909ff3e594db6cd719243ff5ded5c` |
| 209 | `audit/GAMEDAY-RESULT-EVENT-TRANSPORT.txt` | 389 | `c167629bec9238607df68b4b2db7243696621c2436d4cdbcc5527e796fc4f488` |
| 210 | `audit/HELM-STATIC-AUTO4.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 211 | `audit/HELM-STATIC-BASELINE-AUTO6.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 212 | `audit/HELM-STATIC-FINAL-AUTO6.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 213 | `audit/HELM-STATIC-FINAL-REBUILD-AUTO5.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 214 | `audit/HELM-STATIC-REBUILD-AUTO5.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 215 | `audit/HELM-STATIC-RESULT.txt` | 29 | `dd1036d87926e16f0dfd2bc7e3dbcd61d5513959dbaf4cbe321c451ecd59ca0b` |
| 216 | `audit/LOOP-1.md` | 479 | `489f36b2e434c3c610395378f2383aa3714bec29d1848026b90d80e1ca3a6905` |
| 217 | `audit/LOOP-2.md` | 568 | `078e0e0b8543fb6fe8e615331342b2e25d15c733342ddcf73314b7c96e839ed1` |
| 218 | `audit/LOOP-3.md` | 542 | `39b53347e7d4c9820869ef2363c05c8a69c7c9d4297fc85f549d81524bba7675` |
| 219 | `audit/LOOP-4.md` | 284 | `054338e67fed440aa6246ba83c38def51872c67c8e496c0b091e05694c725130` |
| 220 | `audit/LOOP-5.md` | 242 | `9f321a5c5dcdbf70fe54429aae52c49973d4cb035f48e36dfe91e2623e727af8` |
| 221 | `audit/LOOP-6.md` | 230 | `6c2c308eb361da054ae0824a7207197c4c747b7c324aa75e802921c2404b538c` |
| 222 | `audit/LOOP-7.md` | 211 | `934b55cf7c0e238f689dc8790c97b871f6ec7619611e5ca84fc94da5beed091b` |
| 223 | `audit/LOOP-8.md` | 191 | `7b58345af9609f3eb72e86371c466f8438c24e009971acefaa24bf48ef98e525` |
| 224 | `audit/METRICS-SNAPSHOT-AUTO10-RECONSTRUIDO.json` | 439 | `66a7c65b802215d592c40d648f3d645ed97daec098918a99f014aa8e5d443378` |
| 225 | `audit/METRICS-SNAPSHOT-AUTO6.json` | 582 | `c63468a1099dee804b588cc594006c34352cbce19ffaf79565b42240c58e3bec` |
| 226 | `audit/METRICS-SNAPSHOT-EVENT-FOCUS.json` | 558 | `cbbd669cbf9e6e7904802488f46eeb605f496c8b7d51f6f39f7320132b120fdf` |
| 227 | `audit/METRICS-SNAPSHOT-EVENT-GAMEDAY.json` | 751 | `a98c06013f75255cc137a71c13b92de873933405bb2c6c252a5f56a241ca56e7` |
| 228 | `audit/METRICS-SNAPSHOT-REBUILD-AUTO5.json` | 927 | `c83b8f794361f4685c1fdc70753ee1767f846f4f5f89798748b8bc1f6098ac5f` |
| 229 | `audit/METRICS-SNAPSHOT-VERTICAL-1.json` | 574 | `5353a15937c7648ff47e5314700e103f4c90dd7bb3917f765216141de337112b` |
| 230 | `audit/METRICS-SNAPSHOT.json` | 900 | `4f889a729550c6ceda7905332b61537b823e1582c380ba8eeac5b83c94abb603` |
| 231 | `audit/PLAN-NEXT-EVENT-TRANSPORT-INTEGRATION.md` | 559 | `73cef64ad93d692835a111f96412299b1aee7b37fe6eb5ee1b0bd550adb292f7` |
| 232 | `audit/PLAN-NEXT-EVENT-TRANSPORT.md` | 519 | `bb4bc70d1c5b7bdef948ddbd17d23a81f37a25b467449af83577618e0ec171f2` |
| 233 | `audit/PLAN-NEXT-EXECUTION-EVIDENCE-CAMPAIGN.md` | 599 | `0eb5869df85cbb26cf5a6e1a507cd835ca1688ee821232341838c5a4478db25f` |
| 234 | `audit/PLAN-NEXT-LOOP-AUTO10-RECONSTRUIDO.md` | 673 | `62e3a6f1c1ae3065b2deea1d1d98ece23292b5ca177b84a2b7cb618eda11b8c8` |
| 235 | `audit/PLAN-NEXT-LOOP-AUTO11.md` | 747 | `8979b5cda08edb5df0ad5939d785a474a0cd6454146f5a824b59eea09c2ae0e3` |
| 236 | `audit/PLAN-NEXT-LOOP-AUTO12.md` | 564 | `595b1b28741ce8b0931fc5e2b72411ca1d0e105200ba0eb546f52cafdb384686` |
| 237 | `audit/PLAN-NEXT-LOOP-AUTO4.md` | 326 | `5a39468eaadfe11d87082d6aaf481ab540a4dd8b77b987510c9ff492165d2b7c` |
| 238 | `audit/PLAN-NEXT-LOOP-AUTO6.md` | 629 | `a4a5a2a89d1acc4d170e1bbcc5d037339e75961b9eb45a8684278cdf5ea63191` |
| 239 | `audit/PLAN-NEXT-LOOP-AUTO9-RECONSTRUIDO.md` | 595 | `45f64c3ceae0c936397693d0979f56943c22fdf0adde389910bd49020b4103e0` |
| 240 | `audit/PLAN-NEXT-LOOP-METRICS.md` | 454 | `c8a84aee635012c383763349c406beffaa3baa5001895adcf1eb2475ba3d270b` |
| 241 | `audit/PLAN-NEXT-LOOP-REBUILD-AUTO5.md` | 528 | `fe0b9083e2ecc6f13cb40a11c4dc83834d19f4cbd4515d75ff72b79b7d3b5207` |
| 242 | `audit/PLAN-NEXT-LOOP.md` | 688 | `9740e879ddd3e00e476ffdf70a91ca0f14f4ae3fa333f879e86ade6b08c9fd4c` |
| 243 | `audit/PLAN-NEXT-VERTICAL-LOOP.md` | 403 | `f12d972ab86ce899b67d46607f60a36ad9a8c34385b44c85ac7d49627249b9e2` |
| 244 | `audit/POSTGRES-INTEGRATION-EVENT-FOCUS.txt` | 59 | `38cd64e649d64d5a339cfc17d9e13cc085ebbd5b14bd989d29eb15cb7dc73439` |
| 245 | `audit/POSTGRES-INTEGRATION-REBUILD-AUTO5.txt` | 59 | `38cd64e649d64d5a339cfc17d9e13cc085ebbd5b14bd989d29eb15cb7dc73439` |
| 246 | `audit/RELATORIO-AUTO12-100-RODADAS.md` | 1080 | `745b07ac0dca758c893b7d45566908008e6740d39cf32f08c938a91b815dff2c` |
| 247 | `audit/RELATORIO-CICLO-COMPLETO-2026-07-22.md` | 1058 | `5362ae19ecb22a95bd6fe469ba7e176b93af86d50009b2727b2752f97edb278e` |
| 248 | `audit/RELATORIO-CICLO-COMPLETO-AUTO10-RECONSTRUIDO.md` | 1949 | `17f43e4ebbd230cc98af18a1a09b67916789fae419b93d20c5921cb77f316c8d` |
| 249 | `audit/RELATORIO-CICLO-COMPLETO-AUTO11.md` | 2235 | `a94fb098ebf6bed21a43b90e00b31a57c44f04f0adc1b5703c5c9bfa9479df08` |
| 250 | `audit/RELATORIO-CICLO-COMPLETO-AUTO4.md` | 645 | `13c3b06589a7eda2b7b9d045fbea921cffef25eff9eb4efbc5851acee7aaf9d2` |
| 251 | `audit/RELATORIO-CICLO-COMPLETO-AUTO6.md` | 1161 | `d8a6cc75247b54e7fd63ef0f22b5d0ecb03781f51f0518ab1eb02ca69a9bfef2` |
| 252 | `audit/RELATORIO-CICLO-COMPLETO-AUTO9-RECONSTRUIDO.md` | 1450 | `3d600dd34eeed8e48b8f06bfa6a283fb860d7e71379017f2f35018fdee1fd215` |
| 253 | `audit/RELATORIO-CICLO-EVENT-TRANSPORT-FOCUS.md` | 1872 | `8bdd4585f2c3584e079f52579d5ec4fc00588857bbca207c27455988b68d7813` |
| 254 | `audit/RELATORIO-CICLO-REINICIO-CIRURGICO.md` | 896 | `3242dc850c19da6fd9eb40dadcd639f9274a3dcc2c9afb00af98f5d655f97505` |
| 255 | `audit/RELATORIO-EVENT-TRANSPORT-GAMEDAY.md` | 1319 | `b7b13bd69d4fb67e54b6d98eb20408b9f8564488ac8fcdde2586f0a8e21ff240` |
| 256 | `audit/RELATORIO-EXECUTION-EVIDENCE-CAMPAIGN.md` | 2045 | `7a688353447268b31cb2dd67f0860f31dbb022e1a322673ddae8e12e2949326f` |
| 257 | `audit/RELATORIO-METRICAS-ANTI-REGRESSAO.md` | 1720 | `4b8b862baaebcca2924052eabcbc4b29c8cf5431090a5c333088239a673f53ce` |
| 258 | `audit/RELATORIO-RECONSTRUCAO-AUTO5.md` | 1503 | `810e3e52d92a9f8dff9f64185f933523343faca37919fe954e63a5376739483d` |
| 259 | `audit/SDK-TSC-AUTO4.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 260 | `audit/SDK-TSC-BASELINE-AUTO6.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 261 | `audit/SDK-TSC-FINAL-AUTO6.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 262 | `audit/SDK-TSC-FINAL-REBUILD-AUTO5.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 263 | `audit/SDK-TSC-REBUILD-AUTO5.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 264 | `audit/SDK-TSC-RESULT-CURRENT.txt` | 16 | `e2f6b6db4c58e2c470b8add601797ce2f6fb6a561672c885a884ecfafbd9d6f5` |
| 265 | `audit/SDK-TSC-RESULT-EVENT-FOCUS.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 266 | `audit/SDK-TSC-RESULT-GAMEDAY.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 267 | `audit/SDK-TSC-RESULT-METRICS.txt` | 73 | `14cb655f33ac4253b88d36ab80cccbf842c74081d807bcb12974fd2498f8559f` |
| 268 | `audit/SDK-TSC-RESULT-RESTART-3.txt` | 2 | `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa` |
| 269 | `audit/SDK-TSC-RESULT-RESTART.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 270 | `audit/SDK-TSC-RESULT-SURGICAL-RESTART.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 271 | `audit/SDK-TSC-RESULT-VERTICAL-1.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 272 | `audit/SHA256SUMS-AUTO12.txt` | 38034 | `c868d1ee1f4fcb7eafb972c82db4b83daca5df9d7f121160ef5dd21533e6a0f9` |
| 273 | `audit/VALIDATION-BASELINE-AUTO6.txt` | 8692 | `10defa8eb5e9175c03b8cbd901e0cc2c5c9af5dbf688a035141f4bfeca680440` |
| 274 | `audit/VALIDATION-FINAL-AUTO6.txt` | 9751 | `6159da04425a967726b0af90b783bc01bcc878df3b5ce2227740dd547cd9df58` |
| 275 | `audit/VALIDATION-FINAL-REBUILD-AUTO5.txt` | 8692 | `3ce047cfe5e7725eefd0250f259887407d75bdd52d6cbe0ac0c5819437adaeb8` |
| 276 | `audit/VALIDATION-RESULT-AUTO4.txt` | 7540 | `add704e973341bce23ef2c4136c05d538ed23d10a34b09a136cb4817455c4008` |
| 277 | `audit/VALIDATION-RESULT-CURRENT.txt` | 3543 | `52159b0f7fcd7e180a235201580e4246b33f751cc963ba02a81fa74fffca737e` |
| 278 | `audit/VALIDATION-RESULT-EVENT-FOCUS.txt` | 6866 | `39ca95f5177bb24b3368591a24ba7b8b1f23736647d00f1ac42758c689268db8` |
| 279 | `audit/VALIDATION-RESULT-GAMEDAY.txt` | 6978 | `1f9f280ec727afa2c41425d4de5c253ec22a5efa8215d0e79ed654a3d3e0ad9c` |
| 280 | `audit/VALIDATION-RESULT-METRICS.txt` | 6715 | `c90e73aa8ab67f1d64656a24e90fafafcab311d22e2bd86b851ca95181187007` |
| 281 | `audit/VALIDATION-RESULT-REBUILD-AUTO5.txt` | 8587 | `6f3b782ebc89067d2edc101f3d30fae3d40b8019d7b40bea653c2c0799b5bf74` |
| 282 | `audit/VALIDATION-RESULT-RESTART-3.txt` | 4467 | `4e30de3adcaf0386f2edb8e1e861f337887c80cb64b674a8daf5a4738cdf9135` |
| 283 | `audit/VALIDATION-RESULT-RESTART.txt` | 2551 | `7366a0ffbac3ff8526a0232083f7e7cc9bf339c40a645d08bd49e658e6306454` |
| 284 | `audit/VALIDATION-RESULT-SURGICAL-RESTART.txt` | 4069 | `7f061975c679b56f50817c616ddaaaec37e2a418cd450eb9a491b012352ba97a` |
| 285 | `audit/VALIDATION-RESULT-VERTICAL-1.txt` | 5114 | `69a1758a037956886dd69c1a986fdc0eeda0a2ce059e560ff8241dbe26e9ec63` |
| 286 | `audit/history/AUDITORIA-FINAL-4-LOOPS.md` | 1293 | `d049e2d193a49ebb0e6c3f928dfbb81ed9701ee2fb618fc8a88a9e28e10d1882` |
| 287 | `audit/history/SDK-TSC-RESULT.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 288 | `audit/history/VALIDATION-RESULT.txt` | 1708 | `ffa47a4b9955056babeda172e6ab0a7bee11a79c76a20d75592be20c64198e3f` |
| 289 | `bdd_steps/__pycache__/test_event_transport_steps.cpython-313.pyc` | 6512 | `a3c30157c541f3912ef2a77bbad6d7b0b41968f43155bcc1c3d6e56adecf0d78` |
| 290 | `bdd_steps/__pycache__/test_execution_evidence_steps.cpython-313.pyc` | 3545 | `4b6cd03b379e941f4df5e65c200894853fd39b2e120767f4014a118756274fea` |
| 291 | `bdd_steps/run_event_transport_feature.py` | 2017 | `b401eccf2b5cf51c2ffb874d743c9ca6fe2373eca46dca3042dbe129ad850ac6` |
| 292 | `bdd_steps/test_event_transport_steps.py` | 2261 | `2c6be11f66856de195ab1e2f1262630250e057e4dec4848341b56b0d219ad331` |
| 293 | `bdd_steps/test_execution_evidence_steps.py` | 1462 | `76f047a67f82ddcab1c663f3bff8cccad4fe2803647a81c817c4915e3c410f15` |
| 294 | `capabilities/event-transport/SPEC.md` | 1123 | `efb24b406a3b91907991f37cd433d7be28a33a817a059160b8e945d0acfaa0fc` |
| 295 | `capabilities/object-definitions/SPEC.md` | 2826 | `69cb029a82769174dd8531510365a3cc8bd5bbf5db0c2dde482a65e5cb1545c4` |
| 296 | `event_admin/__pycache__/server.cpython-313.pyc` | 12289 | `6f31f75941c98f530a498bbb90d62b08c5ad44cdc1f331475d8d010cd56b6d47` |
| 297 | `event_admin/postgres_store.py` | 2667 | `64855eef8a83101cccddeb4b6488f7dc99952695587831e9afe3368e83adf13f` |
| 298 | `event_admin/server.py` | 5270 | `7011b5a7c82d5de24e5de218ef5a9dfc3389bca7261bab812fea1357a047d760` |
| 299 | `event_publisher/__pycache__/redpanda_http_publisher.cpython-313.pyc` | 5000 | `edf36503f8abaf89dcaafcaaa7dac3b61dd4de1af4e56061a5fb9366723fe34e` |
| 300 | `event_publisher/redpanda_http_publisher.py` | 2140 | `baaff1db8b9ebbbe2670417b1f1e32e595f8c33ac39751e19ccaf148d68a7aab` |
| 301 | `package-lock.json` | 94 | `1496e95bff4335bcd4aa2f4d5969ad28e1b2bad5560c91a61483f3bb138a4ba3` |
| 302 | `reference_runtime/__pycache__/runtime.cpython-313.pyc` | 5590 | `92b024b847e64f806a392cac13d54bcc89f938c68555e72a111b26a971de8c97` |
| 303 | `reference_runtime/runtime.py` | 2874 | `f7b2627be1ce7d16385309c1fdb6422faac097ef5807a9845240f9bcd31d4914` |
| 304 | `scripts/__pycache__/check_event_compatibility.cpython-313.pyc` | 2632 | `f11de127d90d89f93f2c36f32b65dac35a0cd21457cb0d6225193fc99b6b63ce` |
| 305 | `scripts/__pycache__/test_postgres_event_transport.cpython-313.pyc` | 1415 | `af82975162fe3ddab00dc1ad84d2840e8bfdf7795540496e77e2a1768658b51d` |
| 306 | `scripts/audit_gherkin_coverage.py` | 1362 | `363451cb4f5fdc787b9916dc9084d4a8d91f38223d3bdfd596b4a0717c773def` |
| 307 | `scripts/check_event_compatibility.py` | 1098 | `41cb22a2fd16d021723f6f2479ab2ba874d804565951d64b9e8821d5a4ef27ac` |
| 308 | `scripts/check_sdk_drift.sh` | 453 | `3cc1ed7628e01b8537e7be72ffad2974408fc6a59d8101aa0ca22967802c9151` |
| 309 | `scripts/generate_sdk_contract.py` | 741 | `6131e5158317cb5f7a3a898098579d35086ec44143eb656fcde69a0d64e09074` |
| 310 | `scripts/load_event_admin.py` | 1117 | `7a0c93b093d4f7c9d5bf7118122c66e679aa5a7c84dcead6d84612e69fa7d841` |
| 311 | `scripts/measure_spec.py` | 2132 | `3c117ed2181db1c1dc5cd551aa1039afa820737e85b313787b94d3832c1b05a2` |
| 312 | `scripts/run_100_round_evidence_campaign.py` | 10149 | `9dca5ae6096d8322e059e050e387c8d58d9b319e7908b5e491151ab1937ce223` |
| 313 | `scripts/run_distributed_gameday.sh` | 1277 | `1c3c41cfc3fb98418901d6105b45ee2a982fbb2979d251f57cc7e5b1e1de5d99` |
| 314 | `scripts/run_event_transport_gameday.py` | 3396 | `3570ae89d0f4254f1c39f746519e9e2becf52f4c86d1e001ff5115fad1819825` |
| 315 | `scripts/run_three_phase_campaign.py` | 5273 | `4f45647c4d8bcb6278327fd59e7772f71bcd2579d4b95d34beb3358de2f790ea` |
| 316 | `scripts/test_postgres_event_transport.py` | 3988 | `f66bb68ef9a3870d335e490b8677330c86c28d273f04eeebf1a46ae0687c114e` |
| 317 | `scripts/validate_all.py` | 4594 | `ea20748c419a13a3e0f2b36686a72795329bec0f6e28414918b1be7e6fe4d3d6` |
| 318 | `scripts/validate_env_contract.py` | 2160 | `1baa68158df0806aabff11e91f6060a9425116317181898753012160abff1a5c` |
| 319 | `scripts/validate_execution_env.py` | 823 | `d1a1df73776ae99b04813475dcfc6ffddf456c4a278390cd7299cf2a2dfe69a1` |
| 320 | `scripts/validate_helm_static.py` | 1165 | `573fe7911d2f147b6a2520f6743907aac68dc4c89ff727444ee05fc44e9d3c44` |
| 321 | `scripts/validate_networkpolicy_targets.sh` | 911 | `afea35a6efe1ff146ad3ba38165401e7ac0ad9c12d9a2179c176c871829a5267` |
| 322 | `scripts/validate_requirement_traceability.py` | 1476 | `f0e5651d4a93faa6d1e638d7154fddb6a81a928e60ade6a4011aa4bfe0b46423` |
| 323 | `scripts/validate_runtime_prerequisites.py` | 940 | `e0d8ba2ea8a233624d1e0dc09a1ddcde60cd49a7e33315e1135f97178bf3c53a` |
| 324 | `scripts/validate_traceability_matrix.py` | 2135 | `cd9530801d50e6a6efeaa89e99f4c2ff208f4fc75cfcebf591fd78d798f66b42` |
| 325 | `tests/__pycache__/test_acceptance_runtime.cpython-313.pyc` | 6892 | `690ae7b301242d8336d27903f44f0b6426f202ab3acaa1ee9210f2c27af70edc` |
| 326 | `tests/__pycache__/test_auto10_traceability_integrity.cpython-313.pyc` | 3910 | `e3cf03a8e4b9286b1d844d55a086f26cf61a467e4dfd15216050b3aebd85e6aa` |
| 327 | `tests/__pycache__/test_auto11_contract_traceability.cpython-313.pyc` | 4051 | `8b801f7ddfff2ed0e91da8823a3dc7cc8398ae5ee46ff45110f766318fe39eda` |
| 328 | `tests/__pycache__/test_auto11_expansion.cpython-313.pyc` | 5859 | `b6acd9c8573d03e8fd5c38b4f271f544c780ae9e1d046ee3f1d4688d20282e4f` |
| 329 | `tests/__pycache__/test_auto12_100_round_campaign.cpython-313.pyc` | 2015 | `d26ae4182d96527766bc04047acdd38d43bdb88d4f414c3bd485ac1cfaf923e8` |
| 330 | `tests/__pycache__/test_auto5_rebuild.cpython-313.pyc` | 4384 | `a4824ccebfe4fc75a81a7bfaf9496bd968722330e5dd6538452a38b72792403e` |
| 331 | `tests/__pycache__/test_auto6_integration_readiness.cpython-313.pyc` | 3707 | `9695c0f10995cb70e1af5d2ac4a94fafde00bd549b7c2497cb710a76d1f4d902` |
| 332 | `tests/__pycache__/test_auto9_evidence_integrity.cpython-313.pyc` | 2203 | `ead46a1ee8b15a81199726c9e6dcd66345a4c410a49294787453f2f3a61fa39a` |
| 333 | `tests/__pycache__/test_contracts.cpython-313.pyc` | 13883 | `65e9c39942f65707947519aa75ebe70bdd79bb2d8b4ebe8c95bf3fb50680daa6` |
| 334 | `tests/__pycache__/test_event_admin_http.cpython-313.pyc` | 6251 | `ba2ad6be106002854678756eb030bb86e81715154f90fb2620d5e72002f9388a` |
| 335 | `tests/__pycache__/test_event_transport_focus.cpython-313.pyc` | 6421 | `d12bbf933f2b497728296460588ba0402ac61dd4c17f378b2901bb8e5a72ea95` |
| 336 | `tests/__pycache__/test_evidence_campaign.cpython-313.pyc` | 2209 | `3613054df28748b4bb70ba118928f1be9c64fe8bce6805d8d244088b486a945f` |
| 337 | `tests/test_acceptance_runtime.py` | 2206 | `96b7e3ecaf1cd4105a181e950fd1c74cc690d86631d76f32c9df541dd77ea987` |
| 338 | `tests/test_auto10_traceability_integrity.py` | 1502 | `eaa213af4edf0026b4174e25631e95a6aad5f2dd0a3f6ee564768f9ea72193cb` |
| 339 | `tests/test_auto11_contract_traceability.py` | 1641 | `7b01295b718d3dec538db2ae670800e660436434c846013e0db2018938a78d80` |
| 340 | `tests/test_auto11_expansion.py` | 2370 | `19423bf01396e0604f90f5252328aac5a309ddd0158742c565a794f185b8237a` |
| 341 | `tests/test_auto12_100_round_campaign.py` | 571 | `43d3065b8672235a5fc596a79be52ccf6670f8461442c18c2340d1799b961ec1` |
| 342 | `tests/test_auto5_rebuild.py` | 2463 | `297b8da0d29e0e54c62616bd59990dd53cf6d080693f7adbcd78dc158b7ae5bf` |
| 343 | `tests/test_auto6_integration_readiness.py` | 1708 | `758487c2681c9e716c27178d7f1533ddea44847466f615bba4947ad5ed15a73b` |
| 344 | `tests/test_auto9_evidence_integrity.py` | 944 | `f289e981415ebee28b1a9c66b5c88284c27af41636a8be08b37ca17654cd5fb2` |
| 345 | `tests/test_contracts.py` | 6799 | `14ac3a48277890167d9e91799c2e777aace8a217c36c2cb837f89675b05dc2a7` |
| 346 | `tests/test_contracts.py.tmp` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 347 | `tests/test_event_admin_http.py` | 2082 | `9275dad104e87ec0bac2a9850e20f8d8213ebd3caa6a2bed40a0c7efdcb70276` |
| 348 | `tests/test_event_transport_focus.py` | 2733 | `79f3435c927247282e22cc3fa5341fb551bd8ca9ce8e4ed66054ddb88dd7f997` |
| 349 | `tests/test_evidence_campaign.py` | 943 | `1a05e4b4e60cf84d721aa07902697b738d0dd9dbae98a447fae21545294c8103` |
| 350 | `tools/xstate-runtime/package.json` | 199 | `bc106b45c34479b596d675e9f14c1d0e47d39e4da925dfce17e086b7cdf34640` |
| 351 | `tools/xstate-runtime/test-machines.ts` | 1034 | `8a5768d803322eefc496d44d37141b44dc4ce947a23bb39d54f95e083b23a3f1` |
| 352 | `traceability/CAPABILITY-FACET-MATRIX.yaml` | 11551 | `adc2a83b74aa6b2e3e67c8f9cacadc5d674ee7567cf449ce522945dd1797259d` |
| 353 | `traceability/COVERAGE-BASELINE.yaml` | 963 | `83d044d072e18272669122f604007c310f3e682e0203dcec1bd6612f29a71dbe` |
| 354 | `traceability/MATRIX.md` | 4324 | `af5663e733870b2c34e2cccfc3124812d226075e9cc16e5a7239b5c98f1353ee` |
| 355 | `traceability/REQUIREMENT-EVIDENCE-MAP.yaml` | 3494 | `106927bc2ea9f9c5803b9db1d655aa3400ab35af13801c0b3ad0946ff98c4b5a` |
