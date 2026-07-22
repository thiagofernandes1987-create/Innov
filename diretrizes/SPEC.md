# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.6.0  
**Versão implementada da plataforma:** 0.19.0  
**Atualizado em:** 22 de julho de 2026  
**Fonte de verdade:** repositório `thiagofernandes1987-create/Innov`

## 1. Propósito

A Innovar Platform é a plataforma modular da **Innovar Construções e Reformas** para gerir o ciclo completo:

```text
lead → oportunidade → cliente → orçamento → proposta → contrato → assinatura
→ obra → planejamento → execução → qualidade → compras → estoque
→ financeiro → indicadores → entrega → SAC/pós-venda → auditoria
```

A solução suporta múltiplas organizações e múltiplas obras por cliente, abertas ou concluídas.

## 2. Fonte de verdade e continuidade

GitHub contém código, migrations, testes, documentação, CI e recuperação. Perder contêiner, conversa ou máquina local não pode impedir a reconstrução. Segredos e dados reais permanecem fora do repositório.

Ordem de leitura:

1. `diretrizes/SPEC.md`;
2. `diretrizes/ESTADO-ATUAL.json`;
3. `diretrizes/INVENTARIO.md`;
4. `diretrizes/MODULOS.md`;
5. `diretrizes/ARQUITETURA.md`;
6. `diretrizes/ROADMAP.md`;
7. `diretrizes/RECUPERACAO.md`;
8. documentos em `docs/`.

## 3. Princípios inegociáveis

1. módulos plug-and-play por organização;
2. isolamento multiempresa e multiobra;
3. autorização em menu, rota, Server Action, RPC, tabela e arquivo;
4. RLS por padrão;
5. Service Role somente no servidor;
6. Storage privado e download autenticado;
7. versionamento, hash e imutabilidade;
8. auditoria de ações críticas;
9. idempotência em integrações e comandos repetíveis;
10. saldos derivados de razões, nunca editados diretamente;
11. concorrência protegida por transações e locks quando necessária;
12. migrations append-only e alinhadas ao ledger remoto;
13. privilégios mínimos;
14. documentação atualizada no mesmo PR;
15. CI como bloqueio obrigatório;
16. acessibilidade WCAG 2.2 AA, responsividade e estados completos de interface;
17. identidade visual autoral da Innovar, sem presets SaaS genéricos.

## 4. Modelo de autorização

Perfis canônicos:

- Super Administrador;
- Direção;
- Administrador;
- Comercial/Vendas;
- Gestor de Obras;
- Engenharia;
- Orçamentista;
- Financeiro;
- Qualidade;
- Compras/Almoxarifado;
- Pós-venda/SAC;
- Cliente.

Perfis personalizados não são sobrescritos pelos instaladores.

Níveis:

- `NONE`;
- `READ`;
- `EDIT`/`READ_WRITE`;
- `DELETE`/`FULL`.

Capacidades incluem criar, ler, editar, excluir, aprovar, liberar, assinar, exportar, administrar, configurar e visualizar dados sensíveis. Escopos incluem organização, cliente, obra e recurso específico.

## 5. Aplicativos modulares

O catálogo canônico está em `lib/modules/registry.ts` e no banco em `app_modules`. Cada organização habilita aplicativos por `organization_modules`, perfis e overrides. A Etapa 19 consolidou auditoria e observabilidade como aplicativo sensível, restrito por padrão a Super Administrador, Direção e Administrador.

## 6. Estoque, Inventário e Almoxarifado

O módulo de Estoque, Inventário e Almoxarifado permanece consolidado como núcleo operacional da Etapa 17, com:

- catálogo, unidades, categorias e depósitos;
- localizações, lotes e validade;
- movimentos append-only e reversões;
- saldos físico, reservado e disponível derivados;
- recebimentos de compras idempotentes;
- reservas e consumo por obra;
- ativos, custódias e manutenção;
- inventário físico, ajustes e isolamento multiempresa/multiobra.

Saldos não podem ser editados diretamente. Custos sensíveis dependem de capacidade específica e toda operação crítica deve permanecer auditável.

## 7. CRM, Cliente 360 e SAC

A Etapa 18 está incorporada à `main`. O E2E concorrente autenticado foi aprovado no workflow `29883182240`, com:

- login paralelo de administrador e cliente;
- abertura idempotente de chamado;
- mensagens simultâneas com visibilidade correta;
- transição protegida por RPC;
- tentativa direta de alteração de estado bloqueada;
- RLS confirmada;
- cleanup aprovado, preservando históricos append-only como `immutable_history`.

## 8. Auditoria e observabilidade

A versão `0.19.0` inclui:

- fluxo unificado sem duplicação das trilhas dos módulos;
- correlação por `correlation_id`, ator, recurso, cliente e obra;
- sanitização recursiva de payloads;
- idempotência por chave de deduplicação;
- eventos append-only;
- alertas reconhecíveis e resolvíveis com motivo;
- health checks de banco, assinatura, relatórios e SAC;
- diagnósticos de índices, RLS, privilégios e ledger;
- política configurável de retenção.

A Etapa 19 foi homologada, teve CI final verde e foi incorporada à `main` pelos PRs `#19` e `#20`.

## 9. Próxima etapa oficial

A Etapa 20 é a **Prontidão de Produção**. Seu escopo inclui E2E autenticado completo, concorrência real de estoque, provider jurídico, proteção e antimalware de anexos, pentest, backup/restauração, telemetria, retenção, incidentes, proteção contra senhas comprometidas, MFA adicional, revisão jurídica/LGPD e publicação controlada.

A direção de UI/UX da Etapa 20 deve seguir a UI/UX Pro Max adaptada à identidade Innovar: arquitetura e precisão de obra, azul profundo, cobre e materiais naturais, interface densa porém escaneável, status semânticos, motion discreto, acessibilidade e responsividade.

## 10. Etapa 21 — WMS avançado

A Etapa 21 permanece planejada e não integra a versão implementada atual. O WMS avançado deverá evoluir o estoque com:

- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático com limites e segregação de funções;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

Dependências obrigatórias: Etapa 17 estabilizada, auditoria e observabilidade da Etapa 19, prontidão de produção da Etapa 20, revisão fiscal/contábil e seleção de hardware/provider.
