# Inventário de execução — Etapa 22 WhatsApp multiprovider

**Atualizado em:** 04 de agosto de 2026  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** `#40`, draft, aberto e não mesclado  
**Produção:** `NOT_AUTHORIZED`

## 1. Regras de evidência

- check exige código, teste, documento ou decisão verificável;
- fixture sintética não prova integração externa;
- dependência externa permanece aberta;
- QR, pairing, número, sessão, tráfego, homologação e piloto reais não são inferidos;
- PR não é fechado ou mesclado automaticamente;
- Meta Cloud permanece preservado.

## 2. Resumo das sprints

| Sprint | Estado técnico | Evidência/limite |
|---|---|---|
| W-00 | concluída | pesquisa, arquitetura e boundaries |
| W-01 | concluída | governança, ADR, risco e licenças |
| W-02 | concluída | contratos canônicos provider-neutral |
| W-03 | concluída | engine contracts e capability matrix |
| W-04 | concluída | storage multiprovider aditivo |
| W-05 | concluída | gateway isolado e container endurecido |
| W-06 | concluída | adapter Baileys confinado, sem rede |
| W-07 | concluída | session credential store cifrado |
| W-08 | concluída | lifecycle, lease, single writer e fencing sintéticos |
| W-09 | concluída | ingress persist-before-dispatch |
| W-10 | concluída | outbox, retry, DLQ e reconciliação |
| W-11 | concluída | PN/LID e identidade canônica |
| W-12 | concluída | mídia segura e quarentena |
| W-13 | concluída | inbox multiprovider |
| W-14 | concluída | playbooks e fontes canônicas |
| W-15 | concluída | IA independente em `DRAFT_ONLY` e handoff |
| W-16 | concluída | plugins governados e prioridade determinística |
| W-17 | concluída | STRIDE, hardening, scanner e SBOM |
| W-18 | concluída | métricas, alertas, traces, dashboard e runbooks |
| W-19 | parcial controlada | escopo sintético aprovado; número/QR reais bloqueados |
| W-20 | parcial controlada | controles técnicos aprovados; homologação real bloqueada |
| W-21 | parcial controlada | controles de piloto aprovados; piloto real em `HOLD` |
| W-22 | concluída tecnicamente | canônicos, licenças, decisão e CI verdes; PR depende de revisão |

## 3. Marcos concluídos

### W-00 a W-04 — fundação

- [x] pesquisa e decisões arquiteturais;
- [x] provider oficial preservado;
- [x] contratos de domínio e engine;
- [x] capability matrix;
- [x] storage técnico sem domínio paralelo;
- [x] RLS, idempotência e rollback lógico.

### W-05 a W-08 — gateway, adapter e sessão

- [x] gateway Node.js isolado;
- [x] HMAC, replay guard, health, readiness e métricas;
- [x] container non-root e read-only;
- [x] Baileys `7.0.0-rc13` fixado sem range;
- [x] tipos nativos confinados;
- [x] nenhuma conexão externa no runtime ou testes;
- [x] credenciais cifradas e versionadas;
- [x] key updates transacionais;
- [x] lease, single writer e fencing;
- [x] restart e restore sintéticos.

### W-09 a W-14 — pipeline e operação

- [x] ingress persist-before-dispatch;
- [x] envelopes sanitizados e idempotentes;
- [x] outbox durável e ordenada por conversa;
- [x] retry limitado, rate limit, circuit breaker, ledger e DLQ;
- [x] PN/LID, conflitos e merge transacional;
- [x] mídia em quarentena, antivírus, MIME real e SHA-256;
- [x] inbox unificada com origem preservada;
- [x] atribuição, notas e presença;
- [x] playbooks versionados e snapshot histórico;
- [x] conteúdo sensível exige aprovação humana.

### W-15 a W-18 — IA, plugins, segurança e observabilidade

- [x] IA provider/channel-independent;
- [x] retrieval híbrido com tenancy e validade;
- [x] orçamento, lock por conversa, citações e auditoria;
- [x] handoff persistente e humano desabilita IA;
- [x] pipeline de plugins com consentimento e anti-spam primeiro;
- [x] IA como último recurso em `DRAFT_ONLY`;
- [x] STRIDE, allowlist, aprovação crítica, retenção e incidentes;
- [x] scanner de segredos e SBOM;
- [x] métricas de baixa cardinalidade;
- [x] logs sanitizados, traces, dashboard e alertas;
- [x] runbooks de desconexão, upgrade e rollback.

## 4. Sprint W-19 — testes funcionais, chaos e performance

**Estado técnico:** concluído no escopo sintético; integração real bloqueada.

- [x] W-19.1 — unit tests canônicos;
- [x] W-19.2 — contract tests;
- [x] W-19.3 — integration tests PostgreSQL local;
- [ ] W-19.4 — E2E com número de homologação — `BLOCKED_NOT_EXECUTED`;
- [ ] W-19.5 — QR e pairing reais — `BLOCKED_NOT_EXECUTED`;
- [x] W-19.6 — restart durante mensagem sintética;
- [x] W-19.7 — restart durante key update sintético;
- [x] W-19.8 — perda de rede simulada;
- [x] W-19.9 — evento duplicado;
- [x] W-19.10 — receipt fora de ordem;
- [x] W-19.11 — mídia corrompida;
- [x] W-19.12 — banco indisponível;
- [x] W-19.13 — processo zumbi;
- [x] W-19.14 — réplicas disputando sessão;
- [x] W-19.15 — upgrade e downgrade de contrato;
- [x] W-19.16 — restore sintético em infraestrutura nova;
- [x] W-19.17 — benchmark sintético de memória por sessão;
- [x] W-19.18 — benchmark sintético de throughput;
- [x] W-19.19 — benchmark sintético de latência;
- [x] W-19.20 — limites sintéticos registrados.

