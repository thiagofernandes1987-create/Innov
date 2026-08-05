# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.7.0  
**Versão implementada da plataforma:** 0.19.0  
**Atualizado em:** 04 de agosto de 2026  
**Fonte de verdade:** repositório `thiagofernandes1987-create/Innov`

## 1. Propósito

A Innovar Platform é a plataforma modular da Innovar Construções e Reformas para gerir o ciclo completo:

```text
lead → oportunidade → cliente → orçamento → proposta → contrato → assinatura
→ obra → planejamento → execução → qualidade → compras → estoque
→ financeiro → indicadores → entrega → SAC/pós-venda → auditoria
```

A solução suporta múltiplas organizações e múltiplas obras por cliente, abertas ou concluídas.

## 2. Fonte de verdade e continuidade

GitHub contém código, migrations, testes, documentação, CI e procedimentos de recuperação. Perder contêiner, conversa ou máquina local não pode impedir a reconstrução do estado versionado. Segredos, usuários reais, dados operacionais, conteúdo de buckets e credenciais de providers permanecem fora do repositório.

Ordem de leitura:

1. `diretrizes/SPEC.md`;
2. `diretrizes/ESTADO-ATUAL.json`;
3. `diretrizes/INVENTARIO.md`;
4. `diretrizes/MODULOS.md`;
5. `diretrizes/ARQUITETURA.md`;
6. `diretrizes/ROADMAP.md`;
7. `diretrizes/RECUPERACAO.md`;
8. `diretrizes/VACINAS.md`;
9. documentos técnicos e evidências em `docs/`.

## 3. Princípios inegociáveis

1. módulos plug-and-play por organização;
2. isolamento multiempresa e multiobra;
3. autorização em menu, rota, Server Action, RPC, tabela e arquivo;
4. RLS por padrão e privilégios mínimos;
5. Service Role somente no servidor;
6. Storage privado e download autenticado;
7. versionamento, hash e imutabilidade;
8. auditoria de ações críticas;
9. idempotência em integrações e comandos repetíveis;
10. saldos derivados de razões, nunca editados diretamente;
11. concorrência protegida por transações, locks, leases e fencing quando necessária;
12. migrations append-only e alinhadas ao ledger remoto;
13. documentação atualizada no mesmo PR;
14. CI como bloqueio obrigatório;
15. acessibilidade WCAG 2.2 AA, responsividade e estados completos;
16. identidade visual autoral da Innovar;
17. evidência sintética nunca substitui homologação real;
18. dependência externa não é marcada como concluída sem prova objetiva.

## 4. Modelo de autorização

Perfis canônicos: Super Administrador, Direção, Administrador, Comercial/Vendas, Gestor de Obras, Engenharia, Orçamentista, Financeiro, Qualidade, Compras/Almoxarifado, Pós-venda/SAC e Cliente.

Níveis: `NONE`, `READ`, `EDIT`/`READ_WRITE` e `DELETE`/`FULL`. Capacidades adicionais incluem criar, aprovar, liberar, assinar, exportar, administrar, configurar e visualizar dados sensíveis. Escopos incluem organização, cliente, obra e recurso específico. Negação explícita prevalece, e perfis personalizados não são sobrescritos por instaladores.

## 5. Aplicativos modulares

O catálogo canônico está em `lib/modules/registry.ts` e no banco em `app_modules`. Cada organização habilita aplicativos por `organization_modules`, perfis e overrides. Desabilitar um módulo preserva dados e bloqueia o acesso funcional.

Aplicativos implementados incluem Comercial, CRM, Clientes, Obras, Planejamento, Tarefas, Diário, Equipes, Orçamentos, Propostas, Contratos, Aditivos, Assinaturas, Documentos, Qualidade, Compras, Estoque, Financeiro, SAC, Relatórios, Auditoria, Administração e WhatsApp/Atendimento em branch experimental.

## 6. Núcleos consolidados

### Etapa 17 — Estoque

Razão append-only, saldos derivados, movimentos imutáveis, reversões, advisory locks, recebimento idempotente, reservas, ativos, inventário físico e isolamento multiempresa/multiobra.

### Etapa 18 — CRM, Cliente 360 e SAC

Pipeline interno, Cliente 360 multiobra, consentimentos, atividades, SAC interno/portal, mensagens públicas e internas, anexos privados, SLAs, eventos append-only e E2E concorrente autenticado aprovado.

### Etapa 19 — Auditoria e observabilidade

Fluxo unificado sem duplicar trilhas de domínio, `correlation_id`, sanitização, idempotência, alertas, health checks, diagnósticos, retenção configurável e acesso sensível restrito.

## 7. Próxima etapa oficial

A Etapa 20 continua sendo a **Prontidão de Produção** e permanece em andamento no manifesto estável. Seu escopo inclui provider jurídico, proteção de anexos em todos os módulos, pentest, backup/restauração completa, telemetria externa, retenção, incidentes, Auth/MFA, revisão jurídica/LGPD, carga prolongada e publicação controlada.

Produção da plataforma permanece não liberada.

## 8. Etapa 21 — WMS avançado

A Etapa 21 permanece planejada e não integra a versão implementada atual. O WMS avançado deverá incluir endereçamento automatizado, RFID em tempo real, ressuprimento automático com segregação de funções, roteirização logística, integração fiscal de entrada e depreciação contábil oficial.

## 9. Etapa 22 — WhatsApp multiprovider e atendimento

A Etapa 22 foi executada em paralelo no PR draft `#40`, branch `feature/etapa-22-provider-whatsapp-web-baileys`, sem alterar a versão estável ou a ordem oficial das etapas.

### 9.1 Arquitetura

- contratos provider-neutral e capability matrix;
- Meta Cloud preservado como único runtime WhatsApp implementado no monólito;
- adapter `WHATSAPP_WEB_BAILEYS` confinado ao gateway isolado;
- `@whiskeysockets/baileys@7.0.0-rc13` fixado sem range;
- storage técnico aditivo, sem duplicar contatos, conversas ou mensagens;
- persist-before-dispatch, outbox, retry, DLQ e reconciliação;
- session store cifrado, lease, single writer e fencing sintéticos;
- mídia protegida, PN/LID, inbox multiprovider e playbooks canônicos;
- IA independente em `DRAFT_ONLY`, handoff persistente e plugins governados;
- STRIDE, scanner de segredos, SBOM, observabilidade, alertas, traces e runbooks.

### 9.2 Limites comprovados

Os testes W-19, os controles de homologação W-20 e o piloto W-21 foram executados apenas com fixtures, doubles, PostgreSQL local e containers sem rede. Não houve conexão externa, QR, pairing, sessão real, número autorizado, tráfego real, homologação real, piloto real, deploy ou produção.

### 9.3 Decisão

- piloto: `HOLD`;
- homologação real: `NOT_EXECUTED`;
- produção: `NOT_AUTHORIZED`;
- PR `#40`: draft, aberto, não mesclado e pendente de revisão técnica e de segurança;
- revisão jurídica/SBOM e KMS/HSM: dependências externas obrigatórias.

A conclusão da Etapa 22 nesta branch significa fechamento técnico e documental, não promoção operacional.
