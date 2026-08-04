# Evidências — Sprint W-22

**Estado:** escopo técnico e documental concluído; gates externos pendentes  
**Data:** 04 de agosto de 2026  
**Head funcional aprovado:** `ad7bdcd4097d70190848c180eedc22b1feb35204`

## 1. Encerramento comprovado

- [x] `diretrizes/SPEC.md` reconciliada;
- [x] `diretrizes/INVENTARIO.md` reconciliado;
- [x] `diretrizes/MODULOS.md` reconciliado;
- [x] `diretrizes/ARQUITETURA.md` reconciliada;
- [x] `diretrizes/ROADMAP.md` reconciliado;
- [x] `diretrizes/RECUPERACAO.md` reconciliada;
- [x] `diretrizes/VACINAS.md` reconciliada com 42 IDs preservados;
- [x] `diretrizes/ESTADO-ATUAL.json` atualizado sem elevar a versão estável;
- [x] dependências, licenças e avisos de terceiros reconciliados;
- [x] decisão `HOLD / NOT_AUTHORIZED` registrada;
- [x] gate `messaging-stage22-closure-boundary-v1` aprovado;
- [x] Meta Cloud preservado como único runtime WhatsApp implementado no monólito;
- [x] Baileys mantido experimental, confinado e não registrado no bootstrap;
- [x] PR mantido draft, aberto e não mesclado.

## 2. Workflows verdes no mesmo head funcional

| Workflow | Run | Resultado |
|---|---:|---|
| Messaging Incremental Loop | `30950331567` | `success` |
| CI — preflight e quality | `30950327715` | `success` |
| Stage 20 File Security E2E | `30950331506` | `success` |
| Messaging W-10 Outbox | `30950327612` | `success` |

O CI aprovou documentação, vacinas, ledger, todas as validações estruturais, testes PostgreSQL, suíte TypeScript, testes Python, lint, typecheck, build do gateway, smoke test do container e build Next.js.

## 3. Supply chain W-06 preservada

- pacote: `@whiskeysockets/baileys@7.0.0-rc13`;
- versão exata, sem `latest`, caret ou tilde;
- lifecycle scripts bloqueados;
- `ws@8.21.1` fixado em `pnpm-workspace.yaml`;
- fingerprint canônico da cadeia Baileys: `3a00d4b9e53cd7d2ce9ad1de1f1cb5aa40aeac4189f6eb5003227e29d8e52add`;
- hash integral do artefato histórico aprovado: `d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9`;
- override `ws` validado separadamente para não misturar política transitiva com o fingerprint do pacote;
- revisão jurídica da árvore transitiva permanece externa.

## 4. Evidência sintética não convertida em integração real

- W-19: chaos, integração local e performance sintéticos aprovados;
- W-20: controles de homologação fail-closed aprovados;
- W-21: SLOs, abort criteria, feature flags e rollback aprovados;
- número real, QR, pairing, sessão, tráfego, homologação e piloto reais: `BLOCKED_NOT_EXECUTED`;
- piloto: `HOLD`;
- produção: `NOT_AUTHORIZED`.

## 5. Dependências externas não concluídas

- [ ] revisão técnica e de segurança do PR por responsáveis;
- [ ] revisão jurídica e de privacidade;
- [ ] revisão da SBOM transitiva;
- [ ] decisão de KMS/HSM;
- [ ] número dedicado autorizado;
- [ ] homologação real e repetição dos testes P0;
- [ ] piloto real;
- [ ] decisão futura e separada de produção;
- [ ] encerramento ou merge do PR.

O item de encerramento do PR permanece `BLOCKED_PENDING_REVIEW`; esta sprint não autoriza merge, deploy ou operação externa.