**Gate W-G19:** número real não liberado.

## 5. Sprint W-20 — homologação interna

**Estado técnico:** controles concluídos; homologação real bloqueada.

- [ ] W-20.1 — número dedicado e autorizado — `BLOCKED_NOT_EXECUTED`;
- [ ] W-20.2 — organização real de homologação — `BLOCKED_NOT_EXECUTED`;
- [ ] W-20.3 — usuários reais autorizados — `BLOCKED_NOT_EXECUTED`;
- [x] W-20.4 — campanhas desabilitadas;
- [x] W-20.5 — auto-reply IA desabilitado;
- [x] W-20.6 — política de texto e mídia aprovada;
- [x] W-20.7 — roteiro diário fail-closed definido;
- [x] W-20.8 — métricas e alertas validados sinteticamente;
- [x] W-20.9 — expurgo e exclusão de sessão ensaiados;
- [x] W-20.10 — handoff e multiagente ensaiados;
- [x] W-20.11 — incidente sintético e vacinas registrados;
- [x] W-20.12 — relatório de homologação técnica publicado.

**Gate W-G20:** `BLOCKED_NOT_EXECUTED` para homologação real.

## 6. Sprint W-21 — piloto restrito

**Estado técnico:** controles concluídos; piloto real em `HOLD`.

- [x] W-21.1 — limites de escopo e usuários definidos;
- [x] W-21.2 — SLOs e abort criteria definidos;
- [x] W-21.3 — rollout por feature flag;
- [x] W-21.4 — rollback instantâneo;
- [x] W-21.5 — monitoramento de falhas/reconnects/duplicações modelado;
- [x] W-21.6 — comparação sintética com provider oficial;
- [x] W-21.7 — custo operacional sintético;
- [x] W-21.8 — suporte e runbooks revisados;
- [ ] W-21.9 — revisão jurídica, contratual e privacidade — `PENDING_EXTERNAL_REVIEW`;
- [x] W-21.10 — decisão registrada: `HOLD`;
- [ ] piloto real — `NOT_EXECUTED`.

**Gate W-G21:** não liberado.

## 7. Sprint W-22 — encerramento da etapa

**Estado técnico:** concluído; produção `NOT_AUTHORIZED`.

- [x] W-22.1 — atualizar `diretrizes/SPEC.md`;
- [x] W-22.2 — atualizar `diretrizes/INVENTARIO.md`;
- [x] W-22.3 — atualizar `diretrizes/MODULOS.md`;
- [x] W-22.4 — atualizar `diretrizes/ARQUITETURA.md`;
- [x] W-22.5 — atualizar `diretrizes/ROADMAP.md`;
- [x] W-22.6 — atualizar `diretrizes/RECUPERACAO.md`;
- [x] W-22.7 — atualizar `diretrizes/VACINAS.md`;
- [x] W-22.8 — atualizar `diretrizes/ESTADO-ATUAL.json`;
- [x] W-22.9 — registrar dependências e licenças;
- [x] W-22.10 — garantir CI e E2E finais verdes no head funcional `ad7bdcd4097d70190848c180eedc22b1feb35204`;
- [x] W-22.11 — registrar decisão final de produção: `HOLD / NOT_AUTHORIZED`;
- [ ] W-22.12 — encerrar PR após revisão técnica e de segurança — `BLOCKED_PENDING_REVIEW`.

O item W-22.12 não será convertido em check pela automação. O PR deve permanecer draft, aberto e não mesclado até revisão externa.

## 8. Critérios globais

- [x] contratos provider-neutral;
- [x] Meta preservado sem regressão;
- [x] engine e capability matrix;
- [x] storage aditivo sem domínio paralelo;
- [x] gateway e adapter confinados;
- [x] session store, lease, single writer e fencing sintéticos;
- [x] ingress, outbox, identidades e mídia;
- [x] inbox, playbooks, IA, handoff e plugins;
- [x] threat model, hardening e observabilidade;
- [x] chaos/performance sintéticos;
- [ ] homologação real;
- [ ] piloto real;
- [x] decisão explícita: `NOT_AUTHORIZED`;
- [ ] revisão técnica e de segurança do PR;
- [ ] produção.

## 9. Dependências externas

| Controle | Estado |
|---|---|
| revisão jurídica e privacidade | `PENDING_EXTERNAL_REVIEW` |
| revisão da SBOM transitiva | `PENDING_EXTERNAL_REVIEW` |
| KMS/HSM | `PENDING_EXTERNAL_DECISION` |
| número autorizado | `BLOCKED_NOT_EXECUTED` |
| homologação real | `BLOCKED_NOT_EXECUTED` |
| piloto real | `HOLD / NOT_EXECUTED` |
| revisão do PR | `BLOCKED_PENDING_REVIEW` |
| produção | `NOT_AUTHORIZED` |
