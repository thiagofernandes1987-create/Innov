# Contratos dos módulos — Innovar Platform

**Atualizado em:** 04 de agosto de 2026  
**Versão estável:** 0.19.0  
**Registro técnico:** `lib/modules/registry.ts`

Cada módulo possui chave estável, rota, estado por organização, dependências, capacidades e escopos. Desabilitar um módulo preserva dados e bloqueia o uso funcional. Perfis personalizados não são sobrescritos. Nenhum módulo experimental é descrito como homologado ou produtivo sem evidência real.

## `dashboard` — Início

- rota `/app`;
- módulo de sistema;
- exibe apenas aplicativos habilitados e autorizados;
- não inventa métricas quando uma fonte falha.

## `crm` — CRM e Vendas

- rota `/app/crm`;
- pipeline, leads, oportunidades, atividades e conversão idempotente;
- acesso interno e RLS por organização;
- estados críticos por RPC.

## `clientes` — Clientes

- rota `/app/clientes`;
- Cliente 360 multiobra;
- contatos, preferências, consentimentos, oportunidades, contratos e SAC;
- dados sensíveis mascarados por capacidade.

## `obras` — Obras

- rota `/app/obras`;
- depende de `clientes`;
- carteira multiobra, progresso, gerente, contrato e portal.

## `planejamento` — Planejamento

- rota `/app/planejamento`;
- depende de `obras`;
- EAP, cronograma, dependências, marcos e baselines imutáveis.

## `tarefas` — Tarefas

- rota `/app/tarefas`;
- depende de `obras`;
- responsáveis, prioridade, datas, progresso e bloqueios.

## `diario` — Diário de Obras

- rota `/app/diario`;
- depende de `obras`;
- atividades, mão de obra, segurança, ocorrências e mídias privadas.

## `equipes` — Equipes

- rota `/app/equipes`;
- depende de `obras`;
- equipes, integrantes, recursos e atribuições.

## `orcamentos` — Orçamentos

- rota `/app/orcamentos`;
- custos, composições, procedência, BDI, markup, margem, ROI e cenários;
- versão congelada é imutável.

## `propostas` — Propostas

- rota `/app/propostas`;
- depende de `orcamentos`;
- versões, PDF, validade, liberação e aceite.

## `contratos` — Contratos

- rota `/app/contratos`;
- depende de `propostas`;
- templates, versões, partes, vigência e valores.

## `aditivos` — Aditivos

- rota `/app/aditivos`;
- depende de `contratos`;
- alterações de escopo, valor e prazo com aplicação idempotente.

## `assinaturas` — Assinaturas

- rota `/app/assinaturas`;
- operacional em sandbox;
- hashes, evidências e cópias privadas;
- provider jurídico real permanece pendente.

## `documentos` — Documentos

- rota `/app/documentos`;
- arquivos privados, disciplinas, versões, hashes e liberação;
- versão liberada é imutável.

## `modelos` — Modelos e Documentações

- rota `/app/modelos`;
- operacional;
- **uma biblioteca só**: proposta, orçamento, contrato, aditivo, termos, FVS, FVM, procedimento, mensagens de CRM, mensagem por etapa do funil, lembrete, agendamento, e-mail e e-mail marketing;
- **todo aplicativo lê o mesmo acervo** — é o que permite enviar a proposta de dentro de Projetos e anexar o contrato assinado num atendimento;
- `document_type` classifica; a Administração marca, por empresa, quais tipos cada aplicativo oferece (`document_module_types`) — isso é disponibilização, não permissão;
- origem `PLATAFORMA` vale para todas as empresas e muda por migration; a empresa duplica e edita a cópia;
- corpo em Markdown com variáveis `{{escopo.campo}}`; publicado exige a alçada mais alta do aplicativo;
- importa DOCX, XLSX, CSV, TXT e Markdown, convertidos no navegador.

## `qualidade` — Qualidade

- rota `/app/qualidade`;
- biblioteca, FVS, FVM, formulários e pesquisas;
- schema publicado é imutável.

## `compras` — Compras e Suprimentos

