# Contratos dos módulos — Innovar Platform

**Atualizado em:** 04 de agosto de 2026  
**Versão estável:** 0.19.0  
**Atualizado em:** 9 de agosto de 2026  
**Versão:** 0.19.0  
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

## `rh` — Recursos Humanos e Departamento Pessoal

- rota `/app/rh`;
- sensível;
- branch funcional `feature/projeto-rh-especificacao-funcional`;
- PR de rascunho `#42`;
- implementação funcional validada internamente; **homologação externa, piloto e produção ainda não concluídos**;
- integra com `financeiro`, `documentos`, eSocial, DCTFWeb/Integra Contador e FGTS Digital conforme canais oficiais realmente disponíveis.

Escopo:

- pessoas, trabalhadores, vínculos, empresas, estabelecimentos, lotações, cargos/CBO, funções, sindicatos e jornadas;
- admissão, alterações contratuais/cadastrais, ponto, férias, afastamentos, benefícios, SST, desligamento e offboarding;
- folha parametrizada com rubricas versionadas, bases declarativas, IRRF 2026, múltiplos vínculos, 13º, férias, rescisão, retroativos/complementares, provisões e contabilização;
- pagamentos internos com conta/PIX, ordens, lotes, liquidação e evidência;
- documentos privados, recibos PDF, Meu RH e relatórios;
- folha-sombra e reconciliação.

eSocial suportado internamente:

- S-1000/S-1005/S-1010/S-1020;
- S-2190/S-2200 CLT padrão/S-2205/S-2206;
- S-2230 nos caminhos modelados;
- S-2210/S-2220/S-2240;
- S-2299/S-2399 nos caminhos modelados;
- S-1200/S-1210/S-1298/S-1299;
- XMLDSig RSA-SHA256/SHA-256, C14N conferida com `xmllint`, assinatura verificada por `xmlsec1` e XML validado contra XSD oficial S-1.3 vigente;
- mTLS, lote, protocolo, consulta, recibo e ocorrências por evento;
- Produção bloqueada por padrão.

Segurança e dados:

- RLS por organização e FKs compostas para isolamento multiempresa;
- dados clínicos/sensíveis segregados;
- mudanças críticas por RPC/transação;
- histórico temporal preservado;
- Storage privado para documentos;
- Service Role apenas server-side;
- nenhuma API governamental fictícia: adapters usam Web Service, feed, arquivo ou portal conforme o serviço oficial.

Integrações governamentais:

- DCTFWeb tratada como obrigação sensibilizada por fontes oficiais, com workspace e reconciliação;
- MIT JSON leiaute 1.0 com regras condicionais;
- Integra Contador somente por capabilities/paths efetivamente contratados;
- FGTS Digital com bases, guia/pagamento/conciliação e arquivo rescisório oficial; ações sem API pública permanecem assistidas por portal.

Qualidade interna:

- migrations RH replayadas em PostgreSQL isolado;
- regressões de banco, typecheck e lint específicos;
- XMLs eSocial testados contra XSD oficial;
- XMLDSig verificado por implementação externa;
- backup/restore isolado com comparação de tabelas, dados, RLS, policies e funções;
- gates RH específicos verdes no checkpoint registrado em `docs/PROJETO-RH-EXECUCAO-STATUS-IMPLEMENTACAO.md`.

Pendências antes de homologação/piloto:

- Produção Restrita eSocial com certificado/inscrições reais e protocolo oficial;
- Browser E2E em ambiente HTTPS isolado;
- Integra Contador com contrato e credenciais reais;
- folha-sombra contra fonte autorizada real;
- casos especiais de eSocial ainda não modelados;
- rehearsal de cutover/rollback;
- piloto e GO/NO_GO de negócio.

Definition of Done para produção:

- documentação atualizada no mesmo PR;
- migrations aplicadas e homologadas no ambiente candidato;
- gates RH internos verdes no mesmo SHA;
- homologação eSocial real concluída;
- reconciliação sombra aceita;
- restore/cutover ensaiados;
- parâmetros legais aprovados pelo responsável competente;
- piloto sem divergência crítica;
- CI global verde;
- PR revisado sem merge automático.

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
- níveis: nenhuma, leitura, edição e exclusão;
- capacidades adicionais: aprovar, liberar, assinar, exportar, administrar e visualizar sensíveis.

## Definition of Done da Etapa 18

- documentação atualizada no mesmo PR;
- migrations aplicadas, homologadas e alinhadas ao ledger remoto;
- leads, oportunidades e conversão idempotente;
- Cliente 360 multiobra;
- SAC interno e do portal;
- mensagens, anexos, SLA e eventos;
- RLS interna e do cliente;
- nenhuma RPC operacional para `anon`;
- todas as FKs indexadas;
- CI verde;
- PR pronto para revisão, sem merge automático.
