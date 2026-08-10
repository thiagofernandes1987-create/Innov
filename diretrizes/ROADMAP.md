# Roadmap oficial — Innovar Platform

**Versão estável:** 0.19.0  
**Atualizado em:** 04 de agosto de 2026

Planejamento não é tratado como funcionalidade entregue. O estado deve corresponder ao GitHub, banco, manifesto e evidências. Teste sintético não substitui homologação real.

## Etapas consolidadas

- Etapa 9 — comercial, orçamentos, propostas, contratos e aditivos;
- Etapa 10 — hardening de homologação;
- Etapa 11 — homologação autenticada;
- Etapa 12 — gestão de obras e campo;
- Etapa 12.1 — núcleo modular e acessos;
- Etapa 12.2 — assinatura avançada;
- Etapa 13 — qualidade e formulários;
- Etapa 14 — compras e suprimentos;
- Etapa 15 — financeiro operacional;
- Etapa 16 — relatórios e indicadores;
- Etapa 17 — Estoque, Inventário e Almoxarifado;
- Etapa 18 — CRM, Clientes e SAC;
- Etapa 19 — Auditoria e observabilidade.

## Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** incorporada à `main` e homologada tecnicamente.  
**Produção:** depende da Etapa 20.

Entregas: catálogo, depósitos, localizações, lotes, movimentos, reversões, saldos derivados, recebimento idempotente, reservas, ativos, manutenção, inventário físico, RLS e isolamento multiempresa/multiobra.

Evidências: 18 tabelas, seis views `security_invoker`, 14 testes transacionais com `ROLLBACK`, advisory locks e concorrência real com uma postagem, uma rejeição e saldo não negativo.

Definition of Done:

- [x] documentação atualizada no mesmo PR;
- [x] migration aplicada e homologada;
- [x] recebimento de Compras integrado de forma idempotente;
- [x] saldo não editável diretamente;
- [x] movimentos concluídos imutáveis;
- [x] testes de concorrência e saldo;
- [x] isolamento multiempresa e multiobra;
- [x] CI verde;
- [x] Backup e restauração lógica testados;
- [ ] carga prolongada e limites produtivos.

## Etapa 18 — CRM, Clientes e SAC

**Estado:** incorporada à `main`.

Entregas: lead → oportunidade → cliente → múltiplas obras → SAC/pós-venda, Cliente 360, consentimentos, atividades, anexos privados, SLAs, eventos append-only, RLS interna/cliente e E2E concorrente autenticado com cleanup aprovado.

## Etapa 19 — Auditoria e observabilidade

**Estado:** implementada, homologada e incorporada à `main`.

Entregas: fluxo unificado, `correlation_id`, sanitização, idempotência, eventos append-only, alertas, health checks, diagnósticos, retenção configurável e interface protegida.

## Etapa 20 — Prontidão de produção

**Estado:** em andamento no manifesto estável.  
**Publicação:** proibida até conclusão e aprovação explícita.

### Concluído parcialmente

- fundação UI/UX Pro Max;
- concorrência real do estoque;
- Backup e restauração lógica em ambiente isolado;
- proteção local de anexos do SAC com quarentena e antimalware;
- health architecture HMAC.

### Pendente

- provider real de antimalware e E2E de homologação;
- recuperação de Auth, buckets, PITR e retenção durável;
- provider jurídico;
- telemetria externa, retenção e incidentes;
- proteção contra senhas comprometidas e MFA adicional;
- rate limiting e headers/cookies finais;
- pentest;
- revisão jurídica, contábil e LGPD;
- carga prolongada;
- checklist de go-live, rollback e decisão formal;
- publicação controlada.

## Etapa 21 — WMS avançado e Automação Logística

**Estado:** planejada após a Etapa 20.  
**Não implementada na versão 0.19.0.**

Escopo: WMS avançado, Endereçamento automatizado, RFID em tempo real, Ressuprimento automático sem aprovação fora da política, Roteirização logística, Integração fiscal de entrada e Depreciação contábil oficial.

Dependências: Etapa 17 estabilizada em produção, Etapa 19 incorporada, Etapa 20 concluída, revisão fiscal/contábil e seleção de hardware/provider.

## Etapa 22 — WhatsApp multiprovider e atendimento

**Estado do escopo técnico:** fechado na branch experimental.  
**PR:** `#40`, draft, aberto e não mesclado.  
**Produção:** `NOT_AUTHORIZED`.

### Fundação W-00 a W-18

- governança, contratos provider-neutral, capability matrix e storage aditivo;
- gateway isolado e adapter Baileys confinado;
- session store cifrado, lease, single writer e fencing sintéticos;
- ingress persist-before-dispatch e outbox durável;
- identidade PN/LID, mídia segura e inbox multiprovider;
- playbooks canônicos;
- IA `DRAFT_ONLY`, handoff e plugins governados;
- STRIDE, scanner de segredos, SBOM, observabilidade, alertas e runbooks.

### W-19 — testes funcionais, chaos e performance

- [x] unit, contract e integração PostgreSQL;
- [x] restart, perda de rede, duplicados, receipt fora de ordem, mídia corrompida, banco indisponível, processo zumbi e disputa de réplicas com fixtures;
- [x] upgrade/downgrade, restore e benchmarks sintéticos;
- [ ] E2E com número autorizado — `BLOCKED_NOT_EXECUTED`;
- [ ] QR e pairing reais — `BLOCKED_NOT_EXECUTED`.

### W-20 — homologação interna

- [x] políticas fail-closed, campanhas desabilitadas, IA autônoma desligada, conteúdo permitido, métricas, alertas, purge e handoff ensaiados;
- [ ] número, organização, usuários, sessão e tráfego reais — `BLOCKED_NOT_EXECUTED`.

### W-21 — piloto restrito

- [x] escopo máximo, SLOs, abort criteria, feature flags, rollback, revisão de incidentes e comparação sintética definidos;
- [ ] revisão jurídica, autorização formal e piloto real;
- decisão: `HOLD`.

### W-22 — encerramento

- reconciliação dos documentos canônicos;
- dependências e licenças registradas;
- decisão `HOLD / NOT_AUTHORIZED`;
- CI e E2E finais exigidos no head documental;
- PR permanece draft até revisão técnica e de segurança;
- merge ou fechamento não é automático.

### Bloqueadores de promoção

1. revisão jurídica e de privacidade;
2. revisão da SBOM transitiva;
3. decisão de KMS/HSM;
4. número dedicado autorizado;
5. organização e usuários reais de homologação;
6. repetição P0 em ambiente autorizado;
7. piloto restrito real;
8. revisão técnica e de segurança do PR.

## Regra de alteração

Nenhuma etapa é concluída sem código, migrations, testes, documentação, vacinas, homologação aplicável e CI compatíveis. Dependência externa permanece aberta. Nenhum merge ou publicação ocorre automaticamente.