- rota `/app/compras`;
- solicitações, fornecedores, cotações, comparação, aprovação, pedidos e recebimentos;
- recebimento é idempotente.

## `estoque` — Estoque, Inventário e Almoxarifado

- rota `/app/estoque`;
- depende de Compras e Obras;
- catálogo, depósitos, localizações, lotes, movimentos, reservas, ativos e inventário físico;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- correção por reversão;
- advisory locks por posição;
- custos protegidos;
- isolamento multiempresa e multiobra.

Definition of Done:

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

## `financeiro` — Financeiro Operacional

- rota `/app/financeiro`;
- contas a pagar/receber, parcelas, aprovações, baixas, medições e caixa;
- custos de estoque não criam lançamentos automaticamente.

## `sac` — Pós-venda e SAC

- rotas `/app/ocorrencias` e `/cliente/ocorrencias`;
- categorias, SLAs, chamados, mensagens, anexos e satisfação;
- conteúdo interno não aparece ao cliente;
- estados críticos por RPC e histórico append-only.

## `whatsapp` — WhatsApp e Atendimento

- rota `/app/whatsapp`;
- sensível;
- depende de `clientes`, `crm`, `sac` e `documentos`;
- PR `#40` permanece draft e não mesclado;
- provider oficial preservado: `META_CLOUD`;
- provider experimental: `WHATSAPP_WEB_BAILEYS`;
- produção: `NOT_AUTHORIZED`.

### Domínio canônico

O módulo reutiliza contas, contatos, conversas e mensagens existentes. Fontes canônicas incluem templates de contrato, propostas, contratos, aditivos e documentos de obra. Cada envio preserva binding, versão, snapshot e SHA-256; não há cópia editável paralela das mensagens padrão.

### Contratos multiprovider

- `MessagingEngine` e capability matrix provider-neutral;
- storage técnico aditivo;
- adapter Baileys confinado em `apps/messaging-gateway`;
- runtime produtivo não registra Baileys;
- gateway usa `FakeChannelClient` por padrão;
- sessão real, QR, pairing e número real não foram executados;
- IA é independente do canal e permanece `DRAFT_ONLY`;
- handoff humano é persistente;
- grupos, mídia, replies, reactions e receipts dependem de capability;
- ingress é persist-before-dispatch;
- outbox, retry, rate limit, circuit breaker, DLQ e reconciliação são duráveis.

### Segurança e operação

- HMAC e replay guard;
- RLS e privilégio mínimo;
- credenciais cifradas e versionadas;
- lease, single writer e fencing;
- mídia em quarentena, antivírus, MIME real e SHA-256;
- logs sanitizados e métricas de baixa cardinalidade;
- STRIDE, scanner de segredos, SBOM, retenção e incidentes;
- alertas, traces, dashboard e runbooks;
- envio automático por IA proibido.

### Estado de promoção

- W-19: testes e benchmarks sintéticos aprovados; QR/número real bloqueados;
- W-20: controles técnicos aprovados; homologação real não executada;
- W-21: piloto em `HOLD`; piloto real não executado;
- W-22: fechamento técnico/documental;
- revisão jurídica/SBOM, KMS/HSM e revisão técnica/segurança do PR continuam obrigatórias.

Definition of Done da branch experimental:

- documentação atualizada no mesmo PR;
- contratos provider-neutral;
- Meta Cloud sem regressão;
- nenhuma duplicação de domínio;
- testes sintéticos, CI e File Security verdes;
- limitações reais registradas;
- PR revisado sem merge automático;
- produção somente por decisão explícita posterior.

## `relatorios` — Relatórios e Indicadores

- rota `/app/relatorios`;
- dashboards, metas, alertas, relatórios salvos, snapshots e CSV;
- valores sensíveis mascarados.

## `auditoria` — Auditoria e Observabilidade

- rota `/app/auditoria`;
- fluxo unificado, pesquisa, sanitização, idempotência, alertas, health checks e diagnósticos;
- acesso padrão restrito a perfis administrativos;
- cliente sem acesso.

## `administracao` — Administração

- rota `/app/administracao`;
- catálogo de módulos, perfis, usuários, escopos, overrides e permissões;
- módulo de sistema.
